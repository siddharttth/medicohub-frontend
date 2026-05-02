import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

const STORAGE_KEY = 'medicohub_auth';

interface StoredAuth {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isHydrated: boolean;
  login: (tokens: { accessToken: string; refreshToken: string }, user: User) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  setAccessToken: (token: string, refreshToken?: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  isHydrated: false,

  login: async (tokens, user) => {
    // normalize _id to id in case backend returns _id
    const normalizedUser: User = { ...user, id: user.id || (user as any)._id };
    const stored: StoredAuth = { user: normalizedUser, ...tokens };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    set({ user: normalizedUser, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  },

  logout: async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    set({ user: null, accessToken: null, refreshToken: null });
  },

  hydrate: async () => {
    set({ isLoading: true });
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored: StoredAuth = JSON.parse(raw);
        set({
          user: stored.user,
          accessToken: stored.accessToken,
          refreshToken: stored.refreshToken,
        });
      }
    } catch (e) {
      // ignore
    } finally {
      set({ isLoading: false, isHydrated: true });
    }
  },

  updateUser: (partial) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...partial };
    set({ user: updated });
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        const stored: StoredAuth = JSON.parse(raw);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, user: updated }));
      }
    });
  },

  setAccessToken: (token, newRefreshToken) => {
    set({ accessToken: token, ...(newRefreshToken ? { refreshToken: newRefreshToken } : {}) });
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        const stored: StoredAuth = JSON.parse(raw);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
          ...stored,
          accessToken: token,
          ...(newRefreshToken ? { refreshToken: newRefreshToken } : {}),
        }));
      }
    });
  },
}));
