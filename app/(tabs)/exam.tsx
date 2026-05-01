import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import { useExamStore } from '../../src/store/examStore';
import { examApi } from '../../src/api/exam';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { Chip } from '../../src/components/ui/Chip';
import { TopicChecklist } from '../../src/components/exam/TopicChecklist';
import { Subject } from '../../src/types';
import { useQuery, useMutation } from '@tanstack/react-query';

const SUBJECTS: Subject[] = [
  'Anatomy', 'Physiology', 'Biochemistry', 'Pathology',
  'Pharmacology', 'Microbiology', 'Surgery', 'Medicine',
];

export default function ExamScreen() {
  const {
    selectedSubject,
    generatedPack,
    vivaQuestion,
    topics,
    isGenerating,
    isAskingViva,
    setSubject,
    setPack,
    setVivaQuestion,
    setTopics,
    setIsGenerating,
    setIsAskingViva,
    toggleTopic,
    reset,
  } = useExamStore();

  const { data: fetchedTopics } = useQuery({
    queryKey: ['topics', selectedSubject],
    queryFn: () => examApi.getTopics(selectedSubject!),
    enabled: !!selectedSubject,
  });

  useEffect(() => {
    if (fetchedTopics) {
      setTopics(fetchedTopics);
    }
  }, [fetchedTopics]);

  const generateMutation = useMutation({
    mutationFn: () => examApi.generatePack(selectedSubject!),
    onMutate: () => setIsGenerating(true),
    onSuccess: (data) => {
      setPack(data);
      Toast.show({ type: 'success', text1: 'Survival pack ready! 💪' });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Generation failed. Try again.' }),
    onSettled: () => setIsGenerating(false),
  });

  const vivaMutation = useMutation({
    mutationFn: () => examApi.askViva(selectedSubject!),
    onMutate: () => setIsAskingViva(true),
    onSuccess: (data) => setVivaQuestion(data),
    onError: () => Toast.show({ type: 'error', text1: 'Failed to get viva question.' }),
    onSettled: () => setIsAskingViva(false),
  });

  const handleTopicToggle = async (id: string) => {
    const topic = topics.find((t) => t.id === id);
    if (!topic) return;
    toggleTopic(id);
    try {
      await examApi.completeTopic(id, !topic.isCompleted);
    } catch {
      toggleTopic(id); // revert on error
    }
  };

  const completedCount = topics.filter((t) => t.isCompleted).length;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-on-surface font-inter-bold text-2xl">Exam Mode ⚡</Text>
          <Text className="text-on-surface-variant font-inter text-sm mt-1">
            AI-powered survival for your next exam
          </Text>
        </View>

        {/* Subject Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 8 }}
        >
          {SUBJECTS.map((s) => (
            <Chip
              key={s}
              label={s}
              selected={selectedSubject === s}
              onPress={() => {
                setSubject(s);
                if (generatedPack?.subject !== s) {
                  reset();
                  setSubject(s);
                }
              }}
            />
          ))}
        </ScrollView>

        {selectedSubject ? (
          <>
            {/* Generate Button */}
            <TouchableOpacity
              onPress={() => generateMutation.mutate()}
              disabled={isGenerating}
              className="mx-5 my-3 rounded-3xl overflow-hidden"
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#4a2a8a', '#7c3aed']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ padding: 18, borderRadius: 24, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
              >
                {isGenerating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text style={{ fontSize: 20, marginRight: 8 }}>🧠</Text>
                    <Text className="text-white font-inter-bold text-base">
                      Generate {selectedSubject} Survival Pack
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Generated Pack */}
            {generatedPack && (
              <GlassCard className="mx-5 mb-4 p-4" purpleGlow>
                <Text className="text-primary font-inter-semibold text-base mb-3">
                  ✨ {generatedPack.subject} Survival Pack
                </Text>

                <Text className="text-on-surface font-inter-semibold text-sm mb-2">High-Yield Topics</Text>
                {generatedPack.highYieldTopics.map((t, i) => (
                  <View key={i} className="flex-row items-start mb-1">
                    <Text className="text-primary mr-2">•</Text>
                    <Text className="text-on-surface-variant font-inter text-sm flex-1">{t}</Text>
                  </View>
                ))}

                {generatedPack.mnemonics.length > 0 && (
                  <>
                    <Text className="text-on-surface font-inter-semibold text-sm mt-3 mb-2">Mnemonics</Text>
                    {generatedPack.mnemonics.map((m, i) => (
                      <GlassCard key={i} className="p-3 mb-2">
                        <Text className="text-on-surface-variant font-inter text-sm">{m}</Text>
                      </GlassCard>
                    ))}
                  </>
                )}
              </GlassCard>
            )}

            {/* Viva Q&A */}
            <GlassCard className="mx-5 mb-4 p-4">
              <Text className="text-on-surface font-inter-semibold text-base mb-3">Viva Practice 🎙️</Text>

              <TouchableOpacity
                onPress={() => vivaMutation.mutate()}
                disabled={isAskingViva}
                className="bg-surface-container-high rounded-2xl py-3 items-center mb-3"
                activeOpacity={0.8}
              >
                {isAskingViva ? (
                  <ActivityIndicator color="#cfbcff" />
                ) : (
                  <Text className="text-primary font-inter-medium text-sm">Ask Me a Viva Q 🤔</Text>
                )}
              </TouchableOpacity>

              {vivaQuestion && (
                <View>
                  <GlassCard className="p-3 mb-2" style={{ borderColor: 'rgba(207,188,255,0.15)' }}>
                    <Text className="text-on-surface-variant text-xs font-inter-medium mb-1">QUESTION</Text>
                    <Text className="text-on-surface font-inter-semibold text-sm">{vivaQuestion.question}</Text>
                    <View className="bg-surface-container-highest rounded-full px-2 py-0.5 self-start mt-2">
                      <Text className="text-outline text-xs">{vivaQuestion.difficulty}</Text>
                    </View>
                  </GlassCard>
                  <GlassCard className="p-3">
                    <Text className="text-on-surface-variant text-xs font-inter-medium mb-1">ANSWER</Text>
                    <Text className="text-on-surface font-inter text-sm leading-5">{vivaQuestion.answer}</Text>
                  </GlassCard>
                </View>
              )}
            </GlassCard>

            {/* Topics Checklist */}
            <GlassCard className="mx-5 mb-4 p-4">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-on-surface font-inter-semibold text-base">High-Yield Topics</Text>
                {topics.length > 0 && (
                  <Text className="text-primary font-inter-medium text-sm">
                    {completedCount}/{topics.length}
                  </Text>
                )}
              </View>
              <TopicChecklist topics={topics} onToggle={handleTopicToggle} />
            </GlassCard>
          </>
        ) : (
          <View className="mx-5 mt-8 items-center">
            <Text style={{ fontSize: 56 }}>⚡</Text>
            <Text className="text-on-surface font-inter-semibold text-lg mt-4 text-center">
              Select a subject to begin
            </Text>
            <Text className="text-on-surface-variant font-inter text-sm mt-2 text-center">
              Choose from the chips above and generate your personalized survival pack.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
