#import <Foundation/Foundation.h>
#import <CoreAudio/CoreAudio.h>
#import <node_api.h>
#import <vector>
#import <string>

// Structure to hold audio application information
struct AudioAppInfo {
    pid_t pid;
    std::string name;
    float volume;
    bool muted;
};

// Get list of applications with audio sessions
static std::vector<AudioAppInfo> GetAudioApplications() {
    std::vector<AudioAppInfo> apps;
    
    // Get audio system object
    AudioObjectID systemObj = kAudioObjectSystemObject;
    
    // Get output devices
    AudioObjectPropertyAddress propertyAddress = {
        kAudioHardwarePropertyDevices,
        kAudioObjectPropertyScopeGlobal,
        kAudioObjectPropertyElementMain
    };
    
    UInt32 dataSize = 0;
    OSStatus status = AudioObjectGetPropertyDataSize(systemObj, &propertyAddress, 0, NULL, &dataSize);
    if (status != noErr) return apps;
    
    int deviceCount = dataSize / sizeof(AudioDeviceID);
    std::vector<AudioDeviceID> devices(deviceCount);
    
    status = AudioObjectGetPropertyData(systemObj, &propertyAddress, 0, NULL, &dataSize, devices.data());
    if (status != noErr) return apps;
    
    // For each device, get its audio streams
    for (const auto& device : devices) {
        propertyAddress.mSelector = kAudioDevicePropertyStreams;
        propertyAddress.mScope = kAudioDevicePropertyScopeOutput;
        
        status = AudioObjectGetPropertyDataSize(device, &propertyAddress, 0, NULL, &dataSize);
        if (status != noErr) continue;
        
        int streamCount = dataSize / sizeof(AudioStreamID);
        std::vector<AudioStreamID> streams(streamCount);
        
        status = AudioObjectGetPropertyData(device, &propertyAddress, 0, NULL, &dataSize, streams.data());
        if (status != noErr) continue;
        
        // For each stream, get its volume and other properties
        for (const auto& stream : streams) {
            AudioObjectPropertyAddress volumeAddress = {
                kAudioStreamPropertyVolume,
                kAudioObjectPropertyScopeGlobal,
                kAudioObjectPropertyElementMain
            };
            
            Float32 volume;
            dataSize = sizeof(Float32);
            status = AudioObjectGetPropertyData(stream, &volumeAddress, 0, NULL, &dataSize, &volume);
            
            if (status == noErr) {
                // Get process info
                pid_t pid;
                dataSize = sizeof(pid_t);
                AudioObjectPropertyAddress processAddress = {
                    kAudioStreamPropertyOwningProcess,
                    kAudioObjectPropertyScopeGlobal,
                    kAudioObjectPropertyElementMain
                };
                
                status = AudioObjectGetPropertyData(stream, &processAddress, 0, NULL, &dataSize, &pid);
                if (status == noErr) {
                    // Get process name
                    proc_name_t processName;
                    proc_name(pid, processName, sizeof(processName));
                    
                    // Get mute state
                    UInt32 muted;
                    dataSize = sizeof(UInt32);
                    AudioObjectPropertyAddress muteAddress = {
                        kAudioStreamPropertyMute,
                        kAudioObjectPropertyScopeGlobal,
                        kAudioObjectPropertyElementMain
                    };
                    
                    status = AudioObjectGetPropertyData(stream, &muteAddress, 0, NULL, &dataSize, &muted);
                    if (status == noErr) {
                        AudioAppInfo appInfo;
                        appInfo.pid = pid;
                        appInfo.name = processName;
                        appInfo.volume = volume * 100.0f; // Convert to percentage
                        appInfo.muted = muted != 0;
                        apps.push_back(appInfo);
                    }
                }
            }
        }
    }
    
    return apps;
}

