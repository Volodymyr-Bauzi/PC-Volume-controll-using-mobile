import 'dotenv/config';
import express, { Request, Response } from 'express';
import http from 'http';
import WebSocket from 'ws';
import cors, { CorsOptions } from 'cors';
import bodyParser from 'body-parser';
import { AudioManager } from './audioManager';
import path from 'path';

// Load environment variables
const HOST = process.env.HOST || '0.0.0.0';
const PORT = parseInt(process.env.PORT || '8000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Get local IP for display
const os = require('os');
const networkInterfaces = os.networkInterfaces();
let localIP = HOST;
if (HOST === '0.0.0.0') {
  // Find the first non-internal IPv4 address
  for (const interfaceName in networkInterfaces) {
    const networkInterface = networkInterfaces[interfaceName];
    for (const entry of networkInterface) {
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
    // In production, you might want to restrict this to specific origins
    if (origin && CORS_ORIGIN === '*') {
      return callback(null, true);
    }
    if (origin && CORS_ORIGIN.split(',').includes(origin)) {
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

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());

// Serve static files from the frontend directory
const frontendPath = path.join(__dirname, 'frontend');
logger.info(`Serving frontend from: ${frontendPath}`);
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

// Start the server
server.listen(PORT, HOST, () => {
  logger.info('========================================');
  logger.info('Server started successfully!');
  logger.info('========================================');
  logger.info(`Local:            http://localhost:${PORT}`);
  logger.info(`Network:          http://${localIP}:${PORT}`);
  logger.info(`Environment:      ${NODE_ENV}`);
  logger.info(`WebSocket:        ws://${localIP}:${PORT}/ws`);
  logger.info(`CORS Origins:     ${CORS_ORIGIN}`);
  logger.info('========================================');
  
  // Log all network interfaces for debugging
  logger.debug('Available network interfaces:');
  Object.entries(networkInterfaces).forEach(([name, iface]) => {
    if (Array.isArray(iface)) {
      iface.forEach((details: any) => {
        if (details.family === 'IPv4' && !details.internal) {
          logger.debug(`- ${name}: ${details.address} (${details.netmask})`);
        }
      });
    }
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
function appsChanged(prev: any[], current: any[]): boolean {
  // If lengths are different, there's definitely a change
  if (prev.length !== current.length) return true;
  
  // Check if any app was added, removed, or had its volume changed
  const currentMap = new Map(current.map(app => [app.pid, app]));
  
  for (const prevApp of prev) {
    const currentApp = currentMap.get(prevApp.pid);
    if (!currentApp || 
        currentApp.volume !== prevApp.volume || 
        currentApp.isMuted !== prevApp.isMuted) {
      return true;
    }
  }
  
  return false;
}

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
