import '../global.css';
import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Caveat_400Regular, Caveat_700Bold } from '@expo-google-fonts/caveat';
import {
  NotoSerif_500Medium,
  NotoSerif_600SemiBold,
  NotoSerif_700Bold,
} from '@expo-google-fonts/noto-serif';
import { useAuthStore } from '../src/store/authStore';
import { usersApi } from '../src/api/users';
import { toastConfig } from '../src/components/ui/Toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const user = useAuthStore((s) => s.user);
  const sessionStart = useRef<number | null>(null);

  // Track active time and log to backend when app goes to background
  useEffect(() => {
    if (!user) return;
    sessionStart.current = Date.now();

    const handleAppState = (next: AppStateStatus) => {
      if (next === 'active') {
        sessionStart.current = Date.now();
      } else if (next === 'background' || next === 'inactive') {
        if (sessionStart.current) {
          const minutes = Math.round((Date.now() - sessionStart.current) / 60000);
          if (minutes >= 1) usersApi.logStudySession(minutes).catch(() => {});
          sessionStart.current = null;
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => {
      // Log remaining time on unmount
      if (sessionStart.current) {
        const minutes = Math.round((Date.now() - sessionStart.current) / 60000);
        if (minutes >= 1) usersApi.logStudySession(minutes).catch(() => {});
      }
      sub.remove();
    };
  }, [user?.id]);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Caveat_400Regular,
    Caveat_700Bold,
    NotoSerif_500Medium,
    NotoSerif_600SemiBold,
    NotoSerif_700Bold,
  });

  useEffect(() => {
    hydrate();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" backgroundColor="#070810" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#070810' } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
          <Toast config={toastConfig} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
