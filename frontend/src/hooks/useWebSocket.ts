import { useState, useEffect, useCallback, useRef } from 'react';
import WebSocketService from '../services/websocket';
import type { WebSocketStatus, WebSocketMessage } from '@/types';

interface UseWebSocketProps {
  onVolumeChange: (data: { appName: string; volume: number; action?: 'update' | 'add' | 'remove' }) => void;
  apiUrl: string;
}

export const useWebSocket = ({ onVolumeChange, apiUrl }: UseWebSocketProps) => {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const wsService = useRef<WebSocketService | null>(null);

  // Check if WebSocket is disabled via environment variable
  const isWebSocketDisabled = import.meta.env.VITE_DISABLE_WEBSOCKET === 'true';

  // Initialize WebSocket service
  useEffect(() => {
    // Skip WebSocket initialization if disabled
    if (isWebSocketDisabled) {
      setStatus('disconnected');
      setStatusMessage('WebSocket disabled');
      return;
    }

    wsService.current = new WebSocketService(apiUrl);
    
    // Set up status change handler
    const removeStatusHandler = wsService.current.addStatusChangeHandler(
      (newStatus, message) => {
        setStatus(newStatus);
        if (message) setStatusMessage(message);
      }
    );

    // Set up message handler
    const removeMessageHandler = wsService.current.addMessageHandler((data: WebSocketMessage) => {
      switch (data.type) {
        case 'volume_changed':
          onVolumeChange({
            appName: data.app_name || '',
            volume: data.volume || 0,
            action: 'update'
          });
          break;
        case 'app_added':
          onVolumeChange({
            appName: data.app_name || '',
            volume: data.volume || 0,
            action: 'add'
          });
          break;
        case 'app_removed':
          onVolumeChange({
            appName: data.app_name || '',
            volume: 0,
            action: 'remove'
          });
          break;
        // ping/pong are handled internally by WebSocketService
      }
    });

    // Connect to WebSocket
    wsService.current.connect();

    // Cleanup on unmount
    return () => {
      removeStatusHandler();
      removeMessageHandler();
      wsService.current?.disconnect();
    };
  }, [apiUrl, onVolumeChange, isWebSocketDisabled]);

  // Reconnect function
  const reconnect = useCallback(() => {
    if (isWebSocketDisabled) {
      console.warn('WebSocket is disabled via VITE_DISABLE_WEBSOCKET');
      return;
    }
    if (wsService.current) {
      wsService.current.connect();
    }
  }, [isWebSocketDisabled]);

  // Send message function
  const sendMessage = useCallback((data: WebSocketMessage | Record<string, unknown>) => {
    if (isWebSocketDisabled) {
      console.warn('WebSocket is disabled via VITE_DISABLE_WEBSOCKET');
      return;
    }
    if (wsService.current) {
      wsService.current.sendMessage(data);
    }
  }, [isWebSocketDisabled]);

  return {
    status,
    statusMessage,
    reconnect,
    sendMessage,
    isConnected: status === 'connected',
  };
};
