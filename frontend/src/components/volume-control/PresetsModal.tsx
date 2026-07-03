import { Modal, Button, Group, Stack, Text, SimpleGrid, Card, ActionIcon, TextInput } from '@mantine/core';
import { IconTrash, IconDeviceFloppy, IconPlayerPlay } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import type { Application } from '@/types';

interface PresetsModalProps {
  opened: boolean;
  onClose: () => void;
  apiUrl: string;
  currentApps: Application[];
}



export function PresetsModal({ opened, onClose, apiUrl, currentApps }: PresetsModalProps) {
  const [presets, setPresets] = useState<Record<string, any>>({});
  const [newPresetName, setNewPresetName] = useState('');

  const fetchPresets = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/presets`);
      setPresets(response.data);
    } catch (error) {
      console.error('Failed to fetch presets:', error);
    }
  };

  useEffect(() => {
    if (opened) {
      fetchPresets();
    }
  }, [opened, apiUrl]);

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) return;
    
    const appsState = currentApps.map(app => ({
      name: app.name,
      volume: app.volume,
      isMuted: app.isMuted
    }));

    try {
      await axios.post(`${apiUrl}/api/presets`, {
        name: newPresetName,
        apps: appsState
      });
      setNewPresetName('');
      fetchPresets();
    } catch (error) {
      console.error('Failed to save preset:', error);
    }
  };

  const handleApplyPreset = async (name: string) => {
    try {
      await axios.post(`${apiUrl}/api/presets/apply/${name}`);
      onClose();
    } catch (error) {
      console.error('Failed to apply preset:', error);
    }
  };

  const handleDeletePreset = async (name: string) => {
    try {
      await axios.delete(`${apiUrl}/api/presets/${name}`);
      fetchPresets();
    } catch (error) {
      console.error('Failed to delete preset:', error);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Volume Presets" size="lg">
      <Stack>
        <Group>
          <TextInput
            placeholder="New Preset Name"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Button 
            leftSection={<IconDeviceFloppy size={16} />} 
            onClick={handleSavePreset}
            disabled={!newPresetName.trim()}
          >
            Save Current State
          </Button>
        </Group>

        <Text fw={500} mt="md">Saved Presets:</Text>
        
        {Object.keys(presets).length === 0 ? (
          <Text c="dimmed" fs="italic">No presets saved yet.</Text>
        ) : (
          <SimpleGrid cols={2}>
            {Object.keys(presets).map((name) => (
              <Card key={name} shadow="sm" padding="sm" radius="md" withBorder>
                <Group justify="space-between">
                  <Text fw={500}>{name}</Text>
                  <Group gap="xs">
                    <ActionIcon 
                      color="blue" 
                      variant="light" 
                      onClick={() => handleApplyPreset(name)}
                      title="Apply Preset"
                    >
                      <IconPlayerPlay size={16} />
                    </ActionIcon>
                    <ActionIcon 
                      color="red" 
                      variant="light" 
                      onClick={() => handleDeletePreset(name)}
                      title="Delete Preset"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
                <Text size="xs" c="dimmed" mt={5}>
                  {presets[name].length} applications
                </Text>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Modal>
  );
}
