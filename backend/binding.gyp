{
    "targets": [
        {
            "target_name": "addon",
            "conditions": [
                ["OS=='win'", {
                    "sources": ["./src/cpp/nodeBridge.cpp", "./src/cpp/os/windows.cpp"],
                    "include_dirs": [
                        "<!@(node -p \"require('node-addon-api').include\")"
                    ],
                    "defines": [ "NAPI_CPP_EXCEPTIONS" ]
                }],
                ["OS=='linux'", {
                    "sources": ["./src/platforms/linux/audio_control.cpp"],
                    "include_dirs": [
                        "<!@(node -p \"require('node-addon-api').include\")",
                        "<!@(pkg-config --cflags-only-I libpulse | sed s/-I//g)"
                    ],
                    "libraries": [
                        "<!@(pkg-config --libs libpulse)"
                    ],
                    "cflags!": [ "-fno-exceptions" ],
                    "cflags_cc!": [ "-fno-exceptions" ],
                    "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ]
                }]
            ]
        }
    ]
}