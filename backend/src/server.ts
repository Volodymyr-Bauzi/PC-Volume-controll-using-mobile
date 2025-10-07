import 'dotenv/config';
import express, { Request, Response } from 'express';
import http from 'http';
import WebSocket from 'ws';
import cors, { CorsOptions } from 'cors';
import bodyParser from 'body-parser';
import { AudioManager } from './audioManager';
import path from 'path';
import { networkInterfaces } from 'os';

// Load environment variables with defaults for development
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_DEVELOPMENT = NODE_ENV === 'development';

// Server configuration
const HOST = process.env.BACKEND_HOST || '0.0.0.0';
const PORT = parseInt(process.env.BACKEND_PORT || '8777', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || (IS_DEVELOPMENT ? 'http://localhost:3000' : '');
const LOG_LEVEL = process.env.LOG_LEVEL || (IS_DEVELOPMENT ? 'debug' : 'info');

// WebSocket configuration
const WS_PROTOCOL = process.env.WS_PROTOCOL || (IS_DEVELOPMENT ? 'ws' : 'wss');
const WS_HOST = process.env.WS_HOST || HOST;
const WS_PORT = process.env.WS_PORT || PORT.toString();

// Validate required environment variables in production
if (!IS_DEVELOPMENT) {
  const requiredVars = ['CORS_ORIGIN'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }
}

// Get local IP for display
let localIP = HOST;
if (HOST === '0.0.0.0') {
  // Find the first non-internal IPv4 address
  const nets = networkInterfaces();
  for (const interfaceName of Object.keys(nets)) {
    const networkInterface = nets[interfaceName] || [];
    for (const entry of networkInterface) {
      // Skip over non-IPv4 and internal (loopback) addresses
      if (entry.family === 'IPv4' && !entry.internal) {
        localIP = entry.address;
        break;
      }
    }
    if (localIP !== '0.0.0.0') break;
  }
}

// Configure CORS
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow all origins in development
    if (NODE_ENV === 'development') {
      return callback(null, true);
    }
    // Allow requests without origin (curl, mobile apps, same-origin non-browser)
    if (!origin) {
      return callback(null, true);
    }
    // In production, restrict to configured origins
    if (CORS_ORIGIN === '*' || CORS_ORIGIN.split(',').includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

// Configure logging
const logger = {
  debug: (...args: any[]) => LOG_LEVEL === 'debug' && console.debug('[DEBUG]', ...args),
  info: (...args: any[]) => console.log('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args)
};

// Type definitions
interface VolumeRequest {
  app_name: string;
  volume: number;
}

interface WebSocketMessage {
  type: 'volume_changed' | 'app_added' | 'app_removed';
  app_name: string;
  volume?: number;
  data?: any;
}

type WebSocketClient = WebSocket;

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Configure WebSocket server with client tracking
const wss = new WebSocket.Server({
  server,
  path: '/ws',
  clientTracking: true,
  // Disable the per-message deflate to reduce memory usage
  perMessageDeflate: {
    zlibDeflateOptions: {
      // See zlib defaults
      chunkSize: 1024,
      memLevel: 7,
      level: 3,
    },
    // Other options
    clientNoContextTakeover: true, // Default: true
    serverNoContextTakeover: true, // Default: true
    serverMaxWindowBits: 10, // Default: 10
    concurrencyLimit: 10, // Default: 10
    threshold: 1024, // Size (in bytes) below which messages should not be compressed
  },
});

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());

// Serve static files from the frontend directory
const frontendPath = path.join(__dirname, 'frontend');
app.use(express.static(frontendPath));

// Serve index.html for the root path
app.get('/', (req, res) => {
  const indexPath = path.join(frontendPath, 'index.html');
  logger.info(`Serving index.html from: ${indexPath}`);
  res.sendFile(indexPath);
});

// API routes go here...
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.originalUrl}`);
  next();
});

// WebSocket connection handling
const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  clients.add(ws);
  
  // Send current applications to the new client
  try {
    const apps = AudioManager.getApplications();
    console.log('Sending initial applications:', apps);
    ws.send(JSON.stringify({ 
      type: 'applications_updated',
      data: Array.isArray(apps) ? apps : []
    }));
  } catch (error) {
    console.error('Error sending initial applications:', error);
    ws.send(JSON.stringify({
      type: 'applications_updated',
      data: []
    }));
  }
  
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Broadcast to all connected clients
function broadcast(data: WebSocketMessage) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// API Routes
app.get('/api/applications', (req, res) => {
  try {
    const apps = AudioManager.getApplications();
    res.json(apps);
  } catch (error) {
    console.error('Error getting applications:', error);
    res.status(500).json({ error: 'Failed to get applications' });
  }
});

app.post('/api/volume', (req, res) => {
  try {
    const { app_name, volume } = req.body;
    
    if (typeof app_name === 'undefined' || typeof volume === 'undefined') {
      return res.status(400).json({ error: 'app_name and volume are required' });
    }
    if (typeof volume !== 'number' || Number.isNaN(volume)) {
      return res.status(400).json({ error: 'volume must be a number' });
    }
    if (volume < 0 || volume > 100) {
      return res.status(400).json({ error: 'volume must be between 0 and 100' });
    }
    
    // Get current apps to check if volume is actually changing
    const currentApps = AudioManager.getApplications() || [];
    const app = currentApps.find(a => a.name === app_name);
    
    // Only proceed if volume is actually changing
    if (app && app.volume === volume) {
      return res.json({ success: true, message: 'Volume already set to this level' });
    }
    
    const success = AudioManager.setVolume(app_name, volume);
    
    if (success) {
      // Update our local state
      const updatedApps = AudioManager.getApplications() || [];
      previousApps = updatedApps.map(app => ({ ...app }));
      
      // Broadcast the volume update to all clients
      broadcast({
        type: 'volume_changed',
        app_name,
        volume
      });
      
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Application not found' });
    }
  } catch (error) {
    console.error('Error setting volume:', error);
    res.status(500).json({ error: 'Failed to set volume' });
  }
});

// Get system volume
app.get('/api/system/volume', (req, res) => {
  try {
    const volume = AudioManager.getMasterVolume();
    res.json({ volume });
  } catch (error) {
    console.error('Error getting system volume:', error);
    res.status(500).json({ error: 'Failed to get system volume' });
  }
});

// Set system volume
app.post('/api/system/volume', (req, res) => {
  try {
    const { volume } = req.body;
    if (typeof volume !== 'number' || volume < 0 || volume > 100) {
      return res.status(400).json({ error: 'Volume must be between 0 and 100' });
    }
    AudioManager.setMasterVolume(volume);
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting system volume:', error);
    res.status(500).json({ error: 'Failed to set system volume' });
  }
});

// Toggle mute
app.post('/api/system/mute/toggle', (req, res) => {
  try {
    const isMuted = AudioManager.toggleMute();
    res.json({ isMuted });
  } catch (error) {
    console.error('Error toggling mute:', error);
    res.status(500).json({ error: 'Failed to toggle mute' });
  }
});

// Get mute status (no toggle)
app.get('/api/system/mute', (req, res) => {
  try {
    const isMuted = AudioManager.isMuted();
    res.json({ isMuted });
  } catch (error) {
    console.error('Error getting mute status:', error);
    res.status(500).json({ error: 'Failed to get mute status' });
  }
});

// Start the server
server.listen(PORT, HOST, () => {
  logger.info('========================================');
  logger.info('Server started successfully!');
  logger.info('========================================');
  logger.info(`Visit from mobile or other devices within local network:`)          
  logger.info(`http://${localIP}:${PORT}`);
  logger.info('========================================');
  
  // Log all network interfaces for debugging
  logger.debug('Available local network interfaces:');
  const nets = networkInterfaces();
  Object.keys(nets).forEach((name) => {
    const iface = nets[name] || [];
    iface.forEach((details: any) => {
      if (details.family === 'IPv4' && !details.internal) {
        logger.debug(`- ${name}: ${details.address} (${details.netmask})`);
      }
    });
  });
  
  // Log available audio applications on startup
  const apps = AudioManager.getApplications();
  if (apps.length > 0) {
    logger.info('Available audio applications:');
    apps.forEach(app => {
      logger.info(`- ${app.name} (PID: ${app.pid}): ${app.volume}% ${app.isMuted ? '[MUTED]' : ''}`);
    });
  } else {
    logger.warn('No audio applications found. Make sure some applications are playing audio.');
  }
});

