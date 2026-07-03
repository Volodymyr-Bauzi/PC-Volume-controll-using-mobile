import { IAudioControl } from './audio-control.interface';
import { WindowsAudioControl } from './windows-audio-control';
import { LinuxAudioControl } from './linux-audio-control';
import { MacOSAudioControl } from './macos-audio-control';
import { NullAudioControl } from './null-audio-control';

export class AudioControlFactory {
  static createAudioControl(): IAudioControl {
    try {
      switch (process.platform) {
        case 'win32':
          return new WindowsAudioControl();
        case 'linux':
          return new LinuxAudioControl();
        case 'darwin':
          return new MacOSAudioControl();
        default:
          return new NullAudioControl(
            `platform ${process.platform} is not supported`
          );
      }
    } catch (error) {
      // Don't crash the server if the native addon is missing/broken —
      // degrade to a no-op control so the web UI still loads.
      const message = error instanceof Error ? error.message : String(error);
      return new NullAudioControl(message);
    }
  }
}
