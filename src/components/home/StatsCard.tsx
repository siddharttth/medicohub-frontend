import React from 'react';
import { View, Text } from 'react-native';
import { GlassCard } from '../ui/GlassCard';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: string;
  suffix?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon, suffix }) => {
  return (
    <GlassCard className="flex-1 p-3 items-center" style={{ minWidth: 72 }}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <Text className="text-on-surface font-inter-bold text-lg mt-1">
        {value}
        {suffix && <Text className="text-sm text-on-surface-variant">{suffix}</Text>}
      </Text>
      <Text className="text-on-surface-variant text-xs text-center mt-0.5 font-inter" numberOfLines={2}>
        {label}
      </Text>
    </GlassCard>
  );
};
