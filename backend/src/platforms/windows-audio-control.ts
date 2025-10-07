import * as path from 'path';
import * as fs from 'fs';
import { AudioApplication } from '../types';
import { IAudioControl } from './audio-control.interface';

// Type definitions for the native addon
interface NativeAddon {
  getMasterVolumeLevelScalar: () => number;
  setMasterVolumeLevelScalar: (volume: number) => void;
  isMasterMuted: () => boolean;
  muteMaster: (mute: boolean) => void;
  getAudioSessionProcesses: () => Array<{ pid: number; name: string }>;
  getAudioSessionVolumeLevelScalar: (pid: number) => number | null;
  setAudioSessionVolumeLevelScalar: (pid: number, volume: number) => void;
  isAudioSessionMuted: (pid: number) => boolean;
  setAudioSessionMute: (pid: number, mute: boolean) => void;
}

export class WindowsAudioControl implements IAudioControl {
  private addon: NativeAddon;

  constructor() {
    this.addon = this.loadAddon();
  }

  private loadAddon(): NativeAddon {
    const possiblePaths = [
      // When running from packaged executable
      path.resolve(process.execPath, '../addon.node'),
      // Development path (when running from dist/audioManager.js)
      path.resolve(__dirname, '../../../build/Release/addon.node'),
      // Production path (when installed as a package)
      path.resolve(process.cwd(), 'build/Release/addon.node'),
      // Current directory
      path.resolve(process.cwd(), 'addon.node'),
      // Executable directory
      path.resolve(path.dirname(process.execPath), 'addon.node')
    ];

    let lastError: Error | null = null;

    for (const addonPath of possiblePaths) {
      try {
        if (fs.existsSync(addonPath)) {
          console.log('Loading addon from:', addonPath);
          const addon: unknown = require(addonPath);
          
          if (!addon || typeof addon !== 'object') {
            throw new Error('Addon is not an object');
          }

          // Type guard to ensure the addon has the required methods
          const hasRequiredMethods = [
            'getAudioSessionProcesses',
            'getAudioSessionVolumeLevelScalar',
            'setAudioSessionVolumeLevelScalar',
            'isAudioSessionMuted',
            'setAudioSessionMute'
          ].every(method => 
            typeof (addon as Record<string, unknown>)[method] === 'function'
          );

          if (!hasRequiredMethods) {
            throw new Error('Addon is missing required methods');
          }

          return addon as NativeAddon;
        }
      } catch (error) {
        lastError = error as Error;
        console.error(`Failed to load addon from ${addonPath}:`, error);
      }
    }

    throw lastError || new Error('Could not load native addon from any location');
  }

  public getApplications(): AudioApplication[] {
    try {
      const processes = this.addon.getAudioSessionProcesses();
      return processes
        .map(proc => {
          // Skip system processes (PID 0) and processes with empty names
          if (proc.pid === 0 || !proc.name || proc.name.trim() === '') {
            return null;
          }
          
          const volume = this.addon.getAudioSessionVolumeLevelScalar(proc.pid);
          // Only include applications that have valid volume control
          if (volume === null) return null;
          
          return {
            name: proc.name.replace(/\.exe$/i, ''),  // Remove .exe extension
            pid: proc.pid,
            volume: Math.round(volume * 100), // Convert from 0-1 to 0-100 scale
            isMuted: this.addon.isAudioSessionMuted(proc.pid)
          };
        })
        .filter((app): app is AudioApplication => app !== null);
    } catch (error) {
      console.error('Error getting applications:', error);
      return [];
    }
  }

  // Get system master volume (0-100)
  public getMasterVolume(): number {
    try {
      const volume = this.addon.getMasterVolumeLevelScalar();
      return Math.round(volume * 100); // Convert from 0-1 to 0-100
    } catch (error) {
      console.error('Error getting master volume:', error);
      return 100; // Default to 100% on error
    }
  }

  // Set system master volume (0-100)
  public setMasterVolume(volume: number): void {
    try {
      const volumeScalar = Math.max(0, Math.min(100, volume)) / 100; // Convert to 0-1
      this.addon.setMasterVolumeLevelScalar(volumeScalar);
    } catch (error) {
      console.error('Error setting master volume:', error);
    }
  }

  // Toggle system mute
  public toggleMasterMute(): boolean {
    try {
      const isMuted = this.addon.isMasterMuted();
      this.addon.muteMaster(!isMuted);
      return !isMuted; // Return new mute state
    } catch (error) {
      console.error('Error toggling mute:', error);
      return false;
    }
  }

  // Read system mute state
  public isMasterMuted(): boolean {
    try {
      return this.addon.isMasterMuted();
    } catch (error) {
      console.error('Error reading master mute state:', error);
      return false;
    }
  }

  public getVolume(identifier: string | number): number | null {
    try {
      const pid = typeof identifier === 'string' 
        ? this.findPidByName(identifier)
        : identifier;
      
      const volume = pid ? this.addon.getAudioSessionVolumeLevelScalar(pid) : null;
      return volume !== null ? Math.round(volume * 100) : null; // Convert from 0-1 to 0-100 scale
    } catch (error) {
      console.error('Error getting volume:', error);
      return null;
    }
  }

  public setVolume(identifier: string | number, volume: number): boolean {
    try {
      const pid = typeof identifier === 'string'
        ? this.findPidByName(identifier)
        : identifier;

      if (!pid) return false;

      // Convert from 0-100 to 0-1 scale
      const clamped = Math.max(0, Math.min(100, volume));
      const normalizedVolume = clamped / 100;
      this.addon.setAudioSessionVolumeLevelScalar(pid, normalizedVolume);
      return true;
    } catch (error) {
      console.error('Error setting volume:', error);
      return false;
    }
  }

  public muteApplication(identifier: string | number, mute: boolean): boolean {
    try {
      const pid = typeof identifier === 'string'
        ? this.findPidByName(identifier)
        : identifier;

      if (!pid) return false;

      this.addon.setAudioSessionMute(pid, mute);
      return true;
    } catch (error) {
      console.error('Error setting mute state:', error);
      return false;
    }
  }

  private findPidByName(name: string): number | null {
    const normalizedName = name.toLowerCase().replace(/\.exe$/, '');
    const processes = this.addon.getAudioSessionProcesses();
    const process = processes.find(p => 
      p.name.toLowerCase().replace(/\.exe$/, '') === normalizedName
    );
    return process?.pid ?? null;
  }
}
