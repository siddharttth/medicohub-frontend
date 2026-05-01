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
import { notesApi } from '../../src/api/notes';
import { examApi } from '../../src/api/exam';
import { useAuth } from '../../src/hooks/useAuth';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { Achievement, Note, ExamPack } from '../../src/types';

const DEFAULT_ACHIEVEMENTS = [
  { id: '1', title: 'Night Owl', description: 'Studied past midnight 5 times', icon: '🦉', isUnlocked: false },
  { id: '2', title: 'Verified Senior', description: 'Shared 10+ notes', icon: '⭐', isUnlocked: false },
  { id: '3', title: 'Top Contributor', description: 'Notes downloaded 100+ times', icon: '🏆', isUnlocked: false },
  { id: '4', title: '30-Day Streak', description: 'Studied for 30 consecutive days', icon: '🔥', isUnlocked: false },
];

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const { signOut } = useAuth();

  const { data: achievements = DEFAULT_ACHIEVEMENTS } = useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: () => usersApi.getAchievements(user!.id),
    enabled: !!user,
    placeholderData: DEFAULT_ACHIEVEMENTS,
  });

  const { data: myNotes = [] } = useQuery<Note[]>({
    queryKey: ['notes', 'me'],
    queryFn: () => notesApi.getMyNotes(),
    enabled: !!user,
  });

  const { data: savedPacks = [] } = useQuery<ExamPack[]>({
    queryKey: ['exam', 'saved'],
    queryFn: () => examApi.getSavedPacks(),
    enabled: !!user,
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
          <Text className="text-on-surface-variant font-inter text-sm mt-0.5">{user?.college ?? 'Medical College'}</Text>
          <Text className="text-outline font-inter text-xs mt-0.5">Year {user?.year ?? 1} • MBBS</Text>
        </View>

        {/* Stats */}
        <View className="flex-row px-5 gap-2 mb-5">
          {[
            { label: '7-Day Streak', value: `${user?.streak ?? 0}🔥`, },
            { label: 'Notes Shared', value: `${user?.notesShared ?? 0}📚` },
            { label: 'Survival Rate', value: `${Math.round(user?.survivalRate ?? 0)}%💪` },
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
          <View className="flex-row flex-wrap gap-3">
            {achievements.slice(0, 4).map((achievement: Achievement) => (
              <GlassCard
                key={achievement.id}
                className="p-3 items-center"
                style={{
                  width: '47%',
                  opacity: achievement.isUnlocked ? 1 : 0.5,
                }}
              >
                <Text style={{ fontSize: 28 }}>{achievement.icon}</Text>
                <Text className="text-on-surface font-inter-semibold text-sm mt-2 text-center">
                  {achievement.title}
                </Text>
                <Text className="text-on-surface-variant font-inter text-xs text-center mt-1" numberOfLines={2}>
                  {achievement.description}
                </Text>
                {achievement.isUnlocked && (
                  <View className="bg-primary rounded-full px-2 py-0.5 mt-2">
                    <Text className="text-on-primary text-xs font-inter-medium">Unlocked</Text>
                  </View>
                )}
              </GlassCard>
            ))}
          </View>
        </View>

        {/* My Notes */}
        {myNotes.length > 0 && (
          <View className="px-5 mb-5">
            <Text className="text-on-surface font-inter-semibold text-base mb-3">My Shared Notes</Text>
            {myNotes.slice(0, 3).map((note) => (
              <GlassCard key={note.id} className="flex-row items-center p-3 mb-2">
                <Text style={{ fontSize: 20, marginRight: 10 }}>📄</Text>
                <View className="flex-1">
                  <Text className="text-on-surface font-inter-medium text-sm" numberOfLines={1}>{note.title}</Text>
                  <Text className="text-on-surface-variant font-inter text-xs">{note.subject} • {note.downloads} downloads</Text>
                </View>
                <Text style={{ color: '#cfbcff', fontSize: 12 }}>★ {note.rating.toFixed(1)}</Text>
              </GlassCard>
            ))}
          </View>
        )}

        {/* Saved Packs */}
        {savedPacks.length > 0 && (
          <View className="px-5 mb-5">
            <Text className="text-on-surface font-inter-semibold text-base mb-3">Saved Survival Packs</Text>
            {savedPacks.slice(0, 3).map((pack) => (
              <GlassCard key={pack.id} className="flex-row items-center p-3 mb-2">
                <Text style={{ fontSize: 20, marginRight: 10 }}>⚡</Text>
                <View className="flex-1">
                  <Text className="text-on-surface font-inter-medium text-sm">{pack.subject} Pack</Text>
                  <Text className="text-on-surface-variant font-inter text-xs">
                    {pack.highYieldTopics.length} topics
                  </Text>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* Go Pro CTA */}
        {!user?.isPro && (
          <TouchableOpacity className="mx-5 mb-5 rounded-3xl overflow-hidden" activeOpacity={0.85}>
            <LinearGradient
              colors={['#4a2a8a', '#7c3aed', '#b599ff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 20, borderRadius: 24 }}
            >
              <Text className="text-white font-inter-bold text-lg mb-1">⚡ Go Pro</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: 'Inter_400Regular' }}>
                Unlimited AI generations, exclusive senior notes, and priority support.
              </Text>
              <View className="bg-white rounded-xl py-2 px-4 self-start mt-3">
                <Text style={{ color: '#39197c', fontFamily: 'Inter_700Bold', fontSize: 13 }}>
                  Upgrade Now →
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

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
