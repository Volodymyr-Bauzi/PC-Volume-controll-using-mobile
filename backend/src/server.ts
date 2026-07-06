import 'dotenv/config';
import express, { Request, Response } from 'express';
import http from 'http';
import WebSocket from 'ws';
import cors, { CorsOptions } from 'cors';
import bodyParser from 'body-parser';
import { AudioManager } from './audioManager';
import path from 'path';
import fs from 'fs';
import { networkInterfaces } from 'os';
import { MediaController } from './mediaController';
import { exec } from 'child_process';

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

// Media Control Routes

// On macOS, posting media key events requires Accessibility permission and
// an unbundled binary never triggers the system prompt on its own (events
// are silently dropped). Ask explicitly once at startup so the user gets
// the official dialog that deep-links to System Settings.
if (process.platform === 'darwin' && MediaController.isSupported()) {
  const state = MediaController.getPermissionState(true); // prompt if missing
  if (state === 'granted') {
    console.log('[media] Accessibility permission granted — media keys enabled.');
  } else if (state === 'denied') {
    console.warn(
      '[media] Accessibility permission NOT granted. Media keys will not work ' +
        'until you enable this app under System Settings → Privacy & Security → ' +
        'Accessibility, then restart it. macOS should have just shown a prompt.'
    );
  }
}

// Lets the frontend know whether media keys work on this platform and
// whether the OS permission is in place, so it can hide the controls or
// show a permission hint instead of dead buttons.
app.get('/api/media/capabilities', (req: Request, res: Response) => {
  res.json({
    supported: MediaController.isSupported(),
    mediaPermission: MediaController.getPermissionState(false),
  });
});

app.post('/api/media/:action', (req, res) => {
  const { action } = req.params;
  const allowedActions = ['playpause', 'next', 'prev'];

  if (!allowedActions.includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  if (!MediaController.isSupported()) {
    return res.status(501).json({
      error: `Media controls are not supported on ${process.platform}`,
      supported: false,
    });
  }

  let method: 'PlayPause' | 'Next' | 'Prev' = 'PlayPause';
  switch (action) {
    case 'playpause': method = 'PlayPause'; break;
    case 'next': method = 'Next'; break;
    case 'prev': method = 'Prev'; break;
  }

  try {
    MediaController.getInstance().sendCommand(method);
    res.json({ success: true });
  } catch (error) {
    console.error(`Error executing media action ${action}:`, error);
    res.status(500).json({ error: 'Failed to execute media action' });
  }
});



// --- App Launcher Routes ---
// --- App Launcher Routes ---
// When packaged with pkg, __dirname is inside the snapshot.
// We want to look for shortcuts/presets relative to the executable.
const isPkg = (process as any).pkg !== undefined;
const BASE_DIR = isPkg ? path.dirname(process.execPath) : path.join(__dirname, '..');

const SHORTCUTS_DIR = path.join(BASE_DIR, 'shortcuts');
const PRESETS_FILE = path.join(BASE_DIR, 'presets.json');

// Ensure shortcuts directory exists
if (!fs.existsSync(SHORTCUTS_DIR)) {
  fs.mkdirSync(SHORTCUTS_DIR, { recursive: true });
}

// Get list of shortcuts
app.get('/api/shortcuts', (req, res) => {
  try {
    const files = fs.readdirSync(SHORTCUTS_DIR);
    // Filter for common shortcut/executable types if needed, or just send all
    const shortcuts = files.filter(file => !file.startsWith('.')); 
    res.json(shortcuts);
  } catch (error) {
    console.error('Error reading shortcuts directory:', error);
    res.status(500).json({ error: 'Failed to list shortcuts' });
  }
});

// Launch a shortcut
app.post('/api/shortcuts/launch', (req, res) => {
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }

  const filePath = path.join(SHORTCUTS_DIR, filename);
  
  // Security check: prevent directory traversal
  if (!filePath.startsWith(SHORTCUTS_DIR)) {
    return res.status(403).json({ error: 'Invalid file path' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Shortcut not found' });
  }

  // Launch the file with the platform's default opener
  const command =
    process.platform === 'win32'
      ? `start "" "${filePath}"`
      : process.platform === 'darwin'
        ? `open "${filePath}"`
        : `xdg-open "${filePath}"`;
  
  exec(command, (error) => {
    if (error) {
      console.error(`Error launching ${filename}:`, error);
      return res.status(500).json({ error: 'Failed to launch application' });
    }
    res.json({ success: true });
  });
});

// --- Presets Routes ---

// Get all presets
app.get('/api/presets', (req, res) => {
  try {
    if (!fs.existsSync(PRESETS_FILE)) {
      return res.json({});
    }
    const data = fs.readFileSync(PRESETS_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading presets:', error);
    res.status(500).json({ error: 'Failed to get presets' });
  }
});

// Save a preset
app.post('/api/presets', (req, res) => {
  try {
    const { name, apps } = req.body;
    if (!name || !apps) {
      return res.status(400).json({ error: 'Name and apps data are required' });
    }

    let presets: Record<string, any> = {};
    if (fs.existsSync(PRESETS_FILE)) {
      presets = JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8'));
    }

    presets[name] = apps;
    fs.writeFileSync(PRESETS_FILE, JSON.stringify(presets, null, 2));
    
    res.json({ success: true, presets });
  } catch (error) {
    console.error('Error saving preset:', error);
    res.status(500).json({ error: 'Failed to save preset' });
  }
});

// Apply a preset
app.post('/api/presets/apply/:name', (req, res) => {
  try {
    const { name } = req.params;
    if (!fs.existsSync(PRESETS_FILE)) {
      return res.status(404).json({ error: 'No presets found' });
    }

    const presets = JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8'));
    const preset = presets[name];

    if (!preset) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    // Apply volumes
    // preset is an array of { name: string, volume: number, isMuted: boolean }
    let appliedCount = 0;
    
    if (Array.isArray(preset)) {
      preset.forEach((appSetting: any) => {
        // Try to find the app running
        const success = AudioManager.setVolume(appSetting.name, appSetting.volume);
        if (success) {
            // Also try to set mute state if possible
            AudioManager.muteApplication(appSetting.name, appSetting.isMuted);
            appliedCount++;
        }
      });
    }

    res.json({ success: true, appliedCount });
  } catch (error) {
    console.error('Error applying preset:', error);
    res.status(500).json({ error: 'Failed to apply preset' });
  }
});

// Delete a preset
app.delete('/api/presets/:name', (req, res) => {
  try {
    const { name } = req.params;
    if (!fs.existsSync(PRESETS_FILE)) {
      return res.status(404).json({ error: 'No presets found' });
    }

    const presets = JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8'));
    if (presets[name]) {
      delete presets[name];
      fs.writeFileSync(PRESETS_FILE, JSON.stringify(presets, null, 2));
      res.json({ success: true, presets });
    } else {
      res.status(404).json({ error: 'Preset not found' });
    }
  } catch (error) {
    console.error('Error deleting preset:', error);
    res.status(500).json({ error: 'Failed to delete preset' });
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
  try {
    const apps = AudioManager.getApplications();
    if (apps.length > 0) {
      logger.info('Available audio applications:');
      apps.forEach(app => {
        logger.info(`- ${app.name} (PID: ${app.pid}): ${app.volume}% ${app.isMuted ? '[MUTED]' : ''}`);
      });
    } else {
      logger.warn('No audio applications found. Make sure some applications are playing audio.');
    }
  } catch (error) {
    logger.error('Failed to initialize audio manager or get applications:', error);
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
  MediaController.destroyInstance();
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
