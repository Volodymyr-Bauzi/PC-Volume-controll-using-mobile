import { ActionIcon, Menu, Box, useMantineColorScheme } from '@mantine/core';
import { useTheme } from '../../../contexts/ThemeContext';

type ThemeValue = 'light' | 'dark' | 'system';

interface ThemeOption {
  value: ThemeValue;
  label: string;
  icon: React.ReactNode;
}

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const themes: readonly ThemeOption[] = [
    { value: 'light', label: 'Light', icon: <span style={{ fontSize: '16px' }}>☀️</span> },
    { value: 'dark', label: 'Dark', icon: <span style={{ fontSize: '16px' }}>🌙</span> },
    { value: 'system', label: 'System', icon: <span style={{ fontSize: '16px' }}>💻</span> },
  ] as const;

  const currentTheme = themes.find((t) => t.value === theme) || themes[2];
      
  return (
    <Menu 
      shadow="md" 
      width={140} 
      position="bottom-start"
      withArrow
      transitionProps={{ transition: 'pop-top-left' }}
      withinPortal={false}
      positionDependencies={[theme]}
    >
      <Menu.Target>
        <ActionIcon
          size="lg"
          variant="light"
          aria-label="Toggle theme"
          style={(theme) => ({
            backgroundColor: isDark ? theme.colors.dark[6] : theme.colors.gray[0],
            color: isDark ? theme.colors.gray[6] : theme.colors.blue[6],
          })}
          onClick={(e) => e.stopPropagation()}
        >
          {currentTheme.icon}
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        {themes.map((item) => (
          <Menu.Item 
            key={item.value}
            onClick={() => setTheme(item.value)}
            style={(theme) => ({
              backgroundColor: isDark ? theme.colors.dark[6] : theme.colors.gray[1],
            })}
          >
            <Box
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0.2rem',
                color: isDark ? '#fff' : '#000',
                fontWeight: theme === item.value ? 'bold' : 'normal',
              }}
            >
              <span style={{ marginRight: '0.5rem' }}>{item.icon}</span>
              <span>{item.label}</span>
              {theme === item.value && (
                <span style={{ marginLeft: 'auto', fontSize: '16px' }}>✓</span>
              )}
            </Box>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
};
