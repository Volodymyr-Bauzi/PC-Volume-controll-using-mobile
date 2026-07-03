import { Modal, SimpleGrid, Card, Text, Group } from '@mantine/core';
import { IconRocket } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import axios from 'axios';

interface AppLauncherModalProps {
  opened: boolean;
  onClose: () => void;
  apiUrl: string;
}

export function AppLauncherModal({ opened, onClose, apiUrl }: AppLauncherModalProps) {
  const [shortcuts, setShortcuts] = useState<string[]>([]);

  const fetchShortcuts = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/shortcuts`);
      setShortcuts(response.data);
    } catch (error) {
      console.error('Failed to fetch shortcuts:', error);
    }
  };

  useEffect(() => {
    if (opened) {
      fetchShortcuts();
    }
  }, [opened, apiUrl]);

  const handleLaunch = async (filename: string) => {
    try {
      await axios.post(`${apiUrl}/api/shortcuts/launch`, { filename });
      onClose();
    } catch (error) {
      console.error('Failed to launch app:', error);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="App Launcher" size="lg">
      {shortcuts.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          No shortcuts found. Add files to the 'shortcuts' folder in the backend directory.
        </Text>
      ) : (
        <SimpleGrid cols={3}>
          {shortcuts.map((file) => (
            <Card 
              key={file} 
              shadow="sm" 
              padding="lg" 
              radius="md" 
              withBorder
              style={{ cursor: 'pointer' }}
              onClick={() => handleLaunch(file)}
            >
              <Group justify="center" mb="xs">
                <IconRocket size={32} color="var(--mantine-color-blue-6)" />
              </Group>
              <Text fw={500} ta="center" truncate>
                {file.replace(/\.(lnk|exe|url)$/i, '')}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Modal>
  );
}
