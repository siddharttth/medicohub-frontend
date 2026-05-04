import React, { useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
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
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.88,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  const requestedSubjectColor = '#cfbcff';
  return (
    <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={() => {
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
            bounciness: 10,
          }).start();
        }}
        style={{
          backgroundColor: '#10121e',
          borderRadius: 20,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.06)',
          paddingVertical: 14,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 20, marginBottom: 6 }}>{icon}</Text>
        <Text
          style={{
            fontFamily: 'NotoSerif_700Bold',
            fontSize: 20,
            color: '#e1e3e4',
            marginBottom: 4,
          }}
        >
          {value}
        </Text>
        <Text
          style={{
            fontFamily: 'Inter_600SemiBold',
            fontSize: 8,
            color: '#948e9d',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function RecommendationCard({
  note,
  onPress,
}: {
  note: Note;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={{
        width: 268,
        height: 200,
        marginRight: 16,
        backgroundColor: '#10121e',
        borderRadius: 28,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 8,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: 'rgba(99,102,241,0.16)',
          }}
        >
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#c7d2fe', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            {note.subject}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#a78bfa', textTransform: 'uppercase' }}>
            {note.noteType.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text
        style={{
          fontFamily: 'NotoSerif_700Bold',
          fontSize: 20,
          color: '#f8fafc',
          marginBottom: 10,
          lineHeight: 28,
        }}
        numberOfLines={2}
      >
        {note.title}
      </Text>

      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#94a3b8', marginBottom: 18 }} numberOfLines={2}>
        by {note.author?.name ?? 'Senior'}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="star" size={14} color="#fbbf24" />
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: '#f8fafc' }}>
            {note.rating?.toFixed(1) ?? '0.0'}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            backgroundColor: '#312e81',
          }}
        >
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 11, color: '#e0e7ff' }}>
            View
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);

  const { data: stats } = useQuery({
    queryKey: ['stats', user?.id],
    queryFn: () => usersApi.getStats(user!.id),
    enabled: !!user,
  });

  const { data: recommendations = [], isLoading: isLoadingRecommendations } = useQuery({
    queryKey: ['recommendations', user?.id],
    queryFn: () => notesApi.getTrending(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const sortedRecommendations = useMemo(
    () => [...recommendations].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
    [recommendations]
  );

  const firstName = user?.name.split(' ')[0] ?? 'Doctor';
  const streakDays = stats?.streakDays ?? user?.streakDays ?? 0;
  const notesShared = stats?.notesShared ?? user?.notesShared ?? 0;
  const studyHours = stats?.totalStudyHours ?? 0;
  const saves = stats?.notesDownloaded ?? 0;
  const notesProgress = Math.min(notesShared / 10, 1);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#070810' }} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Greeting */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 }}>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 11,
              color: '#948e9d',
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            {getGreeting()}
          </Text>
          <Text
            style={{
              fontFamily: 'NotoSerif_700Bold',
              fontSize: 36,
              color: '#e1e3e4',
              letterSpacing: -0.5,
              lineHeight: 42,
            }}
          >
            {firstName} 👋
          </Text>
        </View>

        {/* CTA Hero Card */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/exam')}
          activeOpacity={0.92}
          style={{
            marginHorizontal: 20,
            marginBottom: 24,
            borderRadius: 28,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(207,188,255,0.18)',
          }}
        >
          <LinearGradient
            colors={['rgba(207,188,255,0.08)', 'rgba(124,58,237,0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: '100%',
              padding: 26,
              backgroundColor: '#10121e',
            }}
          >
            <View style={{ marginBottom: 20 }}>
              <View
                style={{
                  alignSelf: 'flex-start',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: 'rgba(124,58,237,0.18)',
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#c4b5fd', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  Exam mode
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: 'NotoSerif_700Bold',
                  fontSize: 28,
                  color: '#f8f7ff',
                  lineHeight: 36,
                  marginBottom: 10,
                }}
              >
                Enter Exam Mode
              </Text>
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 14,
                  color: '#c7d2fe',
                  lineHeight: 20,
                }}
              >
                AI-powered survival packs for your next rotation.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#a78bfa', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
                  Boost your prep
                </Text>
                <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 14, color: '#f8f7ff' }}>
                  Study smarter with ready packs.
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: '#7c3aed',
                }}
              >
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: '#fff' }}>
                  Start
                </Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Recommendation Section */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginBottom: 14 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  fontFamily: 'NotoSerif_600SemiBold',
                  fontSize: 20,
                  color: '#e1e3e4',
                  marginBottom: 4,
                }}
              >
                Recommended for you
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#948e9d' }}>
                Useful notes suggested based on trending study materials.
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/notes')} activeOpacity={0.7} style={{ marginTop: 10 }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#cfbcff' }}>See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, alignItems: 'flex-start' }}
          >
            {isLoadingRecommendations ? (
              <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 24 }}>
                <ActivityIndicator size="small" color="#cfbcff" />
              </View>
            ) : sortedRecommendations.length > 0 ? (
              sortedRecommendations.map((note) => (
                <RecommendationCard
                  key={note.id}
                  note={note}
                  onPress={() => router.push('/(tabs)/notes')}
                />
              ))
            ) : (
              <View style={{ width: '100%' }}>
                <View
                  style={{
                    backgroundColor: '#10121e',
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.08)',
                    padding: 18,
                  }}
                >
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#e1e3e4', marginBottom: 8 }}>
                    No recommended notes available yet.
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9ca3af' }}>
                    Explore the notes tab to discover more study material.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Stats Row */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 24 }}>
          <StatCard icon="🔥" value={String(streakDays)} label="Streak" />
          <StatCard icon="📋" value={String(notesShared)} label="Shared" />
          <StatCard icon="⏱" value={`${studyHours}h`} label="Hours" />
          <StatCard icon="📥" value={String(saves)} label="Saves" />
        </View>

        {/* Notes Contributed */}
        <View
          style={{
            marginHorizontal: 20,
            backgroundColor: '#10121e',
            borderRadius: 28,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.06)',
            padding: 22,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 18,
            }}
          >
            <View>
              <Text
                style={{
                  fontFamily: 'NotoSerif_600SemiBold',
                  fontSize: 18,
                  color: '#e1e3e4',
                  letterSpacing: -0.2,
                  marginBottom: 4,
                }}
              >
                Notes Contributed
              </Text>
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 12,
                  color: '#948e9d',
                }}
              >
                Upload notes to help your batch
              </Text>
            </View>
            <Text
              style={{
                fontFamily: 'NotoSerif_700Bold',
                fontSize: 28,
                color: '#b599ff',
                letterSpacing: -0.5,
              }}
            >
              {notesShared}
            </Text>
          </View>
          <ProgressBar progress={notesProgress} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <Text
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 9,
                color: '#948e9d',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              Level 1
            </Text>
            <Text
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 9,
                color: '#948e9d',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              Next: 10 Notes
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
