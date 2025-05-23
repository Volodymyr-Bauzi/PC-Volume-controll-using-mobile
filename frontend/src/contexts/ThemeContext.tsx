import React, { createContext, useContext, useEffect, useState } from 'react';
import { useMantineColorScheme } from '@mantine/core';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setColorScheme } = useMantineColorScheme();
  const [theme, setThemeState] = useState<Theme>('system');
  const [isDark, setIsDark] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      setThemeState(savedTheme);
      const shouldBeDark = savedTheme === 'dark' || (savedTheme === 'system' && prefersDark);
      setIsDark(shouldBeDark);
      setColorScheme(shouldBeDark ? 'dark' : 'light');
    } else {
      setIsDark(prefersDark);
      setColorScheme(prefersDark ? 'dark' : 'light');
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        const systemIsDark = mediaQuery.matches;
        setIsDark(systemIsDark);
        setColorScheme(systemIsDark ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, setColorScheme]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem('theme', newTheme);
    setThemeState(newTheme);
    
    // Update isDark based on the new theme
    if (newTheme === 'system') {
      const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(systemIsDark);
      setColorScheme(systemIsDark ? 'dark' : 'light');
    } else {
      const shouldBeDark = newTheme === 'dark';
      setIsDark(shouldBeDark);
      setColorScheme(shouldBeDark ? 'dark' : 'light');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
