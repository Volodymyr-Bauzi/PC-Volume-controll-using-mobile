// macOS audio control addon.
//
// Implements system (master) volume + mute via CoreAudio on the default
// output device. Per-application volume is NOT possible with public
// CoreAudio APIs (it requires a virtual audio driver such as those used
// by BackgroundMusic/Loopback), so the per-app functions are exported as
// graceful no-ops: getAudioApplications() returns an empty array and the
// setters return false. The TypeScript layer treats this as "no
// controllable apps" and the UI simply shows the master volume card.
//
// Exported API (must match NativeAddon in macos-audio-control.ts):
//   getMasterVolumeLevelScalar(): number        0.0 - 1.0
//   setMasterVolumeLevelScalar(v: number): void
//   isMasterMuted(): boolean
//   muteMaster(mute: boolean): void
//   getAudioApplications(): []
//   setApplicationVolume(pid, volume): false
//   setApplicationMute(pid, mute): false

#include <napi.h>

#import <CoreAudio/CoreAudio.h>
#import <Foundation/Foundation.h>

namespace {

// kAudioObjectPropertyElementMain is only defined in the macOS 12+ SDK;
// its value (0) is identical to the older ElementMaster.
const AudioObjectPropertyElement kElementMain = 0;

AudioDeviceID GetDefaultOutputDevice() {
  AudioDeviceID device = kAudioObjectUnknown;
  UInt32 size = sizeof(device);
  AudioObjectPropertyAddress addr = {
    kAudioHardwarePropertyDefaultOutputDevice,
    kAudioObjectPropertyScopeGlobal,
    kElementMain
  };
  OSStatus status = AudioObjectGetPropertyData(
      kAudioObjectSystemObject, &addr, 0, nullptr, &size, &device);
  return (status == noErr) ? device : kAudioObjectUnknown;
}

// Volume: try the main element first; some devices only expose
// per-channel volume, so fall back to averaging channels 1 and 2.
bool GetMasterVolumeScalar(Float32 &outVolume) {
  AudioDeviceID device = GetDefaultOutputDevice();
  if (device == kAudioObjectUnknown) return false;

  AudioObjectPropertyAddress addr = {
    kAudioDevicePropertyVolumeScalar,
    kAudioDevicePropertyScopeOutput,
    kElementMain
  };

  Float32 volume = 0.0f;
  UInt32 size = sizeof(volume);
  if (AudioObjectHasProperty(device, &addr) &&
      AudioObjectGetPropertyData(device, &addr, 0, nullptr, &size, &volume) == noErr) {
    outVolume = volume;
    return true;
  }

  // Per-channel fallback
  Float32 sum = 0.0f;
  int count = 0;
  for (AudioObjectPropertyElement channel = 1; channel <= 2; channel++) {
    addr.mElement = channel;
    size = sizeof(volume);
    if (AudioObjectHasProperty(device, &addr) &&
        AudioObjectGetPropertyData(device, &addr, 0, nullptr, &size, &volume) == noErr) {
      sum += volume;
      count++;
    }
  }
  if (count > 0) {
    outVolume = sum / count;
    return true;
  }
  return false;
}

bool SetMasterVolumeScalar(Float32 volume) {
  AudioDeviceID device = GetDefaultOutputDevice();
  if (device == kAudioObjectUnknown) return false;

  if (volume < 0.0f) volume = 0.0f;
  if (volume > 1.0f) volume = 1.0f;

  AudioObjectPropertyAddress addr = {
    kAudioDevicePropertyVolumeScalar,
    kAudioDevicePropertyScopeOutput,
    kElementMain
  };

  Boolean settable = false;
  if (AudioObjectHasProperty(device, &addr) &&
      AudioObjectIsPropertySettable(device, &addr, &settable) == noErr && settable) {
    return AudioObjectSetPropertyData(
        device, &addr, 0, nullptr, sizeof(volume), &volume) == noErr;
  }

  // Per-channel fallback
  bool anySet = false;
  for (AudioObjectPropertyElement channel = 1; channel <= 2; channel++) {
    addr.mElement = channel;
    if (AudioObjectHasProperty(device, &addr) &&
        AudioObjectIsPropertySettable(device, &addr, &settable) == noErr && settable &&
        AudioObjectSetPropertyData(device, &addr, 0, nullptr, sizeof(volume), &volume) == noErr) {
      anySet = true;
    }
  }
  return anySet;
}

bool GetMasterMuted(bool &outMuted) {
  AudioDeviceID device = GetDefaultOutputDevice();
  if (device == kAudioObjectUnknown) return false;

  AudioObjectPropertyAddress addr = {
    kAudioDevicePropertyMute,
    kAudioDevicePropertyScopeOutput,
    kElementMain
  };

  UInt32 muted = 0;
  UInt32 size = sizeof(muted);
  if (AudioObjectHasProperty(device, &addr) &&
      AudioObjectGetPropertyData(device, &addr, 0, nullptr, &size, &muted) == noErr) {
    outMuted = (muted != 0);
    return true;
  }
  return false;
}

bool SetMasterMuted(bool mute) {
  AudioDeviceID device = GetDefaultOutputDevice();
  if (device == kAudioObjectUnknown) return false;

  AudioObjectPropertyAddress addr = {
    kAudioDevicePropertyMute,
    kAudioDevicePropertyScopeOutput,
    kElementMain
  };

  UInt32 value = mute ? 1 : 0;
  Boolean settable = false;
  if (AudioObjectHasProperty(device, &addr) &&
      AudioObjectIsPropertySettable(device, &addr, &settable) == noErr && settable) {
    return AudioObjectSetPropertyData(
        device, &addr, 0, nullptr, sizeof(value), &value) == noErr;
  }
  return false;
}

// ---------- N-API bindings ----------

Napi::Value GetMasterVolumeLevelScalar(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  Float32 volume = 1.0f;
  if (!GetMasterVolumeScalar(volume)) {
    // No controllable volume (e.g. HDMI/DisplayPort output) — report 100%.
    volume = 1.0f;
  }
  return Napi::Number::New(env, volume);
}

Napi::Value SetMasterVolumeLevelScalar(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected volume as number (0.0-1.0)")
        .ThrowAsJavaScriptException();
    return env.Null();
  }
  SetMasterVolumeScalar(info[0].As<Napi::Number>().FloatValue());
  return env.Null();
}

