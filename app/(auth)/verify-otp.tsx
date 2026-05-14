import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { authApi } from '../../src/api/auth';

const OTP_LENGTH = 6;

export default function VerifyOtp() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { completeRegistration } = useAuth();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef<(TextInput | null)[]>([]);

  // Countdown for resend button
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (value: string, index: number) => {
    // Handle paste of full OTP
    if (value.length === OTP_LENGTH) {
      const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
      if (digits.length === OTP_LENGTH) {
        setOtp(digits);
        inputs.current[OTP_LENGTH - 1]?.blur();
        return;
      }
    }
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) {
      Alert.alert('Enter OTP', 'Please enter the complete 6-digit OTP.');
      return;
    }
    setIsVerifying(true);
    try {
      await completeRegistration(email, code);
      router.replace('/(tabs)');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Invalid OTP. Please try again.';
      Alert.alert('Verification Failed', msg);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setIsResending(true);
    try {
      await authApi.resendOtp(email);
      setCountdown(60);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
      Alert.alert('OTP Sent', 'A new OTP has been sent to your email.');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Failed to resend OTP.';
      Alert.alert('Error', msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#070810' }} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 20 }}>

          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 40 }}
          >
            <Ionicons name="arrow-back" size={22} color="#cfbcff" />
            <Text style={{ color: '#cfbcff', marginLeft: 8, fontFamily: 'Inter_500Medium', fontSize: 15 }}>
              Back
            </Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={{ marginBottom: 40 }}>
            <Text style={{ fontSize: 32, fontFamily: 'Inter_700Bold', color: '#e1e3e4', marginBottom: 10 }}>
              Verify Email
            </Text>
            <Text style={{ fontSize: 15, color: '#948e9d', fontFamily: 'Inter_400Regular', lineHeight: 22 }}>
              We sent a 6-digit OTP to
            </Text>
            <Text style={{ fontSize: 15, color: '#cfbcff', fontFamily: 'Inter_600SemiBold' }}>
              {email}
            </Text>
          </View>

          {/* OTP Input Boxes */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 }}>
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
              <TextInput
                key={i}
                ref={(r) => { inputs.current[i] = r; }}
                value={otp[i]}
                onChangeText={(v) => handleChange(v, i)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                maxLength={OTP_LENGTH}
                keyboardType="number-pad"
                textAlign="center"
                selectTextOnFocus
                style={{
                  width: 48,
                  height: 60,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: otp[i] ? '#cfbcff' : 'rgba(255,255,255,0.1)',
                  backgroundColor: otp[i] ? 'rgba(207,188,255,0.08)' : '#10121e',
                  color: '#e1e3e4',
                  fontSize: 24,
                  fontFamily: 'Inter_700Bold',
                }}
              />
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            onPress={handleVerify}
            disabled={isVerifying || otp.join('').length < OTP_LENGTH}
            style={{
              backgroundColor: '#cfbcff',
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: 'center',
              marginBottom: 24,
              opacity: (isVerifying || otp.join('').length < OTP_LENGTH) ? 0.5 : 1,
            }}
          >
            {isVerifying
              ? <ActivityIndicator color="#39197c" />
              : <Text style={{ color: '#39197c', fontFamily: 'Inter_700Bold', fontSize: 16 }}>Verify & Continue</Text>
            }
          </TouchableOpacity>

          {/* Resend */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#948e9d', fontFamily: 'Inter_400Regular', fontSize: 14 }}>
              Didn't receive it?{' '}
            </Text>
            <TouchableOpacity onPress={handleResend} disabled={countdown > 0 || isResending}>
              {isResending
                ? <ActivityIndicator size="small" color="#cfbcff" />
                : <Text style={{
                    color: countdown > 0 ? '#494551' : '#cfbcff',
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 14,
                  }}>
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                  </Text>
              }
            </TouchableOpacity>
          </View>

          {/* Expiry note */}
          <Text style={{ textAlign: 'center', color: '#494551', fontSize: 12, marginTop: 32, fontFamily: 'Inter_400Regular' }}>
            OTP expires in 10 minutes
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
