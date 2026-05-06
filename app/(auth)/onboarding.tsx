import React, { useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  Dimensions, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useThemeStore, getTheme } from '../../src/store/themeStore';

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

const FEATURE_COLORS = ['#cfbcff', '#4ade80', '#60a5fa'];

type FormState = {
  name: string;
  email: string;
  college: string;
  year: string;
  password: string;
};

// ── Focusable input field ────────────────────────────────────────────────────
function InputField({
  label, value, onChange, placeholder, hint, secure, keyboardType, icon, autoCapitalize, isDark, t,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  hint?: string;
  secure?: boolean;
  keyboardType?: any;
  icon: string;
  autoCapitalize?: any;
  isDark: boolean;
  t: ReturnType<typeof getTheme>;
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);

  const borderColor = focused
    ? t.primaryText
    : value.length > 0
    ? (isDark ? 'rgba(207,188,255,0.3)' : 'rgba(94,53,177,0.25)')
    : t.cardBorder;

  const iconColor = focused ? t.primaryText : value.length > 0 ? t.onSurfaceVariant : t.outlineVariant;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{
        fontFamily: 'Inter_500Medium', fontSize: 13, color: focused ? t.primaryText : t.onSurface,
        marginBottom: 8, letterSpacing: -0.1,
      }}>
        {label}
      </Text>
      <View style={{
        backgroundColor: focused
          ? (isDark ? 'rgba(207,188,255,0.05)' : 'rgba(94,53,177,0.03)')
          : t.card,
        borderWidth: focused ? 1.5 : 1,
        borderColor,
        borderRadius: 14,
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
      }}>
        <Ionicons name={icon as any} size={16} color={iconColor} style={{ marginRight: 10 }} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={isDark ? 'rgba(148,142,157,0.4)' : 'rgba(90,86,112,0.35)'}
          keyboardType={keyboardType ?? 'default'}
          secureTextEntry={secure && !show}
          autoCapitalize={autoCapitalize ?? 'words'}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15,
            color: t.onSurface, paddingVertical: 15,
          }}
        />
        {secure && (
          <TouchableOpacity onPress={() => setShow((s) => !s)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={17} color={t.outlineVariant} />
          </TouchableOpacity>
        )}
      </View>
      {hint && (
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.outlineVariant, marginTop: 5, marginLeft: 2 }}>
          {hint}
        </Text>
      )}
    </View>
  );
}

// ── Step pills ───────────────────────────────────────────────────────────────
function StepIndicator({ current, total, isDark, t }: {
  current: number; total: number;
  isDark: boolean; t: ReturnType<typeof getTheme>;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={{
          height: 4, borderRadius: 2,
          width: i === current ? 24 : 8,
          backgroundColor: i === current
            ? t.primaryText
            : i < current
            ? (isDark ? 'rgba(207,188,255,0.35)' : 'rgba(94,53,177,0.2)')
            : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
        }} />
      ))}
    </View>
  );
}

