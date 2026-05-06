import React from 'react';
import { View, Text } from 'react-native';
import { useThemeStore, getTheme } from '../../store/themeStore';

// Standardised empty state: icon container → heading → body copy
export function EmptyState({
  icon,
  title,
  body,
  accentColor,
}: {
  icon: string;
  title: string;
  body: string;
  accentColor?: string;
}) {
  const isDark = useThemeStore((s) => s.isDark);
  const t = getTheme(isDark);
  const accent = accentColor ?? (isDark ? '#cfbcff' : '#B599FF');
  const iconBg = `${accent}12`;
  const iconBorder = `${accent}20`;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 }}>
      <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: iconBg, borderWidth: 1, borderColor: iconBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Text style={{ fontSize: 32 }}>{icon}</Text>
      </View>
      <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 20, color: t.onSurface, letterSpacing: -0.3, marginBottom: 8, textAlign: 'center' }}>
        {title}
      </Text>
      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: t.onSurfaceVariant, textAlign: 'center', lineHeight: 21 }}>
        {body}
      </Text>
    </View>
  );
}

// Compact empty state for inside card containers (profile page)
export function CardEmptyState({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  const t = getTheme(useThemeStore((s) => s.isDark));
  return (
    <View style={{ padding: 28, alignItems: 'center' }}>
      <Text style={{ fontSize: 36, marginBottom: 12 }}>{icon}</Text>
      <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 16, color: t.onSurface, marginBottom: 6, textAlign: 'center' }}>{title}</Text>
      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: t.onSurfaceVariant, textAlign: 'center' }}>{body}</Text>
    </View>
  );
}
