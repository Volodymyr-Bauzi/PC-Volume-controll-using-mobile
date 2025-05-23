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

We provide pre-built packages for easy installation:

### Windows
- [Download for Windows 10/11 (64-bit)](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/releases/download/${VERSION}/volume-control-windows-x64.exe)
- [Download for Windows 7/8.1 (32-bit)](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/releases/download/${VERSION}/volume-control-windows-ia32.exe)

### Linux
- [Download for Linux (64-bit)](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/releases/download/${VERSION}/volume-control-linux-x64)
- [Download for Linux (ARM64)](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/releases/download/${VERSION}/volume-control-linux-arm64)

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
