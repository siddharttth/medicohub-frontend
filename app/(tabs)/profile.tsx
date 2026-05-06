import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore, getTheme } from '../../src/store/themeStore';
import { usersApi } from '../../src/api/users';
import { achievementsApi } from '../../src/api/achievements';
import { authApi } from '../../src/api/auth';
import { useAuth } from '../../src/hooks/useAuth';
import { notesApi } from '../../src/api/notes';
import { CardEmptyState } from '../../src/components/ui/EmptyState';
import { getSubjectColor } from '../../src/constants/subjects';
import { Achievement, NoteRequest } from '../../src/types';

// ── Skeleton shimmer ──────────────────────────────────────────────────────────
function SkeletonBlock({ width, height, style }: { width: string | number; height: number; style?: object }) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
  const isDark = useThemeStore((s) => s.isDark);
  const t = getTheme(isDark);
  return (
    <Animated.View style={[{ width, height, borderRadius: 8, backgroundColor: t.cardBorder, opacity }, style]} />
  );
}

// Fix #26: skeleton for achievements grid
function AchievementSkeleton() {
  const isDark = useThemeStore((s) => s.isDark);
  const t = getTheme(isDark);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ width: '48.5%', backgroundColor: t.card, borderRadius: 22, borderWidth: 1, borderColor: t.cardBorder, padding: 18, alignItems: 'center' }}>
          <SkeletonBlock width={40} height={40} style={{ borderRadius: 12, marginBottom: 10 }} />
          <SkeletonBlock width="70%" height={14} style={{ marginBottom: 8 }} />
          <SkeletonBlock width="90%" height={11} style={{ marginBottom: 4 }} />
          <SkeletonBlock width="90%" height={11} />
        </View>
      ))}
    </View>
  );
}

