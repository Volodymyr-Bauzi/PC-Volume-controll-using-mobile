{
  "targets": [
    {
      "target_name": "macos-addon",
      "sources": [ "audio_control.mm" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "10.10",
        "OTHER_CFLAGS": [
          "-ObjC++"
        ]
      },
      "link_settings": {
        "libraries": [
          "-framework CoreAudio",
          "-framework Foundation"
        ]
      }
    }
  ]
}
