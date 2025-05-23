import { Center, Loader } from '@mantine/core';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  fullHeight?: boolean;
}

export const LoadingSpinner = ({ 
  size = 'xl',
  fullHeight = false 
}: LoadingSpinnerProps) => {
  return (
    <Center style={{ 
      width: '100%', 
      height: fullHeight ? '100vh' : '100%',
      minHeight: fullHeight ? '100vh' : '200px'
    }}>
      <Loader size={size} />
    </Center>
  );
};

export default LoadingSpinner;
