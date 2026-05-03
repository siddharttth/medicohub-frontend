import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, Modal, KeyboardAvoidingView, Platform, Dimensions,
  FlatList, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useExamStore, StoredPack } from '../../src/store/examStore';
import { examApi } from '../../src/api/exam';
import { TopicChecklist } from '../../src/components/exam/TopicChecklist';
import { Subject, ExamType, ExamPack, VivaQ } from '../../src/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';

const { width: SCREEN_W } = Dimensions.get('window');

const SUBJECTS: Subject[] = [
  'Anatomy', 'Physiology', 'Biochemistry', 'Pathology',
  'Pharmacology', 'Microbiology', 'Surgery', 'Medicine',
];

const SUBJECT_COLORS: Record<string, string> = {
  Anatomy: '#cfbcff', Physiology: '#4ade80', Biochemistry: '#60a5fa',
  Pathology: '#fb923c', Pharmacology: '#f472b6', Microbiology: '#22d3ee',
  Surgery: '#fbbf24', Medicine: '#a78bfa',
};

const EXAM_TYPES: { label: string; value: ExamType; icon: string; desc: string }[] = [
  { label: 'Full Pack', value: 'full-pack', icon: '📦', desc: '10 MCQs + Short + Long Qs' },
  { label: 'Quick Review', value: 'quick-review', icon: '⚡', desc: '15 high-yield short Qs' },
  { label: 'Viva Only', value: 'viva-only', icon: '🎙️', desc: '15 examiner-style viva Qs' },
];

const MAX_PACKS = 3;
const MAX_VIVA = 5;
const POLL_INTERVAL = 2500;

