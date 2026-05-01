import apiClient from './axios';
import { User, AuthTokens, OnboardingData } from '../types';

interface RegisterResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  register: (data: OnboardingData): Promise<RegisterResponse> =>
    apiClient.post('/auth/register', data).then((r) => r.data.data),

  login: (email: string, password: string): Promise<LoginResponse> =>
    apiClient.post('/auth/login', { email, password }).then((r) => r.data.data),

  refresh: (refreshToken: string): Promise<AuthTokens> =>
    apiClient.post('/auth/refresh', { refreshToken }).then((r) => r.data.data),

  logout: (): Promise<void> =>
    apiClient.post('/auth/logout').then((r) => r.data),

  me: (): Promise<User> =>
    apiClient.get('/auth/me').then((r) => r.data.data.user),
};
