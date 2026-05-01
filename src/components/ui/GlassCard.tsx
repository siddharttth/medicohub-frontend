import React from 'react';
import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  purpleGlow?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  style,
  purpleGlow = false,
}) => {
  return (
    <View
      className={`rounded-3xl overflow-hidden ${className}`}
      style={[
        {
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.06)',
        },
        style,
      ]}
    >
      {purpleGlow && (
        <LinearGradient
          colors={['rgba(181,153,255,0.10)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 120,
          }}
          pointerEvents="none"
        />
      )}
      {children}
    </View>
  );
};
