import React, { useMemo } from 'react';
import { View, FlatList, Text } from 'react-native';
import { StreakDay } from '../../types';
import { subDays, format, parseISO } from 'date-fns';

interface StreakHeatmapProps {
  data: StreakDay[];
}

const COLS = 50;
const ROWS = 7;
const CELL_SIZE = 6;
const CELL_GAP = 2;

const OPACITY_LEVELS = [
  '#0a122b',
  'rgba(181,153,255,0.15)',
  'rgba(181,153,255,0.30)',
  'rgba(181,153,255,0.60)',
  '#cfbcff',
];

const getColor = (count: number): string => {
  if (count === 0) return OPACITY_LEVELS[0];
  if (count <= 1) return OPACITY_LEVELS[1];
  if (count <= 3) return OPACITY_LEVELS[2];
  if (count <= 6) return OPACITY_LEVELS[3];
  return OPACITY_LEVELS[4];
};

export const StreakHeatmap: React.FC<StreakHeatmapProps> = ({ data }) => {
  const cells = useMemo(() => {
    const today = new Date();
    const totalDays = COLS * ROWS;
    const dataMap = new Map<string, number>();
    data.forEach((d) => {
      dataMap.set(d.date, d.count);
    });

    return Array.from({ length: totalDays }, (_, i) => {
      const date = subDays(today, totalDays - 1 - i);
      const key = format(date, 'yyyy-MM-dd');
      return { date: key, count: dataMap.get(key) ?? 0 };
    });
  }, [data]);

  const renderCell = ({ item }: { item: { date: string; count: number } }) => (
    <View
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        backgroundColor: getColor(item.count),
        borderRadius: 1,
        margin: CELL_GAP / 2,
      }}
    />
  );

  return (
    <View>
      <FlatList
        data={cells}
        renderItem={renderCell}
        keyExtractor={(item) => item.date}
        numColumns={COLS}
        scrollEnabled={false}
        columnWrapperStyle={{ flexWrap: 'nowrap' }}
      />
      <View className="flex-row justify-end items-center mt-2 gap-1">
        <Text className="text-xs text-outline mr-1">Less</Text>
        {OPACITY_LEVELS.map((color, i) => (
          <View
            key={i}
            style={{ width: 8, height: 8, backgroundColor: color, borderRadius: 1 }}
          />
        ))}
        <Text className="text-xs text-outline ml-1">More</Text>
      </View>
    </View>
  );
};
