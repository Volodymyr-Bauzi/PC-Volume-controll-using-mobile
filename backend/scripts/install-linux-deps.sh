#!/bin/bash

# Function to detect the Linux distribution
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo $ID
    elif [ -f /etc/lsb-release ]; then
        . /etc/lsb-release
        echo $DISTRIB_ID
    else
        echo "unknown"
    fi
}

# Install dependencies based on the distribution
DISTRO=$(detect_distro)
echo "Detected distribution: $DISTRO"

case $DISTRO in
    "ubuntu"|"debian")
        echo "Installing dependencies for Ubuntu/Debian..."
        sudo apt-get update
        sudo apt-get install -y build-essential libpulse-dev pkg-config
        ;;
    "fedora")
        echo "Installing dependencies for Fedora..."
        sudo dnf install -y gcc-c++ pulseaudio-libs-devel pkg-config
        ;;
    "arch")
        echo "Installing dependencies for Arch Linux..."
        sudo pacman -S --noconfirm base-devel libpulse pkg-config
        ;;
    *)
        echo "Unsupported distribution: $DISTRO"
        echo "Please install the following packages manually:"
        echo "- C++ build tools (gcc/g++, make)"
        echo "- PulseAudio development files"
        echo "- pkg-config"
        exit 1
        ;;
esac

# Verify PulseAudio installation
if ! pkg-config --exists libpulse; then
    echo "Error: PulseAudio development files not found"
    exit 1
fi

echo "Dependencies installed successfully!"

# Add current user to pulse-access group if it exists
if getent group pulse-access > /dev/null; then
    if ! groups $USER | grep -q pulse-access; then
        echo "Adding user to pulse-access group..."
        sudo usermod -a -G pulse-access $USER
        echo "Please log out and log back in for the group changes to take effect"
    fi
fi
