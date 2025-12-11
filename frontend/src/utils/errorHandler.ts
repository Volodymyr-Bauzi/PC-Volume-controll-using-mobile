import axios from 'axios';

export interface ErrorHandlerOptions {
  showNotification?: boolean;
  logToConsole?: boolean;
}

/**
 * Centralized error handler for API and application errors
 * Extract error message from various error types
 */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message;
  }
  return error instanceof Error ? error.message : 'An unknown error occurred';
};

/**
 * Check if error is a cancellation error
 */
export const isCancelError = (error: unknown): boolean => {
  return axios.isCancel(error);
};
