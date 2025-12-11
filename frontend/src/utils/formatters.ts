/**
 * Format volume value for display
 */
export const formatVolume = (volume: number): string => {
  return `${Math.round(volume)}%`;
};

/**
 * Clamp a value between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/**
 * Calculate smooth volume increment based on scroll delta
 */
export const calculateVolumeIncrement = (
  delta: number,
  scale: number = 0.05,
  minIncrement: number = 1,
  maxMultiplier: number = 10
): number => {
  return Math.max(
    minIncrement,
    Math.round(maxMultiplier * Math.tanh(Math.abs(delta) * scale))
  );
};
