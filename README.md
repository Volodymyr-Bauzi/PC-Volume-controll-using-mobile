# Volume Control Remote

A sleek, responsive web application that transforms your mobile device into a remote control for your PC's audio. Perfect for controlling volume levels of individual applications from the comfort of your couch or during presentations.

## 🚀 Key Features

- 📱 Mobile-first design for easy control from any device
- 🎚️ Individual volume control for all running applications
- 🔄 Real-time updates via WebSockets
- 🌐 Accessible from any device on the same network
- 🖥️ Cross-platform support (Windows & Linux)
- 🛠️ No installation required - runs in any modern web browser

## 📥 Download Pre-built Packages

We provide pre-built packages for easy installation. Please visit our [Releases page](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/releases) to download the latest version for your platform.

### Windows
- [Download for Windows 10/11 (64-bit)](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/releases/latest)
- [Download for Windows 7/8.1 (32-bit)](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/releases/latest)

### Linux
- [Download for Linux (64-bit)](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/releases/latest)
- [Download for Linux (ARM64)](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/releases/latest)

> **Note**: After downloading, make sure to check the release notes for any specific installation instructions.

## 🛠️ Installation

### Windows
1. Download the appropriate Windows installer
2. Run the installer and follow the on-screen instructions
3. The application will start automatically after installation

### Linux
1. Download the appropriate Linux binary
2. Make it executable:
   ```bash
   chmod +x volume-control-linux-x64
   ```
3. Run the application:
   ```bash
   ./volume-control-linux-x64
   ```

## 🎮 Usage

1. **Start the application** on your PC
2. **Open your mobile browser** and navigate to the address shown in the application window
   - Example: `http://192.168.1.x:8001`
3. **Control volume** for any running application directly from your mobile device

## 📦 Release Packaging

To create release packages for distribution, use the included packaging script:

1. **Build the application** for all platforms:
   ```bash
   # Build for Windows
   npm run package:win
   
   # Build for Linux
   npm run package:linux
   ```

2. **Run the packaging script** to create distribution packages:
   ```bash
   node package-release.js
   ```

3. **Find the packages** in the `release/` directory:
   - `volume-control-windows-vX.X.X.zip`
   - `volume-control-linux-vX.X.X.zip`

4. **Upload these files** to your GitHub release.

## 🔧 Building from Source

### Prerequisites
- Node.js 18+
- npm or yarn
- Windows: Visual Studio Build Tools with Windows SDK
- Linux: PulseAudio and development files

### Build Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/volume-control.git
   cd volume-control
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the application:
   ```bash
   npm run package
   ```

4. Find the built packages in the `dist` directory

## 🐛 Troubleshooting

### Common Issues
- **Can't connect from mobile device**
  - Ensure both devices are on the same network
  - Check your firewall settings to allow connections on port 8001

- **No applications showing**
  - Make sure some applications are playing audio
  - Restart the application

- **Linux: No sound control**
  - Ensure PulseAudio is running: `pulseaudio --check`
  - Check that your user is in the `pulse-access` group

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
  - `public/` - Static assets
  - `package.json` - Node.js dependencies and scripts

## License

MIT
