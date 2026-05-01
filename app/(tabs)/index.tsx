import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { usersApi } from '../../src/api/users';
import { notesApi } from '../../src/api/notes';
import { dropsApi } from '../../src/api/drops';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { StatsCard } from '../../src/components/home/StatsCard';
import { StreakHeatmap } from '../../src/components/home/StreakHeatmap';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { Note, Message } from '../../src/types';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);

  const { data: streakData = [] } = useQuery({
    queryKey: ['streak', user?.id],
    queryFn: () => usersApi.getStreak(user!.id),
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ['stats', user?.id],
    queryFn: () => usersApi.getStats(user!.id),
    enabled: !!user,
  });

  const { data: notesData } = useQuery({
    queryKey: ['notes', 'preview'],
    queryFn: () => notesApi.search({ limit: 5 }),
    enabled: !!user,
  });

  const { data: dropsData } = useQuery({
    queryKey: ['drops', 'preview'],
    queryFn: () => dropsApi.getMessages(1, 3),
    enabled: !!user,
  });

  const firstName = user?.name.split(' ')[0] ?? 'Doctor';
  const survivalRate = stats?.survivalRate ?? user?.survivalRate ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
          <View>
            <Text className="text-on-surface-variant font-inter text-sm">{getGreeting()},</Text>
            <Text className="text-on-surface font-inter-bold text-2xl">{firstName} 👋</Text>
          </View>
          <View className="bg-primary-container rounded-full px-3 py-1.5 flex-row items-center">
            <Text style={{ fontSize: 14 }}>🔥</Text>
            <Text className="text-on-primary font-inter-bold text-sm ml-1">
              {stats?.streakDays ?? user?.streak ?? 0}
            </Text>
          </View>
        </View>

        {/* Exam Mode CTA */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/exam')}
          className="mx-5 my-3 rounded-3xl overflow-hidden"
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#4a2a8a', '#7c3aed', '#b599ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 20, borderRadius: 24 }}
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-white font-inter-bold text-xl">⚡ Enter Exam Mode</Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4, fontFamily: 'Inter_400Regular' }}>
                  AI-powered survival packs for your next exam
                </Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={36} color="rgba(255,255,255,0.8)" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Stats Row */}
        <View className="flex-row px-5 gap-2 mb-4">
          <StatsCard label="Streak Days" value={stats?.streakDays ?? user?.streak ?? 0} icon="🔥" />
          <StatsCard label="Notes Shared" value={stats?.notesShared ?? user?.notesShared ?? 0} icon="📚" />
          <StatsCard label="Survival Rate" value={`${Math.round(survivalRate)}`} icon="💪" suffix="%" />
          <StatsCard label="Study Hours" value={stats?.studyHours ?? user?.studyHours ?? 0} icon="⏱️" />
        </View>

        {/* Streak Heatmap */}
        <GlassCard className="mx-5 p-4 mb-4">
          <Text className="text-on-surface font-inter-semibold text-base mb-3">Study Streak</Text>
          <StreakHeatmap data={streakData} />
        </GlassCard>

        {/* Weekly Survival Progress */}
        <GlassCard className="mx-5 p-4 mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-on-surface font-inter-semibold text-base">Weekly Survival</Text>
            <Text className="text-primary font-inter-medium text-sm">{Math.round(survivalRate)}%</Text>
          </View>
          <ProgressBar progress={survivalRate / 100} />
          <Text className="text-on-surface-variant font-inter text-xs mt-2">
            {survivalRate >= 80
              ? 'You are thriving! Keep it up.'
              : survivalRate >= 50
              ? 'Good progress. Push through!'
              : 'Every day counts. Start small.'}
          </Text>
        </GlassCard>

        {/* Senior Notes Preview */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center px-5 mb-2">
            <Text className="text-on-surface font-inter-semibold text-base">Senior Notes</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/notes')}>
              <Text className="text-primary font-inter-medium text-sm">See all</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={notesData?.notes ?? []}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <GlassCard className="px-4 py-6 mr-3" style={{ width: 200 }}>
                <Text className="text-on-surface-variant text-sm text-center">No notes yet</Text>
              </GlassCard>
            }
            renderItem={({ item }: { item: Note }) => (
              <GlassCard className="p-4 mr-3" style={{ width: 180 }}>
                <View className="bg-primary-container rounded-lg px-2 py-0.5 self-start mb-2">
                  <Text className="text-on-primary text-xs font-inter-medium">{item.subject}</Text>
                </View>
                <Text className="text-on-surface font-inter-semibold text-sm mb-1" numberOfLines={2}>
                  {item.title}
                </Text>
                <Text className="text-on-surface-variant text-xs font-inter">{item.author?.name ?? 'Senior'}</Text>
                <View className="flex-row items-center mt-2">
                  <Text style={{ color: '#cfbcff', fontSize: 12 }}>★ {Number(item.rating ?? 0).toFixed(1)}</Text>
                  <Text className="text-outline text-xs ml-2">↓ {item.downloads ?? 0}</Text>
                </View>
              </GlassCard>
            )}
          />
        </View>

        {/* Medico Drops Preview */}
        <GlassCard className="mx-5 mb-6">
          <View className="flex-row justify-between items-center p-4 pb-2">
            <Text className="text-on-surface font-inter-semibold text-base">Medico Drops</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/drops')}>
              <Text className="text-primary font-inter-medium text-sm">Open chat</Text>
            </TouchableOpacity>
          </View>
          {(dropsData?.messages ?? []).slice(0, 3).map((msg: Message) => (
            <View key={msg.id} className="px-4 py-2 border-b border-outline-variant">
              <Text className="text-primary font-inter-medium text-xs mb-0.5">{msg.sender.name}</Text>
              <Text className="text-on-surface-variant font-inter text-sm" numberOfLines={1}>
                {msg.content}
              </Text>
            </View>
          ))}
          {(!dropsData?.messages || dropsData.messages.length === 0) && (
            <View className="px-4 py-6">
              <Text className="text-on-surface-variant text-sm text-center">No messages yet. Be the first!</Text>
            </View>
          )}
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}
