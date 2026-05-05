import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../src/hooks/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Toast.show({ type: 'error', text1: 'Missing fields', text2: 'Enter your email and password.' });
      return;
    }
    setIsLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Login failed', text2: e?.response?.data?.message ?? 'Invalid credentials.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#070810' }} edges={['top', 'bottom']}>
      {/* Background glow */}
      <View style={{ position: 'absolute', top: -80, left: -60, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(207,188,255,0.06)' }} />
      <View style={{ position: 'absolute', bottom: 60, right: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(96,165,250,0.04)' }} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo mark */}
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(207,188,255,0.12)', borderWidth: 1, borderColor: 'rgba(207,188,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
            <Text style={{ fontSize: 24 }}>🩺</Text>
          </View>

          {/* Headline */}
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#948e9d', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            Welcome back
          </Text>
          <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 34, color: '#e1e3e4', letterSpacing: -0.5, lineHeight: 40, marginBottom: 8 }}>
            Sign in to{'\n'}MedicoHub
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#948e9d', lineHeight: 20, marginBottom: 40 }}>
            Continue your medical journey where you left off.
          </Text>

          {/* Email */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#948e9d', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
              Email
            </Text>
            <View style={{ backgroundColor: '#10121e', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
              <Ionicons name="mail-outline" size={16} color="#494551" style={{ marginRight: 10 }} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@college.edu"
                placeholderTextColor="rgba(148,142,157,0.4)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={{ flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, color: '#e1e3e4', paddingVertical: 16 }}
              />
            </View>
          </View>

          {/* Password */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#948e9d', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
              Password
            </Text>
            <View style={{ backgroundColor: '#10121e', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
              <Ionicons name="lock-closed-outline" size={16} color="#494551" style={{ marginRight: 10 }} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="rgba(148,142,157,0.4)"
                secureTextEntry={!showPassword}
                style={{ flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, color: '#e1e3e4', paddingVertical: 16 }}
              />
              <TouchableOpacity onPress={() => setShowPassword((s) => !s)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#494551" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: 'rgba(148,142,157,0.5)', marginTop: 8 }}>
              8+ chars with uppercase, lowercase, and number
            </Text>
          </View>

          {/* Sign in button */}
          <TouchableOpacity
            onPress={handleLogin}
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
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: '#1a0a3a', letterSpacing: 0.2 }}>
                      Sign In
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#39197c" />
                  </>
              }
            </LinearGradient>
          </TouchableOpacity>

          {/* Register link */}
          <TouchableOpacity onPress={() => router.push('/(auth)/onboarding')} activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#948e9d' }}>
              New here?{' '}
              <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#cfbcff' }}>Create an account</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
