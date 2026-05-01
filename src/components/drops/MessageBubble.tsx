import React from 'react';
import { View, Text } from 'react-native';
import { Message } from '../../types';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, currentUserId }) => {
  const senderId = message.sender?.id ?? '';
  const senderName = message.sender?.name ?? 'Unknown';
  const isCurrentUser = senderId === currentUserId;
  const isAI = message.type === 'ai';
  const body = message.content || message.text || '';
  const time = message.createdAt ? format(new Date(message.createdAt), 'HH:mm') : '';

  if (isCurrentUser) {
    return (
      <View className="items-end mb-3 px-4">
        <View
          className="max-w-[75%] px-4 py-3"
          style={{
            backgroundColor: '#cfbcff',
            borderTopLeftRadius: 24,
            borderBottomLeftRadius: 24,
            borderTopRightRadius: 4,
            borderBottomRightRadius: 24,
          }}
        >
          <Text style={{ color: '#39197c', fontWeight: '500', fontSize: 14 }}>{body}</Text>
        </View>
        <Text className="text-outline text-xs mt-1">{time}</Text>
      </View>
    );
  }

  if (isAI) {
    return (
      <View className="items-start mb-3 px-4">
        <View className="flex-row items-center mb-1">
          <View className="w-5 h-5 rounded-full bg-green-600 items-center justify-center mr-2">
            <Text style={{ fontSize: 10 }}>🤖</Text>
          </View>
          <Text className="text-xs text-on-surface-variant font-inter-medium">MedicoAI</Text>
        </View>
        <View
          className="max-w-[75%] px-4 py-3"
          style={{
            backgroundColor: 'rgba(34,197,94,0.15)',
            borderWidth: 1,
            borderColor: 'rgba(34,197,94,0.3)',
            borderTopRightRadius: 24,
            borderBottomRightRadius: 24,
            borderTopLeftRadius: 4,
            borderBottomLeftRadius: 24,
          }}
        >
          <Text className="text-on-surface text-sm font-inter">{body}</Text>
        </View>
        <Text className="text-outline text-xs mt-1">{time}</Text>
      </View>
    );
  }

  return (
    <View className="items-start mb-3 px-4">
      <View className="flex-row items-center mb-1">
        <View className="w-5 h-5 rounded-full bg-surface-container-high items-center justify-center mr-2">
          <Text style={{ fontSize: 10 }}>👤</Text>
        </View>
        <Text className="text-xs text-on-surface-variant font-inter-medium">{senderName}</Text>
      </View>
      <View
        className="max-w-[75%] px-4 py-3 bg-surface-container-high"
        style={{
          borderTopRightRadius: 24,
          borderBottomRightRadius: 24,
          borderTopLeftRadius: 4,
          borderBottomLeftRadius: 24,
        }}
      >
        <Text className="text-on-surface text-sm font-inter">{body}</Text>
      </View>
      <Text className="text-outline text-xs mt-1">{time}</Text>
    </View>
  );
};
