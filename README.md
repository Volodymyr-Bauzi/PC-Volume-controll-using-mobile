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

## 🛠️ Development Setup

### Prerequisites
- Node.js 16+ and npm 7+
- Git
- (Optional) Yarn or pnpm

### Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile.git
   cd PC-Volume-controll-using-mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env.local`
   - Modify the values as needed for your local setup

### Available Scripts

- `npm start` - Start both frontend and backend in development mode
- `npm run start:prod` - Start in production mode
- `npm run build` - Build both frontend and backend for production
- `npm run package` - Package the application for distribution
- `npm test` - Run tests
- `npm run lint` - Run linter

### Environment Variables

Key environment variables:

- `NODE_ENV` - Environment (development, production, test)
- `REACT_APP_API_URL` - Backend API URL
- `REACT_APP_WS_URL` - WebSocket URL
- `REACT_APP_DEBUG` - Enable debug logging

## 🎮 Usage

### Development Mode

1. Start the development server:
   ```bash
   npm start
   ```
2. The application will be available at `http://localhost:3000`
3. The backend API will be available at `http://localhost:3001`

### Production Mode

1. Build the application:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   npm run start:prod
   ```
3. The application will be available at `http://localhost:3000`

### Remote Access

1. **Start the application** on your PC
2. **Open your mobile browser** and navigate to the address shown in the application window
   - Example: `http://192.168.1.x:3000`
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
