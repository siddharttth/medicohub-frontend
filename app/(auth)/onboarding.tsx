import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { GlassCard } from '../../src/components/ui/GlassCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const YEARS = [
  { label: '1st Year', value: '1st' },
  { label: '2nd Year', value: '2nd' },
  { label: '3rd Year', value: '3rd' },
  { label: 'Final Year', value: 'Final' },
];

type FormState = {
  name: string;
  email: string;
  college: string;
  year: string;
  password: string;
};

export default function Onboarding() {
  const flatListRef = useRef<FlatList>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [form, setForm] = useState<FormState>({ name: '', email: '', college: '', year: '1st', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const goToSlide = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentSlide(index);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.college.trim() || !form.password.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all fields including password.');
      return;
    }
    setIsLoading(true);
    try {
      await register(form);
      router.replace('/(tabs)');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Registration failed. Try again.';
      Alert.alert('Error', msg);
      console.error('Register error:', JSON.stringify(e?.response?.data ?? e?.message));
    } finally {
      setIsLoading(false);
    }
  };

  const slides = [
    {
      key: 'slide1',
      render: () => (
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 items-center justify-center px-8">
          <LinearGradient
            colors={['rgba(181,153,255,0.25)', 'transparent']}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 300,
              borderRadius: 150,
            }}
          />
          <View className="w-32 h-32 rounded-full bg-primary-container items-center justify-center mb-8"
            style={{ opacity: 0.25 }}>
            <Text style={{ fontSize: 60 }}>🩺</Text>
          </View>
          <Text
            style={{ fontFamily: 'Caveat_700Bold', fontSize: 42, color: '#cfbcff', textAlign: 'center', marginBottom: 12 }}
          >
            Survive MBBS.{'\n'}Together.
          </Text>
          <Text className="text-on-surface-variant text-center text-base font-inter leading-6">
            Join thousands of medical students sharing notes, acing exams, and building each other up through the toughest years of their lives.
          </Text>
        </View>
      ),
    },
    {
      key: 'slide2',
      render: () => (
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 justify-center px-6">
          <Text className="text-on-surface font-inter-bold text-2xl text-center mb-8">
            Everything you need to thrive
          </Text>
          {[
            { icon: '⚡', title: 'Exam Mode AI', desc: 'Generate high-yield survival packs before exams with AI-powered insights.' },
            { icon: '📚', title: 'Senior Notes', desc: "Access curated PDFs, handwritten notes, and PYQs from seniors who've been there." },
            { icon: '💬', title: 'Medico Drops', desc: 'Real-time chat with your batch. Share wins, doubts, and memes 24/7.' },
          ].map((f) => (
            <GlassCard key={f.title} className="flex-row items-start p-4 mb-3">
              <Text style={{ fontSize: 28, marginRight: 12 }}>{f.icon}</Text>
              <View className="flex-1">
                <Text className="text-on-surface font-inter-semibold text-base mb-1">{f.title}</Text>
                <Text className="text-on-surface-variant font-inter text-sm leading-5">{f.desc}</Text>
              </View>
            </GlassCard>
          ))}
        </View>
      ),
    },
    {
      key: 'slide3',
      render: () => (
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 justify-center px-6">
          <Text className="text-on-surface font-inter-bold text-2xl mb-2">Get Early Access</Text>
          <Text className="text-on-surface-variant font-inter text-sm mb-6">
            Join the waitlist and start surviving smarter.
          </Text>

          {([
            { label: 'Full Name', key: 'name', placeholder: 'Dr. Future', keyboardType: 'default' as const, secure: false },
            { label: 'Email', key: 'email', placeholder: 'you@college.edu', keyboardType: 'email-address' as const, secure: false },
            { label: 'College', key: 'college', placeholder: 'AIIMS, New Delhi', keyboardType: 'default' as const, secure: false },
            { label: 'Password', key: 'password', placeholder: '••••••••', keyboardType: 'default' as const, secure: true },
          ] as const).map((field) => (
            <View key={field.key} className="mb-4">
              <Text className="text-on-surface-variant font-inter-medium text-sm mb-1">{field.label}</Text>
              <TextInput
                value={form[field.key as keyof Omit<FormState, 'year'>]}
                onChangeText={(v) => setForm((f) => ({ ...f, [field.key]: v }))}
                placeholder={field.placeholder}
                placeholderTextColor="#494551"
                keyboardType={field.keyboardType}
                secureTextEntry={field.secure}
                autoCapitalize={field.key === 'email' || field.key === 'password' ? 'none' : 'words'}
                className="bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-on-surface font-inter"
                style={{ fontSize: 15 }}
              />
            </View>
          ))}

          <View className="mb-6">
            <Text className="text-on-surface-variant font-inter-medium text-sm mb-2">Year of Study</Text>
            <View className="flex-row flex-wrap gap-2">
              {YEARS.map((y) => (
                <TouchableOpacity
                  key={y.value}
                  onPress={() => setForm((f) => ({ ...f, year: y.value }))}
                  className={`px-3 py-2 rounded-full border ${
                    form.year === y.value
                      ? 'bg-primary border-primary'
                      : 'bg-surface-container border-outline-variant'
                  }`}
                >
                  <Text className={`text-xs font-inter-medium ${form.year === y.value ? 'text-on-primary' : 'text-on-surface-variant'}`}>
                    {y.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            className="bg-primary rounded-2xl py-4 items-center"
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#39197c" />
            ) : (
              <Text className="text-on-primary font-inter-bold text-base">Join MedicoHub →</Text>
            )}
          </TouchableOpacity>
        </View>
      ),
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Skip button */}
        <View className="flex-row justify-end px-4 pt-2">
          {currentSlide < 2 && (
            <TouchableOpacity onPress={() => goToSlide(2)}>
              <Text className="text-on-surface-variant font-inter text-sm">Skip</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          ref={flatListRef}
          data={slides}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <ScrollView
              style={{ width: SCREEN_WIDTH }}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              {item.render()}
            </ScrollView>
          )}
        />

        {/* Dots + Next */}
        <View className="flex-row items-center justify-between px-6 pb-6">
          <View className="flex-row gap-2">
            {slides.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === currentSlide ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === currentSlide ? '#cfbcff' : '#494551',
                }}
              />
            ))}
          </View>

          {currentSlide < 2 && (
            <TouchableOpacity
              onPress={() => goToSlide(currentSlide + 1)}
              className="bg-primary px-6 py-3 rounded-full"
              activeOpacity={0.8}
            >
              <Text className="text-on-primary font-inter-bold text-sm">Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