// Track previous applications state
let previousApps: any[] = [];

// Helper function to check if two application arrays are different
// removed unused appsChanged helper

// Periodically check for application changes and broadcast updates only when needed
setInterval(() => {
  try {
    const currentApps = AudioManager.getApplications() || [];
    const currentAppMap = new Map(currentApps.map(app => [app.name, app]));
    const previousAppMap = new Map(previousApps.map(app => [app.name, app]));
    
    // Check for removed apps
    previousApps.forEach(prevApp => {
      if (!currentAppMap.has(prevApp.name)) {
        console.log(`App removed: ${prevApp.name}`);
        broadcast({
          type: 'app_removed',
          app_name: prevApp.name
        });
      }
    });

    // Check for added or updated apps
    currentApps.forEach(currentApp => {
      const prevApp = previousAppMap.get(currentApp.name);
      
      if (!prevApp) {
        // New app
        console.log(`App added: ${currentApp.name}`);
        broadcast({
          type: 'app_added',
          app_name: currentApp.name,
          volume: currentApp.volume
        });
      } else if (currentApp.volume !== prevApp.volume || currentApp.isMuted !== prevApp.isMuted) {
        // Volume or mute state changed
        console.log(`App updated: ${currentApp.name}`);
        broadcast({
          type: 'volume_changed',
          app_name: currentApp.name,
          volume: currentApp.volume
        });
      }
    });

    // Update previous state
    previousApps = currentApps.map(app => ({ ...app }));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error checking for application updates:', errorMessage);
  }
}, 1000); // Check every second, but only update if something changed

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.close();
    }
  });
  server.close(() => {
    console.log('Server shut down');
    process.exit(0);
  });
});
