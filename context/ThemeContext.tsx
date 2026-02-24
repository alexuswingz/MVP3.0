'use client';

import { useUIStore } from '@/stores/ui-store';

/**
 * Compatibility layer for vine-tracker: provides useTheme() that reads from useUIStore.
 * Vine-tracker components expect { isDarkMode } from useTheme().
 */
export function useTheme() {
  const theme = useUIStore((s) => s.theme);
  return { isDarkMode: theme !== 'light' };
}
