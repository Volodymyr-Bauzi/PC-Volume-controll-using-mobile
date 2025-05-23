import { useState, useCallback, useEffect, useRef } from 'react';

import { type Application } from '../services/api';
import api from '../services/api';

export const useVolumeControl = (initialApplications: Application[] = []) => {
  const [applications, setApplications] = useState<Application[]>(initialApplications);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const volumeRequestControllers = useRef<Record<string, AbortController>>({});

  // Fetch applications from the API
  const fetchApplications = useCallback(async () => {
    const controller = new AbortController();
    
    try {
      setIsLoading(true);
      setError(null);
      
      const apps = await api.getApplications(controller.signal);
      setApplications(apps);
      return apps;
    } catch (err) {
      if (!controller.signal.aborted) {
        const message = api.getErrorMessage(err);
        setError(`Failed to load applications: ${message}`);
        console.error('Error fetching applications:', err);
      }
      return [];
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  // Handle volume change (local state only)
  const handleVolumeChange = useCallback((appName: string, newVolume: number) => {
    setApplications(prev => 
      prev.map(app => 
        app.name === appName 
          ? { ...app, volume: newVolume } 
          : app
      )
    );
  }, []);

  // Handle volume change end (send to server)
  const handleVolumeChangeEnd = useCallback(async (appName: string, newVolume: number) => {
    // Cancel any pending request for this app
    if (volumeRequestControllers.current[appName]) {
      volumeRequestControllers.current[appName].abort();
      delete volumeRequestControllers.current[appName];
    }
    
    // Create a new controller for this request
    const controller = new AbortController();
    volumeRequestControllers.current[appName] = controller;
    
    try {
      await api.updateVolume(appName, newVolume, controller.signal);
      // Update local state to ensure it matches the server
      handleVolumeChange(appName, newVolume);
    } catch (err) {
      if (controller.signal.aborted) {
        // Request was cancelled, no need to handle as an error
        return;
      }
      
      const message = api.getErrorMessage(err);
      setError(`Failed to update volume: ${message}`);
      console.error('Error updating volume:', err);
      
      // Re-fetch applications to get the correct state from the server
      fetchApplications();
    } finally {
      // Clean up the controller if it's still the current one
      if (volumeRequestControllers.current[appName] === controller) {
        delete volumeRequestControllers.current[appName];
      }
    }
  }, [fetchApplications, handleVolumeChange]);

  // Handle WebSocket updates
  const handleWebSocketVolumeChange = useCallback(({ appName, volume, action }: { appName: string; volume: number; action?: 'update' | 'add' | 'remove' }) => {
    setApplications(prev => {
      switch (action) {
        case 'add':
          // Only add if not already present
          if (!prev.some(app => app.name === appName)) {
            return [...prev, { name: appName, volume: volume, pid: 0 }];
          }
          return prev;
        case 'remove':
          return prev.filter(app => app.name !== appName);
        case 'update':
        default:
          return prev.map(app => 
            app.name === appName 
              ? { ...app, volume: volume } 
              : app
          );
      }
    });
  }, []);

  // Clean up controllers on unmount
  useEffect(() => {
    // Initial fetch
    fetchApplications();
    
    return () => {
      // Abort any pending requests
      Object.values(volumeRequestControllers.current).forEach(controller => {
        controller.abort();
      });
    };
  }, [fetchApplications]);

  return {
    applications,
    isLoading,
    error,
    fetchApplications,
    handleVolumeChange,
    handleVolumeChangeEnd,
    handleWebSocketVolumeChange,
  };
};
