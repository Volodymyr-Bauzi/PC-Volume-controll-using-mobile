import { Card, Text, Button, Group } from "@mantine/core";
import { memo, useCallback, useMemo } from "react";
import { VolumeSlider } from "../VolumeSlider/VolumeSlider";
import styles from "./ApplicationCard.module.css";

export type OrientationType = "horizontal" | "vertical";

export interface ApplicationCardProps {
  name: string;
  volume: number;
  onVolumeChange: (value: number) => void;
  onVolumeChangeEnd?: (value: number) => void;
  onToggleMute?: () => void;
  isMuted?: boolean;
  orientation?: OrientationType;
  isSystem?: boolean;
  cn?: string;
  style?: React.CSSProperties;
}

const ApplicationCardComponent: React.FC<ApplicationCardProps> = ({
  name: appName,
  volume: initialVolume,
  onVolumeChange,
  onVolumeChangeEnd,
  isMuted: isAppMuted = false,
  onToggleMute,
  isSystem = false,
  orientation = isSystem ? "horizontal" : "vertical",
  cn = "",
}) => {
  // Memoize derived values
  const volumePercentage = useMemo(
    () => Math.round(initialVolume),
    [initialVolume]
  );

  const displayVolume = isAppMuted ? 0 : volumePercentage;

  // Memoize handlers
  const handleVolumeChange = useCallback(
    (value: number) => {
      // Ensure the value is between 0 and 100
      const normalizedValue = Math.max(0, Math.min(100, value));
      onVolumeChange(normalizedValue);

      // If we're changing volume while muted, unmute
      if (isAppMuted && onToggleMute) {
        onToggleMute();
      }
    },
    [onVolumeChange, isAppMuted, onToggleMute]
  );

  const handleVolumeChangeEnd = useCallback(
    (value: number) => {
      onVolumeChangeEnd?.(value);
    },
    [onVolumeChangeEnd]
  );

  const handleToggleMute = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleMute?.();
    },
    [onToggleMute]
  );

  // Memoize the volume text to prevent unnecessary re-renders
  const volumeText = useMemo(() => {
    return isAppMuted ? "Muted" : `${volumePercentage}%`;
  }, [isAppMuted, volumePercentage]);

  const cardClasses = `${styles.card} ${
    orientation === "vertical" ? styles.vertical : styles.horizontal
  }`;
  const sliderClasses = `${styles.sliderContainer} ${styles.appSlider}`;
  const volumeTextClasses = `${styles.volumeText} ${
    isAppMuted ? styles.muted : ""
  }`;

  // Memoize the slider to prevent unnecessary re-renders
  const volumeSlider = useMemo(
    () => (
      <div className={sliderClasses}>
        <button
          className={styles.volumeButton}
          onClick={() => handleVolumeChange(displayVolume - 5)}
        >
          -5
        </button>
        <button
          className={styles.volumeButton}
          onClick={() => handleVolumeChange(displayVolume - 1)}
        >
          -1
        </button>

        <VolumeSlider
          value={displayVolume}
          onChange={handleVolumeChange}
          onChangeEnd={onVolumeChangeEnd ? handleVolumeChangeEnd : undefined}
          orientation={orientation}
          className={styles.volumeSlider}
          aria-label={`Volume control for ${appName}`}
        />
        <button
          className={styles.volumeButton}
          onClick={() => handleVolumeChange(displayVolume + 1)}
        >
          +1
        </button>
        <button
          className={styles.volumeButton}
          onClick={() => handleVolumeChange(displayVolume + 5)}
        >
          +5
        </button>
      </div>
    ),
    [
      displayVolume,
      handleVolumeChange,
      handleVolumeChangeEnd,
      appName,
      orientation,
      sliderClasses,
      onVolumeChangeEnd,
    ]
  );

  return (
    <Card
      className={`${cardClasses} ${cn}`}
      aria-label={`${appName} volume control`}
    >
      <div>
        <Text
          className={styles.appName}
          title={appName}
          aria-label={`Application: ${appName}`}
        >
          {appName}
        </Text>

        {volumeSlider}

        <Group>
          <Text className={volumeTextClasses} aria-live="polite">
            {onToggleMute && (
              <Button
                variant="light"
                color={isAppMuted ? "red" : "blue"}
                onClick={handleToggleMute}
                size="compact-xs"
                radius="xl"
                leftSection={isAppMuted ? <span>🔇</span> : <span>🔊</span>}
                aria-label={isAppMuted ? "Unmute" : "Mute"}
              />
            )}
            {volumeText}
          </Text>
        </Group>
      </div>
    </Card>
  );
};

export const ApplicationCard = memo(ApplicationCardComponent);
ApplicationCard.displayName = "ApplicationCard";

export default ApplicationCard;
