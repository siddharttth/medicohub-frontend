import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore, getTheme } from '../../store/themeStore';

export function EmptyState({
  iconName,
  title,
  body,
  accentColor,
}: {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
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
        <Ionicons name={iconName} size={32} color={accent} />
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

export function CardEmptyState({
  iconName,
  title,
  body,
}: {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
}) {
  const isDark = useThemeStore((s) => s.isDark);
  const t = getTheme(isDark);
  const accent = isDark ? '#cfbcff' : '#B599FF';

  return (
    <View style={{ padding: 28, alignItems: 'center' }}>
      <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: `${accent}12`, borderWidth: 1, borderColor: `${accent}20`, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Ionicons name={iconName} size={26} color={accent} />
      </View>
      <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 16, color: t.onSurface, marginBottom: 6, textAlign: 'center' }}>{title}</Text>
      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: t.onSurfaceVariant, textAlign: 'center' }}>{body}</Text>
    </View>
  );
}
