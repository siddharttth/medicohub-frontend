import apiClient from './axios';
import { User, StreakDay, Stats, Achievement } from '../types';

export const usersApi = {
  getProfile: (id: string): Promise<User> =>
    apiClient.get(`/users/${id}`).then((r) => r.data),

  updateProfile: (id: string, data: Partial<User>): Promise<User> =>
    apiClient.patch(`/users/${id}`, data).then((r) => r.data),

  getStreak: (id: string): Promise<StreakDay[]> =>
    apiClient.get(`/users/${id}/streak`).then((r) => r.data),

  getStats: (id: string): Promise<Stats> =>
    apiClient.get(`/users/${id}/stats`).then((r) => r.data),

  getAchievements: (id: string): Promise<Achievement[]> =>
    apiClient.get(`/users/${id}/achievements`).then((r) => r.data),
};
