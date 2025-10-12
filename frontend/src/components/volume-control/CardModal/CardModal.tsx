import {
  Group,
  Modal,
  Text,
  Box,
  Slider,
  ActionIcon,
  Stack,
  Divider,
} from "@mantine/core";
import styles from "./CardModal.module.css";
import { getAppIcon } from "../../../helpers/getAppIcon";

export const CardModal = ({
  modalOpen,
  closeModal,
  selectedApp,
  systemVolume,
  systemIsMuted,
  toggleSystemMute,
  handleVolumeChange,
  toggleMute,
}: any) => {
  return (
    <Modal
      opened={modalOpen}
      onClose={closeModal}
      title={
        <Group gap="sm">
          <div className={styles.modalIcon}>
            {selectedApp && getAppIcon(selectedApp.name)}
          </div>
          <Text size="lg" fw={600}>
            {selectedApp?.name || "Volume Control"}
          </Text>
        </Group>
      }
      size="md"
      centered
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
    >
      {selectedApp && (
        <Stack gap="xl">
          {/* Current Volume Display */}
          <Box className={styles.modalVolumeDisplay}>
            <Text size="3rem" fw={700} ta="center" c="blue">
              {selectedApp.name === "Master Volume"
                ? systemVolume
                : selectedApp.volume}
            </Text>
            <Text size="sm" ta="center" c="dimmed">
              Current Volume
            </Text>
          </Box>

          {/* Volume Slider */}
          <Box>
            <Group justify="space-between" mb="sm">
              <Text size="sm" fw={500}>
                0
              </Text>
              <Text size="sm" fw={500}>
                100
              </Text>
            </Group>
            <Slider
              value={
                selectedApp.name === "Master Volume"
                  ? systemVolume
                  : selectedApp.volume
              }
              onChange={(value) => {
                if (selectedApp.name === "Master Volume") {
                  setSystemVolume(value);
                } else {
                  handleVolumeChange(selectedApp.name, value);
                }
              }}
              size="lg"
              color="blue"
              thumbSize={24}
              className={styles.modalSlider}
            />
          </Box>

          <Divider />

          {/* Control Buttons */}
          <Group justify="center" gap="sm">
            <ActionIcon
              variant="filled"
              color={
                (
                  selectedApp.name === "Master Volume"
                    ? systemIsMuted
                    : selectedApp.isMuted
                )
                  ? "red"
                  : "blue"
              }
              size="lg"
              onClick={() => {
                if (selectedApp.name === "Master Volume") {
                  toggleSystemMute();
                } else {
                  toggleMute(selectedApp.name);
                }
              }}
            >
              {(
                selectedApp.name === "Master Volume"
                  ? systemIsMuted
                  : selectedApp.isMuted
              )
                ? "🔇"
                : "🔊"}
            </ActionIcon>

            <Button
              variant="filled"
              color="gray"
              onClick={() => {
                const currentVol =
                  selectedApp.name === "Master Volume"
                    ? systemVolume
                    : selectedApp.volume;
                const newVolume = Math.max(0, currentVol - 5);
                if (selectedApp.name === "Master Volume") {
                  setSystemVolume(newVolume);
                } else {
                  handleVolumeChange(selectedApp.name, newVolume);
                }
              }}
            >
              -5
            </Button>

            <Button
              variant="filled"
              color="gray"
              onClick={() => {
                const currentVol =
                  selectedApp.name === "Master Volume"
                    ? systemVolume
                    : selectedApp.volume;
                const newVolume = Math.max(0, currentVol - 1);
                if (selectedApp.name === "Master Volume") {
                  setSystemVolume(newVolume);
                } else {
                  handleVolumeChange(selectedApp.name, newVolume);
                }
              }}
            >
              -1
            </Button>

            <Button
              variant="filled"
              color="gray"
              onClick={() => {
                const currentVol =
                  selectedApp.name === "Master Volume"
                    ? systemVolume
                    : selectedApp.volume;
                const newVolume = Math.min(100, currentVol + 1);
                if (selectedApp.name === "Master Volume") {
                  setSystemVolume(newVolume);
                } else {
                  handleVolumeChange(selectedApp.name, newVolume);
                }
              }}
            >
              +1
            </Button>

            <Button
              variant="filled"
              color="gray"
              onClick={() => {
                const currentVol =
                  selectedApp.name === "Master Volume"
                    ? systemVolume
                    : selectedApp.volume;
                const newVolume = Math.min(100, currentVol + 5);
                if (selectedApp.name === "Master Volume") {
                  setSystemVolume(newVolume);
                } else {
                  handleVolumeChange(selectedApp.name, newVolume);
                }
              }}
            >
              +5
            </Button>
          </Group>

          {/* Instructions */}
          <Text size="xs" ta="center" c="dimmed">
            Use the slider or buttons to adjust volume. Click outside to close.
          </Text>
        </Stack>
      )}
    </Modal>
  );
};
