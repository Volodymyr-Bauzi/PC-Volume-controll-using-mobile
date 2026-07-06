import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Text, Title, Button, Box } from '@mantine/core';
import '@mantine/core/styles.css';

import { useVolumeControl } from './hooks/useVolumeControl';
import { useWebSocket } from './hooks/useWebSocket';
import { ThemeToggle } from './components/common/ThemeToggle/ThemeToggle';
import { useSystemVolume } from './hooks/useSystemVolume';
import styles from './VolumeControlApp.module.css';
import { ApplicationCard, MediaControls, PresetsModal, AppLauncherModal } from './components/volume-control';
import { IconList, IconRocket } from '@tabler/icons-react';
import { SCROLL_CONFIG, VOLUME_CONSTRAINTS, API_CONFIG } from '@/constants';
import { clamp, calculateVolumeIncrement } from '@/utils';

export function VolumeControlApp() {
  const apiUrl = useMemo(() => {
    // In development, use the configured API URL or default to localhost with port
    if (import.meta.env.DEV) {
      const port = import.meta.env.VITE_API_PORT || API_CONFIG.DEFAULT_PORT;
      return `http://${window.location.hostname}:${port}`;
    }
    // In production, use relative URLs or the configured production URL
    return import.meta.env.VITE_API_URL || '';
  }, []);

  // Refs for smooth scrolling
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTimeRef = useRef<number>(0);

  // Hover state for wheel control
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Modal states
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);

  const {
    applications,
    isLoading,
    error,
    handleVolumeChange,
    handleWebSocketVolumeChange,
    handleApplicationsSync,
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
    onApplicationsSync: handleApplicationsSync,
    apiUrl,
  });

  // Handle error dismissal
  const handleDismissError = useCallback(() => {
    // In a real app, you might want to implement a more robust error handling strategy
    window.location.reload();
  }, []);

  // Smooth volume change function
  const smoothVolumeChange = useCallback(
    (
      currentVolume: number,
      delta: number,
      callback: (volume: number) => void
    ) => {
      const now = Date.now();
      const timeSinceLastScroll = now - lastScrollTimeRef.current;

      // Clear any existing timeout
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

      if (timeSinceLastScroll < SCROLL_CONFIG.DEBOUNCE_MIN_MS) return;

      // Calculate new volume with smooth increment
      const increment = calculateVolumeIncrement(
        delta,
        SCROLL_CONFIG.SENSITIVITY_SCALE,
        SCROLL_CONFIG.MIN_INCREMENT,
        SCROLL_CONFIG.MAX_INCREMENT_MULTIPLIER
      );
      const newVolume = clamp(
        currentVolume + (delta > 0 ? increment : -increment),
        VOLUME_CONSTRAINTS.MIN,
        VOLUME_CONSTRAINTS.MAX
      );

      // Apply the change immediately for responsiveness
      callback(newVolume);

      // Update last scroll time
      lastScrollTimeRef.current = now;

      const debounceTime = Math.max(
        SCROLL_CONFIG.DEBOUNCE_BASE_MS -
          Math.min(
            SCROLL_CONFIG.DEBOUNCE_MAX_REDUCTION_MS,
            Math.abs(delta) * SCROLL_CONFIG.DEBOUNCE_DELTA_MULTIPLIER
          ),
        100
      );

      // Set a timeout to debounce rapid changes
      scrollTimeoutRef.current = setTimeout(() => {
        // Final volume adjustment after scrolling stops
        const finalVolume = clamp(
          currentVolume +
            (delta > 0
              ? SCROLL_CONFIG.FINAL_ADJUSTMENT_STEP
              : -SCROLL_CONFIG.FINAL_ADJUSTMENT_STEP),
          VOLUME_CONSTRAINTS.MIN,
          VOLUME_CONSTRAINTS.MAX
        );
        callback(finalVolume);
      }, debounceTime);
    },
    []
  );

  // Mouse wheel handler for system volume (only when card is hovered)
  const handleSystemVolumeWheel = useCallback(
    (e: React.WheelEvent) => {
      if (hoveredCard === "master") {
        const delta = e.deltaY > 0 ? -5 : 5; // Scroll down decreases, scroll up increases
        smoothVolumeChange(systemVolume, delta, setSystemVolume);
      }
    },
    [systemVolume, smoothVolumeChange, hoveredCard]
  );

  // Mouse wheel handler for application volume (only when card is hovered)
  const handleAppVolumeWheel = useCallback(
    (appName: string, currentVolume: number) => {
      return (e: React.WheelEvent) => {
        if (hoveredCard === appName) {
          const delta = e.deltaY > 0 ? -5 : 5; // Scroll down decreases, scroll up increases
          smoothVolumeChange(currentVolume, delta, (newVolume) => {
            handleVolumeChange(appName, newVolume);
          });
        }
      };
    },
    [handleVolumeChange, smoothVolumeChange, hoveredCard]
  );



  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={styles.appContainer}>
      <div className={styles.header}>
        <div style={{ flex: 1 }}>
          <Title order={1} className={styles.title}>
            Volume Control Center
          </Title>
          <Text className={styles.subtitle}>
            Manage audio levels for all your applications
          </Text>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Button 
            variant="light" 
            leftSection={<IconList size={16} />}
            onClick={() => setPresetsOpen(true)}
          >
            Presets
          </Button>
          <Button 
            variant="light" 
            leftSection={<IconRocket size={16} />}
            onClick={() => setLauncherOpen(true)}
          >
            Apps
          </Button>
          <div className={styles.themeToggle}>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <PresetsModal 
        opened={presetsOpen} 
        onClose={() => setPresetsOpen(false)} 
        apiUrl={apiUrl}
        currentApps={applications}
      />

      <AppLauncherModal
        opened={launcherOpen}
        onClose={() => setLauncherOpen(false)}
        apiUrl={apiUrl}
      />

      <div className={styles.content}>
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
            <MediaControls apiUrl={apiUrl} />
            <div className={styles.volumeGrid}>
            {/* Master Volume Card */}
            <ApplicationCard
              app={{
                name: "Main Volume",
                volume: systemVolume,
                isMuted: systemIsMuted,
              }}
              onCardHover={() => setHoveredCard("master")}
              onSystemVolumeChange={setSystemVolume}
              onMuteToggle={toggleSystemMute}
              handleVolumeWheel={handleSystemVolumeWheel}
              masterVolume
            />

            {/* Application Cards */}
            {applications.map((app) => {
              const appVolumeWheel = handleAppVolumeWheel?.(
                app.name,
                app.volume
              );

              return (
                <ApplicationCard
                  key={app.name}
                  app={app}
                  handleVolumeWheel={appVolumeWheel}
                  onCardHover={setHoveredCard}
                  onVolumeChange={handleVolumeChange}
                  onMuteToggle={toggleMute}
                />
              );
            })}
          </div>
          {/* Informative empty state: e.g. macOS only exposes master volume */}
          {applications.length === 0 && (
            <Text c="dimmed" ta="center" size="sm" mt="lg">
              No per-app audio sessions detected — this system only supports
              controlling the main volume. On macOS, per-application volume
              is not available.
            </Text>
          )}
          </>
        )}
      </div>
    </div>
  );
}

export default VolumeControlApp;
