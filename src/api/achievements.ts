import apiClient from './axios';
import { Achievement } from '../types';

export const achievementsApi = {
  getAchievements: (userId: string): Promise<Achievement[]> =>
    apiClient.get(`/achievements/${userId}`).then((r) => r.data.data.achievements),
};