// Fix #26: skeleton for request cards
function RequestSkeleton() {
  const isDark = useThemeStore((s) => s.isDark);
  const t = getTheme(isDark);
  return (
    <>
      {[0, 1].map((i) => (
        <View key={i} style={{ backgroundColor: t.card, borderRadius: 22, borderWidth: 1, borderColor: t.cardBorder, padding: 18, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <SkeletonBlock width={60} height={22} style={{ borderRadius: 8 }} />
            <SkeletonBlock width={50} height={22} style={{ borderRadius: 8 }} />
          </View>
          <SkeletonBlock width="70%" height={16} />
        </View>
      ))}
    </>
  );
}

export default function ProfileScreen() {
  const storeUser = useAuthStore((s) => s.user);
  const { signOut } = useAuth();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showAllRequests, setShowAllRequests] = useState(false);

  const isDark = useThemeStore((s) => s.isDark);
  const setDark = useThemeStore((s) => s.setDark);
  const t = getTheme(isDark);

  const downloadNote = async (noteId: string) => {
    try {
      setDownloadingId(noteId);
      const res = await notesApi.download(noteId);
      if (!res.url) throw new Error('No URL');
      const localUri = (FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '') + (res.fileName ?? 'download');
      const { uri } = await FileSystem.downloadAsync(res.url, localUri);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
    } catch {
      Alert.alert('Download failed', 'Could not download the note. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

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

  const { data: achievements, isLoading: isLoadingAchievements } = useQuery<Achievement[]>({
    queryKey: ['achievements', userId],
    queryFn: () => achievementsApi.getAchievements(userId!),
    enabled: !!userId,
  });

  const { data: myRequests, isLoading: isLoadingRequests } = useQuery<NoteRequest[]>({
    queryKey: ['my-requests'],
    queryFn: notesApi.getMyRequests,
    enabled: !!userId,
  });

  const achievementList = achievements ?? [];
  const requestList = myRequests ?? [];

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await signOut(); router.replace('/(auth)/onboarding'); } },
    ]);
  };

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'MH';
  const streakDays = stats?.streakDays ?? user?.streakDays ?? 0;

  // Fix #4 + #19: standardised card radii — lg=22 for content cards, avatar gets 28 as hero element
  const cardStyle = {
    backgroundColor: t.card,
    borderRadius: 22,   // Fix #19: was 28 everywhere; 22 is app standard for content cards
    borderWidth: 1 as const,
    borderColor: t.cardBorder,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Header ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.onSurfaceVariant, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
              My Account
            </Text>
            <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 36, color: t.onSurface, letterSpacing: -0.5, lineHeight: 40 }}>
              Profile
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,100,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,100,0,0.18)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginTop: 6, gap: 6 }}>
            <Ionicons name="flame-outline" size={15} color="#ff6400" />
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: '#ff6400' }}>{streakDays} day streak</Text>
          </View>
        </View>

        {/* ── Avatar card — borderRadius 28 intentional for hero centred card ── */}
        <View style={{ marginHorizontal: 20, marginTop: 20, marginBottom: 20, backgroundColor: t.card, borderRadius: 28, borderWidth: 1, borderColor: t.cardBorder, padding: 28, alignItems: 'center' }}>
          <View
            style={{
              width: 90, height: 90, borderRadius: 45, padding: 3, marginBottom: 16,
              borderWidth: 2, borderColor: isDark ? 'rgba(207,188,255,0.4)' : 'rgba(181,153,255,0.5)',
              shadowColor: t.primaryContainer, shadowOffset: { width: 0, height: 0 },
              shadowOpacity: isDark ? 0.25 : 0.2, shadowRadius: 16,
            }}
          >
            <LinearGradient
              colors={t.avatarGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ width: '100%', height: '100%', borderRadius: 42, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 30, fontFamily: 'NotoSerif_700Bold', color: '#fff' }}>{initials}</Text>
            </LinearGradient>
          </View>

          <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 24, color: t.onSurface, letterSpacing: -0.3, marginBottom: 6 }}>
            {user?.name ?? 'MedicoHub User'}
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: t.onSurfaceVariant, marginBottom: 4 }}>
            {user?.email ?? ''}
          </Text>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {user?.college && (
              <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: isDark ? 'rgba(207,188,255,0.1)' : 'rgba(181,153,255,0.1)', borderWidth: 1, borderColor: isDark ? 'rgba(207,188,255,0.18)' : 'rgba(181,153,255,0.25)' }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: t.primaryText }}>{user.college}</Text>
              </View>
            )}
            <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(181,153,255,0.06)', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(181,153,255,0.15)' }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: t.onSurfaceVariant }}>Year {user?.year ?? '1'} · MBBS</Text>
            </View>
          </View>
        </View>

        {/* ── Achievements ── */}
        <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            {/* Fix #1: NotoSerif_700Bold for section headings */}
            <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 20, color: t.onSurface, letterSpacing: -0.2 }}>Achievements</Text>
            {achievementList.length > 0 && (
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: isDark ? 'rgba(207,188,255,0.1)' : 'rgba(181,153,255,0.1)', borderWidth: 1, borderColor: isDark ? 'rgba(207,188,255,0.18)' : 'rgba(181,153,255,0.25)' }}>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: t.primaryText, letterSpacing: 1 }}>{achievementList.length} TOTAL</Text>
              </View>
            )}
          </View>

          {/* Fix #26: show skeleton while loading */}
          {isLoadingAchievements ? (
            <AchievementSkeleton />
          ) : achievementList.length === 0 ? (
            <View style={{ ...cardStyle }}>
              <CardEmptyState iconName="ribbon-outline" title="No achievements yet" body="Keep studying to unlock them!" />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
              {achievementList.slice(0, 4).map((achievement: Achievement) => {
                const isUnlocked = achievement.unlockedAt !== null;
                return (
                  <View
                    key={achievement._id}
                    style={{
                      width: '48.5%',
                      ...cardStyle,
                      borderRadius: 22,
                      padding: 18,
                      alignItems: 'center',
                      opacity: isUnlocked ? 1 : 0.45,
                      borderColor: isUnlocked ? (isDark ? 'rgba(207,188,255,0.15)' : 'rgba(181,153,255,0.2)') : t.cardBorder,
                    }}
                  >
                    <Text style={{ fontSize: 32, marginBottom: 10 }}>{achievement.icon}</Text>
                    <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 14, color: t.onSurface, textAlign: 'center', marginBottom: 6 }}>
                      {achievement.title}
                    </Text>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.onSurfaceVariant, textAlign: 'center', lineHeight: 16 }} numberOfLines={2}>
                      {achievement.description}
                    </Text>
                    {achievement.progress && (
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: t.outlineVariant, marginTop: 8 }}>
                        {achievement.progress.current}/{achievement.progress.target}
                      </Text>
                    )}
                    {isUnlocked && (
                      <View style={{ marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: isDark ? 'rgba(207,188,255,0.12)' : 'rgba(181,153,255,0.12)', borderWidth: 1, borderColor: isDark ? 'rgba(207,188,255,0.2)' : 'rgba(181,153,255,0.3)' }}>
                        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 9, color: t.primaryText, letterSpacing: 1 }}>UNLOCKED</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── My Note Requests ── */}
        <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            {/* Fix #1: NotoSerif_700Bold */}
            <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 20, color: t.onSurface, letterSpacing: -0.2 }}>
              My Requests
            </Text>
            {requestList.length > 2 && (
              <TouchableOpacity onPress={() => setShowAllRequests((v) => !v)} activeOpacity={0.7}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: t.primaryText }}>
                  {showAllRequests ? 'Show less' : `See all ${requestList.length}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Fix #26: show skeleton while loading */}
          {isLoadingRequests ? (
            <RequestSkeleton />
          ) : requestList.length === 0 ? (
            <View style={{ ...cardStyle }}>
              <CardEmptyState iconName="document-text-outline" title="No requests yet" body="Request notes from the Notes tab" />
            </View>
          ) : (
            (showAllRequests ? requestList : requestList.slice(0, 2)).map((req) => {
              // Fix #5: use shared getSubjectColor — theme-aware, same as Notes page
              const sc = getSubjectColor(req.subject, isDark);
              const isFulfilled = req.status === 'fulfilled';
              return (
                <TouchableOpacity
                  key={req.id}
                  activeOpacity={isFulfilled && req.fulfilledNote ? 0.8 : 1}
                  onPress={() => { if (isFulfilled && req.fulfilledNote) downloadNote(req.fulfilledNote.id); }}
                  style={{ ...cardStyle, borderRadius: 22, padding: 18, marginBottom: 12, borderColor: isFulfilled ? 'rgba(74,222,128,0.15)' : t.cardBorder }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {/* Fix #5 + #17: use getSubjectColor (theme-aware translucent) and borderRadius 8 (read-only badge) */}
                      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: sc.bg, borderWidth: 1, borderColor: sc.border }}>
                        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: sc.text }}>{req.subject}</Text>
                      </View>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(181,153,255,0.06)', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(181,153,255,0.12)' }}>
                        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 1, color: t.onSurfaceVariant }}>{req.noteType}</Text>
                      </View>
                    </View>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: isFulfilled ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.1)', borderWidth: 1, borderColor: isFulfilled ? 'rgba(74,222,128,0.2)' : 'rgba(251,191,36,0.2)' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isFulfilled ? '#4ade80' : '#fbbf24' }} />
                        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.8, color: isFulfilled ? '#4ade80' : '#fbbf24' }}>
                          {isFulfilled ? 'FULFILLED' : 'PENDING'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 16, color: t.onSurface, marginBottom: isFulfilled && req.fulfilledNote ? 12 : 0 }}>
                    {req.topic}
                  </Text>

                  {isFulfilled && req.fulfilledNote && (
                    <View style={{ backgroundColor: t.innerSurface, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(74,222,128,0.12)' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.onSurfaceVariant, marginBottom: 3 }}>Note uploaded:</Text>
                        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: t.primaryText, marginBottom: 2 }}>{req.fulfilledNote.title}</Text>
                        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.onSurfaceVariant }}>by {req.fulfilledNote.author?.name ?? 'Senior'}</Text>
                      </View>
                      {downloadingId === req.fulfilledNote.id ? (
                        <ActivityIndicator size="small" color={t.primaryText} />
                      ) : (
                        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: isDark ? 'rgba(207,188,255,0.1)' : 'rgba(181,153,255,0.1)', borderWidth: 1, borderColor: isDark ? 'rgba(207,188,255,0.18)' : 'rgba(181,153,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="arrow-down-outline" size={16} color={t.primaryText} />
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* ── Settings ── */}
        <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            {/* Fix #1: NotoSerif_700Bold */}
            <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 20, color: t.onSurface, letterSpacing: -0.2 }}>
              Settings
            </Text>
          </View>
          {/* Fix #19: borderRadius 22 matches rest of app */}
          <View style={{ ...cardStyle }}>
            {/* Appearance / Dark Mode */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: t.separator }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: isDark ? 'rgba(207,188,255,0.08)' : 'rgba(181,153,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={19} color={t.primaryText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: t.onSurface }}>Appearance</Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.onSurfaceVariant, marginTop: 2 }}>
                  {isDark ? 'Dark mode' : 'Light mode'}
                </Text>
              </View>
              <Switch
                value={!isDark}
                onValueChange={(isLight) => setDark(!isLight)}
                thumbColor={isDark ? '#cfbcff' : '#B599FF'}
                trackColor={{ false: isDark ? '#2d1060' : '#D8D4EE', true: isDark ? 'rgba(181,153,255,0.35)' : 'rgba(181,153,255,0.45)' }}
                ios_backgroundColor={isDark ? '#2d1060' : '#D8D4EE'}
              />
            </View>

            {/* Notifications — coming soon */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: t.separator, opacity: 0.45 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: t.iconBg, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Ionicons name="notifications-outline" size={19} color={t.outlineVariant} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: t.outlineVariant }}>Notifications</Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.outlineFaint, marginTop: 2 }}>Study reminders & updates</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(181,153,255,0.08)', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(181,153,255,0.15)' }}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 8, color: t.outlineVariant, letterSpacing: 1, textTransform: 'uppercase' }}>Soon</Text>
                </View>
                <Switch
                  value={false}
                  disabled
                  thumbColor={t.outlineFaint}
                  trackColor={{ false: isDark ? '#1d2021' : '#D8D6E8', true: isDark ? '#1d2021' : '#D8D6E8' }}
                />
              </View>
            </View>

            {/* About */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, opacity: 0.45 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: t.iconBg, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Ionicons name="information-circle-outline" size={19} color={t.outlineVariant} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: t.outlineVariant }}>About MedicoHub</Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.outlineFaint, marginTop: 2 }}>Version 1.0.0</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={t.outlineFaint} />
            </View>
          </View>
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.8}
          style={{
            marginHorizontal: 20, marginBottom: 8,
            borderRadius: 20, borderWidth: 1,
            borderColor: isDark ? 'rgba(255,180,171,0.25)' : 'rgba(192,57,43,0.2)',
            backgroundColor: isDark ? 'rgba(255,180,171,0.06)' : 'rgba(192,57,43,0.05)',
            paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Ionicons name="log-out-outline" size={18} color={t.error} />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: t.error }}>Logout</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
