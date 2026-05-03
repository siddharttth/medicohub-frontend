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
import { Ionicons } from '@expo/vector-icons';
import { useExamStore, StoredPack } from '../../src/store/examStore';
import { examApi } from '../../src/api/exam';
import { TopicChecklist } from '../../src/components/exam/TopicChecklist';
import { Subject, ExamType, ExamPack } from '../../src/types';
import { useQuery, useMutation } from '@tanstack/react-query';

const SUBJECTS: Subject[] = [
  'Anatomy', 'Physiology', 'Biochemistry', 'Pathology',
  'Pharmacology', 'Microbiology', 'Surgery', 'Medicine',
];

const SUBJECT_COLORS: Record<string, string> = {
  Anatomy: '#cfbcff', Physiology: '#4ade80', Biochemistry: '#60a5fa',
  Pathology: '#fb923c', Pharmacology: '#f472b6', Microbiology: '#22d3ee',
  Surgery: '#fbbf24', Medicine: '#a78bfa',
};

const EXAM_TYPES: { label: string; value: ExamType; icon: string }[] = [
  { label: 'Full Pack', value: 'full-pack', icon: '📦' },
  { label: 'Quick Review', value: 'quick-review', icon: '⚡' },
  { label: 'Viva Only', value: 'viva-only', icon: '🎙️' },
];

const MAX_PACKS = 3;

