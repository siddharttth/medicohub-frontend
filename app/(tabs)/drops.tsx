import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  ScrollView,
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

const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      ).start();

    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, []);

  return (
    <View className="flex-row items-center px-4 py-2">
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#948e9d',
            marginHorizontal: 2,
            opacity: dot,
          }}
        />
      ))}
    </View>
  );
};

export default function DropsScreen() {
  const [inputText, setInputText] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<Subject>('Anatomy');
  const flatListRef = useRef<FlatList>(null);
  const { messages, isTyping, onlineCount, addMessage, setMessages } = useDropsStore();
  const user = useAuthStore((s) => s.user);
  const { socket } = useSocket();

  // Clear messages immediately on subject change so old subject's messages don't flash
  const handleSubjectChange = (subject: Subject) => {
    setMessages([]);
    setSelectedSubject(subject);
  };

  const { isLoading } = useQuery({
    queryKey: ['drops', 'messages', selectedSubject],
    queryFn: async () => {
      const res = await dropsApi.getMessages(selectedSubject, 50, 0);
      setMessages(res.messages);
      return res;
    },
    // Keep previous data in cache so switching back restores instantly
    staleTime: 30_000,
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) =>
      dropsApi.sendMessage({ subject: selectedSubject, text }),
    onSuccess: (newMsg) => {
      addMessage(newMsg);
    },
    onError: () => Toast.show({ type: 'error', text1: 'Failed to send message' }),
  });

  const aiMutation = useMutation({
    mutationFn: (question: string) => aiApi.ask(question, selectedSubject),
    onSuccess: (res) => {
      const aiMessage: Message = {
        id: Date.now().toString(),
        content: res.answer,
        sender: { id: 'ai', name: 'MedicoAI' },
        type: 'ai',
        isPinned: false,
        createdAt: new Date().toISOString(),
      };
      addMessage(aiMessage);
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
    if (!text) {
      Toast.show({ type: 'info', text1: 'Type a question first' });
      return;
    }
    setInputText('');
    aiMutation.mutate(text);
  };

  const handleInputChange = (text: string) => {
    setInputText(text);
    socket?.emit('typing', { isTyping: text.length > 0 });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-3 border-b border-outline-variant">
          <View>
            <Text className="text-on-surface font-inter-bold text-xl">Medico Drops 💬</Text>
            <View className="flex-row items-center mt-0.5">
              <View className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
              <Text className="text-on-surface-variant font-inter text-xs">
                {onlineCount > 0 ? `${onlineCount} online` : 'Connecting...'}
              </Text>
            </View>
          </View>
        </View>

        {/* Subject Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
          style={{ flexGrow: 0 }}
        >
          {SUBJECTS.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => handleSubjectChange(s)}
              className="mr-2 px-3 py-1.5 rounded-full"
              style={{
                backgroundColor: selectedSubject === s ? '#7c3aed' : 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: selectedSubject === s ? '#b599ff' : 'rgba(255,255,255,0.1)',
              }}
              activeOpacity={0.8}
            >
              <Text
                className="font-inter-medium text-xs"
                style={{ color: selectedSubject === s ? '#fff' : '#948e9d' }}
              >
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Messages */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#cfbcff" />
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
            contentContainerStyle={{ paddingVertical: 12 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={isTyping ? <TypingIndicator /> : null}
            ListEmptyComponent={
              <View className="items-center justify-center py-20">
                <Text style={{ fontSize: 40 }}>💬</Text>
                <Text className="text-on-surface-variant font-inter-medium text-base mt-3">
                  No messages yet
                </Text>
                <Text className="text-outline font-inter text-sm mt-1">
                  Start the conversation!
                </Text>
              </View>
            }
          />
        )}

        {/* Input Bar */}
        <View
          className="flex-row items-end px-3 py-2 border-t border-outline-variant"
          style={{ backgroundColor: '#0a122b' }}
        >
          <View className="flex-1 bg-surface-container border border-outline-variant rounded-2xl px-4 py-2 mr-2">
            <TextInput
              value={inputText}
              onChangeText={handleInputChange}
              placeholder={`Ask about ${selectedSubject}...`}
              placeholderTextColor="#494551"
              multiline
              maxLength={500}
              className="text-on-surface font-inter"
              style={{ fontSize: 14, maxHeight: 100 }}
            />
          </View>

          <TouchableOpacity
            onPress={handleAskAI}
            disabled={aiMutation.isPending}
            className="w-10 h-10 rounded-full bg-surface-container-high items-center justify-center mr-1"
            activeOpacity={0.8}
          >
            {aiMutation.isPending ? (
              <ActivityIndicator size="small" color="#cfbcff" />
            ) : (
              <Text style={{ fontSize: 18 }}>🤖</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSend}
            disabled={sendMutation.isPending || !inputText.trim()}
            className="w-10 h-10 rounded-full bg-primary items-center justify-center"
            activeOpacity={0.8}
            style={{ opacity: inputText.trim() ? 1 : 0.5 }}
          >
            {sendMutation.isPending ? (
              <ActivityIndicator size="small" color="#39197c" />
            ) : (
              <Ionicons name="send" size={18} color="#39197c" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
