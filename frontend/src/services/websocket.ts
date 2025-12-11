import type {
  WebSocketStatus,
  WebSocketMessage,
  ConnectionMetrics,
} from '@/types';
import { WEBSOCKET_CONFIG } from '@/constants';

type WebSocketMessageHandler = (data: WebSocketMessage) => void;
type StatusChangeHandler = (status: WebSocketStatus, message?: string) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private messageHandlers: Set<WebSocketMessageHandler> = new Set();
  private statusChangeHandlers: Set<StatusChangeHandler> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimeout: number | null = null;
  private heartbeatInterval: number | null = null;
  private heartbeatTimeout: number | null = null;
  private isManuallyClosed = false;
  private url: string;
  private connectedAt: number | null = null;

  // Connection metrics
  private metrics: ConnectionMetrics = {
    totalConnections: 0,
    totalReconnections: 0,
    currentConnectionDuration: 0,
  };

  constructor(baseUrl: string) {
    this.url = this.normalizeUrl(baseUrl);
  }

  private normalizeUrl(baseUrl: string): string {
    try {
      // In production, use the provided baseUrl or default to relative /ws
      if (!import.meta.env.DEV) {
        const wsPath = baseUrl.trim() || import.meta.env.VITE_WS_URL || 'ws';
        if (wsPath.startsWith('ws')) {
          return wsPath;
        }
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}${
          wsPath.startsWith('/') ? wsPath : `/${wsPath}`
        }`;
      }

      // In development, construct WebSocket URL with the correct port
      const port =
        import.meta.env.VITE_WS_PORT || import.meta.env.VITE_API_PORT || 8777;
      const host = window.location.hostname;

      if (baseUrl && baseUrl.trim() !== '') {
        // If baseUrl is a full URL, convert it to WebSocket URL
        if (baseUrl.startsWith('http')) {
          const url = new URL(baseUrl);
          url.protocol = 'ws:';
          return url.toString();
        }
        // If it's just a hostname or hostname:port, construct the WebSocket URL
        const host = baseUrl.includes(':') ? baseUrl : `${baseUrl}:${port}`;
        return `ws://${host}/ws`;
      }

      // Default to current host with development port
      return `ws://${host}:${port}/ws`;
    } catch (error) {
      console.error('Error creating WebSocket URL:', error);
      // Fallback to development defaults
      const port =
        import.meta.env.VITE_WS_PORT || import.meta.env.VITE_API_PORT || 8777;
      return `ws://${window.location.hostname}:${port}/ws`;
    }
  }

  connect(): void {
    if (this.socket) {
      this.disconnect();
    }

    this.isManuallyClosed = false;
    this.updateStatus('connecting');

    try {
      this.socket = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.handleConnectionError('Connection failed');
    }
  }

  disconnect(): void {
    this.isManuallyClosed = true;
    this.cleanup();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.connectedAt = Date.now();
      this.metrics.totalConnections++;
      if (this.metrics.totalConnections > 1) {
        this.metrics.totalReconnections++;
      }
      this.metrics.lastSuccessfulConnection = Date.now();
      
      this.updateStatus('connected');
      this.startHeartbeat();
    };

    this.socket.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        
        // Handle pong response
        if (data.type === 'pong') {
          this.handlePong();
          return;
        }
        
        this.notifyMessageHandlers(data);
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    this.socket.onclose = (event) => {
      this.stopHeartbeat();
      
      if (this.connectedAt) {
        const duration = Date.now() - this.connectedAt;
        this.metrics.currentConnectionDuration = duration;
        this.metrics.lastDisconnection = Date.now();
      }
      
      if (!this.isManuallyClosed) {
        this.handleConnectionError(`Connection closed (code: ${event.code})`);
        this.attemptReconnect();
      } else {
        this.updateStatus('disconnected');
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (!this.isManuallyClosed) {
        this.handleConnectionError('Connection error');
      }
    };
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = window.setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.sendMessage({ type: 'ping', timestamp: Date.now() });
        
        // Set timeout for pong response
        this.heartbeatTimeout = window.setTimeout(() => {
          console.warn('Heartbeat timeout - no pong received');
          this.handleConnectionError('Heartbeat timeout');
          this.socket?.close();
        }, WEBSOCKET_CONFIG.HEARTBEAT_TIMEOUT_MS);
      }
    }, WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout !== null) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private handlePong(): void {
    if (this.heartbeatTimeout !== null) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private handleConnectionError(message: string): void {
    console.error(message);
    this.updateStatus('error', message);
    this.cleanup();
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      this.updateStatus(
        'max_retries_exceeded',
        'Max reconnection attempts reached'
      );
      return;
    }

    this.reconnectAttempts++;
    
    // Calculate delay with exponential backoff and jitter
    const baseDelay = Math.min(
      WEBSOCKET_CONFIG.INITIAL_RECONNECT_DELAY_MS *
        Math.pow(
          WEBSOCKET_CONFIG.RECONNECT_DELAY_MULTIPLIER,
          this.reconnectAttempts - 1
        ),
      WEBSOCKET_CONFIG.MAX_RECONNECT_DELAY_MS
    );
    
    // Add random jitter (0 to JITTER_FACTOR * baseDelay)
    const jitter = Math.random() * WEBSOCKET_CONFIG.JITTER_FACTOR * baseDelay;
    const delay = baseDelay + jitter;

    this.updateStatus(
      'reconnecting',
      `Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts}/${WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS})...`
    );

    this.reconnectTimeout = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  private cleanup(): void {
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;

      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close();
      }

      this.socket = null;
    }

    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private updateStatus(status: WebSocketStatus, message?: string): void {
    this.statusChangeHandlers.forEach((handler) => handler(status, message));
  }

  private notifyMessageHandlers(data: WebSocketMessage): void {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  // Public methods
  addMessageHandler(handler: WebSocketMessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  addStatusChangeHandler(handler: StatusChangeHandler): () => void {
    this.statusChangeHandlers.add(handler);
    return () => this.statusChangeHandlers.delete(handler);
  }

  sendMessage(data: WebSocketMessage | Record<string, unknown>): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        this.socket.send(message);
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  getStatus(): WebSocketStatus {
    if (!this.socket) return 'disconnected';

    switch (this.socket.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
      default:
        return 'disconnected';
    }
  }

  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }
}

export default WebSocketService;
export type { WebSocketMessageHandler, StatusChangeHandler };
