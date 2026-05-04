import React, { useRef } from 'react';
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
        width: 240,
        marginRight: 16,
        backgroundColor: '#10121e',
        borderRadius: 26,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        padding: 18,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text
          style={{
            fontFamily: 'Inter_600SemiBold',
            fontSize: 12,
            color: '#948e9d',
            textTransform: 'uppercase',
            letterSpacing: 1.5,
          }}
        >
          {note.subject}
        </Text>
        <Text style={{ fontSize: 12, color: '#7c3aed' }}>{note.noteType.toUpperCase()}</Text>
      </View>
      <Text
        style={{
          fontFamily: 'NotoSerif_700Bold',
          fontSize: 18,
          color: '#e1e3e4',
          marginBottom: 10,
          lineHeight: 24,
        }}
        numberOfLines={2}
      >
        {note.title}
      </Text>
      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9ca3af', marginBottom: 16 }} numberOfLines={2}>
        by {note.author?.name ?? 'Senior'}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="star" size={14} color="#fbbf24" />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#e1e3e4' }}>
            {note.rating?.toFixed(1) ?? '0.0'}
          </Text>
        </View>
        <View style={{
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: 'rgba(124,58,237,0.12)',
        }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#7c3aed' }}>View</Text>
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

  const firstName = user?.name.split(' ')[0] ?? 'Doctor';
  const streakDays = stats?.streakDays ?? user?.streakDays ?? 0;
  const notesShared = stats?.notesShared ?? user?.notesShared ?? 0;
  const studyHours = stats?.totalStudyHours ?? 0;
  const saves = stats?.notesDownloaded ?? 0;
  const notesProgress = Math.min(notesShared / 10, 1);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
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
          activeOpacity={0.85}
          style={{
            marginHorizontal: 20,
            marginBottom: 28,
            borderRadius: 28,
            overflow: 'hidden',
            // ambient glow
            shadowColor: '#b599ff',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 24,
            elevation: 8,
          }}
        >
          <LinearGradient
            colors={['rgba(181,153,255,0.22)', 'rgba(181,153,255,0.06)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 28,
              borderWidth: 1,
              borderColor: 'rgba(181,153,255,0.22)',
              padding: 26,
            }}
          >
            {/* Icon + Title row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: 'rgba(181,153,255,0.22)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 22 }}>⚡</Text>
              </View>
              <Text
                style={{
                  fontFamily: 'NotoSerif_600SemiBold',
                  fontSize: 22,
                  color: '#ffffff',
                  letterSpacing: -0.3,
                }}
              >
                Enter Exam Mode
              </Text>
            </View>

            {/* Subtitle + Arrow */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 13,
                  color: 'rgba(207,188,255,0.7)',
                  maxWidth: 195,
                  lineHeight: 20,
                }}
              >
                AI-powered survival packs for your next rotation
              </Text>
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: '#cfbcff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#cfbcff',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.5,
                  shadowRadius: 14,
                }}
              >
                <Ionicons name="arrow-forward" size={22} color="#39197c" />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Recommendation Section */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginBottom: 14 }}>
            <View>
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
            <TouchableOpacity onPress={() => router.push('/(tabs)/notes')} activeOpacity={0.7}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#cfbcff' }}>See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {isLoadingRecommendations ? (
              <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 24 }}>
                <ActivityIndicator size="small" color="#cfbcff" />
              </View>
            ) : recommendations.length > 0 ? (
              recommendations.map((note) => (
                <RecommendationCard
                  key={note.id}
                  note={note}
                  onPress={() => router.push('/(tabs)/notes')}
                />
              ))
            ) : (
              <View style={{ width: '100%', paddingHorizontal: 20 }}>
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
