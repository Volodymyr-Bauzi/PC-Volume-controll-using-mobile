import React, { useState, useCallback, memo } from 'react';
import styles from './VolumeSlider.module.css';

type OrientationType = 'horizontal' | 'vertical';

export interface VolumeSliderProps {
  /** Current value of the slider */
  value: number;
  /** Minimum value of the slider */
  min?: number;
  /** Maximum value of the slider */
  max?: number;
  /** Step value for the slider */
  step?: number;
  /** Orientation of the slider */
  orientation?: OrientationType;
  /** Whether the slider is disabled */
  disabled?: boolean;
  /** Callback when the value changes */
  onChange?: (value: number) => void;
  /** Callback when the user stops dragging */
  onChangeEnd?: (value: number) => void;
  /** Additional class name */
  className?: string;
  /** ARIA label for accessibility */
  'aria-label'?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

const VolumeSliderComponent: React.FC<VolumeSliderProps> = ({
  value,
  min = 0,
  max = 100,
  step = 1, // 1%
  orientation = 'vertical',
  disabled = false,
  onChange,
  onChangeEnd,
  className = '',
  style,
  ...props
}) => {
  const [isSliderDragging, setIsSliderDragging] = useState(false);
  const isVertical = orientation === 'vertical';

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolumeValue = parseFloat(e.target.value);
    onChange?.(newVolumeValue);
  }, [onChange]);

  const handlePointerUp = useCallback(() => {
    if (isSliderDragging) {
      setIsSliderDragging(false);
      onChangeEnd?.(value);
    }
  }, [isSliderDragging, onChangeEnd, value]);

  const handlePointerDown = useCallback(() => {
    if (disabled) return;
    setIsSliderDragging(true);
  }, [disabled]);

  // Calculate the fill percentage for the custom styling
  const fillPercentageValue = ((value - min) / (max - min)) * 100;
  const sliderClasses = [
    styles.volumeSlider,
    isVertical ? styles.vertical : styles.horizontal,
    disabled ? styles.disabled : '',
    className
  ].filter(Boolean).join(' ');

  const sliderStyle = {
    '--fill-percentage': `${fillPercentageValue}%`,
    ...style
  } as React.CSSProperties;

  return (
    <div 
      className={sliderClasses}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={sliderStyle}
      aria-disabled={disabled}
    >
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={handleVolumeChange}
        onPointerDown={handlePointerDown}
        className={styles.sliderInput}
        aria-label={props['aria-label']}
        aria-orientation={orientation}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${Math.round(value)}%`}
      />
    </div>
  );
};

/**
 * A customizable volume slider component with smooth animations and accessibility features.
 */
export const VolumeSlider = memo(VolumeSliderComponent);
VolumeSlider.displayName = 'VolumeSlider';

export default VolumeSlider;