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
import { useExamStore, StoredPack } from '../../src/store/examStore';
import { examApi } from '../../src/api/exam';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { Chip } from '../../src/components/ui/Chip';
import { TopicChecklist } from '../../src/components/exam/TopicChecklist';
import { Subject, ExamType, ExamPack } from '../../src/types';
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

const MAX_PACKS = 3;

function timeLeft(ts: number): string {
  const ms = 24 * 60 * 60 * 1000 - (Date.now() - ts);
  if (ms <= 0) return 'expired';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m left`;
}

function PackCard({ stored, onSelect, active }: { stored: StoredPack; onSelect: () => void; active: boolean }) {
  const p = stored.pack;
  return (
    <TouchableOpacity onPress={onSelect} activeOpacity={0.85}>
      <GlassCard className={`p-3 mb-2 ${active ? 'border border-primary' : ''}`}>
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-on-surface font-inter-semibold text-sm">{stored.examType}</Text>
            <Text className="text-outline font-inter text-xs mt-0.5">{timeLeft(stored.generatedAt)}</Text>
          </View>
          <Text className="text-primary font-inter-medium text-xs">{active ? '▶ Viewing' : 'Tap to view'}</Text>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

function PackContent({ pack }: { pack: ExamPack }) {
  return (
    <>
      {(pack.topics ?? []).length > 0 && (
        <>
          <Text className="text-on-surface font-inter-semibold text-sm mb-2">High-Yield Topics</Text>
          {(pack.topics ?? []).map((t) => (
            <View key={t.id} className="flex-row items-center mb-1.5">
              <View style={{
                width: 8, height: 8, borderRadius: 4, marginRight: 8,
                backgroundColor: t.yield === 'high' ? '#cfbcff' : t.yield === 'medium' ? '#948e9d' : '#494551',
              }} />
              <Text className="text-on-surface-variant font-inter text-sm flex-1">{t.title}</Text>
              <Text style={{ fontSize: 10, color: t.yield === 'high' ? '#cfbcff' : '#948e9d' }}>{t.yield}</Text>
            </View>
          ))}
        </>
      )}

      {(pack.mnemonics ?? []).length > 0 && (
        <>
          <Text className="text-on-surface font-inter-semibold text-sm mt-4 mb-2">Mnemonics 🧠</Text>
          {(pack.mnemonics ?? []).map((m, i) => (
            <View key={i} className="flex-row items-start mb-2 bg-surface-container-high rounded-xl p-3">
              <Text className="text-primary mr-2 font-inter-bold">{i + 1}.</Text>
              <Text className="text-on-surface-variant font-inter text-sm flex-1">{m}</Text>
            </View>
          ))}
        </>
      )}

      {(pack.pyqs ?? []).length > 0 && (
        <>
          <Text className="text-on-surface font-inter-semibold text-sm mt-4 mb-2">Previous Year Questions 📝</Text>
          {(pack.pyqs ?? []).map((q, i) => (
            <View key={i} className="flex-row items-center justify-between mb-1.5 bg-surface-container rounded-xl px-3 py-2">
              <Text className="text-on-surface-variant font-inter text-sm">{q.year} — {q.type}</Text>
              <Text className="text-primary font-inter-medium text-xs">{q.marks}M</Text>
            </View>
          ))}
        </>
      )}

      {pack.tips && (
        <>
          <Text className="text-on-surface font-inter-semibold text-sm mt-4 mb-2">Study Tip 💡</Text>
          <View className="bg-surface-container-high rounded-xl p-3">
            <Text className="text-on-surface-variant font-inter text-sm leading-5">{pack.tips}</Text>
          </View>
        </>
      )}
    </>
  );
}

export default function ExamScreen() {
  const [selectedExamType, setSelectedExamType] = useState<ExamType>('full-pack');
  const [viewingPackIndex, setViewingPackIndex] = useState<number | null>(null);

  const {
    selectedSubject,
    vivaQuestion,
    topics,
    isGenerating,
    isAskingViva,
    setSubject,
    addPack,
    getActivePacks,
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

  const activePacks = selectedSubject ? getActivePacks(selectedSubject) : [];
  const viewingPack = viewingPackIndex !== null ? activePacks[viewingPackIndex]?.pack ?? null : null;
  const packsLeft = MAX_PACKS - activePacks.length;

  // When subject changes, show the latest pack if any
  useEffect(() => {
    if (activePacks.length > 0) {
      setViewingPackIndex(activePacks.length - 1);
    } else {
      setViewingPackIndex(null);
    }
  }, [selectedSubject]);

  const { data: fetchedTopics } = useQuery({
    queryKey: ['topics', selectedSubject],
    queryFn: () => examApi.getTopics(selectedSubject!),
    enabled: !!selectedSubject,
  });

  useEffect(() => {
    if (fetchedTopics) setTopics(fetchedTopics);
  }, [fetchedTopics]);

  const generateMutation = useMutation({
    mutationFn: () => examApi.generate(selectedSubject!, selectedExamType),
    onMutate: () => setIsGenerating(true),
    onSuccess: (data) => {
      addPack(data, selectedExamType);
      // Show the new pack
      const newPacks = selectedSubject ? getActivePacks(selectedSubject) : [];
      setViewingPackIndex(newPacks.length - 1);
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
    toggleTopic(id);
    if (!id.startsWith('local-')) {
      examApi.completeTopic(id).catch(() => {});
    }
  };

  const completedCount = topics.filter((t) => t.completed).length;
  const limitReached = packsLeft <= 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
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
                if (selectedSubject !== s) {
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
                    <Text className="font-inter-medium text-xs" style={{ color: selectedExamType === t.value ? '#fff' : '#948e9d' }}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Pack usage indicator */}
            <View className="px-5 mb-2 flex-row items-center justify-between">
              <Text className="text-outline font-inter text-xs">
                {activePacks.length}/{MAX_PACKS} packs used · resets after 24h
              </Text>
              {limitReached && (
                <Text className="text-error font-inter-medium text-xs">Limit reached</Text>
              )}
            </View>

            {/* Generate Button */}
            <TouchableOpacity
              onPress={() => generateMutation.mutate()}
              disabled={isGenerating || limitReached}
              className="mx-5 my-2 rounded-3xl overflow-hidden"
              activeOpacity={0.85}
              style={{ opacity: limitReached ? 0.5 : 1 }}
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
                      {limitReached ? 'Limit Reached (3/3)' : `Generate ${selectedSubject} Pack`}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Saved packs list */}
            {activePacks.length > 0 && (
              <View className="px-5 mb-2">
                <Text className="text-on-surface-variant font-inter text-xs mb-2">Your packs (valid 24h)</Text>
                {activePacks.map((sp, i) => (
                  <PackCard
                    key={sp.generatedAt}
                    stored={sp}
                    active={viewingPackIndex === i}
                    onSelect={() => setViewingPackIndex(i)}
                  />
                ))}
              </View>
            )}

            {/* Pack Content */}
            {viewingPack && (
              <GlassCard className="mx-5 mb-4 p-4" purpleGlow>
                <Text className="text-primary font-inter-semibold text-base mb-4">
                  ✨ {viewingPack.subject} Survival Pack
                </Text>
                <PackContent pack={viewingPack} />
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
                  <Text className="text-primary font-inter-medium text-sm">{completedCount}/{topics.length}</Text>
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
