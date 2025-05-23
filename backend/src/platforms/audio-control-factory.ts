import { IAudioControl } from './audio-control.interface';
import { WindowsAudioControl } from './windows-audio-control';
import { LinuxAudioControl } from './linux-audio-control';
import { MacOSAudioControl } from './macos-audio-control';

export class AudioControlFactory {
  static createAudioControl(): IAudioControl {
    switch (process.platform) {
      case 'win32':
        return new WindowsAudioControl();
      case 'linux':
        return new LinuxAudioControl();
      case 'darwin':
        return new MacOSAudioControl();
      default:
        throw new Error(`Platform ${process.platform} is not supported`);
    }
  }
}
