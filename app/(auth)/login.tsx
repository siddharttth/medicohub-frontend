import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setIsLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Login Failed', e?.response?.data?.message ?? 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center px-6"
      >
        <Text style={{ fontFamily: 'Caveat_700Bold', fontSize: 36, color: '#cfbcff', marginBottom: 8 }}>
          Welcome back 👋
        </Text>
        <Text className="text-on-surface-variant font-inter text-sm mb-8">
          Sign in to continue your medical journey.
        </Text>

        <View className="mb-4">
          <Text className="text-on-surface-variant font-inter-medium text-sm mb-1">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@college.edu"
            placeholderTextColor="#494551"
            keyboardType="email-address"
            autoCapitalize="none"
            className="bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-on-surface font-inter"
            style={{ fontSize: 15 }}
          />
        </View>

        <View className="mb-8">
          <Text className="text-on-surface-variant font-inter-medium text-sm mb-1">Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#494551"
            secureTextEntry
            className="bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-on-surface font-inter"
            style={{ fontSize: 15 }}
          />
        </View>

        <TouchableOpacity
          onPress={handleLogin}
          disabled={isLoading}
          className="bg-primary rounded-2xl py-4 items-center mb-4"
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#39197c" />
          ) : (
            <Text className="text-on-primary font-inter-bold text-base">Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/onboarding')} activeOpacity={0.7}>
          <Text className="text-on-surface-variant text-center font-inter text-sm">
            Don't have an account?{' '}
            <Text className="text-primary font-inter-medium">Join MedicoHub</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
