# Volume Control Frontend

A modern React + TypeScript frontend for controlling system and application audio levels remotely.

## Features

- 🎚️ **System Volume Control**: Adjust master volume with smooth scrolling
- 🎵 **Per-Application Control**: Individual volume sliders for each running application
- 🔇 **Mute Toggle**: Quick mute/unmute for system and applications
- 🌓 **Dark/Light Theme**: Toggle between color schemes
- 🔄 **Real-time Updates**: WebSocket connection for live volume changes
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **React 19** with TypeScript
- **Vite** for fast development and building
- **Mantine UI** for modern component library
- **Axios** for HTTP requests
- **WebSocket** for real-time communication

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend server running (see backend README)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run preview` - Preview production build

## Project Structure

```
src/
├── components/       # React components
│   ├── common/      # Shared components (ErrorBoundary, LoadingSpinner, etc.)
│   └── volume-control/  # Volume control specific components
├── hooks/           # Custom React hooks
├── services/        # API and WebSocket services
├── contexts/        # React contexts (Theme, etc.)
├── types/           # TypeScript type definitions
├── constants/       # Application constants
├── utils/           # Utility functions
├── helpers/         # Helper functions
└── styles/          # Global styles
```

## Configuration

Environment variables can be configured in `.env` files. For local development:

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Customize the values in `.env.local` for your environment

### Environment Variables

#### Development Server

- **`VITE_PORT`** (default: `3000`)  
  Port for the Vite development server

#### Backend API

- **`VITE_API_HOST`** (default: `localhost`)  
  Host where the backend API is running

- **`VITE_API_PORT`** (default: `8777`)  
  Port where the backend API is running

#### WebSocket

- **`VITE_WS_PORT`** (optional)  
  Port for WebSocket connection. If not set, defaults to `VITE_API_PORT`

#### Production Configuration

These variables are typically set during build/deployment:

- **`VITE_API_URL`** (optional)  
  Production API URL. Leave empty to use relative URLs

- **`VITE_WS_URL`** (optional)  
  Production WebSocket URL. Leave empty to auto-detect from browser location

#### Build Configuration

- **`VITE_GENERATE_SOURCEMAP`** (default: `false`)  
  Set to `true` to generate source maps in production builds

### Example Configurations

**Local Development (default):**
```env
VITE_PORT=3000
VITE_API_HOST=localhost
VITE_API_PORT=8777
```

**Custom Backend Port:**
```env
VITE_PORT=3000
VITE_API_HOST=localhost
VITE_API_PORT=9000
```

**Remote Backend:**
```env
VITE_PORT=3000
VITE_API_HOST=192.168.1.100
VITE_API_PORT=8777
```

## Development

The project uses:
- **ESLint** for code linting
- **Prettier** for code formatting
- **EditorConfig** for consistent editor settings
- **TypeScript** for type safety

## Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

## License

MIT
