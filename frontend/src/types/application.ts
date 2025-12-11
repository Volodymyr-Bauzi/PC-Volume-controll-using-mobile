export interface Application {
  name: string;
  pid: number;
  volume: number;
  isMuted: boolean;
}

export interface SystemVolume {
  volume: number;
  isMuted: boolean;
}

export interface VolumeChangeEvent {
  appName: string;
  volume: number;
}
