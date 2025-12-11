import { Card, Text, ActionIcon, Slider } from '@mantine/core';
import { memo, useCallback, useState, useEffect } from 'react';
import styles from './ApplicationCard.module.css';
import '@mantine/core/styles.css';
import type { Application } from '@/types';
import { getAppIcon } from '../../../helpers/getAppIcon';

export interface ApplicationCardProps {
  app: Omit<Application, "pid"> & Partial<Pick<Application, "pid">>;
  handleVolumeWheel?: (e: React.WheelEvent) => void;
  onAppClick?: (appName: string) => void;
  onCardHover: (appName: string | null) => void;
  onVolumeChange?: (appName: string, volume: number) => void;
  onMuteToggle: (appName: string) => void;
  masterVolume?: boolean;
  onSystemVolumeChange?: (volume: number) => void;
}

const ApplicationCardComponent: React.FC<ApplicationCardProps> = ({
  app,
  handleVolumeWheel,
  onAppClick,
  onCardHover,
  onVolumeChange,
  onMuteToggle,
  masterVolume = false,
  onSystemVolumeChange,
}) => {
  const [announcement, setAnnouncement] = useState('');

  const handleVolumeChange = useCallback(
    (volume: number) => {
      if (masterVolume) {
        onSystemVolumeChange?.(volume);
      } else if (onVolumeChange) {
        onVolumeChange(app.name, volume);
      }
    },
    [app.name, onVolumeChange, masterVolume, onSystemVolumeChange]
  );

  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const { key } = e;
      
      // Prevent default for handled keys
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', 'm', 'M', ' '].includes(key)) {
        e.preventDefault();
      }
      
      switch (key) {
        case 'ArrowUp':
          handleVolumeChange(Math.min(100, app.volume + 1));
          break;
        case 'ArrowDown':
          handleVolumeChange(Math.max(0, app.volume - 1));
          break;
        case 'PageUp':
          handleVolumeChange(Math.min(100, app.volume + 5));
          break;
        case 'PageDown':
          handleVolumeChange(Math.max(0, app.volume - 5));
          break;
        case 'Home':
          handleVolumeChange(0);
          break;
        case 'End':
          handleVolumeChange(100);
          break;
        case 'm':
        case 'M':
        case ' ':
          onMuteToggle(app.name);
          break;
      }
    },
    [app.volume, app.name, handleVolumeChange, onMuteToggle]
  );

  // Update screen reader announcement when volume changes
  useEffect(() => {
    if (app.volume !== undefined) {
      const volumeText = app.isMuted 
        ? 'muted' 
        : `set to ${app.volume} percent`;
      setAnnouncement(
        `${masterVolume ? 'System' : app.name} volume ${volumeText}`
      );
    }
  }, [app.volume, app.isMuted, app.name, masterVolume]);

  const cardLabel = masterVolume ? 'System volume control' : `${app.name} volume control`;
  const volumeId = `volume-value-${app.name.replace(/\s+/g, '-')}`;

  return (
    <Card
      className={styles.volumeCard}
      role="region"
      aria-label={cardLabel}
      aria-describedby={volumeId}
      onWheel={(e) => {
        handleVolumeWheel?.(e);
      }}
      onClick={() => onAppClick?.(app.name)}
      onMouseEnter={() => onCardHover(app.name)}
      onMouseLeave={() => onCardHover(null)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ cursor: onAppClick ? 'pointer' : 'default' }}
    >
      <div className={styles.cardHeader}>
        <div className={styles.appIcon}>{getAppIcon(app.name)}</div>
        <Text className={styles.appTitle}>{app.name}</Text>
      </div>

      <div 
        id={volumeId}
        className={styles.currentVolume}
        aria-label="Current volume"
      >
        {app.volume}
      </div>

      <div className={styles.sliderContainer}>
        <Text className={styles.sliderLabel}>0</Text>
        <Slider
          value={app.volume}
          onChange={handleVolumeChange}
          className={styles.volumeSlider}
          size="lg"
          color="blue"
          thumbSize={20}
          aria-label={`Volume for ${app.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={app.volume}
          aria-valuetext={`${app.volume} percent`}
        />
        <Text className={styles.sliderLabel}>100</Text>
      </div>

      <div className={styles.controlButtons}>
        <ActionIcon
          variant="filled"
          color={app.isMuted ? "red" : "blue"}
          onClick={() => onMuteToggle(app.name)}
          className={styles.controlButton}
          aria-label={app.isMuted ? `Unmute ${app.name}` : `Mute ${app.name}`}
          aria-pressed={app.isMuted}
          title={app.isMuted ? "Unmute (M or Space)" : "Mute (M or Space)"}
        >
          {app.isMuted ? "🔇" : "🔊"}
        </ActionIcon>
        <ActionIcon
          variant="filled"
          color="gray"
          size="xs"
          onClick={() => handleVolumeChange(Math.max(0, app.volume - 5))}
          className={styles.controlButton}
          aria-label={`Decrease ${app.name} volume by 5`}
          title="Decrease by 5 (Page Down)"
        >
          -5
        </ActionIcon>
        <ActionIcon
          variant="filled"
          color="gray"
          size="xs"
          onClick={() => handleVolumeChange(Math.max(0, app.volume - 1))}
          className={styles.controlButton}
          aria-label={`Decrease ${app.name} volume by 1`}
          title="Decrease by 1 (Arrow Down)"
        >
          -
        </ActionIcon>
        <ActionIcon
          variant="filled"
          color="gray"
          size="xs"
          onClick={() => handleVolumeChange(Math.min(100, app.volume + 1))}
          className={styles.controlButton}
          aria-label={`Increase ${app.name} volume by 1`}
          title="Increase by 1 (Arrow Up)"
        >
          +
        </ActionIcon>
        <ActionIcon
          variant="filled"
          color="gray"
          size="xs"
          onClick={() => handleVolumeChange(Math.min(100, app.volume + 5))}
          className={styles.controlButton}
          aria-label={`Increase ${app.name} volume by 5`}
          title="Increase by 5 (Page Up)"
        >
          +5
        </ActionIcon>
      </div>
      
      {/* Screen reader announcements */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className={styles.srOnly}
      >
        {announcement}
      </div>
    </Card>
  );
};

export const ApplicationCard = memo(ApplicationCardComponent);
ApplicationCard.displayName = "ApplicationCard";

export default ApplicationCard;
