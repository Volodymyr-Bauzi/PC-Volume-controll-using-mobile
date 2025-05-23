# macOS Audio Control Native Addon

This directory contains the native addon implementation for controlling audio on macOS systems.

## Requirements

- macOS 10.10 or later
- Xcode Command Line Tools
- node-gyp

## Building

To build the native addon:

```bash
npm install
node-gyp configure
node-gyp build
```

## Files

- `audio_control.mm`: Main implementation using CoreAudio framework
- `binding.gyp`: Build configuration for node-gyp
- `package.json`: Node.js package configuration
