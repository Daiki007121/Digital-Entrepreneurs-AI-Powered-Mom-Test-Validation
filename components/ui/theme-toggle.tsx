'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './theme-provider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="relative flex h-9 w-9 items-center justify-center rounded-full glass cursor-pointer transition-all duration-200 hover:shadow-glass"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <Sun
        className={`h-4 w-4 text-amber-500 transition-all duration-300 ${
          theme === 'light'
            ? 'rotate-0 scale-100 opacity-100'
            : 'rotate-90 scale-0 opacity-0'
        }`}
        style={{ position: theme === 'light' ? 'relative' : 'absolute' }}
      />
      <Moon
        className={`h-4 w-4 text-indigo-300 transition-all duration-300 ${
          theme === 'dark'
            ? 'rotate-0 scale-100 opacity-100'
            : '-rotate-90 scale-0 opacity-0'
        }`}
        style={{ position: theme === 'dark' ? 'relative' : 'absolute' }}
      />
    </button>
  );
}
