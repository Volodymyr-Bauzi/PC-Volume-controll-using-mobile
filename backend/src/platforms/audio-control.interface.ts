import { AudioApplication } from '../types';

export interface IAudioControl {
  getApplications(): AudioApplication[];
  getVolume(identifier: string | number): number | null;
  setVolume(identifier: string | number, volume: number): boolean;
  muteApplication(identifier: string | number, mute: boolean): boolean;

  getMasterVolume(): number;
  setMasterVolume(volume: number): void;
  isMasterMuted(): boolean;
  toggleMasterMute(): boolean;
}
