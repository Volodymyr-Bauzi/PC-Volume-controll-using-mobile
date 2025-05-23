import React from 'react';
import { Text, Button, Center } from '@mantine/core';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error in component:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Center style={{ minHeight: '200px', flexDirection: 'column', gap: '1rem' }}>
          <Text size="lg" fw={500}>
            Something went wrong
          </Text>
          <Text c="dimmed">
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <Button 
            onClick={this.handleRetry}
            variant="light"
            color="blue"
          >
            Try Again
          </Button>
        </Center>
      );
    }


    return this.props.children;
  }
}

export default ErrorBoundary;