// Set volume for a specific application
static bool SetApplicationVolume(pid_t pid, float volume) {
    // Convert percentage to CoreAudio scale (0.0 - 1.0)
    float scaledVolume = volume / 100.0f;
    
    // Find the audio stream for this process
    AudioObjectID systemObj = kAudioObjectSystemObject;
    AudioObjectPropertyAddress propertyAddress = {
        kAudioHardwarePropertyDevices,
        kAudioObjectPropertyScopeGlobal,
        kAudioObjectPropertyElementMain
    };
    
    UInt32 dataSize = 0;
    OSStatus status = AudioObjectGetPropertyDataSize(systemObj, &propertyAddress, 0, NULL, &dataSize);
    if (status != noErr) return false;
    
    int deviceCount = dataSize / sizeof(AudioDeviceID);
    std::vector<AudioDeviceID> devices(deviceCount);
    
    status = AudioObjectGetPropertyData(systemObj, &propertyAddress, 0, NULL, &dataSize, devices.data());
    if (status != noErr) return false;
    
    for (const auto& device : devices) {
        propertyAddress.mSelector = kAudioDevicePropertyStreams;
        propertyAddress.mScope = kAudioDevicePropertyScopeOutput;
        
        status = AudioObjectGetPropertyDataSize(device, &propertyAddress, 0, NULL, &dataSize);
        if (status != noErr) continue;
        
        int streamCount = dataSize / sizeof(AudioStreamID);
        std::vector<AudioStreamID> streams(streamCount);
        
        status = AudioObjectGetPropertyData(device, &propertyAddress, 0, NULL, &dataSize, streams.data());
        if (status != noErr) continue;
        
        for (const auto& stream : streams) {
            pid_t streamPid;
            dataSize = sizeof(pid_t);
            AudioObjectPropertyAddress processAddress = {
                kAudioStreamPropertyOwningProcess,
                kAudioObjectPropertyScopeGlobal,
                kAudioObjectPropertyElementMain
            };
            
            status = AudioObjectGetPropertyData(stream, &processAddress, 0, NULL, &dataSize, &streamPid);
            if (status == noErr && streamPid == pid) {
                AudioObjectPropertyAddress volumeAddress = {
                    kAudioStreamPropertyVolume,
                    kAudioObjectPropertyScopeGlobal,
                    kAudioObjectPropertyElementMain
                };
                
                status = AudioObjectSetPropertyData(stream, &volumeAddress, 0, NULL, sizeof(Float32), &scaledVolume);
                return status == noErr;
            }
        }
    }
    
    return false;
}

// Set mute state for a specific application
static bool SetApplicationMute(pid_t pid, bool mute) {
    AudioObjectID systemObj = kAudioObjectSystemObject;
    AudioObjectPropertyAddress propertyAddress = {
        kAudioHardwarePropertyDevices,
        kAudioObjectPropertyScopeGlobal,
        kAudioObjectPropertyElementMain
    };
    
    UInt32 dataSize = 0;
    OSStatus status = AudioObjectGetPropertyDataSize(systemObj, &propertyAddress, 0, NULL, &dataSize);
    if (status != noErr) return false;
    
    int deviceCount = dataSize / sizeof(AudioDeviceID);
    std::vector<AudioDeviceID> devices(deviceCount);
    
    status = AudioObjectGetPropertyData(systemObj, &propertyAddress, 0, NULL, &dataSize, devices.data());
    if (status != noErr) return false;
    
    for (const auto& device : devices) {
        propertyAddress.mSelector = kAudioDevicePropertyStreams;
        propertyAddress.mScope = kAudioDevicePropertyScopeOutput;
        
        status = AudioObjectGetPropertyDataSize(device, &propertyAddress, 0, NULL, &dataSize);
        if (status != noErr) continue;
        
        int streamCount = dataSize / sizeof(AudioStreamID);
        std::vector<AudioStreamID> streams(streamCount);
        
        status = AudioObjectGetPropertyData(device, &propertyAddress, 0, NULL, &dataSize, streams.data());
        if (status != noErr) continue;
        
        for (const auto& stream : streams) {
            pid_t streamPid;
            dataSize = sizeof(pid_t);
            AudioObjectPropertyAddress processAddress = {
                kAudioStreamPropertyOwningProcess,
                kAudioObjectPropertyScopeGlobal,
                kAudioObjectPropertyElementMain
            };
            
            status = AudioObjectGetPropertyData(stream, &processAddress, 0, NULL, &dataSize, &streamPid);
            if (status == noErr && streamPid == pid) {
                UInt32 muteValue = mute ? 1 : 0;
                AudioObjectPropertyAddress muteAddress = {
                    kAudioStreamPropertyMute,
                    kAudioObjectPropertyScopeGlobal,
                    kAudioObjectPropertyElementMain
                };
                
                status = AudioObjectSetPropertyData(stream, &muteAddress, 0, NULL, sizeof(UInt32), &muteValue);
                return status == noErr;
            }
        }
    }
    
    return false;
}

