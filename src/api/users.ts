import apiClient from './axios';
import { User, StreakDay, Stats } from '../types';

export const usersApi = {
  getProfile: (id: string): Promise<User> =>
    apiClient.get(`/users/${id}`).then((r) => r.data.data),

  updateProfile: (id: string, data: Partial<User>): Promise<User> =>
    apiClient.patch(`/users/${id}`, data).then((r) => r.data.data),

  getStreak: (id: string): Promise<StreakDay[]> =>
    apiClient.get(`/users/${id}/streak`).then((r) => r.data.data.streak),

  getStats: (id: string): Promise<Stats> =>
    apiClient.get(`/users/${id}/stats`).then((r) => r.data.data),
};
