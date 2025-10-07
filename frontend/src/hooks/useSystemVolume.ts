import {useState, useEffect, useCallback, useRef} from 'react';
import api from '../services/api';

export const useSystemVolume = () => {
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const volumeRequestController = useRef<AbortController | null>(null);
  const isMounted = useRef(true);

  const fetchSystemVolume = useCallback(async () => {
    if (volumeRequestController.current) {
      volumeRequestController.current.abort();
    }

    const controller = new AbortController();
    volumeRequestController.current = controller;

    try {
      setIsLoading(true);

      // Fetch volume and mute status in parallel
      const [volumeResponse, muteResponse] = await Promise.all([
        api.getSystemVolume(controller.signal),
        api.toggleSystemMute(controller.signal),
      ]);

      if (!isMounted.current) return;

      setVolume(volumeResponse.volume);
      setIsMuted(muteResponse.isMuted);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (isMounted.current) {
        setError('Failed to fetch system volume');
        console.error('Error fetching system volume:', err);
      }
    } finally {
      if (volumeRequestController.current === controller) {
        volumeRequestController.current = null;
      }
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const updateVolume = useCallback(
    async (newVolume: number) => {
      // Update local state immediately for responsiveness
      setVolume(newVolume);

      // Cancel any pending request
      if (volumeRequestController.current) {
        volumeRequestController.current.abort();
      }

      const controller = new AbortController();
      volumeRequestController.current = controller;

      try {
        await api.updateSystemVolume(newVolume, controller.signal);
        // No need to update state here as we already did it optimistically
      } catch (err) {
        if (controller.signal.aborted) return;

        // Revert to previous state on error
        if (isMounted.current) {
          setError('Failed to update system volume');
          console.error(err);
          // Refresh actual state from server
          fetchSystemVolume();
        }
      } finally {
        if (volumeRequestController.current === controller) {
          volumeRequestController.current = null;
        }
      }
    },
    [fetchSystemVolume]
  );

  const toggleMute = useCallback(async () => {
    const previousMuted = isMuted;
    // Optimistic update
    setIsMuted((prev) => !prev);

    try {
      const response = await api.toggleSystemMute();
      if (isMounted.current && response.isMuted !== !previousMuted) {
        setIsMuted(response.isMuted);
      }
    } catch (err) {
      if (isMounted.current) {
        setError('Failed to toggle mute');
        console.error(err);
        // Revert on error
        setIsMuted(previousMuted);
      }
    }
  }, [isMuted]);

  useEffect(() => {
    isMounted.current = true;
    fetchSystemVolume();

    return () => {
      isMounted.current = false;
      if (volumeRequestController.current) {
        volumeRequestController.current.abort();
      }
    };
  }, [fetchSystemVolume]);

  return {
    volume,
    isMuted,
    isLoading,
    error,
    setVolume: updateVolume,
    toggleMute,
    refresh: fetchSystemVolume,
  };
};
