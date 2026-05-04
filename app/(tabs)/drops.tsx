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
import { dropsApi } from '../../src/api/drops';
import { aiApi } from '../../src/api/ai';
import { useSocket } from '../../src/hooks/useSocket';
import { MessageBubble } from '../../src/components/drops/MessageBubble';
import { Message, Subject } from '../../src/types';

const SUBJECTS: Subject[] = [
  'Anatomy', 'Physiology', 'Biochemistry', 'Pathology',
  'Pharmacology', 'Microbiology', 'Surgery', 'Medicine',
];

const SUBJECT_COLORS: Record<string, string> = {
  Anatomy: '#cfbcff', Physiology: '#4ade80', Biochemistry: '#60a5fa',
  Pathology: '#fb923c', Pharmacology: '#f472b6', Microbiology: '#22d3ee',
  Surgery: '#fbbf24', Medicine: '#a78bfa',
};

// ─── Typing indicator ────────────────────────────────────────────────────────
const TypingIndicator = () => {
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10121e', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderTopLeftRadius: 6 }}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#948e9d', opacity: dot }} />
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
  const { socket } = useSocket();

  // Messages for the current subject from cache
  const messages = getMessages(selectedSubject);
  const hasCached = messages.length > 0;

  // Track which subjects have been fetched this session to avoid re-fetching
  const fetchedRef = useRef<Set<string>>(new Set());

  const fetchMessages = useCallback(async (subject: Subject) => {
    const res = await dropsApi.getMessages(subject, 50, 0);
    setMessages(subject, res.messages);
    fetchedRef.current.add(subject);
    return res;
  }, [setMessages]);

  // Background-refresh: if already cached show immediately, refetch silently
  const { isFetching } = useQuery({
    queryKey: ['drops', 'messages', selectedSubject],
    queryFn: () => fetchMessages(selectedSubject),
    // If we have cached data, don't show loading — just refresh in bg
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Show spinner only on first load (no cache yet for this subject)
  const showSpinner = isFetching && !hasCached;

  // Track subject + join room so backend delivers 'new-drop' events
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

  const activeColor = SUBJECT_COLORS[selectedSubject] ?? '#cfbcff';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#070810' }} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {/* ── Header ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#948e9d', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
                Batch Chat
              </Text>
              <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 36, color: '#e1e3e4', letterSpacing: -0.5, lineHeight: 40 }}>
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

        {/* ── Subject pills ── */}
        <View style={{ marginBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}>
            {SUBJECTS.map((s) => {
              const isActive = selectedSubject === s;
              const color = SUBJECT_COLORS[s];
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => setSelectedSubject(s)}
                  activeOpacity={0.75}
                  style={{ paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999, marginRight: 8, backgroundColor: isActive ? color : '#10121e', borderWidth: 1, borderColor: isActive ? color : 'rgba(255,255,255,0.07)' }}
                >
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: isActive ? '#1a0a3a' : '#948e9d' }}>
                    {s}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={{ height: 1.5, marginTop: 12, marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 1, overflow: 'hidden' }}>
            <View style={{ width: 48, height: '100%', backgroundColor: activeColor, borderRadius: 1, opacity: 0.6 }} />
          </View>
        </View>

        {/* ── Messages ── */}
        {showSpinner ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#cfbcff" size="large" />
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
                {/* Icon */}
                <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: `${activeColor}12`, borderWidth: 1, borderColor: `${activeColor}20`, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <Text style={{ fontSize: 32 }}>💬</Text>
                </View>
                {/* Text */}
                <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 22, color: '#e1e3e4', letterSpacing: -0.3, marginBottom: 8, textAlign: 'center' }}>
                  No messages yet
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#948e9d', textAlign: 'center', lineHeight: 21, marginBottom: 28 }}>
                  Be the first to drop something in{' '}
                  <Text style={{ fontFamily: 'Inter_600SemiBold', color: activeColor }}>{selectedSubject}</Text>
                  . Ask a doubt, share a tip, or just say hi 👋
                </Text>
                {/* Suggested prompts */}
                {[
                  `Any good notes for ${selectedSubject}?`,
                  `What topics are high-yield in ${selectedSubject}?`,
                  'Anyone studying right now?',
                ].map((prompt) => (
                  <TouchableOpacity
                    key={prompt}
                    onPress={() => setInputText(prompt)}
                    activeOpacity={0.7}
                    style={{ backgroundColor: '#10121e', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 8, width: '100%' }}
                  >
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#948e9d' }} numberOfLines={1}>
                      {prompt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            }
          />
        )}

        {/* ── Input bar ── */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', backgroundColor: '#070810', flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <View style={{ flex: 1, backgroundColor: '#10121e', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 22, paddingHorizontal: 18, paddingVertical: 11, minHeight: 46, justifyContent: 'center' }}>
            <TextInput
              value={inputText}
              onChangeText={(text) => { setInputText(text); socket?.emit('typing', { isTyping: text.length > 0 }); }}
              placeholder={`Message ${selectedSubject}...`}
              placeholderTextColor="rgba(148,142,157,0.45)"
              multiline
              maxLength={500}
              style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#e1e3e4', maxHeight: 100, padding: 0 }}
            />
          </View>

          {/* AI button */}
          <TouchableOpacity onPress={handleAskAI} disabled={aiMutation.isPending} activeOpacity={0.8}
            style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(74,222,128,0.1)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            {aiMutation.isPending ? <ActivityIndicator size="small" color="#4ade80" /> : <Text style={{ fontSize: 20 }}>🤖</Text>}
          </TouchableOpacity>

          {/* Send button */}
          <TouchableOpacity onPress={handleSend} disabled={sendMutation.isPending || !inputText.trim()} activeOpacity={0.8}
            style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: inputText.trim() ? '#cfbcff' : '#10121e', borderWidth: 1, borderColor: inputText.trim() ? '#cfbcff' : 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', shadowColor: inputText.trim() ? '#cfbcff' : 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 10 }}>
            {sendMutation.isPending
              ? <ActivityIndicator size="small" color="#39197c" />
              : <Ionicons name="send" size={18} color={inputText.trim() ? '#39197c' : '#494551'} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
