import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';

const MAX_RESTART_ATTEMPTS = 5;
const MAX_RESTART_DELAY_MS = 30_000;
// If PowerShell doesn't acknowledge a command in this window we assume the
// helper is wedged (or silently dead) and recycle it.
const ACK_TIMEOUT_MS = 1500;

// --- macOS: media keys via the native addon (NX aux keyboard events) ---

interface MacMediaAddon {
  sendMediaKey?: (action: 'playpause' | 'next' | 'prev') => boolean;
  checkAccessibilityPermission?: (prompt: boolean) => boolean;
}

let macAddonCache: MacMediaAddon | null | undefined; // undefined = not tried yet

function loadMacAddon(): MacMediaAddon | null {
  if (macAddonCache !== undefined) return macAddonCache;

  const candidates = [
    // Development (dist/mediaController.js → backend/build/Release)
    path.resolve(__dirname, '../build/Release/addon.node'),
    path.resolve(process.cwd(), 'build/Release/addon.node'),
    path.resolve(process.cwd(), 'addon.node'),
    // Packaged executable (addon.node ships next to the binary)
    path.resolve(path.dirname(process.execPath), 'addon.node'),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        macAddonCache = require(candidate) as MacMediaAddon;
        return macAddonCache;
      }
    } catch (error) {
      console.error(`[media] Failed to load addon from ${candidate}:`, error);
    }
  }

  macAddonCache = null;
  return macAddonCache;
}

export class MediaController extends EventEmitter {
  private ps: ChildProcess | null = null;
  private ready: boolean = false;
  private queue: string[] = [];
  private restartAttempts = 0;
  private destroyed = false;
  private inFlight: string | null = null;
  private ackTimer: NodeJS.Timeout | null = null;
  private stdoutBuffer = '';

  /**
   * Media keys are supported on Windows (PowerShell key simulation) and on
   * macOS (NX aux key events via the native addon, if it exposes them).
   */
  public static isSupported(): boolean {
    if (process.platform === 'win32') return true;
    if (process.platform === 'darwin') {
      return typeof loadMacAddon()?.sendMediaKey === 'function';
    }
    return false;
  }

  /**
   * Media-key permission state.
   * - Windows needs no permission → 'granted'.
   * - macOS requires Accessibility permission. With prompt=true, macOS shows
   *   the official system dialog (deep-links to System Settings → Privacy &
   *   Security → Accessibility) if permission is missing.
   * - 'unknown' if the addon is missing/stale or the platform is unsupported.
   */
  public static getPermissionState(
    prompt = false
  ): 'granted' | 'denied' | 'unknown' {
    if (process.platform === 'win32') return 'granted';
    if (process.platform === 'darwin') {
      const check = loadMacAddon()?.checkAccessibilityPermission;
      if (typeof check !== 'function') return 'unknown';
      try {
        return check(prompt) ? 'granted' : 'denied';
      } catch (error) {
        console.error('[media] Accessibility permission check failed:', error);
        return 'unknown';
      }
    }
    return 'unknown';
  }

  constructor() {
    super();
    this.init();
  }

