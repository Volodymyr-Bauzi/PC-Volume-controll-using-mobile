#include <napi.h>
#include <pulse/pulseaudio.h>
#include <pulse/context.h>
#include <pulse/mainloop.h>
#include <string>
#include <vector>
#include <memory>
#include <iostream>

struct AudioSink {
    uint32_t pid;
    std::string name;
    double volume;
    bool muted;
};

class PulseAudioWrapper {
private:
    pa_mainloop* mainloop;
    pa_context* context;
    std::vector<AudioSink> sinks;

    static void context_state_callback(pa_context* c, void* userdata) {
        auto* wrapper = static_cast<PulseAudioWrapper*>(userdata);
        switch (pa_context_get_state(c)) {
            case PA_CONTEXT_READY:
            case PA_CONTEXT_TERMINATED:
            case PA_CONTEXT_FAILED:
                pa_mainloop_quit(wrapper->mainloop, 0);
                break;
            default:
                break;
        }
    }

    static void sink_info_callback(pa_context* c, const pa_sink_input_info* i, int eol, void* userdata) {
        if (eol < 0) {
            std::cerr << "Failed to get sink info" << std::endl;
            return;
        }
        
        if (eol > 0) return;
        
        auto* wrapper = static_cast<PulseAudioWrapper*>(userdata);
        if (i) {
            AudioSink sink;
            // Get client name using the client index
            const char* client_name = "Unknown";
            if (i->proplist) {
                const char* app_name = pa_proplist_gets(i->proplist, PA_PROP_APPLICATION_NAME);
                if (app_name) {
                    client_name = app_name;
                } else {
                    const char* app_id = pa_proplist_gets(i->proplist, PA_PROP_APPLICATION_ID);
                    if (app_id) {
                        client_name = app_id;
                    }
                }
            }
            
            sink.pid = i->owner_module;  // This might be -1 if not available
            sink.name = client_name;
            sink.volume = pa_cvolume_avg(&i->volume) / (double)PA_VOLUME_NORM;
            sink.muted = i->mute != 0;
            wrapper->sinks.push_back(sink);
        }
    }

public:
    PulseAudioWrapper() : mainloop(nullptr), context(nullptr) {
        mainloop = pa_mainloop_new();
        if (!mainloop) {
            throw std::runtime_error("Failed to create mainloop");
        }

        context = pa_context_new(pa_mainloop_get_api(mainloop), "Volume Control");
        if (!context) {
            pa_mainloop_free(mainloop);
            throw std::runtime_error("Failed to create context");
        }

        pa_context_set_state_callback(context, context_state_callback, this);
        
        if (pa_context_connect(context, nullptr, PA_CONTEXT_NOFLAGS, nullptr) < 0) {
            pa_context_unref(context);
            pa_mainloop_free(mainloop);
            throw std::runtime_error("Failed to connect to PulseAudio");
        }

        int ret;
        pa_mainloop_run(mainloop, &ret);
    }

    ~PulseAudioWrapper() {
        if (context) {
            pa_context_disconnect(context);
            pa_context_unref(context);
        }
        if (mainloop) {
            pa_mainloop_free(mainloop);
        }
    }

    std::vector<AudioSink> getAudioSinks() {
        sinks.clear();
        pa_operation* op = pa_context_get_sink_input_info_list(context, sink_info_callback, this);
        if (!op) {
            throw std::runtime_error("Failed to get sink input info list");
        }

        while (pa_operation_get_state(op) == PA_OPERATION_RUNNING) {
            pa_mainloop_iterate(mainloop, 1, nullptr);
        }
        
        pa_operation_unref(op);
        return sinks;
    }

    void setVolume(uint32_t pid, double volume) {
        for (const auto& sink : getAudioSinks()) {
            if (sink.pid == pid) {
                pa_cvolume cv;
                pa_cvolume_set(&cv, 1, volume * PA_VOLUME_NORM);
                pa_operation* op = pa_context_set_sink_input_volume(context, sink.pid, &cv, nullptr, nullptr);
                if (op) pa_operation_unref(op);
                break;
            }
        }
    }

    void setMute(uint32_t pid, bool mute) {
        for (const auto& sink : getAudioSinks()) {
            if (sink.pid == pid) {
                pa_operation* op = pa_context_set_sink_input_mute(context, sink.pid, mute ? 1 : 0, nullptr, nullptr);
                if (op) pa_operation_unref(op);
                break;
            }
        }
    }
};

class AudioControl : public Napi::ObjectWrap<AudioControl> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports) {
        Napi::Function func = DefineClass(env, "AudioControl", {
            InstanceMethod("getAudioSinks", &AudioControl::GetAudioSinks),
            InstanceMethod("setVolume", &AudioControl::SetVolume),
            InstanceMethod("setMute", &AudioControl::SetMute)
        });

        Napi::FunctionReference* constructor = new Napi::FunctionReference();
        *constructor = Napi::Persistent(func);
        env.SetInstanceData(constructor);

        exports.Set("AudioControl", func);
        return exports;
    }

    AudioControl(const Napi::CallbackInfo& info) : Napi::ObjectWrap<AudioControl>(info) {
        try {
            pulseAudio = std::make_unique<PulseAudioWrapper>();
        } catch (const std::exception& e) {
            Napi::Error::New(info.Env(), e.what()).ThrowAsJavaScriptException();
        }
    }

private:
    std::unique_ptr<PulseAudioWrapper> pulseAudio;

    Napi::Value GetAudioSinks(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        try {
            auto sinks = pulseAudio->getAudioSinks();
            Napi::Array result = Napi::Array::New(env, sinks.size());
            
            for (size_t i = 0; i < sinks.size(); i++) {
                Napi::Object sink = Napi::Object::New(env);
                sink.Set("pid", Napi::Number::New(env, sinks[i].pid));
                sink.Set("name", Napi::String::New(env, sinks[i].name));
                sink.Set("volume", Napi::Number::New(env, sinks[i].volume));
                sink.Set("muted", Napi::Boolean::New(env, sinks[i].muted));
                result.Set(i, sink);
            }
            
            return result;
        } catch (const std::exception& e) {
            Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
            return env.Undefined();
        }
    }

    Napi::Value SetVolume(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        try {
            if (info.Length() < 2) {
                throw std::runtime_error("Wrong number of arguments");
            }

            uint32_t pid = info[0].As<Napi::Number>().Uint32Value();
            double volume = info[1].As<Napi::Number>().DoubleValue();
            
            if (volume < 0.0 || volume > 1.0) {
                throw std::runtime_error("Volume must be between 0.0 and 1.0");
            }

            pulseAudio->setVolume(pid, volume);
            return env.Undefined();
        } catch (const std::exception& e) {
            Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
            return env.Undefined();
        }
    }

    Napi::Value SetMute(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        try {
            if (info.Length() < 2) {
                throw std::runtime_error("Wrong number of arguments");
            }

            uint32_t pid = info[0].As<Napi::Number>().Uint32Value();
            bool mute = info[1].As<Napi::Boolean>().Value();

            pulseAudio->setMute(pid, mute);
            return env.Undefined();
        } catch (const std::exception& e) {
            Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
            return env.Undefined();
        }
    }
};

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    return AudioControl::Init(env, exports);
}

NODE_API_MODULE(linux_addon, Init)
