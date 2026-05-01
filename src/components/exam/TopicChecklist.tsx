import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Topic } from '../../types';

interface TopicChecklistProps {
  topics: Topic[];
  onToggle: (id: string) => void;
}

export const TopicChecklist: React.FC<TopicChecklistProps> = ({ topics, onToggle }) => {
  const renderItem = ({ item }: { item: Topic }) => (
    <TouchableOpacity
      onPress={() => onToggle(item.id)}
      className="flex-row items-center py-3 border-b border-outline-variant"
      activeOpacity={0.7}
    >
      <View
        className={`w-5 h-5 rounded mr-3 items-center justify-center border ${
          item.isCompleted
            ? 'bg-primary border-primary'
            : 'border-outline bg-transparent'
        }`}
      >
        {item.isCompleted && (
          <Ionicons name="checkmark" size={12} color="#39197c" />
        )}
      </View>
      <Text
        className={`flex-1 font-inter text-sm ${
          item.isCompleted ? 'text-outline line-through' : 'text-on-surface'
        }`}
      >
        {item.title}
      </Text>
      {item.isHighYield && (
        <View className="bg-primary-container px-2 py-0.5 rounded-full ml-2">
          <Text className="text-on-primary text-xs font-inter-medium">HY</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={topics}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      ListEmptyComponent={
        <Text className="text-on-surface-variant text-sm text-center py-4">
          No topics available. Generate a pack first.
        </Text>
      }
    />
  );
};