// Node.js N-API function implementations
static napi_value GetAudioApplications(napi_env env, napi_callback_info info) {
    napi_status status;
    napi_value result;
    
    auto apps = GetAudioApplications();
    
    status = napi_create_array_with_length(env, apps.size(), &result);
    if (status != napi_ok) return nullptr;
    
    for (size_t i = 0; i < apps.size(); i++) {
        napi_value app_obj;
        status = napi_create_object(env, &app_obj);
        if (status != napi_ok) continue;
        
        napi_value pid_val, name_val, volume_val, muted_val;
        
        status = napi_create_int32(env, apps[i].pid, &pid_val);
        if (status == napi_ok) {
            napi_set_named_property(env, app_obj, "pid", pid_val);
        }
        
        status = napi_create_string_utf8(env, apps[i].name.c_str(), NAPI_AUTO_LENGTH, &name_val);
        if (status == napi_ok) {
            napi_set_named_property(env, app_obj, "name", name_val);
        }
        
        status = napi_create_double(env, apps[i].volume, &volume_val);
        if (status == napi_ok) {
            napi_set_named_property(env, app_obj, "volume", volume_val);
        }
        
        status = napi_get_boolean(env, apps[i].muted, &muted_val);
        if (status == napi_ok) {
            napi_set_named_property(env, app_obj, "muted", muted_val);
        }
        
        napi_set_element(env, result, i, app_obj);
    }
    
    return result;
}

static napi_value SetApplicationVolume(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 2;
    napi_value args[2];
    
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    if (status != napi_ok || argc < 2) {
        napi_throw_error(env, nullptr, "Wrong number of arguments");
        return nullptr;
    }
    
    int32_t pid;
    status = napi_get_value_int32(env, args[0], &pid);
    if (status != napi_ok) {
        napi_throw_error(env, nullptr, "Invalid PID argument");
        return nullptr;
    }
    
    double volume;
    status = napi_get_value_double(env, args[1], &volume);
    if (status != napi_ok) {
        napi_throw_error(env, nullptr, "Invalid volume argument");
        return nullptr;
    }
    
    bool success = SetApplicationVolume(pid, static_cast<float>(volume));
    
    napi_value result;
    status = napi_get_boolean(env, success, &result);
    if (status != napi_ok) return nullptr;
    
    return result;
}

static napi_value SetApplicationMute(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 2;
    napi_value args[2];
    
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    if (status != napi_ok || argc < 2) {
        napi_throw_error(env, nullptr, "Wrong number of arguments");
        return nullptr;
    }
    
    int32_t pid;
    status = napi_get_value_int32(env, args[0], &pid);
    if (status != napi_ok) {
        napi_throw_error(env, nullptr, "Invalid PID argument");
        return nullptr;
    }
    
    bool mute;
    status = napi_get_value_bool(env, args[1], &mute);
    if (status != napi_ok) {
        napi_throw_error(env, nullptr, "Invalid mute argument");
        return nullptr;
    }
    
    bool success = SetApplicationMute(pid, mute);
    
    napi_value result;
    status = napi_get_boolean(env, success, &result);
    if (status != napi_ok) return nullptr;
    
    return result;
}

// Module initialization
static napi_value Init(napi_env env, napi_value exports) {
    napi_status status;
    napi_value fn;
    
    // Register getAudioApplications
    status = napi_create_function(env, nullptr, 0, GetAudioApplications, nullptr, &fn);
    if (status == napi_ok) {
        status = napi_set_named_property(env, exports, "getAudioApplications", fn);
    }
    
    // Register setApplicationVolume
    status = napi_create_function(env, nullptr, 0, SetApplicationVolume, nullptr, &fn);
    if (status == napi_ok) {
        status = napi_set_named_property(env, exports, "setApplicationVolume", fn);
    }
    
    // Register setApplicationMute
    status = napi_create_function(env, nullptr, 0, SetApplicationMute, nullptr, &fn);
    if (status == napi_ok) {
        status = napi_set_named_property(env, exports, "setApplicationMute", fn);
    }
    
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
