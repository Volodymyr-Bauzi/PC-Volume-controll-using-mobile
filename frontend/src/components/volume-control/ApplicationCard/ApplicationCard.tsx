import { Card, Text, Button, Group } from "@mantine/core";
import { memo, useCallback, useMemo } from "react";
import { VolumeSlider } from "../VolumeSlider/VolumeSlider";
import styles from "./ApplicationCard.module.css";

export interface ApplicationCardProps {
  name: string;
  volume: number;
  onVolumeChange: (value: number) => void;
  onVolumeChangeEnd?: (value: number) => void;
  onToggleMute?: () => void;
  isMuted?: boolean;
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
  cn = "",
}) => {
  return (
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
        <div className={styles.appIcon}>{getAppIcon("Master Volume")}</div>
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
          onClick={() => setSystemVolume(Math.min(100, systemVolume + 1))}
          className={styles.controlButton}
        >
          +
        </Button>
        <Button
          variant="filled"
          color="gray"
          size="xs"
          onClick={() => setSystemVolume(Math.min(100, systemVolume + 5))}
          className={styles.controlButton}
        >
          +5
        </Button>
      </div>
    </Card>
  );
};
