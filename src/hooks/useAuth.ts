import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import { OnboardingData } from '../types';

export const useAuth = () => {
  const { user, accessToken, isLoading, isHydrated, login, logout } = useAuthStore();

  // register now just sends OTP — returns { email }
  const register = async (data: OnboardingData) => {
    return authApi.register(data);
  };

  // Called after OTP is verified — stores tokens and logs user in
  const completeRegistration = async (email: string, otp: string) => {
    const response = await authApi.verifyOtp(email, otp);
    await login(
      { accessToken: response.accessToken, refreshToken: response.refreshToken },
      response.user
    );
    return response;
  };

  const signIn = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    await login(
      { accessToken: response.accessToken, refreshToken: response.refreshToken },
      response.user
    );
    return response;
  };

  const signOut = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    await logout();
  };

  return {
    user,
    accessToken,
    isLoading,
    isHydrated,
    isAuthenticated: !!accessToken,
    register,
    completeRegistration,
    signIn,
    signOut,
  };
};
