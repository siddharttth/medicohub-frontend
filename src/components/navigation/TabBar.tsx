import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore, getTheme } from '../../store/themeStore';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: { name: string; icon: IconName; activeIcon: IconName; label: string }[] = [
  { name: 'index', icon: 'home-outline', activeIcon: 'home', label: 'Home' },
  { name: 'notes', icon: 'book-outline', activeIcon: 'book', label: 'Notes' },
  { name: 'exam', icon: 'flash-outline', activeIcon: 'flash', label: 'Exam' },
  { name: 'drops', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses', label: 'Drops' },
  { name: 'profile', icon: 'person-outline', activeIcon: 'person', label: 'Profile' },
];

export const TabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const t = getTheme(isDark);

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: t.bg,
        borderTopWidth: 1,
        borderTopColor: t.separator,
        paddingBottom: insets.bottom || 8,
        paddingTop: 10,
      }}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const config = TAB_CONFIG.find((c) => c.name === route.name) ?? TAB_CONFIG[0];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.7}
            style={{ flex: 1, alignItems: 'center', paddingBottom: 4 }}
          >
            <Ionicons
              name={isFocused ? config.activeIcon : config.icon}
              size={24}
              color={isFocused ? t.primaryText : t.onSurfaceVariant}
            />
            <Text
              style={{
                fontSize: 9,
                marginTop: 3,
                color: isFocused ? t.primaryContainer : t.onSurfaceVariant,
                fontFamily: isFocused ? 'Inter_700Bold' : 'Inter_400Regular',
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              {config.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
