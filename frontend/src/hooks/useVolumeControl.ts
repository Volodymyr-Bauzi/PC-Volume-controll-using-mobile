import { useState, useCallback, useEffect, useRef } from 'react';
import { type Application } from '../services/api';
import api from '../services/api';

// Store previous volume levels when muting
const usePreviousVolume = () => {
  const prevVolumesRef = useRef<Record<string, number>>({});
  
  const saveVolume = useCallback((appName: string, volume: number) => {
    prevVolumesRef.current[appName] = volume;
  }, []);
  
  const getVolume = useCallback((appName: string) => {
    return prevVolumesRef.current[appName] ?? 50; // Default to 50 if no previous volume
  }, []);
  
  return { saveVolume, getVolume };
};

export const useVolumeControl = (initialApplications: Application[] = []) => {
  const [applications, setApplications] = useState<Application[]>(initialApplications);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const volumeRequestControllers = useRef<Record<string, AbortController>>({});
  const updateTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const lastRequestedVolumeRef = useRef<Record<string, number>>({});
  const { saveVolume, getVolume } = usePreviousVolume();
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts
      Object.values(updateTimeoutRef.current).forEach(timeout => clearTimeout(timeout as any));
      // Abort all pending requests
      Object.values(volumeRequestControllers.current).forEach(controller => controller.abort());
    };
  }, []);

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
      setIsLoading(false);
    }
  }, []);

  // Update application volume on the server
  const updateAppVolume = useCallback(async (appName: string, volume: number) => {
    const controller = new AbortController();
    volumeRequestControllers.current[appName] = controller;
    lastRequestedVolumeRef.current[appName] = volume;
    
    try {
      await api.updateVolume(appName, volume, controller.signal);
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error(`Error updating volume for ${appName}:`, err);
        // Revert the UI if the API call fails
        setApplications(prev => 
          prev.map(app => 
            app.name === appName 
              ? { ...app, volume: app.volume } // Keep the old volume
              : app
          )
        );
      }
    } finally {
      if (volumeRequestControllers.current[appName] === controller) {
        delete volumeRequestControllers.current[appName];
      }
    }
  }, []);

  // Handle volume change with debounced server updates
  const handleVolumeChange = useCallback((appName: string, newVolume: number, isFinalUpdate = false) => {
    // Track the latest user-intended volume for conflict resolution with WS
    lastRequestedVolumeRef.current[appName] = newVolume;
    // Update local state immediately for responsive UI
    setApplications(prev => 
      prev.map(app => {
        if (app.name !== appName) return app;
        
        // If volume is being set to 0, ensure isMuted is true
        // If volume is being set above 0 and we were muted, unmute
        const isMuted = newVolume === 0 ? true : app.isMuted ? false : app.isMuted;
        
        return { 
          ...app, 
          volume: newVolume,
          isMuted
        };
      })
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
      
      updateAppVolume(appName, newVolume);
      return;
    }

    // Otherwise, debounce the update to avoid too many API calls
    updateTimeoutRef.current[appName] = setTimeout(() => {
      updateAppVolume(appName, newVolume);
    }, 150); // 150ms debounce delay
  }, [updateAppVolume]);

  // Handle volume change end (send final update to server)
  const handleVolumeChangeEnd = useCallback((appName: string, newVolume: number) => {
    // Clear any pending debounced updates
    if (updateTimeoutRef.current[appName]) {
      clearTimeout(updateTimeoutRef.current[appName]);
      delete updateTimeoutRef.current[appName];
    }
    
    // Send the final update
    handleVolumeChange(appName, newVolume, true);
  }, [handleVolumeChange]);

  // Toggle mute for an application
  const toggleMute = useCallback(async (appName: string) => {
    setApplications(prev => {
      return prev.map(app => {
        if (app.name !== appName) return app;
        
        const isMuted = !app.isMuted;
        
        if (isMuted) {
          // When muting, save the current volume
          saveVolume(appName, app.volume);
          // Set volume to 0 when muting
          handleVolumeChange(appName, 0, true);
        } else {
          // When unmuting, restore the previous volume
          const prevVolume = getVolume(appName);
          handleVolumeChange(appName, prevVolume, true);
        }
        
        return { ...app, isMuted };
      });
    });
  }, [handleVolumeChange, saveVolume, getVolume]);

  // Handle WebSocket updates
  const handleWebSocketVolumeChange = useCallback(({ appName, volume, action }: { appName: string; volume: number; action?: 'update' | 'add' | 'remove' }) => {
    // Ignore WS updates that conflict with a pending local change
    const hasPendingDebounce = Boolean(updateTimeoutRef.current[appName]);
    const hasInFlightRequest = Boolean(volumeRequestControllers.current[appName]);
    const hasPendingLocalChange = hasPendingDebounce || hasInFlightRequest;
    const lastRequested = lastRequestedVolumeRef.current[appName];

    if (action === 'update' && hasPendingLocalChange && typeof lastRequested === 'number' && lastRequested !== volume) {
      return; // drop stale WS update while user is actively changing volume
    }

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

  // WebSocket connection handled by useWebSocket hook; legacy WS removed

  // Initial fetch
  useEffect(() => {
    const fetchData = async () => {
      await fetchApplications();
    };
    
    fetchData();
  }, [fetchApplications]);

  return {
    applications,
    isLoading,
    error,
    handleVolumeChange,
    handleVolumeChangeEnd,
    handleWebSocketVolumeChange,
    toggleMute,
    refresh: fetchApplications,
  };
};