export default function Onboarding() {
  const flatRef = useRef<FlatList>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [form, setForm] = useState<FormState>({ name: '', email: '', college: '', year: '1st', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const isDark = useThemeStore((s) => s.isDark);
  const t = getTheme(isDark);

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
        <View style={{ width: W, flex: 1, paddingHorizontal: 28, paddingTop: 16, paddingBottom: 40 }}>
          {/* Decorative glow blobs */}
          <View style={{ position: 'absolute', top: 20, right: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: isDark ? 'rgba(167,139,250,0.08)' : 'rgba(167,139,250,0.1)' }} pointerEvents="none" />
          <View style={{ position: 'absolute', bottom: 80, left: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: isDark ? 'rgba(96,165,250,0.05)' : 'rgba(96,165,250,0.07)' }} pointerEvents="none" />

          {/* Logo */}
          <View style={{ marginBottom: 52, marginTop: 8 }}>
            <LinearGradient
              colors={isDark ? ['rgba(207,188,255,0.18)', 'rgba(167,139,250,0.1)'] : ['rgba(207,188,255,0.35)', 'rgba(167,139,250,0.2)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ width: 68, height: 68, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(207,188,255,0.2)' : 'rgba(167,139,250,0.3)' }}
            >
              <Text style={{ fontSize: 32 }}>🩺</Text>
            </LinearGradient>
          </View>

          {/* Headline block */}
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: t.primaryText, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>
            For MBBS students
          </Text>
          <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 38, color: t.onSurface, letterSpacing: -1, lineHeight: 44, marginBottom: 18 }}>
            Survive MBBS.{'\n'}Together.
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: t.onSurfaceVariant, lineHeight: 24, maxWidth: W - 80, marginBottom: 52 }}>
            Join thousands of medical students sharing notes, acing exams, and getting each other through the toughest years.
          </Text>

          {/* CTA row */}
          <View style={{ gap: 10 }}>
            <TouchableOpacity onPress={() => goTo(1)} activeOpacity={0.85} style={{ borderRadius: 16, overflow: 'hidden' }}>
              <LinearGradient
                colors={['#cfbcff', '#a78bfa']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: '#1a0a3a' }}>Get started</Text>
                <Ionicons name="arrow-forward" size={17} color="#39197c" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.7}
              style={{ paddingVertical: 17, borderRadius: 16, borderWidth: 1.5, borderColor: t.cardBorder, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: t.onSurfaceVariant }}>I already have an account</Text>
            </TouchableOpacity>
          </View>
        </View>
      ),
    },

    // ── Slide 2: Features ────────────────────────────────────────────────────
    {
      key: 's2',
      render: () => (
        <View style={{ width: W, flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}>
          {/* Eyebrow + headline */}
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: t.primaryText, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
            What's inside
          </Text>
          <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 32, color: t.onSurface, letterSpacing: -0.6, lineHeight: 38, marginBottom: 8 }}>
            Everything you need{'\n'}to actually thrive
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: t.onSurfaceVariant, lineHeight: 21, marginBottom: 32 }}>
            Three tools, one app. Built for the way MBBS really works.
          </Text>

          {FEATURES.map((f, i) => (
            <View key={f.label} style={{
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.cardBorder,
              borderRadius: 18, padding: 18, marginBottom: 10,
              flexDirection: 'row', alignItems: 'center', gap: 16,
            }}>
              {/* Colored icon tile */}
              <View style={{
                width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
                backgroundColor: `${FEATURE_COLORS[i]}${isDark ? '18' : '18'}`,
                borderWidth: 1, borderColor: `${FEATURE_COLORS[i]}${isDark ? '30' : '35'}`,
              }}>
                <Text style={{ fontSize: 22 }}>{f.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: t.onSurface, marginBottom: 3 }}>{f.label}</Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: t.onSurfaceVariant, lineHeight: 18 }}>{f.desc}</Text>
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
        <View style={{ width: W, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}>
          {/* Eyebrow + headline */}
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: t.primaryText, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
            Create account
          </Text>
          <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 32, color: t.onSurface, letterSpacing: -0.6, lineHeight: 38, marginBottom: 28 }}>
            Join MedicoHub
          </Text>

          {/* Fields */}
          <InputField
            label="Full Name"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="Dr. Future"
            icon="person-outline"
            isDark={isDark} t={t}
          />
          <InputField
            label="Email"
            value={form.email}
            onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            placeholder="you@college.edu"
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            isDark={isDark} t={t}
          />
          <InputField
            label="College"
            value={form.college}
            onChange={(v) => setForm((f) => ({ ...f, college: v }))}
            placeholder="AIIMS, New Delhi"
            icon="school-outline"
            isDark={isDark} t={t}
          />
          <InputField
            label="Password"
            value={form.password}
            onChange={(v) => setForm((f) => ({ ...f, password: v }))}
            placeholder="••••••••"
            hint="8+ chars with uppercase, lowercase, and number"
            secure
            icon="lock-closed-outline"
            autoCapitalize="none"
            isDark={isDark} t={t}
          />

          {/* Year selector */}
          <View style={{ marginBottom: 28, marginTop: 4 }}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: t.onSurface, marginBottom: 10, letterSpacing: -0.1 }}>
              Year of Study
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {YEARS.map((y) => {
                const isActive = form.year === y.value;
                return (
                  <TouchableOpacity
                    key={y.value}
                    onPress={() => setForm((f) => ({ ...f, year: y.value }))}
                    activeOpacity={0.75}
                    style={{
                      flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center',
                      backgroundColor: isActive
                        ? (isDark ? 'rgba(207,188,255,0.2)' : 'rgba(94,53,177,0.1)')
                        : t.card,
                      borderWidth: isActive ? 1.5 : 1,
                      borderColor: isActive
                        ? (isDark ? 'rgba(207,188,255,0.5)' : 'rgba(94,53,177,0.4)')
                        : t.cardBorder,
                    }}
                  >
                    <Text style={{ fontFamily: isActive ? 'Inter_700Bold' : 'Inter_400Regular', fontSize: 12, color: isActive ? t.primaryText : t.onSurfaceVariant }}>
                      {y.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.85}
            style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 20, opacity: isLoading ? 0.75 : 1 }}
          >
            <LinearGradient
              colors={['#cfbcff', '#a78bfa']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 17, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }}
            >
              {isLoading
                ? <ActivityIndicator color="#39197c" size="small" />
                : <>
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: '#1a0a3a' }}>Create Account</Text>
                    <Ionicons name="arrow-forward" size={18} color="#39197c" />
                  </>
              }
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/login')} activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 4 }}>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: t.onSurfaceVariant }}>
              Already a member?{' '}
              <Text style={{ fontFamily: 'Inter_600SemiBold', color: t.primaryText }}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      ),
    },
  ];

  const SLIDE_LABELS = ['Intro', 'Features', 'Sign Up'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Ambient glow — top-left and bottom-right */}
      <View style={{ position: 'absolute', top: -80, left: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: isDark ? 'rgba(207,188,255,0.05)' : 'rgba(181,153,255,0.07)' }} pointerEvents="none" />
      <View style={{ position: 'absolute', bottom: -60, right: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: isDark ? 'rgba(96,165,250,0.04)' : 'rgba(96,165,250,0.06)' }} pointerEvents="none" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* ── Top nav bar ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
        }}>
          {/* Back button — only on slides 1 and 2 */}
          <TouchableOpacity
            onPress={() => currentSlide > 0 ? goTo(currentSlide - 1) : undefined}
            disabled={currentSlide === 0}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: currentSlide > 0 ? t.card : 'transparent', borderWidth: currentSlide > 0 ? 1 : 0, borderColor: t.cardBorder }}
          >
            {currentSlide > 0 && <Ionicons name="arrow-back" size={18} color={t.onSurface} />}
          </TouchableOpacity>

          {/* Step indicator — pill progress */}
          <StepIndicator current={currentSlide} total={slides.length} isDark={isDark} t={t} />

          {/* Step label */}
          <View style={{ width: 60, alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: t.outlineVariant }}>
              {currentSlide + 1} / {slides.length}
            </Text>
          </View>
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
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {item.render()}
            </ScrollView>
          )}
        />

        {/* ── Sticky bottom CTA — slide 2 only ── */}
        {currentSlide === 1 && (
          <View style={{ paddingHorizontal: 24, paddingBottom: 8, paddingTop: 4 }}>
            <TouchableOpacity onPress={() => goTo(2)} activeOpacity={0.85} style={{ borderRadius: 16, overflow: 'hidden' }}>
              <LinearGradient
                colors={['#cfbcff', '#a78bfa']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 17, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
              >
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: '#1a0a3a' }}>Create my account</Text>
                <Ionicons name="arrow-forward" size={17} color="#39197c" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
