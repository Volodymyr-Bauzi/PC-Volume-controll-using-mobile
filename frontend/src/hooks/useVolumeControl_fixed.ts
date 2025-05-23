import { useState, useCallback, useEffect, useRef } from 'react';

import { type Application } from '../services/api';
import api from '../services/api';

export const useVolumeControl = (initialApplications: Application[] = []) => {
  const [applications, setApplications] = useState<Application[]>(initialApplications);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const volumeRequestControllers = useRef<Record<string, AbortController>>({});
  const updateTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

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

  // Handle volume change with debounced server updates
  const handleVolumeChange = useCallback((appName: string, newVolume: number, isFinalUpdate = false) => {
    // Update local state immediately for responsive UI
    setApplications(prev => 
      prev.map(app => 
        app.name === appName 
          ? { ...app, volume: newVolume } 
          : app
      )
    );

    // Clear any pending update for this app
    if (updateTimeoutRef.current[appName]) {
      clearTimeout(updateTimeoutRef.current[appName]);
      delete updateTimeoutRef.current[appName];
    }

    // Only send to server if it's the final update or we're dragging has ended
    if (isFinalUpdate) {
      // Cancel any pending request for this app
      if (volumeRequestControllers.current[appName]) {
        volumeRequestControllers.current[appName].abort();
        delete volumeRequestControllers.current[appName];
      }
      
      // Create a new controller for this request
      const controller = new AbortController();
      volumeRequestControllers.current[appName] = controller;
      
      // Send the update immediately
      api.updateVolume(appName, newVolume, controller.signal)
        .catch(err => {
          if (!controller.signal.aborted) {
            const message = api.getErrorMessage(err);
            setError(`Failed to update volume: ${message}`);
            console.error('Error updating volume:', err);
            fetchApplications();
          }
        })
        .finally(() => {
          if (volumeRequestControllers.current[appName] === controller) {
            delete volumeRequestControllers.current[appName];
          }
        });
    } else {
      // For intermediate updates, debounce the server update
      updateTimeoutRef.current[appName] = setTimeout(() => {
        // Cancel any pending request for this app
        if (volumeRequestControllers.current[appName]) {
          volumeRequestControllers.current[appName].abort();
        }
        
        // Create a new controller for this request
        const controller = new AbortController();
        volumeRequestControllers.current[appName] = controller;
        
        // Send the debounced update
        api.updateVolume(appName, newVolume, controller.signal)
          .catch(err => {
            if (!controller.signal.aborted) {
              console.error('Debounced volume update failed:', err);
              // Don't show error or refetch for debounced updates
            }
          })
          .finally(() => {
            if (volumeRequestControllers.current[appName] === controller) {
              delete volumeRequestControllers.current[appName];
            }
          });
      }, 50); // 50ms debounce for smooth dragging
    }
  }, [fetchApplications]);

  // Handle volume change end (send final update to server)
  const handleVolumeChangeEnd = useCallback(async (appName: string, newVolume: number) => {
    // Clear any pending debounced updates
    if (updateTimeoutRef.current[appName]) {
      clearTimeout(updateTimeoutRef.current[appName]);
      delete updateTimeoutRef.current[appName];
    }
    
    // Send the final update
    handleVolumeChange(appName, newVolume, true);
  }, [handleVolumeChange]);

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

  // Set up WebSocket connection
  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.hostname}:3001/ws`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'volumeUpdate') {
          handleWebSocketVolumeChange(data);
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
    
    return () => {
      ws.close();
      // Clean up any pending requests
      Object.values(volumeRequestControllers.current).forEach(controller => {
        controller.abort();
      });
      // Clear any pending timeouts
      Object.values(updateTimeoutRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, [handleWebSocketVolumeChange]);

  // Initial fetch
  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return {
    applications,
    isLoading,
    error,
    handleVolumeChange,
    handleVolumeChangeEnd,
    refresh: fetchApplications,
  };
};
