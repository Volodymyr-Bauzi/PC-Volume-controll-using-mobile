import config from '../../config';

// Environment variables with defaults
const env = {
  // API Configuration
  API_URL: process.env.REACT_APP_API_URL || config.apiUrl,
  WS_URL: process.env.REACT_APP_WS_URL || config.wsUrl,
  
  // Feature flags
  DEBUG: process.env.REACT_APP_DEBUG === 'true' || config.debug,
  
  // App info
  VERSION: process.env.REACT_APP_VERSION || process.env.npm_package_version,
  BUILD_DATE: process.env.REACT_APP_BUILD_DATE || new Date().toISOString(),
  
  // Get current environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  
  // Helper methods
  getApiUrl: (path = '') => {
    const baseUrl = env.API_URL;
    return `${baseUrl}${path}`;
  },
  
  getWsUrl: (path = '') => {
    const baseUrl = env.WS_URL;
    return `${baseUrl}${path}`.replace(/([^:])\/\//g, '$1/');
  }
};

export default env;
