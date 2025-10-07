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
- [Download for Windows](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/releases/download/v1.2.10/volume-control-windows-v1.2.10.zip)
  
### Linux
- [Download for Linux](https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile/releases/download/v1.2.10/volume-control-linux-v1.2.10.zip)

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
- Node.js 18+ and npm 9+ or pnpm 8+
- Git
- (Windows) Windows Build Tools (for native modules)
- (Linux) Build essentials and Python (for node-gyp)

### Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile.git
   cd PC-Volume-controll-using-mobile
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install frontend dependencies
   cd frontend
   npm install
   
   # Install backend dependencies
   cd ../backend
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env.development` in the root directory
   - Update the values as needed (defaults should work for local development)

4. **Start the development servers**
   ```bash
   # From the root directory
   npm run dev
   ```
   This will start both the frontend (port 3000) and backend (port 3001) in development mode with hot-reload.

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## 🚀 Production Setup

### Prerequisites
- Node.js 18+ and npm 9+ or pnpm 8+
- (Optional) PM2 for process management
- (Optional) Nginx or similar reverse proxy for production

### Building for Production

1. **Build the application**
   ```bash
   # From the root directory
   npm run build
   ```
   This will build both the frontend and backend for production.

2. **Set up environment variables**
   - Create a `.env.production` file in the root directory
   - Configure production-specific settings (see `.env.example` for reference)
   - **Important**: Set secure values for production (HTTPS, CORS, etc.)

3. **Start the production server**
   ```bash
   # From the backend directory
   cd backend
   npm start
   ```
   The application will be available at the configured domain/port.

### Using PM2 (Recommended for Production)

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. Start the application with PM2:
   ```bash
   # From the backend directory
   cd backend
   pm2 start npm --name "volume-control" -- start
   ```

3. Save the PM2 process list and set up startup script:
   ```bash
   pm2 save
   pm2 startup
   ```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `VITE_PORT` | Frontend development server port | `3000` |
| `VITE_API_PORT` | Backend API port | `3001` |
| `VITE_API_URL` | API base URL (auto-configured) | - |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:3000` |
| `WS_PROTOCOL` | WebSocket protocol (ws/wss) | `ws` (dev) / `wss` (prod) |
| `WS_HOST` | WebSocket host | `localhost` |
| `WS_PORT` | WebSocket port | `3001` |
| `LOG_LEVEL` | Logging level | `debug` (dev) / `info` (prod) |

## 🔧 Troubleshooting

### Common Issues

- **Native module build fails**
  - Ensure you have the required build tools installed
  - On Windows: `npm install --global --production windows-build-tools`
  - On Ubuntu/Debian: `sudo apt-get install -y build-essential python3`

- **Port already in use**
  - Check for other processes using ports 3000 or 3001
  - Update the ports in `.env.development` if needed

- **CORS errors**
  - Ensure `CORS_ORIGIN` is correctly set in your environment variables
  - In development, make sure the frontend URL matches the allowed origins

- **WebSocket connection issues**
  - Check that the WebSocket URL is correctly configured
  - Ensure your reverse proxy (if any) is configured to handle WebSocket connections

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
