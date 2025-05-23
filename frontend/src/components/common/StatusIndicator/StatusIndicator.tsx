import { Badge, Text } from '@mantine/core';
import { memo } from 'react';
import styles from './StatusIndicator.module.css';

type StatusType = 'connected' | 'connecting' | 'disconnected' | 'error';

interface StatusConfig {
  color: string;
  icon: string;
  label: string;
}

const STATUS_CONFIG: Record<StatusType, StatusConfig> = {
  connected: { color: 'green', icon: '🟢', label: 'Connected' },
  connecting: { color: 'orange', icon: '🟡', label: 'Connecting...' },
  disconnected: { color: 'gray', icon: '⚪', label: 'Disconnected' },
  error: { color: 'red', icon: '🔴', label: 'Error' },
} as const;

interface StatusIndicatorProps {
  status: StatusType;
  message?: string;
}

export const StatusIndicator = memo(({ 
  status, 
  message 
}: StatusIndicatorProps) => {
  const { color, icon, label } = STATUS_CONFIG[status] || STATUS_CONFIG.error;
  const displayText = message || label;
  const iconElement = (
    <Text component="span" className={styles.statusIcon}>
      {icon}
    </Text>
  );

  return (
    <Badge 
      color={color} 
      variant="light"
      leftSection={iconElement}
    >
      {displayText}
    </Badge>
  );
});

StatusIndicator.displayName = 'StatusIndicator';

export default StatusIndicator;
