import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import { usersApi } from '../../src/api/users';
import { achievementsApi } from '../../src/api/achievements';
import { authApi } from '../../src/api/auth';
import { useAuth } from '../../src/hooks/useAuth';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { Achievement } from '../../src/types';

export default function ProfileScreen() {
  const storeUser = useAuthStore((s) => s.user);
  const { signOut } = useAuth();

  // Fetch fresh user data from /auth/me
  const { data: user = storeUser } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    enabled: !!storeUser,
    placeholderData: storeUser ?? undefined,
  });

  const userId = user?.id || user?._id;

  const { data: stats } = useQuery({
    queryKey: ['stats', userId],
    queryFn: () => usersApi.getStats(userId!),
    enabled: !!userId,
  });

  const { data: achievements = [] } = useQuery<Achievement[]>({
    queryKey: ['achievements', userId],
    queryFn: () => achievementsApi.getAchievements(userId!),
    enabled: !!userId,
  });

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/onboarding');
        },
      },
    ]);
  };

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'MH';

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Avatar + Name */}
        <View className="items-center pt-6 pb-4 px-5">
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              padding: 3,
              marginBottom: 12,
              borderWidth: 2,
              borderColor: '#cfbcff',
            }}
          >
            <LinearGradient
              colors={['#4a2a8a', '#b599ff']}
              style={{ width: '100%', height: '100%', borderRadius: 41, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 28, fontFamily: 'Inter_700Bold', color: 'white' }}>{initials}</Text>
            </LinearGradient>
          </View>
          <Text className="text-on-surface font-inter-bold text-xl">{user?.name ?? 'MedicoHub User'}</Text>
          <Text className="text-on-surface-variant font-inter text-sm mt-0.5">{user?.email ?? ''}</Text>
          <Text className="text-on-surface-variant font-inter text-sm mt-0.5">{user?.college ?? 'Medical College'}</Text>
          <Text className="text-outline font-inter text-xs mt-0.5">Year {user?.year ?? '1st'} • MBBS</Text>
        </View>

        {/* Stats */}
        <View className="flex-row px-5 gap-2 mb-5">
          {[
            { label: 'Streak Days', value: `${stats?.streakDays ?? user?.streakDays ?? 0}🔥` },
            { label: 'Notes Shared', value: `${stats?.notesShared ?? user?.notesShared ?? 0}📚` },
            { label: 'Study Hours', value: `${stats?.totalStudyHours ?? 0}⏱️` },
          ].map((s) => (
            <GlassCard key={s.label} className="flex-1 items-center py-3">
              <Text className="text-on-surface font-inter-bold text-lg">{s.value}</Text>
              <Text className="text-on-surface-variant font-inter text-xs text-center mt-0.5">{s.label}</Text>
            </GlassCard>
          ))}
        </View>

        {/* Achievements */}
        <View className="px-5 mb-5">
          <Text className="text-on-surface font-inter-semibold text-base mb-3">Achievements 🏅</Text>
          {achievements.length === 0 ? (
            <GlassCard className="p-4 items-center">
              <Text className="text-on-surface-variant font-inter text-sm">No achievements yet. Keep studying!</Text>
            </GlassCard>
          ) : (
            <View className="flex-row flex-wrap gap-3">
              {achievements.slice(0, 4).map((achievement: Achievement) => {
                const isUnlocked = achievement.unlockedAt !== null;
                return (
                  <GlassCard
                    key={achievement._id}
                    className="p-3 items-center"
                    style={{
                      width: '47%',
                      opacity: isUnlocked ? 1 : 0.5,
                    }}
                  >
                    <Text style={{ fontSize: 28 }}>{achievement.icon}</Text>
                    <Text className="text-on-surface font-inter-semibold text-sm mt-2 text-center">
                      {achievement.title}
                    </Text>
                    <Text className="text-on-surface-variant font-inter text-xs text-center mt-1" numberOfLines={2}>
                      {achievement.description}
                    </Text>
                    {achievement.progress && (
                      <Text className="text-outline font-inter text-xs mt-1">
                        {achievement.progress.current}/{achievement.progress.target}
                      </Text>
                    )}
                    {isUnlocked && (
                      <View className="bg-primary rounded-full px-2 py-0.5 mt-2">
                        <Text className="text-on-primary text-xs font-inter-medium">Unlocked</Text>
                      </View>
                    )}
                  </GlassCard>
                );
              })}
            </View>
          )}
        </View>

        {/* Settings */}
        <View className="px-5 mb-5">
          <Text className="text-on-surface font-inter-semibold text-base mb-3">Settings</Text>
          <GlassCard>
            {[
              { icon: 'notifications-outline' as const, label: 'Notifications', hasToggle: true },
              { icon: 'information-circle-outline' as const, label: 'About MedicoHub', hasToggle: false },
            ].map((item, i, arr) => (
              <View
                key={item.label}
                className={`flex-row items-center px-4 py-4 ${i < arr.length - 1 ? 'border-b border-outline-variant' : ''}`}
              >
                <Ionicons name={item.icon} size={20} color="#948e9d" />
                <Text className="flex-1 text-on-surface font-inter text-sm ml-3">{item.label}</Text>
                {item.hasToggle ? (
                  <Switch
                    value={true}
                    thumbColor="#cfbcff"
                    trackColor={{ false: '#494551', true: '#39197c' }}
                  />
                ) : (
                  <Ionicons name="chevron-forward" size={16} color="#494551" />
                )}
              </View>
            ))}
          </GlassCard>
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          className="mx-5 mb-6 border border-error rounded-2xl py-4 items-center flex-row justify-center"
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color="#ffb4ab" />
          <Text className="text-error font-inter-medium text-sm ml-2">Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
