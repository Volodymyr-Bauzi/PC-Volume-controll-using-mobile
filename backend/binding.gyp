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
                }],
                ["OS=='mac'", {
                    "sources": ["./src/platforms/macos/audio_control.mm"],
                    "include_dirs": [
                        "<!@(node -p \"require('node-addon-api').include\")"
                    ],
                    "defines": [ "NAPI_CPP_EXCEPTIONS" ],
                    "cflags!": [ "-fno-exceptions" ],
                    "cflags_cc!": [ "-fno-exceptions" ],
                    "xcode_settings": {
                        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
                        "CLANG_CXX_LIBRARY": "libc++",
                        "MACOSX_DEPLOYMENT_TARGET": "10.13",
                        "OTHER_CPLUSPLUSFLAGS": [ "-ObjC++" ],
                        "OTHER_CFLAGS": [ "-arch x86_64", "-arch arm64" ],
                        "OTHER_LDFLAGS": [ "-arch x86_64", "-arch arm64" ]
                    },
                    "link_settings": {
                        "libraries": [
                            "-framework CoreAudio",
                            "-framework AppKit",
                            "-framework CoreGraphics",
                            "-framework ApplicationServices",
                            "-framework Foundation"
                        ]
                    }
                }]
            ]
        }
    ]
}