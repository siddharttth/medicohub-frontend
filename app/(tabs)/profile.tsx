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
import { useThemeStore, getTheme } from '../../src/store/themeStore';
import { usersApi } from '../../src/api/users';
import { achievementsApi } from '../../src/api/achievements';
import { authApi } from '../../src/api/auth';
import { useAuth } from '../../src/hooks/useAuth';
import { notesApi } from '../../src/api/notes';
import { Achievement, NoteRequest } from '../../src/types';

const SUBJECT_FILL_COLORS: Record<string, string> = {
  Anatomy: '#cfbcff', Physiology: '#4ade80', Biochemistry: '#60a5fa',
  Pathology: '#fb923c', Pharmacology: '#f472b6', Microbiology: '#22d3ee',
  Surgery: '#fbbf24', Medicine: '#a78bfa',
};

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
      { text: 'Logout', style: 'destructive', onPress: async () => { await signOut(); router.replace('/(auth)/onboarding'); } },
    ]);
  };

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'MH';
  const streakDays = stats?.streakDays ?? user?.streakDays ?? 0;

  const card = {
    backgroundColor: t.card,
    borderRadius: 28,
    borderWidth: 1,
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
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(181,153,255,0.08)', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(181,153,255,0.2)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginTop: 6 }}>
            <Text style={{ fontSize: 16 }}>🔥</Text>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: t.onSurface, marginLeft: 6 }}>{streakDays}</Text>
          </View>
        </View>

        {/* ── Avatar card ── */}
        <View style={{ marginHorizontal: 20, marginTop: 20, marginBottom: 20, ...card, padding: 28, alignItems: 'center' }}>
          <View
            style={{
              width: 90,
              height: 90,
              borderRadius: 45,
              padding: 3,
              marginBottom: 16,
              borderWidth: 2,
              borderColor: isDark ? 'rgba(207,188,255,0.4)' : 'rgba(181,153,255,0.5)',
              shadowColor: t.primaryContainer,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: isDark ? 0.25 : 0.2,
              shadowRadius: 16,
            }}
          >
            <LinearGradient
              colors={t.avatarGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
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
            <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 20, color: t.onSurface, letterSpacing: -0.2 }}>Achievements</Text>
            {achievements.length > 0 && (
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: isDark ? 'rgba(207,188,255,0.1)' : 'rgba(181,153,255,0.1)', borderWidth: 1, borderColor: isDark ? 'rgba(207,188,255,0.18)' : 'rgba(181,153,255,0.25)' }}>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: t.primaryText, letterSpacing: 1 }}>{achievements.length} TOTAL</Text>
              </View>
            )}
          </View>

          {achievements.length === 0 ? (
            <View style={{ ...card, padding: 28, alignItems: 'center' }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>🏅</Text>
              <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 16, color: t.onSurface, marginBottom: 6 }}>No achievements yet</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: t.onSurfaceVariant }}>Keep studying to unlock them!</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
              {achievements.slice(0, 4).map((achievement: Achievement) => {
                const isUnlocked = achievement.unlockedAt !== null;
                return (
                  <View
                    key={achievement._id}
                    style={{
                      width: '48.5%',
                      ...card,
                      borderRadius: 24,
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
            <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 20, color: t.onSurface, letterSpacing: -0.2 }}>
              My Requests
            </Text>
            {myRequests.length > 2 && (
              <TouchableOpacity onPress={() => setShowAllRequests((v) => !v)} activeOpacity={0.7}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: t.primaryText }}>
                  {showAllRequests ? 'Show less' : `See all ${myRequests.length}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {myRequests.length === 0 ? (
            <View style={{ ...card, padding: 28, alignItems: 'center' }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>📬</Text>
              <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 16, color: t.onSurface, marginBottom: 6 }}>No requests yet</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: t.onSurfaceVariant }}>Request notes from the Notes tab</Text>
            </View>
          ) : (
            (showAllRequests ? myRequests : myRequests.slice(0, 2)).map((req) => {
              const subjectFill = SUBJECT_FILL_COLORS[req.subject] ?? '#cfbcff';
              const isFulfilled = req.status === 'fulfilled';
              return (
                <TouchableOpacity
                  key={req.id}
                  activeOpacity={isFulfilled && req.fulfilledNote ? 0.8 : 1}
                  onPress={() => { if (isFulfilled && req.fulfilledNote) downloadNote(req.fulfilledNote.id); }}
                  style={{ ...card, borderRadius: 24, padding: 18, marginBottom: 12, borderColor: isFulfilled ? 'rgba(74,222,128,0.15)' : t.cardBorder }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: subjectFill, borderWidth: 1, borderColor: subjectFill }}>
                        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: '#1a0a3a' }}>{req.subject}</Text>
                      </View>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(181,153,255,0.06)', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(181,153,255,0.12)' }}>
                        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 1, color: t.onSurfaceVariant }}>{req.noteType}</Text>
                      </View>
                    </View>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: isFulfilled ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.1)', borderWidth: 1, borderColor: isFulfilled ? 'rgba(74,222,128,0.2)' : 'rgba(251,191,36,0.2)' }}>
                      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.8, color: isFulfilled ? '#4ade80' : '#fbbf24' }}>
                        {isFulfilled ? '✓ FULFILLED' : '⏳ PENDING'}
                      </Text>
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
            <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 20, color: t.onSurface, letterSpacing: -0.2 }}>
              Settings
            </Text>
          </View>
          <View style={{ ...card }}>
            {/* ── Appearance / Dark Mode toggle ── */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: t.separator,
              }}
            >
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

            {/* ── Notifications (coming soon) ── */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: t.separator,
                opacity: 0.45,
              }}
            >
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

            {/* ── About (coming soon) ── */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 16,
                opacity: 0.45,
              }}
            >
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
            marginHorizontal: 20,
            marginBottom: 8,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,180,171,0.25)' : 'rgba(192,57,43,0.2)',
            backgroundColor: isDark ? 'rgba(255,180,171,0.06)' : 'rgba(192,57,43,0.05)',
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Ionicons name="log-out-outline" size={18} color={t.error} />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: t.error }}>Logout</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
