import { ActionIcon, Menu, Box, useMantineColorScheme } from '@mantine/core';
import { IconSun, IconMoon, IconDeviceDesktop, IconCheck } from '@tabler/icons-react';
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
    { value: 'light', label: 'Light', icon: <IconSun size={16} /> },
    { value: 'dark', label: 'Dark', icon: <IconMoon size={16} /> },
    { value: 'system', label: 'System', icon: <IconDeviceDesktop size={16} /> },
  ] as const;

  const currentTheme = themes.find((t) => t.value === theme) || themes[2];

  return (
    <Menu 
      shadow="md" 
      width={140} 
      position="bottom-end"
      withArrow
      transitionProps={{ transition: 'pop-top-right' }}
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
          >
            <Box
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: isDark ? '#fff' : '#000',
                backgroundColor: isDark ? '#222' : '#fff',
              }}
            >
              <span style={{ marginRight: '0.5rem' }}>{item.icon}</span>
              <span>{item.label}</span>
              {theme === item.value && (
                <IconCheck 
                  size={16} 
                  style={{ marginLeft: 'auto' }} 
                />
              )}
            </Box>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
};
