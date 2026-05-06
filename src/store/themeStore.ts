import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'medicohub_theme';

interface ThemeState {
  isDark: boolean;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setDark: (dark: boolean) => Promise<void>;
  toggle: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: false,
  isHydrated: false,

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const isDark = stored === null ? false : stored === 'dark';
      set({ isDark, isHydrated: true });
    } catch {
      set({ isHydrated: true });
    }
  },

  setDark: async (dark: boolean) => {
    set({ isDark: dark });
    await AsyncStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
  },

  toggle: async () => {
    const next = !get().isDark;
    await get().setDark(next);
  },
}));

// ── Theme tokens ─────────────────────────────────────────────────────────────

export const darkTheme = {
  bg: '#070810',
  surface: '#10121e',
  surfaceLow: '#0c0e18',
  surfaceHigh: '#181b2e',
  card: '#10121e',
  cardBorder: 'rgba(255,255,255,0.06)',
  primary: '#cfbcff',
  primaryContainer: '#b599ff',
  primaryText: '#b599ff',        // readable on dark surfaces — same as container
  onPrimary: '#39197c',
  onSurface: '#e1e3e4',
  onSurfaceVariant: '#948e9d',
  outline: '#948e9d',
  outlineVariant: '#494551',
  outlineFaint: '#323536',
  error: '#ffb4ab',
  statusBar: 'light' as const,
  avatarGradient: ['#2d1060', '#b599ff'] as [string, string],
  iconBg: 'rgba(255,255,255,0.04)',
  separator: 'rgba(255,255,255,0.05)',
  innerSurface: '#070810',
};

export const lightTheme = {
  bg: '#F8F9FF',
  surface: '#FFFFFF',
  surfaceLow: '#F2F4FF',
  surfaceHigh: '#ECEEFF',
  card: '#FFFFFF',
  cardBorder: 'rgba(181,153,255,0.18)',
  primary: '#7C5CBF',
  primaryContainer: '#B599FF',
  primaryText: '#5E35B1',        // dark purple — legible on white/light backgrounds
  onPrimary: '#FFFFFF',
  onSurface: '#1A1C2E',
  onSurfaceVariant: '#5A5670',
  outline: '#5A5670',
  outlineVariant: '#6B6882',
  outlineFaint: '#8B88A0',
  error: '#C0392B',
  statusBar: 'dark' as const,
  avatarGradient: ['#7C5CBF', '#B599FF'] as [string, string],
  iconBg: 'rgba(181,153,255,0.1)',
  separator: 'rgba(181,153,255,0.12)',
  innerSurface: '#F2F4FF',
};

export type AppTheme = typeof darkTheme;

export function getTheme(isDark: boolean): AppTheme {
  return isDark ? darkTheme : lightTheme;
}
