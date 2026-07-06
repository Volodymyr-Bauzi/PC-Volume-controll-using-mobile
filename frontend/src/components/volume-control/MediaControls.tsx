import { Group, ActionIcon, Paper, Tooltip, Alert } from '@mantine/core';
import {
  IconPlayerPlay,
  IconPlayerSkipForward,
  IconPlayerSkipBack,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';
import axios from 'axios';

interface MediaControlsProps {
  apiUrl: string;
}

type MediaAction = 'playpause' | 'next' | 'prev';
type MediaPermission = 'granted' | 'denied' | 'unknown';

// Ignore repeat clicks within this window (prevents keystroke bursts)
const DEBOUNCE_MS = 300;

export function MediaControls({ apiUrl }: MediaControlsProps) {
  // null = unknown (render optimistically), false = hide controls
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<MediaPermission>('granted');
  const lastActionAtRef = useRef(0);

  // Ask the backend whether media keys work on its platform
  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${apiUrl}/api/media/capabilities`)
      .then((res) => {
        if (cancelled) return;
        setSupported(res.data?.supported === true);
        if (res.data?.mediaPermission) {
          setPermission(res.data.mediaPermission as MediaPermission);
        }
      })
      .catch(() => {
        // Endpoint missing (older backend) or transient error — keep controls
        // visible; individual commands will surface errors via toasts.
        if (!cancelled) setSupported(true);
      });
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  const handleAction = async (action: MediaAction) => {
    const now = Date.now();
    if (now - lastActionAtRef.current < DEBOUNCE_MS) return;
    lastActionAtRef.current = now;

    try {
      await axios.post(`${apiUrl}/api/media/${action}`);
    } catch (error) {
      const unsupported =
        axios.isAxiosError(error) && error.response?.status === 501;
      if (unsupported) setSupported(false);
      notifications.show({
        color: 'red',
        title: 'Media control failed',
        message: unsupported
          ? 'Media keys are not supported on this system.'
          : 'Could not reach the PC to send the command.',
      });
      console.error(`Failed to ${action}`, error);
    }
  };

  // Platform can't do media keys (Linux/macOS) — don't show dead buttons
  if (supported === false) return null;

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder mb="lg">
      <Group justify="center" gap="xl">
        <Tooltip label="Previous Track">
          <ActionIcon
            size="xl"
            variant="light"
            onClick={() => handleAction('prev')}
            aria-label="Previous Track"
          >
            <IconPlayerSkipBack size={28} />
          </ActionIcon>
        </Tooltip>

        {/*
          Single neutral Play/Pause button. The backend can only send the
          global play/pause media key — it cannot know the real playback
          state, so the UI intentionally doesn't claim playing vs. paused.
        */}
        <Tooltip label="Play / Pause">
          <ActionIcon
            size={48}
            variant="filled"
            color="blue"
            onClick={() => handleAction('playpause')}
            aria-label="Play or pause"
          >
            <IconPlayerPlay size={32} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Next Track">
          <ActionIcon
            size="xl"
            variant="light"
            onClick={() => handleAction('next')}
            aria-label="Next Track"
          >
            <IconPlayerSkipForward size={28} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* macOS: media keys need Accessibility permission */}
      {permission === 'denied' && (
        <Alert
          color="yellow"
          variant="light"
          icon={<IconAlertTriangle size={18} />}
          mt="md"
          title="Media keys need permission on your Mac"
        >
          Grant Accessibility permission in System Settings → Privacy &
          Security → Accessibility (a system prompt should have appeared when
          the app started), then restart the app on your PC.
        </Alert>
      )}
    </Paper>
  );
}
