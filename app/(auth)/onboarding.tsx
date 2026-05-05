import React, { useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  Dimensions, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';

const { width: W } = Dimensions.get('window');

const YEARS = [
  { label: '1st Year', value: '1st' },
  { label: '2nd Year', value: '2nd' },
  { label: '3rd Year', value: '3rd' },
  { label: 'Final Year', value: 'Final' },
];

const FEATURES = [
  { icon: '🧠', label: 'AI Exam Mode', desc: 'Topic-based packs: MCQs, short Qs, viva — generated from your actual syllabus.' },
  { icon: '📚', label: 'Senior Notes', desc: 'Curated PDFs, handwritten notes & PYQs from seniors who\'ve been there.' },
  { icon: '💬', label: 'Medico Drops', desc: 'Real-time batch chat. Doubts, wins, and memes — all in one place.' },
];

type FormState = {
  name: string;
  email: string;
  college: string;
  year: string;
  password: string;
};

function InputField({
  label, value, onChange, placeholder, secure, keyboardType, icon, autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  secure?: boolean;
  keyboardType?: any;
  icon: string;
  autoCapitalize?: any;
}) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#948e9d', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 7 }}>
        {label}
      </Text>
      <View style={{ backgroundColor: '#10121e', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
        <Ionicons name={icon as any} size={15} color="#494551" style={{ marginRight: 10 }} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="rgba(148,142,157,0.35)"
          keyboardType={keyboardType ?? 'default'}
          secureTextEntry={secure && !show}
          autoCapitalize={autoCapitalize ?? 'words'}
          autoCorrect={false}
          style={{ flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, color: '#e1e3e4', paddingVertical: 15 }}
        />
        {secure && (
          <TouchableOpacity onPress={() => setShow((s) => !s)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={17} color="#494551" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function Onboarding() {
  const flatRef = useRef<FlatList>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [form, setForm] = useState<FormState>({ name: '', email: '', college: '', year: '1st', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const goTo = (i: number) => {
    flatRef.current?.scrollToIndex({ index: i, animated: true });
    setCurrentSlide(i);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.college.trim() || !form.password.trim()) {
      Toast.show({ type: 'error', text1: 'Missing fields', text2: 'Fill in all fields to continue.' });
      return;
    }
    if (form.password.length < 6) {
      Toast.show({ type: 'error', text1: 'Weak password', text2: 'Password must be at least 6 characters.' });
      return;
    }
    setIsLoading(true);
    try {
      await register({ ...form, email: form.email.trim().toLowerCase() });
      router.replace('/(tabs)');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Registration failed', text2: e?.response?.data?.message ?? 'Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const slides = [
    // ── Slide 1: Hero ────────────────────────────────────────────────────────
    {
      key: 's1',
      render: () => (
        <View style={{ width: W, flex: 1, paddingHorizontal: 28, justifyContent: 'center', alignItems: 'flex-start', paddingTop: 20, paddingBottom: 32 }}>
          {/* Glow */}
          <View style={{ position: 'absolute', top: -40, right: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(207,188,255,0.07)' }} />

          <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: 'rgba(207,188,255,0.12)', borderWidth: 1, borderColor: 'rgba(207,188,255,0.22)', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
            <Text style={{ fontSize: 30 }}>🩺</Text>
          </View>

          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#948e9d', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 10 }}>
            For MBBS students
          </Text>
          <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 40, color: '#e1e3e4', letterSpacing: -1, lineHeight: 46, marginBottom: 16 }}>
            Survive MBBS.{'\n'}Together.
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: '#948e9d', lineHeight: 23, maxWidth: 300, marginBottom: 40 }}>
            Join thousands of medical students sharing notes, acing exams, and getting each other through the toughest years.
          </Text>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={() => goTo(1)}
              activeOpacity={0.85}
              style={{ borderRadius: 18, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#cfbcff', '#a78bfa']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ paddingHorizontal: 28, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: '#1a0a3a' }}>Get started</Text>
                <Ionicons name="arrow-forward" size={16} color="#39197c" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.7}
              style={{ paddingHorizontal: 22, paddingVertical: 15, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#948e9d' }}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      ),
    },

    // ── Slide 2: Features ────────────────────────────────────────────────────
    {
      key: 's2',
      render: () => (
        <View style={{ width: W, flex: 1, paddingHorizontal: 24, justifyContent: 'center', paddingTop: 20, paddingBottom: 32 }}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#948e9d', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
            What's inside
          </Text>
          <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 30, color: '#e1e3e4', letterSpacing: -0.5, lineHeight: 36, marginBottom: 32 }}>
            Everything you need{'\n'}to actually thrive
          </Text>

          {FEATURES.map((f, i) => (
            <View key={f.label} style={{
              backgroundColor: '#10121e',
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
              borderRadius: 20, padding: 18, marginBottom: 12,
              flexDirection: 'row', alignItems: 'flex-start', gap: 14,
            }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(207,188,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>{f.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#e1e3e4', marginBottom: 4 }}>{f.label}</Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#948e9d', lineHeight: 19 }}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      ),
    },

    // ── Slide 3: Sign up form ────────────────────────────────────────────────
    {
      key: 's3',
      render: () => (
        <View style={{ width: W, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32 }}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#948e9d', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
            Create account
          </Text>
          <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 28, color: '#e1e3e4', letterSpacing: -0.4, lineHeight: 34, marginBottom: 28 }}>
            Join MedicoHub
          </Text>

          <InputField
            label="Full Name"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="Dr. Future"
            icon="person-outline"
          />
          <InputField
            label="Email"
            value={form.email}
            onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            placeholder="you@college.edu"
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputField
            label="College"
            value={form.college}
            onChange={(v) => setForm((f) => ({ ...f, college: v }))}
            placeholder="AIIMS, New Delhi"
            icon="school-outline"
          />
          <InputField
            label="Password"
            value={form.password}
            onChange={(v) => setForm((f) => ({ ...f, password: v }))}
            placeholder="••••••••"
            secure
            icon="lock-closed-outline"
            autoCapitalize="none"
          />
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: 'rgba(148,142,157,0.5)', marginTop: 6, marginBottom: 4 }}>
            8+ chars with uppercase, lowercase, and number
          </Text>

          {/* Year selector */}
          <View style={{ marginBottom: 28 }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#948e9d', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
              Year of Study
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {YEARS.map((y) => {
                const isActive = form.year === y.value;
                return (
                  <TouchableOpacity
                    key={y.value}
                    onPress={() => setForm((f) => ({ ...f, year: y.value }))}
                    activeOpacity={0.8}
                    style={{
                      flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                      backgroundColor: isActive ? '#cfbcff' : '#10121e',
                      borderWidth: 1, borderColor: isActive ? '#cfbcff' : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: isActive ? '#1a0a3a' : '#948e9d' }}>
                      {y.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.85}
            style={{ borderRadius: 22, overflow: 'hidden', marginBottom: 16, opacity: isLoading ? 0.7 : 1 }}
          >
            <LinearGradient
              colors={['#cfbcff', '#a78bfa']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }}
            >
              {isLoading
                ? <ActivityIndicator color="#39197c" size="small" />
                : <>
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: '#1a0a3a' }}>
                      Create Account
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#39197c" />
                  </>
              }
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/login')} activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 10 }}>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#948e9d' }}>
              Already a member?{' '}
              <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#cfbcff' }}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      ),
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#070810' }} edges={['top', 'bottom']}>
      {/* Bg glows */}
      <View style={{ position: 'absolute', top: -100, left: -80, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(207,188,255,0.05)' }} pointerEvents="none" />
      <View style={{ position: 'absolute', bottom: 0, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(96,165,250,0.04)' }} pointerEvents="none" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Top nav */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 }}>
          {currentSlide > 0 ? (
            <TouchableOpacity onPress={() => goTo(currentSlide - 1)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="arrow-back" size={20} color="#948e9d" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 20 }} />
          )}
          {/* Dot indicators */}
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {slides.map((_, i) => (
              <View key={i} style={{ width: i === currentSlide ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: i === currentSlide ? '#cfbcff' : 'rgba(255,255,255,0.12)' }} />
            ))}
          </View>
          <View style={{ width: 20 }} />
        </View>

        <FlatList
          ref={flatRef}
          data={slides}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <ScrollView
              style={{ width: W }}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {item.render()}
            </ScrollView>
          )}
        />

        {/* Bottom next button for slide 2 only */}
        {currentSlide === 1 && (
          <View style={{ paddingHorizontal: 24, paddingBottom: 20 }}>
            <TouchableOpacity
              onPress={() => goTo(2)}
              activeOpacity={0.85}
              style={{ borderRadius: 22, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#cfbcff', '#a78bfa']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
              >
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: '#1a0a3a' }}>Create account</Text>
                <Ionicons name="arrow-forward" size={16} color="#39197c" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
