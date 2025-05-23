// Environment configuration
const env = process.env.NODE_ENV || 'development';

const config = {
  development: {
    apiUrl: 'http://localhost:3001',
    wsUrl: 'ws://localhost:3001',
    debug: true,
  },
  production: {
    apiUrl: '', // Empty for same origin in production
    wsUrl: window.location.protocol === 'https:' ? 'wss://' : 'ws://' + window.location.host,
    debug: false,
  },
  test: {
    apiUrl: 'http://localhost:3001',
    wsUrl: 'ws://localhost:3001',
    debug: false,
  }
};

// Merge with environment-specific config
const envConfig = config[env] || config.development;

// Add environment flag
envConfig.env = env;

// Freeze the config to prevent accidental modifications
module.exports = Object.freeze(envConfig);
