import axios from 'axios';
import env from '../utils/env';
import logger from '../utils/logger';

// Create axios instance with base URL from environment
const api = axios.create({
  baseURL: env.getApiUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    logger.api.request(config.url, config);
    // You can add auth token here if needed
    // const token = getAuthToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    logger.api.error('Request error', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    logger.api.response(response.config.url, response.data);
    return response.data;
  },
  (error) => {
    const errorMessage = error.response?.data?.message || error.message;
    logger.api.error(error.config?.url, errorMessage);
    
    // Handle common error statuses
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Handle unauthorized
          break;
        case 403:
          // Handle forbidden
          break;
        case 404:
          // Handle not found
          break;
        case 500:
          // Handle server error
          break;
        default:
          break;
      }
    }
    
    return Promise.reject(errorMessage);
  }
);

// Example API methods
export const volumeApi = {
  getSystemVolume: () => api.get('/api/volume'),
  setSystemVolume: (volume) => api.post('/api/volume', { volume }),
  getApplications: () => api.get('/api/applications'),
  setApplicationVolume: (appId, volume) => 
    api.post(`/api/applications/${appId}/volume`, { volume }),
};

export default api;
