import { Suspense } from 'react';
import { MantineProvider, AppShell, createTheme } from '@mantine/core';
import type { MantineThemeOverride } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ErrorBoundary, LoadingSpinner } from './components/common';
import VolumeControlApp from './VolumeControlApp';
import { ThemeProvider } from './contexts/ThemeContext';

// Create a theme instance with dark/light support
const theme: MantineThemeOverride = createTheme({
  fontFamily: 'Inter, sans-serif',
  primaryColor: 'blue',
  colors: {
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5C5F66',
      '#373A40',
      '#2C2E33',
      '#25262B',
      '#1A1B1E',
      '#141517',
      '#101113',
    ],
  },
});

const App = () => {
  return (
    <MantineProvider 
      theme={theme}
      defaultColorScheme="dark"
    >
      <ThemeProvider>
        <AppShell style={{ minHeight: '100vh' }}>
          <Notifications position="top-right" />
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner fullHeight />}>
              <VolumeControlApp />
            </Suspense>
          </ErrorBoundary>
        </AppShell>
      </ThemeProvider>
    </MantineProvider>
  );
}

export default App;
