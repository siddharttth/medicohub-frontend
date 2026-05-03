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
import { Achievement, NoteRequest } from '../../src/types';

const SUBJECT_COLORS: Record<string, string> = {
  Anatomy: '#cfbcff', Physiology: '#4ade80', Biochemistry: '#60a5fa',
  Pathology: '#fb923c', Pharmacology: '#f472b6', Microbiology: '#22d3ee',
  Surgery: '#fbbf24', Medicine: '#a78bfa',
};

export default function ProfileScreen() {
  const storeUser = useAuthStore((s) => s.user);
  const { signOut } = useAuth();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showAllRequests, setShowAllRequests] = useState(false);

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

  // ─── Shared card style ──────────────────────────────────────────────────────
  const card = {
    backgroundColor: '#10121e',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#070810' }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Header ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#948e9d', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
              My Account
            </Text>
            <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 36, color: '#e1e3e4', letterSpacing: -0.5, lineHeight: 40 }}>
              Profile
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginTop: 6 }}>
            <Text style={{ fontSize: 16 }}>🔥</Text>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: '#e1e3e4', marginLeft: 6 }}>{streakDays}</Text>
          </View>
        </View>

        {/* ── Avatar card ── */}
        <View style={{ marginHorizontal: 20, marginTop: 20, marginBottom: 20, ...card, padding: 28, alignItems: 'center' }}>
          {/* Avatar */}
          <View
            style={{
              width: 90,
              height: 90,
              borderRadius: 45,
              padding: 3,
              marginBottom: 16,
              borderWidth: 2,
              borderColor: 'rgba(207,188,255,0.4)',
              shadowColor: '#cfbcff',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
            }}
          >
            <LinearGradient
              colors={['#2d1060', '#b599ff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: '100%', height: '100%', borderRadius: 42, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 30, fontFamily: 'NotoSerif_700Bold', color: '#fff' }}>{initials}</Text>
            </LinearGradient>
          </View>

          {/* Name */}
          <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 24, color: '#e1e3e4', letterSpacing: -0.3, marginBottom: 6 }}>
            {user?.name ?? 'MedicoHub User'}
          </Text>

          {/* Email */}
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#948e9d', marginBottom: 4 }}>
            {user?.email ?? ''}
          </Text>

          {/* College + Year badges */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {user?.college && (
              <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(207,188,255,0.1)', borderWidth: 1, borderColor: 'rgba(207,188,255,0.18)' }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#cfbcff' }}>{user.college}</Text>
              </View>
            )}
            <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#948e9d' }}>Year {user?.year ?? '1'} · MBBS</Text>
            </View>
          </View>
        </View>

        {/* ── Achievements ── */}
        <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 20, color: '#e1e3e4', letterSpacing: -0.2 }}>Achievements</Text>
            {achievements.length > 0 && (
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(207,188,255,0.1)', borderWidth: 1, borderColor: 'rgba(207,188,255,0.18)' }}>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: '#cfbcff', letterSpacing: 1 }}>{achievements.length} TOTAL</Text>
              </View>
            )}
          </View>

          {achievements.length === 0 ? (
            <View style={{ ...card, padding: 28, alignItems: 'center' }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>🏅</Text>
              <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 16, color: '#e1e3e4', marginBottom: 6 }}>No achievements yet</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#948e9d' }}>Keep studying to unlock them!</Text>
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
                      borderColor: isUnlocked ? 'rgba(207,188,255,0.15)' : 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <Text style={{ fontSize: 32, marginBottom: 10 }}>{achievement.icon}</Text>
                    <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 14, color: '#e1e3e4', textAlign: 'center', marginBottom: 6 }}>
                      {achievement.title}
                    </Text>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#948e9d', textAlign: 'center', lineHeight: 16 }} numberOfLines={2}>
                      {achievement.description}
                    </Text>
                    {achievement.progress && (
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#494551', marginTop: 8 }}>
                        {achievement.progress.current}/{achievement.progress.target}
                      </Text>
                    )}
                    {isUnlocked && (
                      <View style={{ marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(207,188,255,0.12)', borderWidth: 1, borderColor: 'rgba(207,188,255,0.2)' }}>
                        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 9, color: '#cfbcff', letterSpacing: 1 }}>UNLOCKED</Text>
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
            <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 20, color: '#e1e3e4', letterSpacing: -0.2 }}>
              My Requests
            </Text>
            {myRequests.length > 2 && (
              <TouchableOpacity onPress={() => setShowAllRequests((v) => !v)} activeOpacity={0.7}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#cfbcff' }}>
                  {showAllRequests ? 'Show less' : `See all ${myRequests.length}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {myRequests.length === 0 ? (
            <View style={{ ...card, padding: 28, alignItems: 'center' }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>📬</Text>
              <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 16, color: '#e1e3e4', marginBottom: 6 }}>No requests yet</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#948e9d' }}>Request notes from the Notes tab</Text>
            </View>
          ) : (
            (showAllRequests ? myRequests : myRequests.slice(0, 2)).map((req) => {
              const subjectColor = SUBJECT_COLORS[req.subject] ?? '#cfbcff';
              const isFulfilled = req.status === 'fulfilled';
              return (
                <TouchableOpacity
                  key={req.id}
                  activeOpacity={isFulfilled && req.fulfilledNote ? 0.8 : 1}
                  onPress={() => { if (isFulfilled && req.fulfilledNote) downloadNote(req.fulfilledNote.id); }}
                  style={{ ...card, borderRadius: 24, padding: 18, marginBottom: 12, borderColor: isFulfilled ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {/* Subject badge */}
                      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: `${subjectColor}18`, borderWidth: 1, borderColor: `${subjectColor}28` }}>
                        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: subjectColor }}>{req.subject}</Text>
                      </View>
                      {/* Type badge */}
                      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}>
                        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 1, color: '#948e9d' }}>{req.noteType}</Text>
                      </View>
                    </View>
                    {/* Status badge */}
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: isFulfilled ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.1)', borderWidth: 1, borderColor: isFulfilled ? 'rgba(74,222,128,0.2)' : 'rgba(251,191,36,0.2)' }}>
                      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.8, color: isFulfilled ? '#4ade80' : '#fbbf24' }}>
                        {isFulfilled ? '✓ FULFILLED' : '⏳ PENDING'}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 16, color: '#e1e3e4', marginBottom: isFulfilled && req.fulfilledNote ? 12 : 0 }}>
                    {req.topic}
                  </Text>

                  {isFulfilled && req.fulfilledNote && (
                    <View style={{ backgroundColor: '#070810', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(74,222,128,0.12)' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#948e9d', marginBottom: 3 }}>Note uploaded:</Text>
                        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#cfbcff', marginBottom: 2 }}>{req.fulfilledNote.title}</Text>
                        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#948e9d' }}>by {req.fulfilledNote.author?.name ?? 'Senior'}</Text>
                      </View>
                      {downloadingId === req.fulfilledNote.id ? (
                        <ActivityIndicator size="small" color="#cfbcff" />
                      ) : (
                        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(207,188,255,0.1)', borderWidth: 1, borderColor: 'rgba(207,188,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="arrow-down-outline" size={16} color="#cfbcff" />
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
        <View style={{ marginHorizontal: 20, marginBottom: 20, opacity: 0.45 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 20, color: '#e1e3e4', letterSpacing: -0.2 }}>
              Settings
            </Text>
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#494551', letterSpacing: 1, textTransform: 'uppercase' }}>Coming soon</Text>
            </View>
          </View>
          <View style={{ ...card }}>
            {[
              { icon: 'notifications-outline' as const, label: 'Notifications', sublabel: 'Study reminders & updates', hasToggle: true },
              { icon: 'information-circle-outline' as const, label: 'About MedicoHub', sublabel: 'Version 1.0.0', hasToggle: false },
            ].map((item, i, arr) => (
              <View
                key={item.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                  borderBottomColor: 'rgba(255,255,255,0.05)',
                }}
              >
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <Ionicons name={item.icon} size={19} color="#494551" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#494551' }}>{item.label}</Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#323536', marginTop: 2 }}>{item.sublabel}</Text>
                </View>
                {item.hasToggle ? (
                  <Switch
                    value={false}
                    disabled
                    thumbColor="#323536"
                    trackColor={{ false: '#1d2021', true: '#1d2021' }}
                  />
                ) : (
                  <Ionicons name="chevron-forward" size={16} color="#323536" />
                )}
              </View>
            ))}
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
            borderColor: 'rgba(255,180,171,0.25)',
            backgroundColor: 'rgba(255,180,171,0.06)',
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Ionicons name="log-out-outline" size={18} color="#ffb4ab" />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#ffb4ab' }}>Logout</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
