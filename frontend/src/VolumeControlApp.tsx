import { useState, useCallback } from 'react';
import { Text, Container, Title, Button, Group, AppShell, Box } from '@mantine/core';
import { ApplicationCard } from './components/volume-control/ApplicationCard/ApplicationCard';
import { useVolumeControl } from './hooks/useVolumeControl';
import { useWebSocket } from './hooks/useWebSocket';
import { ThemeToggle } from './components/common/ThemeToggle/ThemeToggle';
import { useSystemVolume } from './hooks/useSystemVolume';

export function VolumeControlApp() {
  const [apiUrl] = useState<string>(() => {
    // In development, use the configured API URL or default to localhost with port 8777
    if (import.meta.env.DEV) {
      const port = import.meta.env.VITE_API_PORT || 8777;
      return `http://${window.location.hostname}:${port}`;
    }
    // In production, use relative URLs or the configured production URL
    return import.meta.env.VITE_API_URL || '';
  });

  const {
    applications,
    isLoading,
    error,
    handleVolumeChange,
    handleVolumeChangeEnd,
    handleWebSocketVolumeChange,
  } = useVolumeControl([]);

  const {
    volume: systemVolume,
    isMuted: systemIsMuted,
    setVolume: setSystemVolume,
    toggleMute: toggleSystemMute,
  } = useSystemVolume();

  // Set up WebSocket connection
  useWebSocket({
    onVolumeChange: handleWebSocketVolumeChange,
    apiUrl,
  });


  // Handle error dismissal
  const handleDismissError = useCallback(() => {
    // In a real app, you might want to implement a more robust error handling strategy
    window.location.reload();
  }, []);

  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
    >
      <AppShell.Header>
        <Container size="xl" h="100%">
          <Group justify="space-between" align="center" h="100%">
            <Title order={4}>Volume Control</Title>
            <ThemeToggle />
          </Group>
        </Container>
      </AppShell.Header>
      <AppShell.Main>
        <Container size="xl" py="md">
        
        {isLoading ? (
          <Box py="xl" style={{ textAlign: 'center' }}>
            <Text c="dimmed" inherit>Loading applications...</Text>
          </Box>
        ) : error ? (
          <Box py="xl" style={{ textAlign: 'center' }}>
            <Text c="red" mb="md" fw={500} inherit>{error}</Text>
            <Button 
              onClick={handleDismissError} 
              variant="light"
              color="blue"
              mt="md"
            >
              Retry Connection
            </Button>
          </Box>
        ) : (
          <>
          <div style={{ marginBottom: '2rem' }}>
            <Group justify="space-between" align="center" mb="sm">
              <Text size="lg" fw={500}>System Volume</Text>
              <Button 
                variant="light" 
                color={systemIsMuted ? 'red' : 'blue'} 
                onClick={toggleSystemMute}
                leftSection={systemIsMuted ? <span>🔇</span> : <span>🔊</span>}
                size="compact-sm"
                radius="xl"
              >
                {systemIsMuted ? 'Muted - Click to Unmute' : 'Click to Mute'}
              </Button>
            </Group>
            <ApplicationCard
              name="System Volume"
              volume={systemVolume}
              isMuted={systemIsMuted}
              onVolumeChange={setSystemVolume}
              onVolumeChangeEnd={setSystemVolume}
            />
          </div>
          <div style= {{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {applications.map((app) => (
              <ApplicationCard
                key={app.name}
                name={app.name}
                volume={app.volume}
                isMuted={app.isMuted}
                onVolumeChange={(volume) => handleVolumeChange(app.name, volume)}
                onVolumeChangeEnd={(volume) => handleVolumeChangeEnd(app.name, volume)}
              />
            ))}
          </div>
          </>
        )} 
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

export default VolumeControlApp;
