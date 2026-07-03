import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export class MediaController extends EventEmitter {
  private ps: ChildProcess | null = null;
  private ready: boolean = false;
  private queue: string[] = [];

  constructor() {
    super();
    this.init();
  }

  private init() {
    // Media key simulation is implemented via PowerShell/user32.dll and is
    // Windows-only. On Linux/macOS, degrade gracefully instead of crashing:
    // spawning a missing 'powershell' binary emits an unhandled 'error'
    // event that would otherwise take down the whole server at startup.
    if (process.platform !== 'win32') {
      console.warn(
        '[media] Media key controls are only supported on Windows; ' +
          `media buttons will be no-ops on ${process.platform}.`
      );
      return;
    }

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
$code = @'
using System;
using System.Runtime.InteropServices;
public class KeySender {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, uint dwExtraInfo);
    public const int VK_MEDIA_NEXT_TRACK = 0xB0;
    public const int VK_MEDIA_PREV_TRACK = 0xB1;
    public const int VK_MEDIA_STOP = 0xB2;
    public const int VK_MEDIA_PLAY_PAUSE = 0xB3;
    public const int KEYEVENTF_KEYUP = 0x0002;

    public static void PlayPause() {
        keybd_event((byte)VK_MEDIA_PLAY_PAUSE, 0, 0, 0);
        keybd_event((byte)VK_MEDIA_PLAY_PAUSE, 0, KEYEVENTF_KEYUP, 0);
    }
    public static void Next() {
        keybd_event((byte)VK_MEDIA_NEXT_TRACK, 0, 0, 0);
        keybd_event((byte)VK_MEDIA_NEXT_TRACK, 0, KEYEVENTF_KEYUP, 0);
    }
    public static void Prev() {
        keybd_event((byte)VK_MEDIA_PREV_TRACK, 0, 0, 0);
        keybd_event((byte)VK_MEDIA_PREV_TRACK, 0, KEYEVENTF_KEYUP, 0);
    }
    public static void Stop() {
        keybd_event((byte)VK_MEDIA_STOP, 0, 0, 0);
        keybd_event((byte)VK_MEDIA_STOP, 0, KEYEVENTF_KEYUP, 0);
    }
}
'@
Add-Type -TypeDefinition $code -Language CSharp
Write-Output "READY"
`;

    this.ps.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output.includes('READY')) {
        this.ready = true;
        this.processQueue();
      }
    });

    this.ps.stderr.on('data', (data) => {
      console.error('PowerShell Error:', data.toString());
    });

    this.ps.on('close', (code) => {
      console.log(`PowerShell process exited with code ${code}`);
      this.ready = false;
      this.ps = null;
      // Restart after a delay if it crashed
      setTimeout(() => this.init(), 1000);
    });

    // Send the initialization code
    this.ps.stdin.write(psCode + '\n');
  }

  private processQueue() {
    if (!this.ready || !this.ps || !this.ps.stdin) return;

    while (this.queue.length > 0) {
      const command = this.queue.shift();
      if (command) {
        this.ps.stdin.write(`[KeySender]::${command}()\n`);
      }
    }
  }

  public sendCommand(command: 'PlayPause' | 'Next' | 'Prev' | 'Stop') {
    if (process.platform !== 'win32') {
      console.warn(`[media] Ignoring media command '${command}' (unsupported on ${process.platform})`);
      return;
    }
    this.queue.push(command);
    this.processQueue();
  }

  public destroy() {
    if (this.ps) {
      this.ps.kill();
      this.ps = null;
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