Napi::Value IsMasterMuted(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  bool muted = false;
  GetMasterMuted(muted);
  return Napi::Boolean::New(env, muted);
}

Napi::Value MuteMaster(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsBoolean()) {
    Napi::TypeError::New(env, "Expected mute as boolean")
        .ThrowAsJavaScriptException();
    return env.Null();
  }
  SetMasterMuted(info[0].As<Napi::Boolean>().Value());
  return env.Null();
}

// Per-application control is not supported by public CoreAudio APIs.
Napi::Value GetAudioApplications(const Napi::CallbackInfo &info) {
  return Napi::Array::New(info.Env(), 0);
}

Napi::Value SetApplicationVolume(const Napi::CallbackInfo &info) {
  return Napi::Boolean::New(info.Env(), false);
}

Napi::Value SetApplicationMute(const Napi::CallbackInfo &info) {
  return Napi::Boolean::New(info.Env(), false);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("getMasterVolumeLevelScalar",
              Napi::Function::New(env, GetMasterVolumeLevelScalar));
  exports.Set("setMasterVolumeLevelScalar",
              Napi::Function::New(env, SetMasterVolumeLevelScalar));
  exports.Set("isMasterMuted", Napi::Function::New(env, IsMasterMuted));
  exports.Set("muteMaster", Napi::Function::New(env, MuteMaster));

  exports.Set("getAudioApplications",
              Napi::Function::New(env, GetAudioApplications));
  exports.Set("setApplicationVolume",
              Napi::Function::New(env, SetApplicationVolume));
  exports.Set("setApplicationMute",
              Napi::Function::New(env, SetApplicationMute));
  return exports;
}

}  // namespace

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)
