# Linux Audio Control Native Addon

This native addon provides Linux audio control functionality using PulseAudio.

## Prerequisites

Before building this addon, ensure you have the following dependencies installed:

```bash
# Ubuntu/Debian
sudo apt-get install build-essential libpulse-dev

# Fedora
sudo dnf install gcc-c++ pulseaudio-libs-devel

# Arch Linux
sudo pacman -S base-devel libpulse
```

## Building

The addon will be built automatically when you install the package:

```bash
npm install
```

## Troubleshooting

1. Make sure PulseAudio is running:
```bash
pulseaudio --check  # Check if PulseAudio is running
pulseaudio -D       # Start PulseAudio if not running
```

2. Verify PulseAudio permissions:
```bash
# Add your user to the pulse-access group if needed
sudo usermod -a -G pulse-access $USER
```

3. Check PulseAudio logs:
```bash
tail -f ~/.config/pulse/log
```
