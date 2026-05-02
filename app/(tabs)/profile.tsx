import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useAuthStore } from '../../src/store/authStore';
import { usersApi } from '../../src/api/users';
import { achievementsApi } from '../../src/api/achievements';
import { authApi } from '../../src/api/auth';
import { useAuth } from '../../src/hooks/useAuth';
import { notesApi } from '../../src/api/notes';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { Achievement, NoteRequest } from '../../src/types';

export default function ProfileScreen() {
  const storeUser = useAuthStore((s) => s.user);
  const { signOut } = useAuth();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const downloadNote = async (noteId: string) => {
    try {
      setDownloadingId(noteId);
      const res = await notesApi.download(noteId);
      if (!res.url) throw new Error('No URL');
      const localUri = (FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '') + (res.fileName ?? 'download');
      const { uri } = await FileSystem.downloadAsync(res.url, localUri);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch {
      Alert.alert('Download failed', 'Could not download the note. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

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

  const { data: myRequests = [] } = useQuery<NoteRequest[]>({
    queryKey: ['my-requests'],
    queryFn: notesApi.getMyRequests,
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
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
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

        {/* My Requests */}
        <View className="px-5 mb-5">
          <Text className="text-on-surface font-inter-semibold text-base mb-3">My Note Requests 📬</Text>
          {myRequests.length === 0 ? (
            <GlassCard className="p-4 items-center">
              <Text className="text-on-surface-variant font-inter text-sm">No requests yet.</Text>
            </GlassCard>
          ) : (
            myRequests.map((req) => (
              <TouchableOpacity
                key={req.id}
                activeOpacity={req.status === 'fulfilled' && req.fulfilledNote ? 0.75 : 1}
                onPress={() => {
                  if (req.status === 'fulfilled' && req.fulfilledNote) {
                    downloadNote(req.fulfilledNote.id);
                  }
                }}
              >
                <GlassCard className="p-3 mb-2">
                  <View className="flex-row items-center justify-between mb-1">
                    <View className="flex-row gap-2">
                      <View className="bg-primary-container rounded-full px-2 py-0.5">
                        <Text className="text-on-primary text-xs font-inter-medium">{req.subject}</Text>
                      </View>
                      <View className="bg-surface-container-high rounded-full px-2 py-0.5">
                        <Text className="text-outline text-xs font-inter">{req.noteType}</Text>
                      </View>
                    </View>
                    <View
                      className="rounded-full px-2 py-0.5"
                      style={{ backgroundColor: req.status === 'fulfilled' ? '#1a3a1a' : '#3a2a0a' }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '600', color: req.status === 'fulfilled' ? '#4caf50' : '#ffb300' }}>
                        {req.status === 'fulfilled' ? '✓ Fulfilled' : '⏳ Pending'}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-on-surface font-inter-semibold text-sm">{req.topic}</Text>
                  {req.status === 'fulfilled' && req.fulfilledNote && (
                    <View className="mt-2 bg-surface-container rounded-xl px-3 py-2 flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-on-surface-variant font-inter text-xs mb-0.5">Note uploaded:</Text>
                        <Text className="text-primary font-inter-medium text-sm">{req.fulfilledNote.title}</Text>
                        <Text className="text-outline font-inter text-xs">by {req.fulfilledNote.author?.name ?? 'Senior'}</Text>
                      </View>
                      {downloadingId === req.fulfilledNote.id ? (
                        <ActivityIndicator size="small" color="#cfbcff" />
                      ) : (
                        <Ionicons name="download-outline" size={18} color="#cfbcff" />
                      )}
                    </View>
                  )}
                </GlassCard>
              </TouchableOpacity>
            ))
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
