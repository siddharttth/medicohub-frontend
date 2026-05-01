import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
import { Subject, ExamType } from '../../src/types';
import { useQuery, useMutation } from '@tanstack/react-query';

const SUBJECTS: Subject[] = [
  'Anatomy', 'Physiology', 'Biochemistry', 'Pathology',
  'Pharmacology', 'Microbiology', 'Surgery', 'Medicine',
];

const EXAM_TYPES: { label: string; value: ExamType }[] = [
  { label: 'Full Pack', value: 'full-pack' },
  { label: 'Quick Review', value: 'quick-review' },
  { label: 'Viva Only', value: 'viva-only' },
];

export default function ExamScreen() {
  const [selectedExamType, setSelectedExamType] = useState<ExamType>('full-pack');

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
    addTopic,
    editTopic,
    deleteTopic,
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
    mutationFn: () => examApi.generate(selectedSubject!, selectedExamType),
    onMutate: () => setIsGenerating(true),
    onSuccess: (data) => {
      setPack(data);
      Toast.show({ type: 'success', text1: 'Survival pack ready! 💪' });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Generation failed. Please try again.' }),
    onSettled: () => setIsGenerating(false),
  });

  const vivaMutation = useMutation({
    mutationFn: () => examApi.getViva(selectedSubject!),
    onMutate: () => setIsAskingViva(true),
    onSuccess: (data) => setVivaQuestion(data),
    onError: () => Toast.show({ type: 'error', text1: 'Failed to get viva question.' }),
    onSettled: () => setIsAskingViva(false),
  });

  const handleTopicToggle = (id: string) => {
    // Optimistically toggle in local store — no revert
    toggleTopic(id);
    // Best-effort sync to backend (only for non-local topics)
    if (!id.startsWith('local-')) {
      examApi.completeTopic(id).catch(() => {/* silent — local state already updated */});
    }
  };

  const completedCount = topics.filter((t) => t.completed).length;

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
            {/* Exam Type Selector */}
            <View className="px-5 mb-3">
              <Text className="text-on-surface-variant font-inter text-xs mb-2">Exam Type</Text>
              <View className="flex-row gap-2">
                {EXAM_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => setSelectedExamType(t.value)}
                    className="flex-1 py-2 rounded-xl items-center"
                    style={{
                      backgroundColor: selectedExamType === t.value ? '#7c3aed' : 'rgba(255,255,255,0.06)',
                      borderWidth: 1,
                      borderColor: selectedExamType === t.value ? '#b599ff' : 'rgba(255,255,255,0.1)',
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      className="font-inter-medium text-xs"
                      style={{ color: selectedExamType === t.value ? '#fff' : '#948e9d' }}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

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
                <Text className="text-primary font-inter-semibold text-base mb-4">
                  ✨ {generatedPack.subject} Survival Pack
                </Text>

                {/* Topics by yield */}
                {(generatedPack.topics ?? []).length > 0 && (
                  <>
                    <Text className="text-on-surface font-inter-semibold text-sm mb-2">High-Yield Topics</Text>
                    {(generatedPack.topics ?? []).map((t) => (
                      <View key={t.id} className="flex-row items-center mb-1.5">
                        <View
                          style={{
                            width: 8, height: 8, borderRadius: 4, marginRight: 8,
                            backgroundColor: t.yield === 'high' ? '#cfbcff' : t.yield === 'medium' ? '#948e9d' : '#494551',
                          }}
                        />
                        <Text className="text-on-surface-variant font-inter text-sm flex-1">{t.title}</Text>
                        <Text style={{ fontSize: 10, color: t.yield === 'high' ? '#cfbcff' : '#948e9d' }}>
                          {t.yield}
                        </Text>
                      </View>
                    ))}
                  </>
                )}

                {/* Mnemonics */}
                {(generatedPack.mnemonics ?? []).length > 0 && (
                  <>
                    <Text className="text-on-surface font-inter-semibold text-sm mt-4 mb-2">Mnemonics 🧠</Text>
                    {(generatedPack.mnemonics ?? []).map((m, i) => (
                      <View key={i} className="flex-row items-start mb-2 bg-surface-container-high rounded-xl p-3">
                        <Text className="text-primary mr-2 font-inter-bold">{i + 1}.</Text>
                        <Text className="text-on-surface-variant font-inter text-sm flex-1">{m}</Text>
                      </View>
                    ))}
                  </>
                )}

                {/* PYQs */}
                {(generatedPack.pyqs ?? []).length > 0 && (
                  <>
                    <Text className="text-on-surface font-inter-semibold text-sm mt-4 mb-2">Previous Year Questions 📝</Text>
                    {(generatedPack.pyqs ?? []).map((q, i) => (
                      <View key={i} className="flex-row items-center justify-between mb-1.5 bg-surface-container rounded-xl px-3 py-2">
                        <Text className="text-on-surface-variant font-inter text-sm">{q.year} — {q.type}</Text>
                        <Text className="text-primary font-inter-medium text-xs">{q.marks}M</Text>
                      </View>
                    ))}
                  </>
                )}

                {/* Tips */}
                {generatedPack.tips && (
                  <>
                    <Text className="text-on-surface font-inter-semibold text-sm mt-4 mb-2">Study Tip 💡</Text>
                    <View className="bg-surface-container-high rounded-xl p-3">
                      <Text className="text-on-surface-variant font-inter text-sm leading-5">{generatedPack.tips}</Text>
                    </View>
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
              <TopicChecklist
                topics={topics}
                onToggle={handleTopicToggle}
                onAdd={addTopic}
                onEdit={editTopic}
                onDelete={deleteTopic}
              />
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
