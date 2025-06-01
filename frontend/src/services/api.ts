import axios from 'axios';
import type { CancelTokenSource } from 'axios';

// Get configuration from environment variables
const IS_DEVELOPMENT = import.meta.env.DEV;

// Function to get the API base URL
const getApiBaseUrl = () => {
  if (IS_DEVELOPMENT) {
    // In development, use the Vite dev server proxy or direct to backend
    const port = import.meta.env.VITE_API_PORT || 8777;
    return `http://${window.location.hostname}:${port}`;
  }
  // In production, use relative URLs or the configured production URL
  return import.meta.env.VITE_API_URL || '';
};

// Function to get WebSocket URL
const getWebSocketUrl = () => {
  if (IS_DEVELOPMENT) {
    const port = import.meta.env.VITE_WS_PORT || import.meta.env.VITE_API_PORT || 8777;
    return `ws://${window.location.hostname}:${port}`;
  }
  // In production, use relative WebSocket URL or construct from current host
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsPath = import.meta.env.VITE_WS_URL || 'ws';
  return wsPath.startsWith('ws') ? wsPath : `${wsProtocol}//${window.location.host}${wsPath}`;
};

const API_BASE_URL = getApiBaseUrl();
const WS_BASE_URL = getWebSocketUrl();

console.log('Environment:', IS_DEVELOPMENT ? 'Development' : 'Production');
console.log('API Base URL:', API_BASE_URL);
console.log('WebSocket URL:', WS_BASE_URL);

export interface Application {
  name: string;
  pid: number;
  volume: number;
  isMuted?: boolean;
}

const api = {

  // Get system volume
  async getSystemVolume(signal?: AbortSignal): Promise<{ volume: number }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/system/volume`, {
        signal,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching system volume:', error);
      throw error;
    }
  },

  // Update system volume
  async updateSystemVolume(volume: number, signal?: AbortSignal): Promise<void> {
    try {
      await axios.post(`${API_BASE_URL}/api/system/volume`, { volume }, {
        signal,
      });
    } catch (error) {
      console.error('Error updating system volume:', error);
      throw error;
    }
  },

  // Toggle system mute
  async toggleSystemMute(signal?: AbortSignal): Promise<{ isMuted: boolean }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/system/mute/toggle`, {}, {
        signal,
      });
      return response.data;
    } catch (error) {
      console.error('Error toggling system mute:', error);
      throw error;
    }
  },

  // Fetch all applications
  async getApplications(signal?: AbortSignal): Promise<Application[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/applications`, {
        signal,
      });
      
      // Convert volume from 0-100 to 0-1 scale
      const applications = Array.isArray(response?.data) ? response.data : [];
      return applications.map(app => ({
        ...app,
        // volume: app.volume / 100 // Convert from percentage to decimal
      }));
    } catch (error) {
      console.error('Error fetching applications:', error);
      throw error;
    }
  },

  // Update volume for an application
  async updateVolume(
    appName: string, 
    volume: number, 
    signal?: AbortSignal
  ): Promise<void> {
    try {
      // Convert volume from 0-1 to 0-100 for the backend
      // const volumePercentage = Math.round(volume * 100);
      
      await axios.post(
        `${API_BASE_URL}/api/volume`,
        { app_name: appName, volume: volume },
        { 
          signal,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error(`Error updating volume for ${appName}:`, error);
      throw error;
    }
  },

  // Create a cancel token source for request cancellation
  createCancelTokenSource(): CancelTokenSource {
    return axios.CancelToken.source();
  },

  // Check if an error is a cancellation
  isCancel(error: unknown): boolean {
    return axios.isCancel(error);
  },

  // Helper to extract error message from various error types
  getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      return error.response?.data?.message || error.message;
    }
    return error instanceof Error ? error.message : 'An unknown error occurred';
  },
};

export default api;
