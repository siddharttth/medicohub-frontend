import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ProgressBarProps {
  progress: number; // 0 to 1
  height?: number;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 8,
  className = '',
}) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View
      className={`rounded-full overflow-hidden ${className}`}
      style={{ height, backgroundColor: 'rgba(255,255,255,0.06)' }}
    >
      <Animated.View
        style={{
          width: animatedWidth.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%'],
          }),
          height: '100%',
          borderRadius: height / 2,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={['#cfbcff', '#b599ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
};
