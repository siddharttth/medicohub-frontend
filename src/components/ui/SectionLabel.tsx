import React from 'react';
import { Text } from 'react-native';
import { useThemeStore, getTheme } from '../../store/themeStore';

// Shared section label — uppercase, Inter_600SemiBold, 11px, letterSpacing 1.5
export function SectionLabel({ children, style }: { children: string; style?: object }) {
  const t = getTheme(useThemeStore((s) => s.isDark));
  return (
    <Text
      style={[
        {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 11,
          color: t.onSurfaceVariant,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginBottom: 12,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
