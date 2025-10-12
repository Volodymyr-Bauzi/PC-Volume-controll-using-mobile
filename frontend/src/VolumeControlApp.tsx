import { useState, useCallback, useRef, useEffect } from "react";
import {
  Text,
  Title,
  Button,
  Box,
  Card,
  Slider,
  ActionIcon,
} from "@mantine/core";
import { useVolumeControl } from "./hooks/useVolumeControl";
import { useWebSocket } from "./hooks/useWebSocket";
import { ThemeToggle } from "./components/common/ThemeToggle/ThemeToggle";
import { useSystemVolume } from "./hooks/useSystemVolume";
import styles from "./VolumeControlApp.module.css";
import { getAppIcon } from "./helpers/getAppIcon";

// const HORIZONTAL = "horizontal";
// const VERTICAL = 'vertical';

export function VolumeControlApp() {
  const [apiUrl] = useState<string>(() => {
    // In development, use the configured API URL or default to localhost with port 8777
    if (import.meta.env.DEV) {
      const port = import.meta.env.VITE_API_PORT || 8777;
      return `http://${window.location.hostname}:${port}`;
    }
    // In production, use relative URLs or the configured production URL
    return import.meta.env.VITE_API_URL || "";
  });

  // Refs for smooth scrolling
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTimeRef = useRef<number>(0);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<{
    name: string;
    volume: number;
    isMuted: boolean;
  } | null>(null);

  // Hover state for wheel control
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

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
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Calculate new volume with smooth increment
      const increment = Math.max(1, Math.floor(Math.abs(delta) / 10)); // Minimum 1% change
      const newVolume = Math.max(
        0,
        Math.min(100, currentVolume + (delta > 0 ? increment : -increment))
      );

      // Apply the change immediately for responsiveness
      callback(newVolume);

      // Update last scroll time
      lastScrollTimeRef.current = now;

      // Set a timeout to debounce rapid changes
      scrollTimeoutRef.current = setTimeout(() => {
        // Final volume adjustment after scrolling stops
        const finalVolume = Math.max(
          0,
          Math.min(100, currentVolume + (delta > 0 ? 2 : -2))
        );
        callback(finalVolume);
      }, 150);
    },
    []
  );

  // Mouse wheel handler for system volume (only when card is hovered)
  const handleSystemVolumeWheel = useCallback(
    (e: React.WheelEvent) => {
      if (hoveredCard === "master") {
        e.preventDefault();
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
          e.preventDefault();
          const delta = e.deltaY > 0 ? -5 : 5; // Scroll down decreases, scroll up increases
          smoothVolumeChange(currentVolume, delta, (newVolume) => {
            handleVolumeChange(appName, newVolume);
          });
        }
      };
    },
    [handleVolumeChange, smoothVolumeChange, hoveredCard]
  );

  // Modal handlers
  const openModal = useCallback(
    (app: { name: string; volume: number; isMuted: boolean }) => {
      setSelectedApp(app);
      setModalOpen(true);
    },
    []
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setSelectedApp(null);
  }, []);

  const handleMasterVolumeClick = useCallback(() => {
    openModal({
      name: "Master Volume",
      volume: systemVolume,
      isMuted: systemIsMuted,
    });
  }, [openModal, systemVolume, systemIsMuted]);

  const handleAppClick = useCallback(
    (app: { name: string; volume: number; isMuted: boolean }) => {
      openModal(app);
    },
    [openModal]
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
        <Title order={1} className={styles.title}>
          Volume Control Center
        </Title>
        <Text className={styles.subtitle}>
          Manage audio levels for all your applications
        </Text>
        <div className={styles.themeToggle}>
          <ThemeToggle />
        </div>
      </div>

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
          <div className={styles.volumeGrid}>
            {/* Master Volume Card */}
            <Card
              className={styles.volumeCard}
              onWheel={handleSystemVolumeWheel}
              onClick={handleMasterVolumeClick}
              onMouseEnter={() => setHoveredCard("master")}
              onMouseLeave={() => setHoveredCard(null)}
              tabIndex={0}
              style={{ cursor: "pointer" }}
            >
              <div className={styles.cardHeader}>
                <div className={styles.appIcon}>
                  {getAppIcon("Master Volume")}
                </div>
                <Text className={styles.appTitle}>Master Volume</Text>
              </div>

              <div className={styles.currentVolume}>{systemVolume}</div>

              <div className={styles.sliderContainer}>
                <Text className={styles.sliderLabel}>0</Text>
                <Slider
                  value={systemVolume}
                  onChange={setSystemVolume}
                  className={styles.volumeSlider}
                  size="lg"
                  color="blue"
                  thumbSize={20}
                />
                <Text className={styles.sliderLabel}>100</Text>
              </div>

              <div className={styles.controlButtons}>
                <ActionIcon
                  variant="filled"
                  color={systemIsMuted ? "red" : "blue"}
                  onClick={toggleSystemMute}
                  className={styles.controlButton}
                >
                  {systemIsMuted ? "🔇" : "🔊"}
                </ActionIcon>
                <Button
                  variant="filled"
                  color="gray"
                  size="xs"
                  onClick={() => setSystemVolume(Math.max(0, systemVolume - 5))}
                  className={styles.controlButton}
                >
                  -5
                </Button>
                <Button
                  variant="filled"
                  color="gray"
                  size="xs"
                  onClick={() => setSystemVolume(Math.max(0, systemVolume - 1))}
                  className={styles.controlButton}
                >
                  -
                </Button>
                <Button
                  variant="filled"
                  color="gray"
                  size="xs"
                  onClick={() =>
                    setSystemVolume(Math.min(100, systemVolume + 1))
                  }
                  className={styles.controlButton}
                >
                  +
                </Button>
                <Button
                  variant="filled"
                  color="gray"
                  size="xs"
                  onClick={() =>
                    setSystemVolume(Math.min(100, systemVolume + 5))
                  }
                  className={styles.controlButton}
                >
                  +5
                </Button>
              </div>
            </Card>

            {/* Application Cards */}
            {applications.slice(0, 5).map((app) => (
              <Card
                key={app.name}
                className={styles.volumeCard}
                onWheel={handleAppVolumeWheel(app.name, app.volume)}
                onClick={() => handleAppClick(app)}
                onMouseEnter={() => setHoveredCard(app.name)}
                onMouseLeave={() => setHoveredCard(null)}
                tabIndex={0}
                style={{ cursor: "pointer" }}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.appIcon}>{getAppIcon(app.name)}</div>
                  <Text className={styles.appTitle}>{app.name}</Text>
                </div>

                <div className={styles.currentVolume}>{app.volume}</div>

                <div className={styles.sliderContainer}>
                  <Text className={styles.sliderLabel}>0</Text>
                  <Slider
                    value={app.volume}
                    onChange={(volume) => handleVolumeChange(app.name, volume)}
                    className={styles.volumeSlider}
                    size="lg"
                    color="blue"
                    thumbSize={20}
                  />
                  <Text className={styles.sliderLabel}>100</Text>
                </div>

                <div className={styles.controlButtons}>
                  <ActionIcon
                    variant="filled"
                    color={app.isMuted ? "red" : "blue"}
                    onClick={() => toggleMute(app.name)}
                    className={styles.controlButton}
                  >
                    {app.isMuted ? "🔇" : "🔊"}
                  </ActionIcon>
                  <Button
                    variant="filled"
                    color="gray"
                    size="xs"
                    onClick={() =>
                      handleVolumeChange(app.name, Math.max(0, app.volume - 5))
                    }
                    className={styles.controlButton}
                  >
                    -5
                  </Button>
                  <Button
                    variant="filled"
                    color="gray"
                    size="xs"
                    onClick={() =>
                      handleVolumeChange(app.name, Math.max(0, app.volume - 1))
                    }
                    className={styles.controlButton}
                  >
                    -
                  </Button>
                  <Button
                    variant="filled"
                    color="gray"
                    size="xs"
                    onClick={() =>
                      handleVolumeChange(
                        app.name,
                        Math.min(100, app.volume + 1)
                      )
                    }
                    className={styles.controlButton}
                  >
                    +
                  </Button>
                  <Button
                    variant="filled"
                    color="gray"
                    size="xs"
                    onClick={() =>
                      handleVolumeChange(
                        app.name,
                        Math.min(100, app.volume + 5)
                      )
                    }
                    className={styles.controlButton}
                  >
                    +5
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default VolumeControlApp;
