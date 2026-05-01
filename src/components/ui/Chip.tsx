import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export const Chip: React.FC<ChipProps> = ({ label, selected = false, onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`px-4 py-2 rounded-full mr-2 border ${
        selected
          ? 'bg-primary border-primary'
          : 'bg-surface-container border-outline-variant'
      }`}
      activeOpacity={0.7}
    >
      <Text
        className={`text-sm font-inter-medium ${
          selected ? 'text-on-primary' : 'text-on-surface-variant'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};
