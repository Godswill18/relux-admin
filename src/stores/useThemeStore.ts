// ============================================================================
// THEME STORE - Persistent Dark Mode with Zustand
// ============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// TYPES
// ============================================================================

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

// ============================================================================
// THEME STORE
// ============================================================================

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: false,

      toggleTheme: () => {
        set((state) => {
          const newIsDark = !state.isDark;
          applyTheme(newIsDark);
          return { isDark: newIsDark };
        });
      },

      setTheme: (isDark: boolean) => {
        set({ isDark });
        applyTheme(isDark);
      },
    }),
    {
      name: 'relux-theme', // localStorage key
      onRehydrateStorage: () => {
        return (state) => {
          // Apply theme after rehydration
          if (state) {
            applyTheme(state.isDark);
          }
        };
      },
    }
  )
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Apply theme to document
 */
function applyTheme(isDark: boolean) {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// ============================================================================
// HELPER HOOKS
// ============================================================================

/**
 * Hook to get current theme
 */
export const useIsDarkMode = (): boolean => {
  return useThemeStore((state) => state.isDark);
};