function timeLeft(ts: number): string {
  const ms = 24 * 60 * 60 * 1000 - (Date.now() - ts);
  if (ms <= 0) return 'expired';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m left`;
}

// ── Topics input modal ───────────────────────────────────────────────────────
function TopicsModal({
  visible, onClose, onConfirm, title, subtitle, loading,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (topics: string[]) => void;
  title: string;
  subtitle: string;
  loading: boolean;
}) {
  const [text, setText] = useState('');

  const handleConfirm = () => {
    const topics = text.split(',').map((t) => t.trim()).filter(Boolean);
    if (topics.length === 0) {
      Toast.show({ type: 'info', text1: 'Enter at least one topic' });
      return;
    }
    onConfirm(topics);
    setText('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 20 }}>
          <View style={{ backgroundColor: '#10121e', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 26 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 20, color: '#e1e3e4', letterSpacing: -0.3 }}>
                {title}
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color="#494551" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#948e9d', marginBottom: 20, lineHeight: 19 }}>
              {subtitle}
            </Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="e.g. Metabolism, Vitamins, DNA Replication"
              placeholderTextColor="rgba(148,142,157,0.4)"
              multiline
              style={{
                backgroundColor: '#070810',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: '#e1e3e4',
                minHeight: 80,
                textAlignVertical: 'top',
                marginBottom: 10,
              }}
            />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#494551', marginBottom: 20 }}>
              Separate topics with commas
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={onClose}
                style={{ flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingVertical: 13, alignItems: 'center' }}
              >
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#948e9d' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={loading}
                style={{ flex: 2, backgroundColor: '#cfbcff', borderRadius: 14, paddingVertical: 13, alignItems: 'center', opacity: loading ? 0.7 : 1 }}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#39197c" />
                  : <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: '#39197c' }}>Generate</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Pack card ────────────────────────────────────────────────────────────────
function PackCard({ stored, onSelect, active, subjectColor }: {
  stored: StoredPack; onSelect: () => void; active: boolean; subjectColor: string;
}) {
  const isPending = stored.pack.status === 'pending';
  const isFailed = stored.pack.status === 'failed';
  return (
    <TouchableOpacity
      onPress={onSelect}
      disabled={isPending}
      activeOpacity={0.8}
      style={{
        backgroundColor: active ? `${subjectColor}12` : '#10121e',
        borderRadius: 18, borderWidth: 1,
        borderColor: active ? `${subjectColor}30` : isFailed ? '#ffb4ab30' : 'rgba(255,255,255,0.06)',
        paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        opacity: isPending ? 0.7 : 1,
      }}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: active ? subjectColor : '#e1e3e4' }}>
            {stored.examType.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </Text>
          {isPending && <ActivityIndicator size="small" color={subjectColor} style={{ marginLeft: 2 }} />}
        </View>
        {(stored.topics ?? []).length > 0 && (
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#948e9d', marginBottom: 2 }} numberOfLines={1}>
            {(stored.topics ?? []).join(', ')}
          </Text>
        )}
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: isFailed ? '#ffb4ab' : '#494551' }}>
          {isFailed ? 'Generation failed — tap to retry' : isPending ? 'Generating in background…' : timeLeft(stored.generatedAt)}
        </Text>
      </View>
      {!isPending && !isFailed && (
        <View style={{
          paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
          backgroundColor: active ? `${subjectColor}20` : 'rgba(255,255,255,0.05)',
          borderWidth: 1, borderColor: active ? `${subjectColor}30` : 'rgba(255,255,255,0.07)',
        }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: active ? subjectColor : '#494551', letterSpacing: 0.5 }}>
            {active ? 'VIEWING' : 'TAP'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#948e9d', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
      {children}
    </Text>
  );
}

// ── Pack content renderer ────────────────────────────────────────────────────
function PackContent({ pack, subjectColor }: { pack: ExamPack; subjectColor: string }) {
  const [expandedMCQ, setExpandedMCQ] = useState<number | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  const rowStyle = {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 14, marginBottom: 8,
  };

  return (
    <>
      {(pack.mcqs ?? []).length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <SectionLabel>MCQs (10 × 1 mark)</SectionLabel>
          {(pack.mcqs ?? []).map((q, i) => (
            <View key={i} style={rowStyle}>
              <TouchableOpacity onPress={() => setExpandedMCQ(expandedMCQ === i ? null : i)} activeOpacity={0.8}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#e1e3e4', lineHeight: 20, marginBottom: 6 }}>
                  {i + 1}. {q.question}
                </Text>
              </TouchableOpacity>
              {expandedMCQ === i && (
                <>
                  {q.options.map((opt, j) => {
                    const letter = ['A', 'B', 'C', 'D'][j];
                    const isAnswer = q.answer === letter || q.answer === opt || opt.startsWith(`${q.answer}.`);
                    return (
                      <View key={j} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, paddingLeft: 4 }}>
                        <View style={{
                          width: 22, height: 22, borderRadius: 6, marginRight: 8, alignItems: 'center', justifyContent: 'center',
                          backgroundColor: isAnswer ? `${subjectColor}25` : 'rgba(255,255,255,0.04)',
                          borderWidth: 1, borderColor: isAnswer ? `${subjectColor}40` : 'rgba(255,255,255,0.07)',
                        }}>
                          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: isAnswer ? subjectColor : '#494551' }}>{letter}</Text>
                        </View>
                        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: isAnswer ? subjectColor : '#948e9d', flex: 1, lineHeight: 18 }}>
                          {opt.replace(/^[A-D]\.\s*/, '')}
                        </Text>
                      </View>
                    );
                  })}
                </>
              )}
              {expandedMCQ !== i && (
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#494551' }}>Tap to see options & answer</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {(pack.shortQuestions ?? []).length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <SectionLabel>Short Questions (10 × 5 marks)</SectionLabel>
          {(pack.shortQuestions ?? []).map((q, i) => (
            <View key={i} style={rowStyle}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#e1e3e4', lineHeight: 20, marginBottom: 8 }}>
                {i + 1}. {q.question}
              </Text>
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 8 }} />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#c8cdd0', lineHeight: 20 }}>
                {q.answer}
              </Text>
            </View>
          ))}
        </View>
      )}

      {(pack.longQuestions ?? []).length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <SectionLabel>Long Questions — Self Practice (10 × 10 marks)</SectionLabel>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 4 }}>
            {(pack.longQuestions ?? []).map((q, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderBottomWidth: i < (pack.longQuestions?.length ?? 0) - 1 ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 14, color: subjectColor, marginRight: 10, lineHeight: 21 }}>{i + 1}.</Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#c8cdd0', flex: 1, lineHeight: 21 }}>{q}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {(pack.reviewQuestions ?? []).length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <SectionLabel>Quick Review Questions</SectionLabel>
          {(pack.reviewQuestions ?? []).map((q, i) => (
            <View key={i} style={rowStyle}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#e1e3e4', lineHeight: 20, marginBottom: 8 }}>
                {i + 1}. {q.question}
              </Text>
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 8 }} />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#c8cdd0', lineHeight: 20 }}>
                {q.answer}
              </Text>
            </View>
          ))}
        </View>
      )}

      {(pack.vivaQuestions ?? []).length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <SectionLabel>Viva Questions</SectionLabel>
          {(pack.vivaQuestions ?? []).map((q, i) => (
            <View key={i} style={rowStyle}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#e1e3e4', lineHeight: 20, marginBottom: 6 }}>
                {i + 1}. {q.question}
              </Text>
              <TouchableOpacity
                onPress={() => setRevealedAnswers((p) => ({ ...p, [i]: !p[i] }))}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Ionicons name={revealedAnswers[i] ? 'eye-off-outline' : 'eye-outline'} size={14} color={subjectColor} />
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: subjectColor }}>
                  {revealedAnswers[i] ? 'Hide answer' : 'Reveal answer'}
                </Text>
              </TouchableOpacity>
              {revealedAnswers[i] && (
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#c8cdd0', lineHeight: 20, marginTop: 8 }}>
                  {q.answer}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </>
  );
}

// ── Swipeable viva cards ─────────────────────────────────────────────────────
function VivaCards({ questions, subjectColor }: { questions: VivaQ[]; subjectColor: string }) {
  const [index, setIndex] = useState(questions.length > 0 ? questions.length - 1 : 0);
  const [revealedMap, setRevealedMap] = useState<Record<number, boolean>>({});
  const flatRef = useRef<FlatList>(null);

  // Auto-scroll to latest when a new question is added
  useEffect(() => {
    if (questions.length > 0) {
      const next = questions.length - 1;
      setIndex(next);
      flatRef.current?.scrollToIndex({ index: next, animated: true });
    }
  }, [questions.length]);

  if (questions.length === 0) return null;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const CARD_W = SCREEN_W - 40;
    const newIdx = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
    if (newIdx !== index) setIndex(newIdx);
  };

  // Card width = screen - 40px (parent has marginHorizontal:20 on each side)
  // FlatList breaks out of the inner 22px padding via negative margin
  const CARD_W = SCREEN_W - 40;
  const INNER_PAD = 22;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <SectionLabel>Viva Practice Cards</SectionLabel>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#494551' }}>
          {index + 1} / {questions.length}
        </Text>
      </View>
      <FlatList
        ref={flatRef}
        data={questions}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={{ marginHorizontal: -INNER_PAD }}
        snapToInterval={CARD_W}
        decelerationRate="fast"
        getItemLayout={(_, i) => ({ length: CARD_W, offset: CARD_W * i, index: i })}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index: itemIdx }) => {
          const isRevealed = !!revealedMap[itemIdx];
          return (
            <View style={{ width: CARD_W, paddingHorizontal: INNER_PAD }}>
              <View style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderWidth: 1, borderColor: `${subjectColor}20`,
                borderRadius: 18, padding: 18,
              }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: subjectColor, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
                  Question {itemIdx + 1}
                </Text>
                <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 15, color: '#e1e3e4', lineHeight: 22, marginBottom: 14 }}>
                  {item.question}
                </Text>
                <TouchableOpacity
                  onPress={() => setRevealedMap((m) => ({ ...m, [itemIdx]: !m[itemIdx] }))}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  <Ionicons name={isRevealed ? 'eye-off-outline' : 'eye-outline'} size={14} color={subjectColor} />
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: subjectColor }}>
                    {isRevealed ? 'Hide answer' : 'Reveal answer'}
                  </Text>
                </TouchableOpacity>
                {isRevealed && (
                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#c8cdd0', lineHeight: 22 }}>
                      {item.answer}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
      />
      {questions.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 12 }}>
          {questions.map((_, i) => (
            <View key={i} style={{ width: i === index ? 16 : 5, height: 5, borderRadius: 3, backgroundColor: i === index ? subjectColor : 'rgba(255,255,255,0.12)' }} />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function ExamScreen() {
  const queryClient = useQueryClient();
  const [selectedExamType, setSelectedExamType] = useState<ExamType>('full-pack');
  const [viewingPackIndex, setViewingPackIndex] = useState<number | null>(null);
  const [showTopicsModal, setShowTopicsModal] = useState(false);
  const [showVivaTopicsModal, setShowVivaTopicsModal] = useState(false);
  // track pending job IDs for polling
  const [pendingPackId, setPendingPackId] = useState<string | null>(null);
  const [pendingVivaId, setPendingVivaId] = useState<string | null>(null);

  const {
    selectedSubject, vivaTopics, topics,
    isGenerating, isAskingViva,
    setSubject, addPack, updatePack, getActivePacks, setPacksForSubject,
    addVivaQuestion, setVivaQuestions, getVivaQuestions,
    setVivaTopics, setTopics,
    setIsGenerating, setIsAskingViva,
    toggleTopic, addTopic, editTopic, deleteTopic,
    setDailyUsage, dailyUsage, reset,
  } = useExamStore();

  const activePacks = selectedSubject ? getActivePacks(selectedSubject) : [];
  const vivaQuestions = selectedSubject ? getVivaQuestions(selectedSubject) : [];
  const viewingPack = viewingPackIndex !== null ? activePacks[viewingPackIndex]?.pack ?? null : null;
  const subjectColor = selectedSubject ? (SUBJECT_COLORS[selectedSubject] ?? '#cfbcff') : '#cfbcff';
  const completedCount = topics.filter((t) => t.completed).length;

  const packsUsed = dailyUsage?.packsUsed ?? 0;
  const packsRemaining = dailyUsage?.packsRemaining ?? MAX_PACKS;
  const vivaRemaining = dailyUsage?.vivaRemaining ?? MAX_VIVA;
  const limitReached = packsRemaining <= 0;
  const vivaLimitReached = vivaRemaining <= 0;

  // ── Fetch daily usage ──
  useQuery({
    queryKey: ['exam-usage'],
    queryFn: async () => {
      const u = await examApi.getDailyUsage();
      setDailyUsage(u);
      return u;
    },
    staleTime: 60_000,
  });

  // ── Fetch topics checklist ──
  useQuery({
    queryKey: ['topics', selectedSubject],
    queryFn: () => examApi.getTopics(selectedSubject!),
    enabled: !!selectedSubject,
    onSuccess: (data) => setTopics(data),
  } as any);

  // ── Load user's packs from DB when subject changes ──
  useEffect(() => {
    if (!selectedSubject) return;
    examApi.getMyPacks(selectedSubject).then((packs) => {
      setPacksForSubject(selectedSubject, packs);
    }).catch(() => {});
    examApi.getMyViva(selectedSubject).then((qs) => {
      setVivaQuestions(selectedSubject, qs);
    }).catch(() => {});
  }, [selectedSubject]);

  // ── Reload packs when screen refocuses ──
  useFocusEffect(
    useCallback(() => {
      if (!selectedSubject) return;
      examApi.getMyPacks(selectedSubject).then((packs) => setPacksForSubject(selectedSubject, packs)).catch(() => {});
      examApi.getMyViva(selectedSubject).then((qs) => setVivaQuestions(selectedSubject, qs)).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['exam-usage'] });
    }, [selectedSubject])
  );

  // ── Poll pending pack ──
  useEffect(() => {
    if (!pendingPackId) return;
    const interval = setInterval(async () => {
      try {
        const updated = await examApi.getPackById(pendingPackId);
        if (updated.status === 'done') {
          updatePack(pendingPackId, updated);
          setPendingPackId(null);
          setIsGenerating(false);
          queryClient.invalidateQueries({ queryKey: ['exam-usage'] });
          Toast.show({ type: 'success', text1: 'Pack ready! 💪' });
          // Reload all packs to get fresh data
          if (selectedSubject) {
            examApi.getMyPacks(selectedSubject).then((packs) => setPacksForSubject(selectedSubject, packs)).catch(() => {});
          }
        } else if (updated.status === 'failed') {
          updatePack(pendingPackId, updated);
          setPendingPackId(null);
          setIsGenerating(false);
          Toast.show({ type: 'error', text1: 'Pack generation failed' });
        }
      } catch {}
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [pendingPackId, selectedSubject]);

  // ── Poll pending viva ──
  useEffect(() => {
    if (!pendingVivaId) return;
    const interval = setInterval(async () => {
      try {
        const result = await examApi.getVivaById(pendingVivaId);
        if (result.status === 'done' && result.viva) {
          setPendingVivaId(null);
          setIsAskingViva(false);
          if (selectedSubject) {
            addVivaQuestion(selectedSubject, result.viva);
          }
          queryClient.invalidateQueries({ queryKey: ['exam-usage'] });
        } else if (result.status === 'failed') {
          setPendingVivaId(null);
          setIsAskingViva(false);
          Toast.show({ type: 'error', text1: 'Viva generation failed' });
        }
      } catch {}
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [pendingVivaId, selectedSubject]);

  // ── Generate pack mutation ──
  const generateMutation = useMutation({
    mutationFn: (topics: string[]) => examApi.generate(selectedSubject!, selectedExamType, topics),
    onMutate: () => { setIsGenerating(true); setShowTopicsModal(false); },
    onSuccess: ({ pack, packsRemainingToday }, topics) => {
      const inputTopics = pack.inputTopics ?? topics ?? [];
      addPack(pack, selectedExamType, inputTopics);
      const newPacks = selectedSubject ? getActivePacks(selectedSubject) : [];
      setViewingPackIndex(newPacks.length - 1);
      if (pack._id) setPendingPackId(pack._id);
      setDailyUsage({
        ...(dailyUsage ?? { packsUsed: 0, packsLimit: MAX_PACKS, packsRemaining: MAX_PACKS, vivaUsed: 0, vivaLimit: MAX_VIVA, vivaRemaining: MAX_VIVA }),
        packsRemaining: packsRemainingToday,
        packsUsed: MAX_PACKS - packsRemainingToday,
      });
      Toast.show({ type: 'info', text1: 'Generating your pack…', text2: 'You can switch tabs — we\'ll notify you when done' });
    },
    onError: (e: any) => {
      Toast.show({ type: 'error', text1: e?.response?.data?.message ?? 'Generation failed' });
      setIsGenerating(false);
    },
  });

  // ── Ask viva mutation ──
  const vivaMutation = useMutation({
    mutationFn: (topics: string[]) => examApi.getViva(selectedSubject!, topics),
    onMutate: () => { setIsAskingViva(true); setShowVivaTopicsModal(false); },
    onSuccess: ({ packId, vivaRemainingToday }) => {
      setPendingVivaId(packId);
      setDailyUsage({
        ...(dailyUsage ?? { packsUsed: 0, packsLimit: MAX_PACKS, packsRemaining: MAX_PACKS, vivaUsed: 0, vivaLimit: MAX_VIVA, vivaRemaining: MAX_VIVA }),
        vivaRemaining: vivaRemainingToday,
        vivaUsed: MAX_VIVA - vivaRemainingToday,
      });
    },
    onError: (e: any) => {
      Toast.show({ type: 'error', text1: e?.response?.data?.message ?? 'Failed to get viva question' });
      setIsAskingViva(false);
    },
  });

  const handleAskViva = () => {
    if (vivaLimitReached) {
      Toast.show({ type: 'info', text1: `Daily viva limit reached (${MAX_VIVA}/day)` });
      return;
    }
    if (isAskingViva) return;
    if (vivaTopics.length > 0) {
      vivaMutation.mutate(vivaTopics);
    } else {
      setShowVivaTopicsModal(true);
    }
  };

  const handleTopicToggle = (id: string) => {
    toggleTopic(id);
    if (!id.startsWith('local-')) examApi.completeTopic(id).catch(() => {});
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}>
            {SUBJECTS.map((s) => {
              const isActive = selectedSubject === s;
              const color = SUBJECT_COLORS[s];
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => { if (selectedSubject !== s) { reset(); setSubject(s); setViewingPackIndex(null); } }}
                  activeOpacity={0.75}
                  style={{
                    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999, marginRight: 8,
                    backgroundColor: isActive ? color : '#10121e',
                    borderWidth: 1, borderColor: isActive ? color : 'rgba(255,255,255,0.07)',
                  }}
                >
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: isActive ? '#1a0a3a' : '#948e9d' }}>
                    {s}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {selectedSubject && (
            <View style={{ height: 1.5, marginTop: 12, marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 1, overflow: 'hidden' }}>
              <View style={{ width: 48, height: '100%', backgroundColor: subjectColor, borderRadius: 1, opacity: 0.6 }} />
            </View>
          )}
        </View>

        {selectedSubject ? (
          <>
            {/* ── Daily usage ── */}
            <View style={{ marginHorizontal: 20, marginBottom: 20, flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, backgroundColor: '#10121e', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 14 }}>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: '#494551', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Packs Today</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 22, color: limitReached ? '#ffb4ab' : '#e1e3e4' }}>{packsUsed}</Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#494551' }}>/ {MAX_PACKS}</Text>
                </View>
                <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.min((packsUsed / MAX_PACKS) * 100, 100)}%`, height: '100%', backgroundColor: limitReached ? '#ffb4ab' : subjectColor, borderRadius: 2 }} />
                </View>
              </View>
              <View style={{ flex: 1, backgroundColor: '#10121e', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 14 }}>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: '#494551', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Viva Today</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 22, color: vivaLimitReached ? '#ffb4ab' : '#e1e3e4' }}>{dailyUsage?.vivaUsed ?? 0}</Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#494551' }}>/ {MAX_VIVA}</Text>
                </View>
                <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.min(((dailyUsage?.vivaUsed ?? 0) / MAX_VIVA) * 100, 100)}%`, height: '100%', backgroundColor: vivaLimitReached ? '#ffb4ab' : '#4ade80', borderRadius: 2 }} />
                </View>
              </View>
            </View>

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
                      key={t.value} onPress={() => setSelectedExamType(t.value)} activeOpacity={0.8}
                      style={{ flex: 1, paddingVertical: 12, borderRadius: 16, alignItems: 'center', backgroundColor: isActive ? `${subjectColor}18` : '#10121e', borderWidth: 1, borderColor: isActive ? `${subjectColor}40` : 'rgba(255,255,255,0.07)' }}
                    >
                      <Text style={{ fontSize: 16, marginBottom: 4 }}>{t.icon}</Text>
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 0.8, color: isActive ? subjectColor : '#948e9d' }}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#494551', marginTop: 8, textAlign: 'center' }}>
                {EXAM_TYPES.find((t) => t.value === selectedExamType)?.desc}
              </Text>
            </View>

            {/* ── Generate button ── */}
            <TouchableOpacity
              onPress={() => { if (!limitReached && !isGenerating) setShowTopicsModal(true); }}
              disabled={limitReached || isGenerating}
              activeOpacity={0.85}
              style={{ marginHorizontal: 20, marginBottom: 20, borderRadius: 28, overflow: 'hidden', opacity: (limitReached || isGenerating) ? 0.55 : 1 }}
            >
              <LinearGradient
                colors={[`${subjectColor}38`, `${subjectColor}18`]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ padding: 22, borderRadius: 28, borderWidth: 1, borderColor: `${subjectColor}30`, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}
              >
                {isGenerating
                  ? <>
                      <ActivityIndicator color={subjectColor} />
                      <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 16, color: '#ffffff', letterSpacing: -0.2 }}>
                        Generating in background…
                      </Text>
                    </>
                  : <>
                      <Text style={{ fontSize: 20 }}>🧠</Text>
                      <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 18, color: '#ffffff', letterSpacing: -0.2 }}>
                        {limitReached ? 'Daily Limit Reached' : `Generate ${selectedSubject} Pack`}
                      </Text>
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* ── Saved packs ── */}
            {activePacks.length > 0 && (
              <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#948e9d', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
                  Your Packs (valid 24h)
                </Text>
                {activePacks.map((sp, i) => (
                  <PackCard
                    key={sp.pack._id ?? sp.generatedAt}
                    stored={sp}
                    active={viewingPackIndex === i && sp.pack.status === 'done'}
                    onSelect={() => {
                      if (sp.pack.status !== 'done') return;
                      setViewingPackIndex(viewingPackIndex === i ? null : i);
                    }}
                    subjectColor={subjectColor}
                  />
                ))}
              </View>
            )}

            {/* ── Pack content ── */}
            {viewingPack && viewingPack.status === 'done' && (
              <View style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: '#10121e', borderRadius: 28, borderWidth: 1, borderColor: `${subjectColor}20`, padding: 22 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: `${subjectColor}18`, borderWidth: 1, borderColor: `${subjectColor}28`, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18 }}>✨</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 17, color: subjectColor, letterSpacing: -0.2 }}>
                      {viewingPack.subject} — {activePacks[viewingPackIndex!]?.examType.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Text>
                    {(activePacks[viewingPackIndex!]?.topics ?? []).length > 0 && (
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#948e9d', marginTop: 2 }} numberOfLines={1}>
                        {(activePacks[viewingPackIndex!]?.topics ?? []).join(', ')}
                      </Text>
                    )}
                  </View>
                </View>
                <PackContent pack={viewingPack} subjectColor={subjectColor} />
              </View>
            )}

            {/* ── Viva Practice ── */}
            <View style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: '#10121e', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 22 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 18, color: '#e1e3e4', letterSpacing: -0.2 }}>Viva Practice</Text>
                <Text style={{ fontSize: 18 }}>🎙️</Text>
              </View>

              {vivaTopics.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#948e9d', flex: 1 }} numberOfLines={1}>
                    Topics: {vivaTopics.join(', ')}
                  </Text>
                  <TouchableOpacity onPress={() => { setVivaTopics([]); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#494551' }}>Change</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!vivaTopics.length && <View style={{ height: 14 }} />}

              <TouchableOpacity
                onPress={handleAskViva}
                disabled={isAskingViva || vivaLimitReached}
                activeOpacity={0.8}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
                  borderRadius: 18, paddingVertical: 14, alignItems: 'center',
                  marginBottom: vivaQuestions.length > 0 ? 20 : 0,
                  opacity: vivaLimitReached ? 0.45 : 1,
                }}
              >
                {isAskingViva
                  ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator size="small" color={subjectColor} />
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: subjectColor }}>Generating…</Text>
                    </View>
                  : <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: vivaLimitReached ? '#ffb4ab' : subjectColor }}>
                      {vivaLimitReached
                        ? `Daily limit reached (${MAX_VIVA}/day)`
                        : vivaTopics.length > 0
                          ? 'Ask Another Viva Question'
                          : 'Set Topics & Start Viva'}
                    </Text>
                }
              </TouchableOpacity>

              <VivaCards questions={vivaQuestions} subjectColor={subjectColor} />
            </View>

            {/* ── Topics Checklist ── */}
            <View style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: '#10121e', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 22 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 18, color: '#e1e3e4', letterSpacing: -0.2 }}>High-Yield Topics</Text>
                {topics.length > 0 && (
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: `${subjectColor}18`, borderWidth: 1, borderColor: `${subjectColor}28` }}>
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: subjectColor, letterSpacing: 1 }}>{completedCount}/{topics.length}</Text>
                  </View>
                )}
              </View>
              <TopicChecklist topics={topics} onToggle={handleTopicToggle} onAdd={addTopic} onEdit={editTopic} onDelete={deleteTopic} />
            </View>
          </>
        ) : (
          <View style={{ marginHorizontal: 20, marginTop: 40, alignItems: 'center' }}>
            <View style={{ width: 80, height: 80, borderRadius: 28, backgroundColor: 'rgba(181,153,255,0.1)', borderWidth: 1, borderColor: 'rgba(181,153,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 36 }}>⚡</Text>
            </View>
            <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 20, color: '#e1e3e4', letterSpacing: -0.2, marginBottom: 8, textAlign: 'center' }}>Select a Subject</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#948e9d', textAlign: 'center', lineHeight: 21, maxWidth: 260 }}>
              Pick a subject above to generate your personalized AI exam pack
            </Text>
          </View>
        )}
      </ScrollView>

      <TopicsModal
        visible={showTopicsModal}
        onClose={() => setShowTopicsModal(false)}
        onConfirm={(topics) => generateMutation.mutate(topics)}
        loading={generateMutation.isPending ?? false}
        title="Enter Exam Topics"
        subtitle={`What topics are coming in your ${selectedSubject} exam? The pack will be strictly based on these.`}
      />

      <TopicsModal
        visible={showVivaTopicsModal}
        onClose={() => setShowVivaTopicsModal(false)}
        onConfirm={(t) => { setVivaTopics(t); vivaMutation.mutate(t); }}
        loading={vivaMutation.isPending ?? false}
        title="Viva Practice Topics"
        subtitle="Enter topics for your viva practice. All questions will come from these topics only."
      />
    </SafeAreaView>
  );
}
