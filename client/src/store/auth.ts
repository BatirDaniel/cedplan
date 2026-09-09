import { create } from 'zustand';
import i18n from '@/i18n';
import { useThemeStore } from '@/store/theme';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (token: string, user: User) => void;
  updateUser: (user: User) => void;
  logout: () => void;
}

const storedUser = localStorage.getItem('cedplan_user');

function syncPreferences(user: User) {
  if (user.preferredLanguage) i18n.changeLanguage(user.preferredLanguage);
  if (user.theme) useThemeStore.getState().setTheme(user.theme);
}

export const useAuthStore = create<AuthState>((set) => ({
  user: storedUser ? JSON.parse(storedUser) : null,
  token: localStorage.getItem('cedplan_token'),
  setAuth: (token, user) => {
    localStorage.setItem('cedplan_token', token);
    localStorage.setItem('cedplan_user', JSON.stringify(user));
    syncPreferences(user);
    set({ token, user });
  },
  updateUser: (user) => {
    localStorage.setItem('cedplan_user', JSON.stringify(user));
    syncPreferences(user);
    set({ user });
  },
  logout: () => {
    localStorage.removeItem('cedplan_token');
    localStorage.removeItem('cedplan_user');
    set({ token: null, user: null });
  },
}));
