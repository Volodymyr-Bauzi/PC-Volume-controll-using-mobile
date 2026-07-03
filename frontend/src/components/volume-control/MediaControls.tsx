import { Group, ActionIcon, Paper, Tooltip } from '@mantine/core';
import { IconPlayerPlay, IconPlayerPause, IconPlayerSkipForward, IconPlayerSkipBack, IconPlayerStop } from '@tabler/icons-react';
import { useState } from 'react';
import axios from 'axios';

interface MediaControlsProps {
  apiUrl: string;
}

export function MediaControls({ apiUrl }: MediaControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleAction = async (action: 'playpause' | 'next' | 'prev' | 'stop') => {
    try {
      await axios.post(`${apiUrl}/api/media/${action}`);
      if (action === 'playpause') {
        setIsPlaying(!isPlaying);
      } else if (action === 'stop') {
        setIsPlaying(false);
      }
    } catch (error) {
      console.error(`Failed to ${action}`, error);
    }
  };

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
        
        <Tooltip label={isPlaying ? "Pause" : "Play"}>
          <ActionIcon 
            size={48} 
            variant="filled" 
            color={isPlaying ? 'orange' : 'blue'}
            onClick={() => handleAction('playpause')}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <IconPlayerPause size={32} /> : <IconPlayerPlay size={32} />}
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Stop">
          <ActionIcon 
            size="xl" 
            variant="light" 
            color="red"
            onClick={() => handleAction('stop')}
            aria-label="Stop"
          >
            <IconPlayerStop size={28} />
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
    </Paper>
  );
}
