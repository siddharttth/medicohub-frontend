import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '../../types';
import { format } from 'date-fns';
import { useThemeStore, getTheme } from '../../store/themeStore';

interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, currentUserId }) => {
  const isDark = useThemeStore((s) => s.isDark);
  const t = getTheme(isDark);
  const senderId = message.sender?.id ?? '';
  const senderName = message.sender?.name ?? 'Unknown';
  const isCurrentUser = senderId === currentUserId;
  const isAI = message.type === 'ai';
  const body = message.content || message.text || '';
  const time = message.createdAt ? format(new Date(message.createdAt), 'HH:mm') : '';

  // Own message — right-aligned, purple fill
  if (isCurrentUser) {
    return (
      <View style={{ alignItems: 'flex-end', marginBottom: 10, paddingHorizontal: 20 }}>
        <View
          style={{
            maxWidth: '78%',
            backgroundColor: t.primaryContainer,
            paddingHorizontal: 16,
            paddingVertical: 11,
            borderTopLeftRadius: 22,
            borderBottomLeftRadius: 22,
            borderTopRightRadius: 6,
            borderBottomRightRadius: 22,
            shadowColor: t.primaryContainer,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
          }}
        >
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: '#39197c', lineHeight: 20 }}>
            {body}
          </Text>
        </View>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: t.onSurfaceVariant, marginTop: 4 }}>
          {time}
        </Text>
      </View>
    );
  }

  // AI message — green-tinted surface
  if (isAI) {
    return (
      <View style={{ alignItems: 'flex-start', marginBottom: 10, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 6 }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: 'rgba(74,222,128,0.15)',
              borderWidth: 1,
              borderColor: 'rgba(74,222,128,0.3)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="sparkles" size={12} color="#4ade80" />
          </View>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#4ade80', letterSpacing: 0.3 }}>
            MedicoAI
          </Text>
        </View>
        <View
          style={{
            maxWidth: '78%',
            backgroundColor: isDark ? 'rgba(74,222,128,0.08)' : 'rgba(74,222,128,0.1)',
            borderWidth: 1,
            borderColor: 'rgba(74,222,128,0.2)',
            paddingHorizontal: 16,
            paddingVertical: 11,
            borderTopRightRadius: 22,
            borderBottomRightRadius: 22,
            borderTopLeftRadius: 6,
            borderBottomLeftRadius: 22,
          }}
        >
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: t.onSurface, lineHeight: 21 }}>
            {body}
          </Text>
        </View>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: t.onSurfaceVariant, marginTop: 4 }}>
          {time}
        </Text>
      </View>
    );
  }

  // Other user message — left-aligned, card surface
  return (
    <View style={{ alignItems: 'flex-start', marginBottom: 10, paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 6 }}>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: t.iconBg,
            borderWidth: 1,
            borderColor: t.cardBorder,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 9, color: t.onSurfaceVariant }}>{senderName.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: t.onSurfaceVariant, letterSpacing: 0.3 }}>
          {senderName}
        </Text>
      </View>
      <View
        style={{
          maxWidth: '78%',
          backgroundColor: t.card,
          borderWidth: 1,
          borderColor: t.cardBorder,
          paddingHorizontal: 16,
          paddingVertical: 11,
          borderTopRightRadius: 22,
          borderBottomRightRadius: 22,
          borderTopLeftRadius: 6,
          borderBottomLeftRadius: 22,
        }}
      >
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: t.onSurface, lineHeight: 21 }}>
          {body}
        </Text>
      </View>
      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: t.onSurfaceVariant, marginTop: 4 }}>
        {time}
      </Text>
    </View>
  );
};
