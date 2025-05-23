# Volume Control Backend

A Node.js backend service for controlling application volume on Windows using native audio APIs.

## Features

- List all running applications with active audio sessions
- Control volume levels (0-100%) for individual applications
- Mute/unmute applications
- Real-time updates via WebSocket
- CORS support for frontend development

## Prerequisites

- Node.js 16+ (LTS recommended)
- npm or yarn
- Windows 10/11
- Visual Studio 2019/2022 with C++ build tools
- Python 3.x (for node-gyp)

## Installation

1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies:

```bash
npm install
```

4. Build the native addon:

```bash
npm run build
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=8000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=debug
```

## Available Scripts

- `npm run build` - Build the TypeScript code and native addon
- `npm run dev` - Start the development server with ts-node
- `npm run dev:watch` - Start the development server with auto-reload
- `npm start` - Start the production server
- `npm run rebuild` - Clean, reinstall dependencies, and rebuild

## API Endpoints

### GET /api/applications

List all applications with active audio sessions.

**Response:**

```json
[
  {
    "name": "chrome",
    "pid": 1234,
    "volume": 75,
    "isMuted": false
  }
]
```

### POST /api/volume

Set the volume for an application.

**Request Body:**

```json
{
  "app_name": "chrome",
  "volume": 50
}
```

**Response:**

```json
{
  "success": true
}
```

## WebSocket

The server provides real-time updates via WebSocket at `ws://localhost:8000/ws`.

**Events:**

- `volume_updated`: Sent when an application's volume changes
  ```json
  {
    "type": "volume_updated",
    "app_name": "chrome",
    "volume": 50
  }
  ```

- `applications_updated`: Sent when the list of applications changes
  ```json
  {
    "type": "applications_updated",
    "data": [
      {
        "name": "chrome",
        "pid": 1234,
        "volume": 50,
        "isMuted": false
      }
    ]
  }
  ```

## Development

1. Start the development server:

```bash
npm run dev:watch
```

2. The server will be available at `http://localhost:8000`

## Building for Production

1. Build the project:

```bash
npm run build
```

2. Start the production server:

```bash
npm start
```

## Troubleshooting

### Native Addon Build Issues

If you encounter issues building the native addon:

1. Ensure you have Visual Studio 2019/2022 with C++ build tools installed
2. Install Python 3.x and add it to your PATH
3. Run `npm config set msvs_version 2019` (or 2022 if using VS 2022)
4. Run `npm run rebuild`

### No Audio Applications Found

If no audio applications are detected:

1. Ensure some applications are playing audio
2. Run the application as Administrator
3. Check the Windows Volume Mixer to verify applications appear there

## License

MIT
