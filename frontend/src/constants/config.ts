// Scroll and volume control configuration
export const SCROLL_CONFIG = {
  DEBOUNCE_MIN_MS: 30,
  SENSITIVITY_SCALE: 0.05,
  MIN_INCREMENT: 1,
  MAX_INCREMENT_MULTIPLIER: 10,
  DEBOUNCE_BASE_MS: 300,
  DEBOUNCE_MAX_REDUCTION_MS: 200,
  DEBOUNCE_DELTA_MULTIPLIER: 5,
  FINAL_ADJUSTMENT_STEP: 2,
} as const;

// Volume constraints
export const VOLUME_CONSTRAINTS = {
  MIN: 0,
  MAX: 100,
  DEFAULT_STEP: 5,
} as const;

// WebSocket configuration
export const WEBSOCKET_CONFIG = {
  // Reconnection
  MAX_RECONNECT_ATTEMPTS: 10,
  INITIAL_RECONNECT_DELAY_MS: 1000,
  MAX_RECONNECT_DELAY_MS: 30000,
  RECONNECT_DELAY_MULTIPLIER: 2,
  JITTER_FACTOR: 0.3, // 30% random jitter to prevent thundering herd
  
  // Health monitoring
  HEARTBEAT_INTERVAL_MS: 30000, // Send ping every 30 seconds
  HEARTBEAT_TIMEOUT_MS: 5000, // Wait 5 seconds for pong
  
  // Connection
  CONNECTION_TIMEOUT_MS: 10000,
} as const;

// API configuration
export const API_CONFIG = {
  DEFAULT_PORT: 8777,
  REQUEST_TIMEOUT_MS: 5000,
} as const;
