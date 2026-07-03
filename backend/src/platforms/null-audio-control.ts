import { AudioApplication } from '../types';
import { IAudioControl } from './audio-control.interface';

/**
 * Fallback used when the platform's native addon can't be loaded
 * (not built for this platform, missing methods, unsupported OS, ...).
 *
 * Keeps the server and web UI running instead of crashing: reports no
 * controllable applications, 100% unmuted master volume, and all
 * mutating operations are no-ops.
 */
export class NullAudioControl implements IAudioControl {
  constructor(private readonly reason: string) {
    console.warn(
      `[audio] Falling back to no-op audio control: ${reason}. ` +
        'The UI will load, but volume control is unavailable on this system.'
    );
  }

  getApplications(): AudioApplication[] {
    return [];
  }

  getVolume(): number | null {
    return null;
  }

  setVolume(): boolean {
    return false;
  }

  muteApplication(): boolean {
    return false;
  }

  getMasterVolume(): number {
    return 100;
  }

  setMasterVolume(): void {
    // no-op
  }

  isMasterMuted(): boolean {
    return false;
  }

  toggleMasterMute(): boolean {
    return false;
  }
}
