import { AudioApplication } from '../types';
import { IAudioControl } from './audio-control.interface';
import * as path from 'path';
import * as fs from 'fs';

// Type definitions for the native addon
interface NativeAddon {
  getMasterVolumeLevelScalar: () => number;
  setMasterVolumeLevelScalar: (volume: number) => void;
  isMasterMuted: () => boolean;
  muteMaster: (mute: boolean) => void;

  getAudioSinks: () => Array<{ pid: number; name: string; volume: number; muted: boolean }>;
  setVolume: (pid: number, volume: number) => void;
  setMute: (pid: number, mute: boolean) => void;
}

export class LinuxAudioControl implements IAudioControl {
  private addon: NativeAddon;

  constructor() {
    this.addon = this.loadAddon();
  }

  private loadAddon(): NativeAddon {
    const possiblePaths = [
      // Development path
      path.resolve(__dirname, '../../../build/Release/linux-addon.node'),
      // Production path
      path.resolve(process.cwd(), 'build/Release/linux-addon.node'),
      // Fallback path
      path.resolve(process.cwd(), 'linux-addon.node')
    ];

    let lastError: Error | null = null;

    for (const addonPath of possiblePaths) {
      try {
        if (fs.existsSync(addonPath)) {
          console.log('Loading Linux addon from:', addonPath);
          const addon: unknown = require(addonPath);
          
          if (!addon || typeof addon !== 'object') {
            throw new Error('Addon is not an object');
          }

          // Type guard to ensure the addon has the required methods
          const hasRequiredMethods = [
            'getAudioSinks',
            'setVolume',
            'setMute',
            'getMasterVolumeLevelScalar',
            'setMasterVolumeLevelScalar',
            'isMasterMuted',
            'muteMaster'
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
        console.error(`Failed to load Linux addon from ${addonPath}:`, error);
      }
    }

    throw lastError || new Error('Could not load Linux native addon from any location');
  }

  public getMasterVolume(): number {
    try {
      const volume = this.addon.getMasterVolumeLevelScalar();
      return Math.round(volume * 100); // Convert from 0-1 to 0-100
    } catch (error) {
      console.error('Error getting master volume:', error);
      return 100; // Default to 100% on error
    }
  }

  public setMasterVolume(volume: number): void {
    try {
      const volumeScalar = Math.max(0, Math.min(100, volume)) / 100; // Convert to 0-1
      this.addon.setMasterVolumeLevelScalar(volumeScalar);
    } catch (error) {
      console.error('Error setting master volume:', error);
    }
  }

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
      console.error('Error reading Linux master mute state:', error);
      return false;
    }
  }

  public getApplications(): AudioApplication[] {
    try {
      const sinks = this.addon.getAudioSinks();
      return sinks.map(sink => ({
        name: sink.name,
        pid: sink.pid,
        volume: sink.volume,
        isMuted: sink.muted
      }));
    } catch (error) {
      console.error('Error getting Linux audio sinks:', error);
      return [];
    }
  }

  public getVolume(identifier: string | number): number | null {
    try {
      const pid = typeof identifier === 'string'
        ? this.findPidByName(identifier)
        : identifier;

      if (!pid) return null;

      const sink = this.findSinkByPid(pid);
      return sink?.volume ?? null;
    } catch (error) {
      console.error('Error getting Linux volume:', error);
      return null;
    }
  }

  public setVolume(identifier: string | number, volume: number): boolean {
    try {
      const pid = typeof identifier === 'string'
        ? this.findPidByName(identifier)
        : identifier;

      if (!pid) return false;

      const clamped = Math.max(0, Math.min(100, volume));
      this.addon.setVolume(pid, clamped);
      return true;
    } catch (error) {
      console.error('Error setting Linux volume:', error);
      return false;
    }
  }

  public muteApplication(identifier: string | number, mute: boolean): boolean {
    try {
      const pid = typeof identifier === 'string'
        ? this.findPidByName(identifier)
        : identifier;

      if (!pid) return false;

      this.addon.setMute(pid, mute);
      return true;
    } catch (error) {
      console.error('Error setting Linux mute state:', error);
      return false;
    }
  }

  private findPidByName(name: string): number | null {
    const normalizedName = name.toLowerCase();
    const sinks = this.addon.getAudioSinks();
    const sink = sinks.find(s => s.name.toLowerCase() === normalizedName);
    return sink?.pid ?? null;
  }

  private findSinkByPid(pid: number) {
    const sinks = this.addon.getAudioSinks();
    return sinks.find(s => s.pid === pid);
  }
}
