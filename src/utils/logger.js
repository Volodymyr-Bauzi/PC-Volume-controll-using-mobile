import env from './env';

const logger = {
  // Log only in development or when debug is enabled
  debug: (...args) => {
    if (env.DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  },
  
  // Always log info messages
  info: (...args) => {
    console.log('[INFO]', ...args);
  },
  
  // Log warnings
  warn: (...args) => {
    console.warn('[WARN]', ...args);
  },
  
  // Log errors
  error: (...args) => {
    console.error('[ERROR]', ...args);
    
    // In production, you might want to send errors to an error tracking service
    if (env.isProduction) {
      // Example: sendToErrorTrackingService(...args);
    }
  },
  
  // Log API requests
  api: {
    request: (url, config = {}) => {
      logger.debug(`API Request: ${url}`, config);
    },
    response: (url, response) => {
      logger.debug(`API Response: ${url}`, response);
    },
    error: (url, error) => {
      logger.error(`API Error: ${url}`, error);
    }
  }
};

export default logger;
