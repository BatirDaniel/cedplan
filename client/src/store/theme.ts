import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

function applyTheme(theme: Theme) {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const stored = (localStorage.getItem('cedplan_theme') as Theme | null) ?? 'system';
applyTheme(stored);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: stored,
  setTheme: (theme) => {
    localStorage.setItem('cedplan_theme', theme);
    applyTheme(theme);
    set({ theme });
  },
}));

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (useThemeStore.getState().theme === 'system') applyTheme('system');
});
