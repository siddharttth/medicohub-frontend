import React, { useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore, getTheme } from '../../src/store/themeStore';
import { usersApi } from '../../src/api/users';
import { notesApi } from '../../src/api/notes';
import { Note } from '../../src/types';
import { ProgressBar } from '../../src/components/ui/ProgressBar';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good Morning,';
  if (h >= 12 && h < 17) return 'Good Afternoon,';
  if (h >= 17 && h < 21) return 'Good Evening,';
  return 'Good Night,';
};

function StatCard({
  icon, value, label, cardBg, cardBorder, textColor, subColor,
}: {
  icon: string; value: string; label: string;
  cardBg: string; cardBorder: string; textColor: string; subColor: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }).start();
  };

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={{ backgroundColor: cardBg, borderRadius: 20, borderWidth: 1, borderColor: cardBorder, paddingVertical: 14, alignItems: 'center' }}
      >
        <Text style={{ fontSize: 20, marginBottom: 6 }}>{icon}</Text>
        <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 20, color: textColor, marginBottom: 4 }}>{value}</Text>
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 8, color: subColor, letterSpacing: 1.5, textTransform: 'uppercase' }}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function RecommendationCard({ note, onDownload, isDownloading, cardBg, cardBorder, textColor, subColor, primary }: {
  note: Note; onDownload: () => void; isDownloading: boolean;
  cardBg: string; cardBorder: string; textColor: string; subColor: string; primary: string;
}) {
  const isDark = useThemeStore((s) => s.isDark);
  const t = getTheme(isDark);
  const truncatedTitle = note.title.split(' ').slice(0, 3).join(' ') + (note.title.split(' ').length > 3 ? '...' : '');
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onDownload}
      disabled={isDownloading}
      style={{ width: 230, marginRight: 14, backgroundColor: cardBg, borderRadius: 28, borderWidth: 1, borderColor: cardBorder, padding: 18, flexDirection: 'column', justifyContent: 'space-between' }}
    >
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: t.iconBg, borderWidth: 1, borderColor: t.cardBorder }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: t.primaryText, letterSpacing: 1.2, textTransform: 'uppercase' }}>
              {note.subject}
            </Text>
          </View>
          <View style={{ paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: cardBorder }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: t.onSurfaceVariant, textTransform: 'uppercase' }}>
              {note.noteType.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 18, color: textColor, lineHeight: 26, marginBottom: 6 }}>{truncatedTitle}</Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: subColor }} numberOfLines={1}>
          by {(note as any).author?.name ?? 'Senior'}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="star" size={13} color="#fbbf24" />
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: textColor }}>{note.ratingCount ?? 0}</Text>
        </View>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: t.iconBg, borderWidth: 1, borderColor: t.cardBorder, alignItems: 'center', justifyContent: 'center' }}>
          {isDownloading
            ? <ActivityIndicator size="small" color={primary} />
            : <Ionicons name="arrow-down-outline" size={18} color={primary} />
          }
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const isDark = useThemeStore((s) => s.isDark);
  const t = getTheme(isDark);

  const { data: stats } = useQuery({
    queryKey: ['stats', user?.id],
    queryFn: () => usersApi.getStats(user!.id),
    enabled: !!user,
  });

  const { data: recommendations = [], isLoading: isLoadingRecommendations } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => notesApi.getTrending(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const sortedRecommendations = useMemo(
    () => [...recommendations].sort((a, b) => (b.ratingCount ?? 0) - (a.ratingCount ?? 0)).slice(0, 5),
    [recommendations]
  );

  const downloadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await notesApi.download(id);
      const localUri = (FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '') + (res.fileName ?? 'download');
      const { uri } = await FileSystem.downloadAsync(res.url, localUri);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
    },
  });

  const firstName = user?.name.split(' ')[0] ?? 'Doctor';
  const streakDays = stats?.streakDays ?? user?.streakDays ?? 0;
  const notesShared = stats?.notesShared ?? user?.notesShared ?? 0;
  const studyHours = stats?.totalStudyHours ?? 0;
  const saves = stats?.notesDownloaded ?? 0;
  const level = Math.floor(notesShared / 10) + 1;
  const notesIntoLevel = notesShared % 10;
  const notesProgress = notesIntoLevel / 10;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Greeting */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 }}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.onSurfaceVariant, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
            {getGreeting()}
          </Text>
          <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 36, color: t.onSurface, letterSpacing: -0.5, lineHeight: 42 }}>
            {firstName} 👋
          </Text>
        </View>

        {/* CTA Hero Card */}
        <TouchableOpacity onPress={() => router.push('/(tabs)/exam')} activeOpacity={0.85} style={{ marginHorizontal: 20, marginBottom: 28, borderRadius: 28 }}>
          <LinearGradient
            colors={isDark ? ['#2a1f3d', '#1a1530'] : ['#EDE8FF', '#F5F2FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 28, borderWidth: 1, borderColor: 'rgba(181,153,255,0.35)', padding: 26 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(181,153,255,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>⚡</Text>
              </View>
              <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 22, color: isDark ? '#ffffff' : '#1A1C2E', letterSpacing: -0.3 }}>
                Enter Exam Mode
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: isDark ? 'rgba(207,188,255,0.7)' : 'rgba(90,68,170,0.75)', maxWidth: 195, lineHeight: 20 }}>
                AI-powered survival packs for your next rotation
              </Text>
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: t.primaryContainer, alignItems: 'center', justifyContent: 'center', shadowColor: t.primaryContainer, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 14 }}>
                <Ionicons name="arrow-forward" size={22} color="#39197c" />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Recommended Notes */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 14 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 20, color: t.onSurface, marginBottom: 4 }}>Recommended for you</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: t.onSurfaceVariant }}>Top starred notes from your batch</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/notes')} activeOpacity={0.7}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: t.primaryText }}>See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            {isLoadingRecommendations ? (
              <ActivityIndicator size="small" color={t.primaryText} style={{ marginTop: 24 }} />
            ) : sortedRecommendations.length > 0 ? (
              sortedRecommendations.map((note) => (
                <RecommendationCard
                  key={note.id} note={note}
                  onDownload={() => downloadMutation.mutate(note.id)}
                  isDownloading={downloadMutation.isPending && downloadMutation.variables === note.id}
                  cardBg={t.card} cardBorder={t.cardBorder} textColor={t.onSurface} subColor={t.onSurfaceVariant} primary={t.primaryContainer}
                />
              ))
            ) : (
              <View style={{ backgroundColor: t.card, borderRadius: 24, borderWidth: 1, borderColor: t.cardBorder, padding: 18, width: 268 }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: t.onSurface, marginBottom: 6 }}>No notes yet</Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: t.onSurfaceVariant }}>Explore the notes tab to discover study material.</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Stats Row */}
        <View style={{ flexDirection: 'row', marginHorizontal: 20, gap: 10, marginBottom: 24 }}>
          <StatCard icon="🔥" value={String(streakDays)} label="Streak" cardBg={t.card} cardBorder={t.cardBorder} textColor={t.onSurface} subColor={t.onSurfaceVariant} />
          <StatCard icon="📋" value={String(notesShared)} label="Shared" cardBg={t.card} cardBorder={t.cardBorder} textColor={t.onSurface} subColor={t.onSurfaceVariant} />
          <StatCard icon="⏱" value={`${studyHours}h`} label="Hours" cardBg={t.card} cardBorder={t.cardBorder} textColor={t.onSurface} subColor={t.onSurfaceVariant} />
          <StatCard icon="📥" value={String(saves)} label="Saves" cardBg={t.card} cardBorder={t.cardBorder} textColor={t.onSurface} subColor={t.onSurfaceVariant} />
        </View>

        {/* Notes Contributed */}
        <View style={{ marginHorizontal: 20, backgroundColor: t.card, borderRadius: 28, borderWidth: 1, borderColor: t.cardBorder, padding: 22 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
            <View>
              <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 18, color: t.onSurface, letterSpacing: -0.2, marginBottom: 4 }}>Notes Contributed</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: t.onSurfaceVariant }}>Upload notes to help your batch</Text>
            </View>
            <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 28, color: t.primaryText, letterSpacing: -0.5 }}>{notesShared}</Text>
          </View>
          <ProgressBar progress={notesProgress} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: t.onSurfaceVariant, letterSpacing: 1.5, textTransform: 'uppercase' }}>Level {level}</Text>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: t.onSurfaceVariant, letterSpacing: 1.5, textTransform: 'uppercase' }}>Next: {10 - notesIntoLevel} Notes</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
