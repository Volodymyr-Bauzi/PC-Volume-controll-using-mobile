import { Card, Text } from '@mantine/core';
import { memo, useCallback, useMemo } from 'react';
import { VolumeSlider } from '../VolumeSlider/VolumeSlider';
import styles from './ApplicationCard.module.css';

export interface ApplicationCardProps {
  name: string;
  volume: number;
  onVolumeChange: (value: number) => void;
  onVolumeChangeEnd?: (value: number) => void;
  isMuted?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const ApplicationCardComponent: React.FC<ApplicationCardProps> = ({
  name: appName,
  volume: initialVolume,
  onVolumeChange,
  onVolumeChangeEnd,
  isMuted: isAppMuted = false,
  className = '',
  style,
}) => {
  // Memoize derived values
  const volumePercentage = useMemo(() => Math.round(initialVolume), [initialVolume]);
  
  const displayVolume = isAppMuted ? 0 : volumePercentage;

  // Memoize handlers
  const handleVolumeChange = useCallback((value: number) => {
    // Ensure the value is between 0 and 100
    const normalizedValue = Math.max(0, Math.min(100, value));
    onVolumeChange(normalizedValue);
  }, [onVolumeChange]);

  const handleVolumeChangeEnd = useCallback((value: number) => {
    // Ensure the value is between 0 and 100
    const normalizedValue = Math.max(0, Math.min(100, value));
    onVolumeChangeEnd?.(normalizedValue);
  }, [onVolumeChangeEnd]);

  // Memoize the volume text to prevent unnecessary re-renders
  const volumeText = useMemo(() => {
    return isAppMuted ? 'Muted' : `${volumePercentage}%`;
  }, [isAppMuted, volumePercentage]);

  // Memoize the slider to prevent unnecessary re-renders
  const volumeSlider = useMemo(() => (
    <VolumeSlider
      value={displayVolume}
      min={0}
      max={100}
      step={1}
      orientation="horizontal"
      onChange={handleVolumeChange}
      onChangeEnd={handleVolumeChangeEnd}
      aria-label={`Volume control for ${appName}`}
      style={{ width: '100%' }}
    />
  ), [displayVolume, handleVolumeChange, handleVolumeChangeEnd, appName]);

  return (
    <Card
      withBorder
      radius="md"
      p="md"
      className={`${styles.card} ${className}`}
      style={style}
      role="region"
      aria-label={`${appName} volume control`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Text
          fw={500}
          ta="center"
          className={styles.appName}
          title={appName}
          aria-label={`Application: ${appName}`}
        >
          {appName}
        </Text>

        <div className={styles.sliderContainer}>
          {volumeSlider}
        </div>

        <Text 
          size="sm" 
          className={`${styles.volumeText} ${isAppMuted ? styles.muted : styles.dimmed}`}
          aria-live="polite"
          ta="center"
          mt="xs"
        >
          {volumeText}
        </Text>
      </div>
    </Card>
  );
};

export const ApplicationCard = memo(ApplicationCardComponent);
ApplicationCard.displayName = 'ApplicationCard';

export default ApplicationCard;
