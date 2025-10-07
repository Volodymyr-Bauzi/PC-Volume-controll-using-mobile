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

  getAudioApplications: () => Array<{ pid: number; name: string; volume: number; muted: boolean }>;
  setApplicationVolume: (pid: number, volume: number) => void;
  setApplicationMute: (pid: number, mute: boolean) => void;
}

export class MacOSAudioControl implements IAudioControl {
  private addon: NativeAddon;

  constructor() {
    this.addon = this.loadAddon();
  }

  private loadAddon(): NativeAddon {
    const possiblePaths = [
      // Development path
      path.resolve(__dirname, '../../../build/Release/macos-addon.node'),
      // Production path
      path.resolve(process.cwd(), 'build/Release/macos-addon.node'),
      // Fallback path
      path.resolve(process.cwd(), 'macos-addon.node')
    ];

    let lastError: Error | null = null;

    for (const addonPath of possiblePaths) {
      try {
        if (fs.existsSync(addonPath)) {
          console.log('Loading macOS addon from:', addonPath);
          const addon: unknown = require(addonPath);
          
          if (!addon || typeof addon !== 'object') {
            throw new Error('Addon is not an object');
          }

          // Type guard to ensure the addon has the required methods
          const hasRequiredMethods = [
            'getAudioApplications',
            'setApplicationVolume',
            'setApplicationMute',
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
        console.error(`Failed to load macOS addon from ${addonPath}:`, error);
      }
    }

    throw lastError || new Error('Could not load macOS native addon from any location');
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
      console.error('Error reading macOS master mute state:', error);
      return false;
    }
  }

  private findPidByName(name: string): number | null {
    const normalizedName = name.toLowerCase().replace(/\.app$/, '');
    const apps = this.getApplications();
    const app = apps.find(app => app.name.toLowerCase().replace(/\.app$/, '') === normalizedName);
    return app?.pid ?? null;
  }

  public getApplications(): AudioApplication[] {
    try {
      const apps = this.addon.getAudioApplications();
      return apps.map(app => ({
        name: app.name,
        pid: app.pid,
        volume: app.volume,
        isMuted: app.muted
      }));
    } catch (error) {
      console.error('Error getting macOS applications:', error);
      return [];
    }
  }

  public getVolume(identifier: string | number): number | null {
    try {
      const pid = typeof identifier === 'string'
        ? this.findPidByName(identifier)
        : identifier;

      if (!pid) return null;

      const app = this.getApplications().find(app => app.pid === pid);
      return app?.volume ?? null;
    } catch (error) {
      console.error('Error getting macOS volume:', error);
      return null;
    }
  }

  public setVolume(identifier: string | number, volume: number): boolean {
    try {
      const pid = typeof identifier === 'string'
        ? this.findPidByName(identifier)
        : identifier;

      if (!pid) return false;

      // Clamp volume between 0 and 100
      const clampedVolume = Math.max(0, Math.min(100, volume));
      this.addon.setApplicationVolume(pid, clampedVolume);
      return true;
    } catch (error) {
      console.error('Error setting macOS volume:', error);
      return false;
    }
  }

  public muteApplication(identifier: string | number, mute: boolean): boolean {
    try {
      const pid = typeof identifier === 'string'
        ? this.findPidByName(identifier)
        : identifier;

      if (!pid) return false;

      this.addon.setApplicationMute(pid, mute);
      return true;
    } catch (error) {
      console.error('Error setting macOS mute state:', error);
      return false;
    }
  }
}
