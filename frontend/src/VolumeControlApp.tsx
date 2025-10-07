import {useState, useCallback} from 'react';
import {
  Text,
  Container,
  Title,
  Button,
  Group,
  AppShell,
  Box,
} from '@mantine/core';
import {ApplicationCard} from './components/volume-control/ApplicationCard/ApplicationCard';
import {useVolumeControl} from './hooks/useVolumeControl';
import {useWebSocket} from './hooks/useWebSocket';
import {ThemeToggle} from './components/common/ThemeToggle/ThemeToggle';
import {useSystemVolume} from './hooks/useSystemVolume';
import styles from './VolumeControlApp.module.css';

const HORIZONTAL = 'horizontal';
// const VERTICAL = 'vertical';

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
    toggleMute,
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
    <AppShell header={{height: 60}} padding="md">
      <AppShell.Header>
        <Container size="xl" h="100%" className={styles.headerContainer}>
          <Group justify="space-between" align="center" h="100%">
            <Title order={4} style={{textAlign: 'center'}}>
              Volume Control
            </Title>
            <ThemeToggle />
          </Group>
        </Container>
      </AppShell.Header>
      <AppShell.Main className={styles.noScrollOnTouch}>
        <Container size="xl" py="md" className={styles.mainContainer}>
          {isLoading ? (
            <Box className={styles.loadingBox}>
              <Text c="dimmed" inherit>
                Loading applications...
              </Text>
            </Box>
          ) : error ? (
            <Box className={styles.errorBox}>
              <Text c="red" mb="md" fw={500} inherit>
                {error}
              </Text>
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
              <div className={styles.systemSection}>
                <Group justify="space-between" align="center" mb="sm" w="100%">
                  <Text style={{textAlign: 'center'}} size="lg" fw={500}>
                    System Volume
                  </Text>
                  <Button
                    variant="light"
                    color={systemIsMuted ? 'red' : 'blue'}
                    onClick={toggleSystemMute}
                    leftSection={
                      systemIsMuted ? <span>🔇</span> : <span>🔊</span>
                    }
                    size="compact-sm"
                    radius="xl"
                  >
                    {systemIsMuted
                      ? 'Muted - Click to Unmute'
                      : 'Click to Mute'}
                  </Button>
                </Group>
                <ApplicationCard
                  name="💻System Volume"
                  volume={systemVolume}
                  isMuted={systemIsMuted}
                  onVolumeChange={setSystemVolume}
                  onVolumeChangeEnd={setSystemVolume}
                  isSystem
                />
              </div>
              <div className={styles.appsGrid}>
                {applications.map((app) => (
                  <ApplicationCard
                    key={app.name}
                    name={app.name}
                    volume={app.volume}
                    isMuted={app.isMuted}
                    onVolumeChange={(volume) =>
                      handleVolumeChange(app.name, volume)
                    }
                    onVolumeChangeEnd={(volume) =>
                      handleVolumeChangeEnd(app.name, volume)
                    }
                    onToggleMute={() => toggleMute(app.name)}
                    orientation={HORIZONTAL}
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
