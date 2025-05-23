import { useState, useEffect, useCallback, useRef } from 'react';
import WebSocketService, { type WebSocketStatus } from '../services/websocket';

interface UseWebSocketProps {
  onVolumeChange: (data: { appName: string; volume: number; action?: 'update' | 'add' | 'remove' }) => void;
  apiUrl: string;
}

export const useWebSocket = ({ onVolumeChange, apiUrl }: UseWebSocketProps) => {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const wsService = useRef<WebSocketService | null>(null);

  // Initialize WebSocket service
  useEffect(() => {
    wsService.current = new WebSocketService(apiUrl);
    
    // Set up status change handler
    const removeStatusHandler = wsService.current.addStatusChangeHandler(
      (newStatus, message) => {
        setStatus(newStatus);
        if (message) setStatusMessage(message);
      }
    );

    // Set up message handler
    const removeMessageHandler = wsService.current.addMessageHandler((data: any) => {
      switch (data.type) {
        case 'volume_changed':
          onVolumeChange({
            appName: data.app_name,
            volume: data.volume,
            action: 'update'
          });
          break;
        case 'app_added':
          onVolumeChange({
            appName: data.app_name,
            volume: data.volume || 0,
            action: 'add'
          });
          break;
        case 'app_removed':
          onVolumeChange({
            appName: data.app_name,
            volume: 0,
            action: 'remove'
          });
          break;
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
  }, [apiUrl, onVolumeChange]);

  // Reconnect function
  const reconnect = useCallback(() => {
    if (wsService.current) {
      wsService.current.connect();
    }
  }, []);

  // Send message function
  const sendMessage = useCallback((data: any) => {
    if (wsService.current) {
      wsService.current.sendMessage(data);
    }
  }, []);

  return {
    status,
    statusMessage,
    reconnect,
    sendMessage,
    isConnected: status === 'connected',
  };
};
