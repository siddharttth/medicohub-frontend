import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useDropsStore } from '../../src/store/dropsStore';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore, getTheme } from '../../src/store/themeStore';
import { dropsApi } from '../../src/api/drops';
import { aiApi } from '../../src/api/ai';
import { useSocket } from '../../src/hooks/useSocket';
import { MessageBubble } from '../../src/components/drops/MessageBubble';
import { SUBJECTS, SubjectPill } from '../../src/constants/subjects';
import { Message, Subject } from '../../src/types';

// ─── Typing indicator ────────────────────────────────────────────────────────
const TypingIndicator = () => {
  const isDark = useThemeStore((s) => s.isDark);
  const t = getTheme(isDark);
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    dots.forEach((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 280, useNativeDriver: true }),
          Animated.delay(480 - i * 160),
        ])
      ).start()
    );
  }, []);

  return (
    <View style={{ paddingHorizontal: 20, paddingVertical: 6, alignItems: 'flex-start' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.card, borderWidth: 1, borderColor: t.cardBorder, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderTopLeftRadius: 6 }}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.onSurfaceVariant, opacity: dot }} />
        ))}
      </View>
    </View>
  );
};

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function DropsScreen() {
  const [inputText, setInputText] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<Subject>('Anatomy');
  const flatListRef = useRef<FlatList>(null);
  const { getMessages, addMessage, setMessages, isTyping, onlineCount } = useDropsStore();
  const user = useAuthStore((s) => s.user);
  const isDark = useThemeStore((s) => s.isDark);
  const t = getTheme(isDark);
  const { socket } = useSocket();

  const messages = getMessages(selectedSubject);
  const hasCached = messages.length > 0;

  const fetchedRef = useRef<Set<string>>(new Set());

  const fetchMessages = useCallback(async (subject: Subject) => {
    const res = await dropsApi.getMessages(subject, 50, 0);
    setMessages(subject, res.messages);
    fetchedRef.current.add(subject);
    return res;
  }, [setMessages]);

  const { isFetching } = useQuery({
    queryKey: ['drops', 'messages', selectedSubject],
    queryFn: () => fetchMessages(selectedSubject),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const showSpinner = isFetching && !hasCached;

  useEffect(() => {
    if (socket) {
      (socket as any)._currentSubject = selectedSubject;
      socket.emit('join-subject', selectedSubject);
    }
  }, [socket, selectedSubject]);

  const sendMutation = useMutation({
    mutationFn: (text: string) => dropsApi.sendMessage({ subject: selectedSubject, text }),
    onSuccess: (newMsg) => addMessage(selectedSubject, newMsg),
    onError: () => Toast.show({ type: 'error', text1: 'Failed to send message' }),
  });

  const aiMutation = useMutation({
    mutationFn: (question: string) => aiApi.ask(question, selectedSubject),
    onSuccess: (res) => {
      addMessage(selectedSubject, {
        id: Date.now().toString(),
        content: res.answer,
        sender: { id: 'ai', name: 'MedicoAI' },
        type: 'ai',
        isPinned: false,
        createdAt: new Date().toISOString(),
      });
    },
    onError: () => Toast.show({ type: 'error', text1: 'AI request failed' }),
  });

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    sendMutation.mutate(text);
    socket?.emit('typing', { isTyping: false });
  };

  const handleAskAI = () => {
    const text = inputText.trim();
    if (!text) { Toast.show({ type: 'info', text1: 'Type a question first' }); return; }
    setInputText('');
    aiMutation.mutate(text);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={0}>

        {/* ── Header ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.onSurfaceVariant, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
                Batch Chat
              </Text>
              <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 36, color: t.onSurface, letterSpacing: -0.5, lineHeight: 40 }}>
                Medico Drops
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(74,222,128,0.08)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 4 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80' }} />
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#4ade80' }}>
                {onlineCount > 0 ? `${onlineCount} online` : 'Live'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Subject pills — Fix #2: shared SubjectPill; Fix #8: padding matches exam (16/8) ── */}
        {/* Fix #9: removed misleading static underline indicator */}
        <View style={{ marginBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}>
            {SUBJECTS.map((s) => (
              <SubjectPill
                key={s}
                subject={s}
                active={selectedSubject === s}
                variant="pill"
                onPress={() => setSelectedSubject(s)}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── Messages ── */}
        {showSpinner ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={t.primaryText} size="large" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item }: { item: Message }) => (
              <MessageBubble message={item} currentUserId={user?.id ?? ''} />
            )}
            keyExtractor={(item, index) => item.id ?? index.toString()}
            inverted
            contentContainerStyle={{ paddingVertical: 16 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={isTyping ? <TypingIndicator /> : null}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 }}>
                <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: 'rgba(207,188,255,0.1)', borderWidth: 1, borderColor: 'rgba(207,188,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <Ionicons name="chatbubbles-outline" size={32} color={isDark ? '#cfbcff' : '#7C5CBF'} />
                </View>
                <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 22, color: t.onSurface, letterSpacing: -0.3, marginBottom: 8, textAlign: 'center' }}>
                  No messages yet
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: t.onSurfaceVariant, textAlign: 'center', lineHeight: 21, marginBottom: 28 }}>
                  Be the first to drop something in{' '}
                  <Text style={{ fontFamily: 'Inter_600SemiBold', color: t.primaryText }}>{selectedSubject}</Text>
                  . Ask a doubt, share a tip, or start a discussion.
                </Text>
                {[
                  `Any good notes for ${selectedSubject}?`,
                  `What topics are high-yield in ${selectedSubject}?`,
                  'Anyone studying right now?',
                ].map((prompt) => (
                  <TouchableOpacity
                    key={prompt}
                    onPress={() => setInputText(prompt)}
                    activeOpacity={0.7}
                    style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.cardBorder, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 8, width: '100%' }}
                  >
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: t.onSurfaceVariant }} numberOfLines={1}>{prompt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            }
          />
        )}

        {/* ── Input bar ── */}
        {/* Fix #22: explicit paddingTop/paddingBottom instead of conflicting paddingVertical + paddingBottom */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderTopWidth: 1, borderTopColor: t.separator, backgroundColor: t.bg, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <View style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.cardBorder, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 11, minHeight: 46, justifyContent: 'center' }}>
            <TextInput
              value={inputText}
              onChangeText={(text) => { setInputText(text); socket?.emit('typing', { isTyping: text.length > 0 }); }}
              placeholder={`Message ${selectedSubject}...`}
              placeholderTextColor={isDark ? 'rgba(148,142,157,0.45)' : 'rgba(90,86,112,0.4)'}
              multiline
              maxLength={500}
              style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: t.onSurface, maxHeight: 100, padding: 0 }}
            />
          </View>
          {/* Fix #13: replace robot emoji with Ionicons sparkles for consistent icon system */}
          <TouchableOpacity
            onPress={handleAskAI}
            disabled={aiMutation.isPending}
            activeOpacity={0.8}
            style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(74,222,128,0.1)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)', alignItems: 'center', justifyContent: 'center' }}
          >
            {aiMutation.isPending
              ? <ActivityIndicator size="small" color="#4ade80" />
              : <Ionicons name="sparkles-outline" size={20} color="#4ade80" />
            }
          </TouchableOpacity>
          {/* Fix #7: use t.onPrimary instead of hardcoded '#39197c' for send icon */}
          <TouchableOpacity
            onPress={handleSend}
            disabled={sendMutation.isPending || !inputText.trim()}
            activeOpacity={0.8}
            style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: inputText.trim() ? t.primaryContainer : t.card, borderWidth: 1, borderColor: inputText.trim() ? t.primaryContainer : t.cardBorder, alignItems: 'center', justifyContent: 'center', shadowColor: inputText.trim() ? t.primaryContainer : 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 10 }}
          >
            {sendMutation.isPending
              ? <ActivityIndicator size="small" color={t.onPrimary} />
              : <Ionicons name="send" size={18} color={inputText.trim() ? t.onPrimary : t.outlineVariant} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