function timeLeft(ts: number): string {
  const ms = 24 * 60 * 60 * 1000 - (Date.now() - ts);
  if (ms <= 0) return 'expired';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m left`;
}

function PackCard({ stored, onSelect, active, subjectColor }: { stored: StoredPack; onSelect: () => void; active: boolean; subjectColor: string }) {
  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.8}
      style={{
        backgroundColor: active ? `${subjectColor}12` : '#10121e',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: active ? `${subjectColor}30` : 'rgba(255,255,255,0.06)',
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: active ? subjectColor : '#e1e3e4', marginBottom: 3 }}>
          {stored.examType.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#948e9d' }}>
          {timeLeft(stored.generatedAt)}
        </Text>
      </View>
      <View style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: active ? `${subjectColor}20` : 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: active ? `${subjectColor}30` : 'rgba(255,255,255,0.07)',
      }}>
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: active ? subjectColor : '#494551', letterSpacing: 0.5 }}>
          {active ? 'VIEWING' : 'TAP'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#948e9d', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
      {children}
    </Text>
  );
}

function PackContent({ pack, subjectColor }: { pack: ExamPack; subjectColor: string }) {
  const yieldColor = (y: string) => {
    if (y === 'high') return subjectColor;
    if (y === 'medium') return '#948e9d';
    return '#494551';
  };

  return (
    <>
      {(pack.topics ?? []).length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <SectionTitle>High-Yield Topics</SectionTitle>
          {(pack.topics ?? []).map((t) => (
            <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View style={{
                width: 7, height: 7, borderRadius: 4, marginRight: 10,
                backgroundColor: yieldColor(t.yield),
              }} />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#c8cdd0', flex: 1, lineHeight: 20 }}>
                {t.title}
              </Text>
              <View style={{
                paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
                backgroundColor: `${yieldColor(t.yield)}18`,
              }}>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 9, color: yieldColor(t.yield), letterSpacing: 0.8 }}>
                  {t.yield?.toUpperCase()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {(pack.mnemonics ?? []).length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <SectionTitle>Mnemonics</SectionTitle>
          {(pack.mnemonics ?? []).map((m, i) => (
            <View key={i} style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
              borderRadius: 16,
              padding: 14,
              marginBottom: 8,
              flexDirection: 'row',
              alignItems: 'flex-start',
            }}>
              <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 14, color: subjectColor, marginRight: 10, lineHeight: 21 }}>
                {i + 1}.
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#c8cdd0', flex: 1, lineHeight: 21 }}>
                {m}
              </Text>
            </View>
          ))}
        </View>
      )}

      {(pack.pyqs ?? []).length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <SectionTitle>Previous Year Questions</SectionTitle>
          {(pack.pyqs ?? []).map((q, i) => (
            <View key={i} style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 11,
              marginBottom: 7,
            }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#948e9d' }}>
                {q.year} · {q.type}
              </Text>
              <View style={{
                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
                backgroundColor: `${subjectColor}18`, borderWidth: 1, borderColor: `${subjectColor}28`,
              }}>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: subjectColor }}>
                  {q.marks}M
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {pack.tips && (
        <View>
          <SectionTitle>Study Tip</SectionTitle>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: 16,
          }}>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#c8cdd0', lineHeight: 22 }}>
              {pack.tips}
            </Text>
          </View>
        </View>
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
  const limitReached = packsLeft <= 0;
  const subjectColor = selectedSubject ? (SUBJECT_COLORS[selectedSubject] ?? '#cfbcff') : '#cfbcff';
  const completedCount = topics.filter((t) => t.completed).length;

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#070810' }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Header ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 }}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#948e9d', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
            AI-Powered
          </Text>
          <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 36, color: '#e1e3e4', letterSpacing: -0.5, lineHeight: 40 }}>
            Exam Mode
          </Text>
        </View>

        {/* ── Subject pills ── */}
        <View style={{ marginBottom: 24 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}
          >
            {SUBJECTS.map((s) => {
              const isActive = selectedSubject === s;
              const color = SUBJECT_COLORS[s];
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => { if (selectedSubject !== s) { reset(); setSubject(s); } }}
                  activeOpacity={0.75}
                  style={{
                    paddingHorizontal: 18,
                    paddingVertical: 9,
                    borderRadius: 999,
                    marginRight: 8,
                    backgroundColor: isActive ? color : '#10121e',
                    borderWidth: 1,
                    borderColor: isActive ? color : 'rgba(255,255,255,0.07)',
                  }}
                >
                  <Text style={{
                    fontFamily: 'Inter_700Bold',
                    fontSize: 10,
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                    color: isActive ? '#1a0a3a' : '#948e9d',
                  }}>
                    {s}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Active subject accent line */}
          {selectedSubject && (
            <View style={{ height: 1.5, marginTop: 12, marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 1, overflow: 'hidden' }}>
              <View style={{ width: 48, height: '100%', backgroundColor: subjectColor, borderRadius: 1, opacity: 0.6 }} />
            </View>
          )}
        </View>

        {selectedSubject ? (
          <>
            {/* ── Exam type selector ── */}
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#948e9d', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
                Pack Type
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {EXAM_TYPES.map((t) => {
                  const isActive = selectedExamType === t.value;
                  return (
                    <TouchableOpacity
                      key={t.value}
                      onPress={() => setSelectedExamType(t.value)}
                      activeOpacity={0.8}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 16,
                        alignItems: 'center',
                        backgroundColor: isActive ? `${subjectColor}18` : '#10121e',
                        borderWidth: 1,
                        borderColor: isActive ? `${subjectColor}40` : 'rgba(255,255,255,0.07)',
                      }}
                    >
                      <Text style={{ fontSize: 16, marginBottom: 4 }}>{t.icon}</Text>
                      <Text style={{
                        fontFamily: 'Inter_600SemiBold',
                        fontSize: 10,
                        letterSpacing: 0.8,
                        color: isActive ? subjectColor : '#948e9d',
                      }}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Generate button ── */}
            <TouchableOpacity
              onPress={() => generateMutation.mutate()}
              disabled={isGenerating || limitReached}
              activeOpacity={0.85}
              style={{
                marginHorizontal: 20,
                marginBottom: 20,
                borderRadius: 28,
                overflow: 'hidden',
                opacity: limitReached ? 0.45 : 1,
                shadowColor: subjectColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 6,
              }}
            >
              <LinearGradient
                colors={[`${subjectColor}38`, `${subjectColor}18`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  padding: 22,
                  borderRadius: 28,
                  borderWidth: 1,
                  borderColor: `${subjectColor}30`,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                }}
              >
                {isGenerating ? (
                  <ActivityIndicator color={subjectColor} />
                ) : (
                  <>
                    <Text style={{ fontSize: 20 }}>🧠</Text>
                    <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 18, color: '#ffffff', letterSpacing: -0.2 }}>
                      {limitReached ? 'Limit Reached (3/3)' : `Generate ${selectedSubject} Pack`}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* ── Pack usage ── */}
            <View style={{ paddingHorizontal: 20, marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#494551' }}>
                {activePacks.length}/{MAX_PACKS} packs used · resets in 24h
              </Text>
              {limitReached && (
                <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(255,180,171,0.1)', borderWidth: 1, borderColor: 'rgba(255,180,171,0.2)' }}>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: '#ffb4ab', letterSpacing: 0.8 }}>LIMIT REACHED</Text>
                </View>
              )}
            </View>

            {/* ── Saved packs ── */}
            {activePacks.length > 0 && (
              <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#948e9d', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
                  Your Packs
                </Text>
                {activePacks.map((sp, i) => (
                  <PackCard
                    key={sp.generatedAt}
                    stored={sp}
                    active={viewingPackIndex === i}
                    onSelect={() => setViewingPackIndex(i)}
                    subjectColor={subjectColor}
                  />
                ))}
              </View>
            )}

            {/* ── Pack content ── */}
            {viewingPack && (
              <View style={{
                marginHorizontal: 20,
                marginBottom: 20,
                backgroundColor: '#10121e',
                borderRadius: 28,
                borderWidth: 1,
                borderColor: `${subjectColor}20`,
                padding: 22,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 22 }}>
                  <View style={{
                    width: 36, height: 36, borderRadius: 12,
                    backgroundColor: `${subjectColor}18`,
                    borderWidth: 1, borderColor: `${subjectColor}28`,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 18 }}>✨</Text>
                  </View>
                  <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 18, color: subjectColor, letterSpacing: -0.2 }}>
                    {viewingPack.subject} Survival Pack
                  </Text>
                </View>
                <PackContent pack={viewingPack} subjectColor={subjectColor} />
              </View>
            )}

            {/* ── Viva Practice ── */}
            <View style={{
              marginHorizontal: 20,
              marginBottom: 20,
              backgroundColor: '#10121e',
              borderRadius: 28,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
              padding: 22,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 18, color: '#e1e3e4', letterSpacing: -0.2 }}>
                  Viva Practice
                </Text>
                <Text style={{ fontSize: 18 }}>🎙️</Text>
              </View>

              <TouchableOpacity
                onPress={() => vivaMutation.mutate()}
                disabled={isAskingViva}
                activeOpacity={0.8}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.07)',
                  borderRadius: 18,
                  paddingVertical: 14,
                  alignItems: 'center',
                  marginBottom: vivaQuestion ? 16 : 0,
                }}
              >
                {isAskingViva ? (
                  <ActivityIndicator color={subjectColor} />
                ) : (
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: subjectColor }}>
                    Ask Me a Viva Question
                  </Text>
                )}
              </TouchableOpacity>

              {vivaQuestion && (
                <View style={{ gap: 10 }}>
                  <View style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderWidth: 1,
                    borderColor: `${subjectColor}20`,
                    borderRadius: 18,
                    padding: 16,
                  }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: subjectColor, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                      Question
                    </Text>
                    <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 15, color: '#e1e3e4', lineHeight: 22 }}>
                      {vivaQuestion.question}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.06)',
                    borderRadius: 18,
                    padding: 16,
                  }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#948e9d', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                      Answer
                    </Text>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#c8cdd0', lineHeight: 22 }}>
                      {vivaQuestion.answer}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* ── Topics Checklist ── */}
            <View style={{
              marginHorizontal: 20,
              marginBottom: 20,
              backgroundColor: '#10121e',
              borderRadius: 28,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
              padding: 22,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 18, color: '#e1e3e4', letterSpacing: -0.2 }}>
                  High-Yield Topics
                </Text>
                {topics.length > 0 && (
                  <View style={{
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
                    backgroundColor: `${subjectColor}18`, borderWidth: 1, borderColor: `${subjectColor}28`,
                  }}>
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: subjectColor, letterSpacing: 1 }}>
                      {completedCount}/{topics.length}
                    </Text>
                  </View>
                )}
              </View>
              <TopicChecklist
                topics={topics}
                onToggle={handleTopicToggle}
                onAdd={addTopic}
                onEdit={editTopic}
                onDelete={deleteTopic}
              />
            </View>
          </>
        ) : (
          /* ── Empty state ── */
          <View style={{ marginHorizontal: 20, marginTop: 40, alignItems: 'center' }}>
            <View style={{
              width: 80, height: 80, borderRadius: 28,
              backgroundColor: 'rgba(181,153,255,0.1)',
              borderWidth: 1, borderColor: 'rgba(181,153,255,0.18)',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
            }}>
              <Text style={{ fontSize: 36 }}>⚡</Text>
            </View>
            <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 20, color: '#e1e3e4', letterSpacing: -0.2, marginBottom: 8, textAlign: 'center' }}>
              Select a Subject
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#948e9d', textAlign: 'center', lineHeight: 21, maxWidth: 260 }}>
              Pick a subject above to generate your personalized AI survival pack
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
