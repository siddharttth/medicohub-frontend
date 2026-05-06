import React, { useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, ActivityIndicator, Dimensions } from 'react-native';
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

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = Math.round(SCREEN_W * 0.62);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good Morning,';
  if (h >= 12 && h < 17) return 'Good Afternoon,';
  if (h >= 17 && h < 21) return 'Good Evening,';
  return 'Good Night,';
};

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  icon, value, label, cardBg, cardBorder, textColor, subColor,
}: {
  icon: string; value: string; label: string;
  cardBg: string; cardBorder: string; textColor: string; subColor: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={{ backgroundColor: cardBg, borderRadius: 18, borderWidth: 1, borderColor: cardBorder, paddingVertical: 16, paddingHorizontal: 6, alignItems: 'center' }}
      >
        <Text style={{ fontSize: 22, marginBottom: 8 }}>{icon}</Text>
        <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 18, color: textColor, marginBottom: 4, letterSpacing: -0.3 }}>{value}</Text>
        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 10, color: subColor, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Note card skeleton ───────────────────────────────────────────────────────
function NoteCardSkeleton({ cardBg, cardBorder }: { cardBg: string; cardBorder: string }) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View style={{ width: CARD_W, backgroundColor: cardBg, borderRadius: 22, borderWidth: 1, borderColor: cardBorder, padding: 18, opacity }}>
      <View style={{ height: 20, borderRadius: 6, backgroundColor: cardBorder, marginBottom: 12, width: '60%' }} />
      <View style={{ height: 26, borderRadius: 6, backgroundColor: cardBorder, marginBottom: 8, width: '90%' }} />
      <View style={{ height: 14, borderRadius: 5, backgroundColor: cardBorder, width: '40%' }} />
    </Animated.View>
  );
}

