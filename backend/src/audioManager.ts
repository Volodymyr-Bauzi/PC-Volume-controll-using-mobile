import { AudioApplication } from './types';
import { AudioControlFactory } from './platforms/audio-control-factory';
import { IAudioControl } from './platforms/audio-control.interface';
import { WindowsAudioControl } from './platforms/windows-audio-control';

const audioControl = AudioControlFactory.createAudioControl();

export class AudioManager {
  private static instance: AudioManager;
  private audioControl: IAudioControl;

  private constructor() {
    this.audioControl = new WindowsAudioControl();
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  static getMasterVolume(): number {
    return this.getInstance().audioControl.getMasterVolume();
  }

  static setMasterVolume(volume: number): void {
    this.getInstance().audioControl.setMasterVolume(volume);
  }

  static toggleMute(): boolean {
    return this.getInstance().audioControl.toggleMasterMute();
  }

  /**
   * Get the current mute status of the master volume
   * @returns True if muted, false otherwise
   */
  static isMuted(): boolean {
    return this.getInstance().audioControl.toggleMasterMute();
  }

  /**
   * List all applications that have an audio session.
   * @returns Array of audio applications with their current volume state
   */
  static getApplications(): AudioApplication[] {
    return audioControl.getApplications();
  }

  /**
   * Get the current volume of an application by its name or PID
   * @param identifier Application name (case-insensitive, .exe is optional) or PID
   * @returns Current volume (0-100) or null if not found
   */
  static getVolume(identifier: string | number): number | null {
    return audioControl.getVolume(identifier);
  }

  /**
   * Set the volume of an application by its name or PID
   * @param identifier Application name (case-insensitive, .exe is optional) or PID
   * @param volume Volume level (0-100)
   * @returns True if volume was set successfully, false otherwise
   */
  static setVolume(identifier: string | number, volume: number): boolean {
    return audioControl.setVolume(identifier, volume);
  }

  /**
   * Mute or unmute an application by its name or PID
   * @param identifier Application name (case-insensitive, .exe is optional) or PID
   * @param mute Whether to mute (true) or unmute (false) the application
   * @returns True if mute state was set successfully, false otherwise
   */
  static muteApplication(identifier: string | number, mute: boolean): boolean {
    return audioControl.muteApplication(identifier, mute);
  }
}
