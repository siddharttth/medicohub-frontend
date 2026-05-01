import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: { name: string; icon: IconName; activeIcon: IconName; label: string }[] = [
  { name: 'index', icon: 'home-outline', activeIcon: 'home', label: 'Home' },
  { name: 'notes', icon: 'book-outline', activeIcon: 'book', label: 'Notes' },
  { name: 'exam', icon: 'flash-outline', activeIcon: 'flash', label: 'Exam' },
  { name: 'drops', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles', label: 'Drops' },
  { name: 'profile', icon: 'person-outline', activeIcon: 'person', label: 'Profile' },
];

export const TabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: '#0a122b',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
        paddingBottom: insets.bottom,
        paddingTop: 8,
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
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
            style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}
          >
            <View
              style={
                isFocused
                  ? {
                      shadowColor: '#cfbcff',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.6,
                      shadowRadius: 8,
                      elevation: 5,
                    }
                  : {}
              }
            >
              <Ionicons
                name={isFocused ? config.activeIcon : config.icon}
                size={22}
                color={isFocused ? '#cfbcff' : '#948e9d'}
              />
            </View>
            <Text
              style={{
                fontSize: 10,
                marginTop: 2,
                color: isFocused ? '#cfbcff' : '#948e9d',
                fontWeight: isFocused ? '600' : '400',
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