// ── Recommendation card ──────────────────────────────────────────────────────
function RecommendationCard({ note, onDownload, isDownloading, isDark, t }: {
  note: Note; onDownload: () => void; isDownloading: boolean;
  isDark: boolean; t: ReturnType<typeof getTheme>;
}) {
  // Clamp title at 5 words for better readability
  const words = note.title.split(' ');
  const title = words.length > 5 ? words.slice(0, 5).join(' ') + '…' : note.title;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onDownload}
      disabled={isDownloading}
      style={{
        width: CARD_W,
        backgroundColor: t.card, borderRadius: 22, borderWidth: 1, borderColor: t.cardBorder,
        padding: 18, flexDirection: 'column', justifyContent: 'space-between',
        minHeight: 148,
      }}
    >
      {/* Tags row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: isDark ? 'rgba(207,188,255,0.12)' : 'rgba(94,53,177,0.08)', borderWidth: 1, borderColor: isDark ? 'rgba(207,188,255,0.2)' : 'rgba(94,53,177,0.15)' }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: t.primaryText, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            {note.subject}
          </Text>
        </View>
        <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: t.iconBg, borderWidth: 1, borderColor: t.cardBorder }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: t.onSurfaceVariant, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            {note.noteType}
          </Text>
        </View>
      </View>

      {/* Title + author */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 16, color: t.onSurface, lineHeight: 23, marginBottom: 5 }}>{title}</Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: t.onSurfaceVariant }} numberOfLines={1}>
          by {(note as any).author?.name ?? 'Senior'}
        </Text>
      </View>

      {/* Footer: rating + download */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="star" size={12} color="#f59e0b" />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: t.onSurface }}>{note.ratingCount ?? 0} ratings</Text>
        </View>
        <TouchableOpacity
          onPress={onDownload}
          disabled={isDownloading}
          activeOpacity={0.8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: isDark ? 'rgba(207,188,255,0.1)' : 'rgba(94,53,177,0.08)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: isDark ? 'rgba(207,188,255,0.18)' : 'rgba(94,53,177,0.15)' }}
        >
          {isDownloading
            ? <ActivityIndicator size="small" color={t.primaryText} />
            : <>
                <Ionicons name="arrow-down-outline" size={13} color={t.primaryText} />
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: t.primaryText }}>Save</Text>
              </>
          }
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Progress bar ─────────────────────────────────────────────────────────────
function LevelProgressBar({ progress, isDark }: { progress: number; isDark: boolean }) {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(94,53,177,0.1)', overflow: 'hidden' }}>
      <Animated.View
        style={{
          width: animatedWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          height: '100%', borderRadius: 3, overflow: 'hidden',
        }}
      >
        <LinearGradient colors={['#cfbcff', '#a78bfa']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
      </Animated.View>
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
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
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* ── Greeting ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 }}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.onSurfaceVariant, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
            {getGreeting()}
          </Text>
          <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 36, color: t.onSurface, letterSpacing: -0.5, lineHeight: 42 }}>
            {firstName} 👋
          </Text>
        </View>

        {/* ── Stats row — personal context above the fold ── */}
        <View style={{ flexDirection: 'row', marginHorizontal: 20, gap: 8, marginBottom: 24 }}>
          <StatCard icon="🔥" value={String(streakDays)} label="Streak" cardBg={t.card} cardBorder={t.cardBorder} textColor={t.onSurface} subColor={t.onSurfaceVariant} />
          <StatCard icon="📋" value={String(notesShared)} label="Shared" cardBg={t.card} cardBorder={t.cardBorder} textColor={t.onSurface} subColor={t.onSurfaceVariant} />
          <StatCard icon="⏱" value={`${studyHours}h`} label="Hours" cardBg={t.card} cardBorder={t.cardBorder} textColor={t.onSurface} subColor={t.onSurfaceVariant} />
          <StatCard icon="📥" value={String(saves)} label="Saves" cardBg={t.card} cardBorder={t.cardBorder} textColor={t.onSurface} subColor={t.onSurfaceVariant} />
        </View>

        {/* ── Hero CTA card ── */}
        <TouchableOpacity onPress={() => router.push('/(tabs)/exam')} activeOpacity={0.87} style={{ marginHorizontal: 20, marginBottom: 28, borderRadius: 24 }}>
          <LinearGradient
            colors={isDark ? ['#2a1f3d', '#1a1530'] : ['#EDE8FF', '#E8E1FF']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ borderRadius: 24, borderWidth: 1, borderColor: isDark ? 'rgba(181,153,255,0.25)' : 'rgba(94,53,177,0.2)', padding: 22 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Left: icon + text */}
              <View style={{ flex: 1, marginRight: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: isDark ? 'rgba(207,188,255,0.18)' : 'rgba(94,53,177,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18 }}>⚡</Text>
                  </View>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: isDark ? 'rgba(207,188,255,0.6)' : 'rgba(94,53,177,0.6)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    AI-Powered
                  </Text>
                </View>
                <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 22, color: isDark ? '#ffffff' : '#1A1C2E', letterSpacing: -0.4, lineHeight: 28, marginBottom: 6 }}>
                  Enter Exam Mode
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: isDark ? 'rgba(207,188,255,0.65)' : 'rgba(60,40,120,0.65)', lineHeight: 19 }}>
                  AI-powered survival packs for{'\n'}your next rotation
                </Text>
              </View>

              {/* Right: arrow CTA */}
              <View style={{
                width: 44, height: 44, borderRadius: 14,
                backgroundColor: isDark ? 'rgba(207,188,255,0.15)' : 'rgba(94,53,177,0.12)',
                borderWidth: 1, borderColor: isDark ? 'rgba(207,188,255,0.25)' : 'rgba(94,53,177,0.2)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="arrow-forward" size={20} color={isDark ? '#cfbcff' : '#5E35B1'} />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Recommended notes ── */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 14 }}>
            <View>
              <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 22, color: t.onSurface, letterSpacing: -0.3, marginBottom: 2 }}>Recommended for you</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: t.onSurfaceVariant }}>Top starred notes from your batch</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/notes')} activeOpacity={0.7}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: isDark ? 'rgba(207,188,255,0.08)' : 'rgba(94,53,177,0.07)', borderWidth: 1, borderColor: isDark ? 'rgba(207,188,255,0.15)' : 'rgba(94,53,177,0.15)' }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: t.primaryText, letterSpacing: 0.3 }}>See all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20, paddingRight: 20, paddingBottom: 6, gap: 14 }}>
            {isLoadingRecommendations ? (
              <>
                <NoteCardSkeleton cardBg={t.card} cardBorder={t.cardBorder} />
                <NoteCardSkeleton cardBg={t.card} cardBorder={t.cardBorder} />
              </>
            ) : sortedRecommendations.length > 0 ? (
              sortedRecommendations.map((note) => (
                <RecommendationCard
                  key={note.id}
                  note={note}
                  onDownload={() => downloadMutation.mutate(note.id)}
                  isDownloading={downloadMutation.isPending && downloadMutation.variables === note.id}
                  isDark={isDark}
                  t={t}
                />
              ))
            ) : (
              <View style={{ width: CARD_W, backgroundColor: t.card, borderRadius: 22, borderWidth: 1, borderColor: t.cardBorder, padding: 20 }}>
                <Text style={{ fontSize: 28, marginBottom: 10 }}>📭</Text>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: t.onSurface, marginBottom: 4 }}>No notes yet</Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: t.onSurfaceVariant, lineHeight: 18 }}>Explore the notes tab to discover study material.</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* ── Notes Contributed / level card ── */}
        <View style={{ marginHorizontal: 20, backgroundColor: t.card, borderRadius: 22, borderWidth: 1, borderColor: t.cardBorder, padding: 20 }}>
          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 17, color: t.onSurface, letterSpacing: -0.2, marginBottom: 3 }}>Notes Contributed</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: t.onSurfaceVariant }}>Upload notes to help your batch</Text>
            </View>
            {/* Level badge */}
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: isDark ? 'rgba(207,188,255,0.12)' : 'rgba(94,53,177,0.08)', borderWidth: 1, borderColor: isDark ? 'rgba(207,188,255,0.2)' : 'rgba(94,53,177,0.15)' }}>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: t.primaryText, letterSpacing: 0.8 }}>LVL {level}</Text>
              </View>
              <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 26, color: t.primaryText, letterSpacing: -0.5 }}>{notesShared}</Text>
            </View>
          </View>

          {/* Progress bar */}
          <LevelProgressBar progress={notesProgress} isDark={isDark} />

          {/* Progress labels */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: t.onSurfaceVariant }}>Level {level}</Text>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: t.onSurfaceVariant }}>{10 - notesIntoLevel} notes to next level</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