  private init() {
    // macOS sends media keys synchronously through the native addon —
    // no persistent helper process needed.
    if (process.platform === 'darwin') return;

    // The PowerShell/user32.dll key simulation is Windows-only. On other
    // platforms, degrade gracefully instead of crashing: spawning a missing
    // 'powershell' binary emits an unhandled 'error' event that would
    // otherwise take down the whole server at startup.
    if (process.platform !== 'win32') {
      console.warn(
        '[media] Media key controls are not supported on ' +
          `${process.platform}; media buttons will be no-ops.`
      );
      return;
    }

    this.stdoutBuffer = '';
    this.ps = spawn('powershell', ['-NoProfile', '-Command', '-'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.ps.on('error', (err) => {
      console.error('[media] Failed to start PowerShell:', err.message);
      this.ready = false;
      this.ps = null;
    });

    if (!this.ps.stdin || !this.ps.stdout || !this.ps.stderr) {
      console.error('Failed to spawn PowerShell process');
      return;
    }

    const psCode = `
$ErrorActionPreference = 'Continue'
$code = @'
using System;
using System.Runtime.InteropServices;
public class KeySender {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, uint dwExtraInfo);
    [DllImport("user32.dll")]
    public static extern uint MapVirtualKey(uint uCode, uint uMapType);

    public const byte VK_MEDIA_NEXT_TRACK = 0xB0;
    public const byte VK_MEDIA_PREV_TRACK = 0xB1;
    public const byte VK_MEDIA_PLAY_PAUSE = 0xB3;
    public const uint KEYEVENTF_EXTENDEDKEY = 0x0001;
    public const uint KEYEVENTF_KEYUP = 0x0002;
    public const uint MAPVK_VK_TO_VSC = 0x00;

    // Media keys live on the extended (E0-prefixed) key set. Sending them
    // without KEYEVENTF_EXTENDEDKEY and a real scan code makes them look
    // malformed to the Windows media-session router, which re-registers its
    // listeners on every track change - that is why playback would work
    // right after startup and then silently stop once a track switched.
    private static void Tap(byte vk) {
        byte scan = (byte)MapVirtualKey(vk, MAPVK_VK_TO_VSC);
        keybd_event(vk, scan, KEYEVENTF_EXTENDEDKEY, 0);
        keybd_event(vk, scan, KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP, 0);
    }

    public static void PlayPause() { Tap(VK_MEDIA_PLAY_PAUSE); }
    public static void Next()      { Tap(VK_MEDIA_NEXT_TRACK); }
    public static void Prev()      { Tap(VK_MEDIA_PREV_TRACK); }
}
'@
Add-Type -TypeDefinition $code -Language CSharp
Write-Output "READY"
`;

    this.ps.stdout.on('data', (data) => {
      this.stdoutBuffer += data.toString();
      const lines = this.stdoutBuffer.split(/\r?\n/);
      this.stdoutBuffer = lines.pop() ?? '';

      for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;

        if (line.includes('READY')) {
          this.ready = true;
          this.restartAttempts = 0; // healthy again — reset backoff
          this.processQueue();
        } else if (line.includes('ACK')) {
          this.clearAck();
          this.inFlight = null;
          this.processQueue();
        }
      }
    });

    // A dead pipe emits 'error' on stdin; without a listener Node treats it as
    // an unhandled error event and takes the whole server down.
    this.ps.stdin.on('error', (err) => {
      console.error('[media] PowerShell stdin error:', err.message);
      this.recycle();
    });

    this.ps.stderr.on('data', (data) => {
      console.error('PowerShell Error:', data.toString());
    });

    this.ps.on('close', (code) => {
      console.log(`PowerShell process exited with code ${code}`);
      this.ready = false;
      this.ps = null;
      this.clearAck();
      // Put the un-acked command back at the front so it isn't lost.
      if (this.inFlight) {
        this.queue.unshift(this.inFlight);
        this.inFlight = null;
      }

      // Don't restart on intentional shutdown
      if (this.destroyed) return;

      // Restart with exponential backoff, capped attempts
      this.restartAttempts++;
      if (this.restartAttempts > MAX_RESTART_ATTEMPTS) {
        console.error(
          `[media] PowerShell keeps exiting; giving up after ${MAX_RESTART_ATTEMPTS} restart attempts. ` +
            'Media controls are disabled for this session.'
        );
        return;
      }
      const delay = Math.min(
        1000 * 2 ** (this.restartAttempts - 1),
        MAX_RESTART_DELAY_MS
      );
      console.warn(`[media] Restarting PowerShell in ${delay}ms (attempt ${this.restartAttempts}/${MAX_RESTART_ATTEMPTS})`);
      setTimeout(() => this.init(), delay);
    });

    // Send the initialization code
    this.ps.stdin.write(psCode + '\n');
  }

  private clearAck() {
    if (this.ackTimer) {
      clearTimeout(this.ackTimer);
      this.ackTimer = null;
    }
  }

  /** Tear the helper down so the 'close' handler restarts it and replays work. */
  private recycle() {
    this.clearAck();
    this.ready = false;
    if (this.ps) {
      const ps = this.ps;
      this.ps = null;
      ps.kill();
    }
  }

  private processQueue() {
    if (!this.ready || !this.ps || !this.ps.stdin) return;
    // One command at a time so an ACK unambiguously belongs to it.
    if (this.inFlight) return;

    const command = this.queue.shift();
    if (!command) return;

    this.inFlight = command;
    try {
      this.ps.stdin.write(`[KeySender]::${command}(); Write-Output "ACK"\n`);
    } catch (error) {
      console.error('[media] Failed to write to PowerShell:', error);
      this.recycle();
      return;
    }

    this.ackTimer = setTimeout(() => {
      console.warn(
        `[media] No ACK for '${this.inFlight}' after ${ACK_TIMEOUT_MS}ms — recycling PowerShell helper.`
      );
      this.recycle();
    }, ACK_TIMEOUT_MS);
  }

  public sendCommand(command: 'PlayPause' | 'Next' | 'Prev') {
    if (!MediaController.isSupported()) {
      console.warn(`[media] Ignoring media command '${command}' (unsupported on ${process.platform})`);
      return;
    }

    // macOS: post the aux key event directly via the native addon
    if (process.platform === 'darwin') {
      const actionMap = {
        PlayPause: 'playpause',
        Next: 'next',
        Prev: 'prev',
      } as const;
      try {
        loadMacAddon()?.sendMediaKey?.(actionMap[command]);
      } catch (error) {
        console.error(`[media] Failed to send media key '${command}':`, error);
      }
      return;
    }

    // Windows: queue for the PowerShell helper. Bound the queue so a wedged
    // helper can't accumulate a burst that all fires at once on recovery.
    this.queue.push(command);
    if (this.queue.length > 10) this.queue.splice(0, this.queue.length - 10);
    this.processQueue();
  }

  public destroy() {
    this.destroyed = true;
    this.clearAck();
    this.queue = [];
    this.inFlight = null;
    if (this.ps) {
      this.ps.kill();
      this.ps = null;
    }
  }

  /** Destroy the singleton if it was ever created (avoids spawning one just to kill it). */
  public static destroyInstance() {
    if (MediaController.instance) {
      MediaController.instance.destroy();
    }
  }

  public static getInstance(): MediaController {
    if (!MediaController.instance) {
      MediaController.instance = new MediaController();
    }
    return MediaController.instance;
  }

  private static instance: MediaController;
}

// Note: intentionally no eager singleton export here. Instantiation is lazy
// (MediaController.getInstance() in route handlers) so importing this module
// has no side effects at server startup.
