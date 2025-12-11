export interface WebSocketMessage {
  type: 'ping' | 'pong' | 'volume_changed' | 'app_added' | 'app_removed';
  data?: unknown;
  app_name?: string;
  volume?: number;
  timestamp?: number;
}

export interface ConnectionMetrics {
  totalConnections: number;
  totalReconnections: number;
  lastSuccessfulConnection?: number;
  lastDisconnection?: number;
  currentConnectionDuration: number;
}

export interface ConnectionState {
  status: WebSocketStatus;
  reconnectAttempts: number;
  lastError?: string;
  connectedAt?: number;
  disconnectedAt?: number;
}

export type WebSocketStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'max_retries_exceeded';
