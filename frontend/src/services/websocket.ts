type WebSocketStatus = 'connected' | 'connecting' | 'disconnected' | 'error';
type WebSocketMessageHandler = (data: any) => void;
type StatusChangeHandler = (status: WebSocketStatus, message?: string) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private messageHandlers: Set<WebSocketMessageHandler> = new Set();
  private statusChangeHandlers: Set<StatusChangeHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  private isManuallyClosed = false;
  private url: string;

  constructor(baseUrl: string) {
    this.url = this.normalizeUrl(baseUrl);
  }

  private normalizeUrl(baseUrl: string): string {
    try {
      const port = import.meta.env.VITE_API_PORT || 8001;
      
      if (!baseUrl || baseUrl.trim() === '') {
        console.warn('Empty API URL, using current hostname for WebSocket');
        return `ws://${window.location.hostname}:${port}/ws`;
      }
      
      // If baseUrl is a full URL, convert it to WebSocket URL
      if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://') || 
          baseUrl.startsWith('ws://') || baseUrl.startsWith('wss://')) {
        const url = new URL(baseUrl);
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        url.pathname = '/ws';
        return url.toString();
      }
      
      // If it's just a hostname or hostname:port, construct the WebSocket URL
      const host = baseUrl.includes(':') ? baseUrl : `${baseUrl}:${port}`;
      return `ws://${host}/ws`;
      
    } catch (error) {
      console.error('Error creating WebSocket URL:', error);
      // Fallback to localhost if there's an error
      const port = import.meta.env.VITE_API_PORT || 8001;
      return `ws://localhost:${port}/ws`;
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
      this.updateStatus('connected');
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.notifyMessageHandlers(data);
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    this.socket.onclose = () => {
      if (!this.isManuallyClosed) {
        this.handleConnectionError('Connection closed');
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

  private handleConnectionError(message: string): void {
    console.error(message);
    this.updateStatus('error', message);
    this.cleanup();
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateStatus('error', 'Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    this.updateStatus('connecting', `Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    this.reconnectTimeout = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  private cleanup(): void {
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
    this.statusChangeHandlers.forEach(handler => handler(status, message));
  }

  private notifyMessageHandlers(data: any): void {
    this.messageHandlers.forEach(handler => {
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

  sendMessage(data: any): void {
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
}

export default WebSocketService;
export type { WebSocketStatus, WebSocketMessageHandler, StatusChangeHandler };
