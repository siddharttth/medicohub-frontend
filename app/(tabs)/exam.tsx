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
import { useThemeStore, getTheme } from '../../src/store/themeStore';
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

// Darker shades of subject colors — for text on tinted backgrounds in light mode
const SUBJECT_DARK_COLORS: Record<string, string> = {
  Anatomy: '#5E35B1', Physiology: '#16A34A', Biochemistry: '#1D4ED8',
  Pathology: '#C2410C', Pharmacology: '#BE185D', Microbiology: '#0E7490',
  Surgery: '#92400E', Medicine: '#6D28D9',
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
  visible: boolean; onClose: () => void; onConfirm: (topics: string[]) => void;
  title: string; subtitle: string; loading: boolean;
}) {
  const [text, setText] = useState('');
  const isDark = useThemeStore((s) => s.isDark);
  const t = getTheme(isDark);

  const handleConfirm = () => {
    const topics = text.split(',').map((tp) => tp.trim()).filter(Boolean);
    if (topics.length === 0) { Toast.show({ type: 'info', text1: 'Enter at least one topic' }); return; }
    onConfirm(topics);
    setText('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 20 }}>
          <View style={{ backgroundColor: t.card, borderRadius: 28, borderWidth: 1, borderColor: t.cardBorder, padding: 26 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 20, color: t.onSurface, letterSpacing: -0.3 }}>{title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={t.outlineVariant} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: t.onSurfaceVariant, marginBottom: 20, lineHeight: 19 }}>{subtitle}</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="e.g. Metabolism, Vitamins, DNA Replication"
              placeholderTextColor={isDark ? 'rgba(148,142,157,0.4)' : 'rgba(90,86,112,0.4)'}
              multiline
              style={{ backgroundColor: t.innerSurface, borderWidth: 1, borderColor: t.cardBorder, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontFamily: 'Inter_400Regular', fontSize: 14, color: t.onSurface, minHeight: 80, textAlignVertical: 'top', marginBottom: 10 }}
            />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.outlineVariant, marginBottom: 20 }}>Separate topics with commas</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={onClose} style={{ flex: 1, borderWidth: 1, borderColor: t.cardBorder, borderRadius: 14, paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: t.onSurfaceVariant }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm} disabled={loading} style={{ flex: 2, backgroundColor: t.primaryContainer, borderRadius: 14, paddingVertical: 13, alignItems: 'center', opacity: loading ? 0.7 : 1 }}>
                {loading ? <ActivityIndicator size="small" color="#39197c" /> : <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: '#39197c' }}>Generate</Text>}
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
  const isDark = useThemeStore((s) => s.isDark);
  const t = getTheme(isDark);
  const subjectDarkColor = Object.entries(SUBJECT_COLORS).find(([, v]) => v === subjectColor)?.[0];
  const subjectTextColor = isDark ? subjectColor : (subjectDarkColor ? (SUBJECT_DARK_COLORS[subjectDarkColor] ?? t.primaryText) : t.primaryText);
  const isPending = stored.pack.status === 'pending';
  const isFailed = stored.pack.status === 'failed';
  return (
    <View style={{ marginBottom: 12, borderRadius: 20, borderWidth: 1, borderColor: active ? `${subjectColor}${isDark ? '40' : '60'}` : isFailed ? 'rgba(255,180,171,0.2)' : t.cardBorder, overflow: 'hidden', opacity: isPending ? 0.7 : 1 }}>
      {/* ── Header row — always visible, tap to toggle ── */}
      <TouchableOpacity onPress={onSelect} disabled={isPending} activeOpacity={0.8}
        style={{ backgroundColor: active ? `${subjectColor}${isDark ? '18' : '22'}` : t.card, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: active ? subjectTextColor : t.onSurface }}>
              {stored.examType.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </Text>
            {isPending && <ActivityIndicator size="small" color={subjectTextColor} style={{ marginLeft: 2 }} />}
          </View>
          {(stored.topics ?? []).length > 0 && (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.onSurfaceVariant, marginBottom: 2 }} numberOfLines={1}>{(stored.topics ?? []).join(', ')}</Text>
          )}
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: isFailed ? '#ffb4ab' : t.outlineVariant }}>
            {isFailed ? 'Generation failed — tap to retry' : isPending ? 'Generating in background…' : timeLeft(stored.generatedAt)}
          </Text>
        </View>
        {!isPending && !isFailed && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: active ? `${subjectColor}${isDark ? '25' : '30'}` : t.iconBg, borderWidth: 1, borderColor: active ? `${subjectColor}${isDark ? '40' : '60'}` : t.cardBorder }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: active ? subjectTextColor : t.outlineVariant, letterSpacing: 0.5 }}>{active ? 'VIEWING' : 'TAP TO VIEW'}</Text>
            </View>
            <Ionicons name={active ? 'chevron-up' : 'chevron-down'} size={16} color={active ? subjectTextColor : t.outlineVariant} />
          </View>
        )}
      </TouchableOpacity>

      {/* ── Expanded content — same card, below the header ── */}
      {active && stored.pack.status === 'done' && (
        <View style={{ backgroundColor: t.card, borderTopWidth: 1, borderTopColor: `${subjectColor}${isDark ? '25' : '40'}`, padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${subjectColor}${isDark ? '20' : '28'}`, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 16 }}>✨</Text>
            </View>
            <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 15, color: subjectTextColor, letterSpacing: -0.2 }}>
              {stored.pack.subject} — {stored.examType.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </Text>
          </View>
          <PackContent pack={stored.pack} subjectColor={subjectColor} />
        </View>
      )}
    </View>
  );
}

// ── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  const t = getTheme(useThemeStore((s) => s.isDark));
  return (
    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: t.onSurfaceVariant, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
      {children}
    </Text>
  );
}

// ── Pack content renderer ────────────────────────────────────────────────────
function PackContent({ pack, subjectColor }: { pack: ExamPack; subjectColor: string }) {
  const [expandedMCQ, setExpandedMCQ] = useState<number | null>(null);
  const [selectedOption, setSelectedOption] = useState<Record<number, number>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const isDark = useThemeStore((s) => s.isDark);
  const t = getTheme(isDark);
  const subjectDarkColor = Object.entries(SUBJECT_COLORS).find(([, v]) => v === subjectColor)?.[0];
  const subjectTextColor = isDark ? subjectColor : (subjectDarkColor ? (SUBJECT_DARK_COLORS[subjectDarkColor] ?? t.primaryText) : t.primaryText);

  const rowStyle = {
    backgroundColor: t.iconBg,
    borderWidth: 1, borderColor: t.cardBorder,
    borderRadius: 16, padding: 14, marginBottom: 8,
  };

  return (
    <>
      {(pack.mcqs ?? []).length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <SectionLabel>MCQs (10 × 1 mark)</SectionLabel>
          {(pack.mcqs ?? []).map((q, i) => {
            const isExpanded = expandedMCQ === i;
            const picked = selectedOption[i];
            const hasAnswered = picked !== undefined;
            return (
              <View key={i} style={rowStyle}>
                <TouchableOpacity onPress={() => { if (!isExpanded) setExpandedMCQ(i); }} activeOpacity={0.8}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: t.onSurface, lineHeight: 20, marginBottom: isExpanded ? 12 : 6 }}>
                    {i + 1}. {q.question}
                  </Text>
                </TouchableOpacity>
                {isExpanded ? (
                  <>
                    {q.options.map((opt, j) => {
                      const letter = ['A', 'B', 'C', 'D'][j];
                      const isCorrect = q.answer === letter || q.answer === opt || opt.startsWith(`${q.answer}.`);
                      const isSelected = picked === j;
                      const showResult = hasAnswered;
                      const bgColor = showResult
                        ? isCorrect ? `${subjectColor}35` : isSelected ? 'rgba(255,100,100,0.12)' : t.iconBg
                        : t.iconBg;
                      const borderColor = showResult
                        ? isCorrect ? `${subjectColor}70` : isSelected ? 'rgba(255,100,100,0.35)' : t.cardBorder
                        : t.cardBorder;
                      const textColor = showResult
                        ? isCorrect ? subjectTextColor : isSelected ? (isDark ? '#ff6b6b' : '#C0392B') : t.onSurfaceVariant
                        : t.onSurface;
                      const letterColor = showResult
                        ? isCorrect ? subjectTextColor : isSelected ? (isDark ? '#ff6b6b' : '#C0392B') : t.outlineVariant
                        : t.outlineVariant;
                      return (
                        <TouchableOpacity
                          key={j}
                          onPress={() => { if (!hasAnswered) setSelectedOption((p) => ({ ...p, [i]: j })); }}
                          activeOpacity={hasAnswered ? 1 : 0.7}
                          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 12, backgroundColor: bgColor, borderWidth: 1, borderColor }}
                        >
                          <View style={{ width: 22, height: 22, borderRadius: 6, marginRight: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: showResult ? (isCorrect ? `${subjectColor}30` : isSelected ? 'rgba(255,100,100,0.2)' : t.iconBg) : t.card, borderWidth: 1, borderColor }}>
                            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: letterColor }}>{letter}</Text>
                          </View>
                          <Text style={{ fontFamily: isCorrect && showResult ? 'Inter_600SemiBold' : 'Inter_400Regular', fontSize: 13, color: textColor, flex: 1, lineHeight: 18 }}>
                            {opt.replace(/^[A-D]\.\s*/, '')}
                          </Text>
                          {showResult && isCorrect && <Ionicons name="checkmark-circle" size={16} color={subjectTextColor} style={{ marginLeft: 6 }} />}
                          {showResult && isSelected && !isCorrect && <Ionicons name="close-circle" size={16} color={isDark ? '#ff6b6b' : '#C0392B'} style={{ marginLeft: 6 }} />}
                        </TouchableOpacity>
                      );
                    })}
                    {!hasAnswered && (
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.outlineVariant, marginTop: 4, textAlign: 'center' }}>Tap an option to submit your answer</Text>
                    )}
                  </>
                ) : (
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.outlineVariant }}>Tap to see options & answer</Text>
                )}
              </View>
            );
          })}
        </View>
      )}

      {(pack.shortQuestions ?? []).length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <SectionLabel>Short Questions (10 × 5 marks)</SectionLabel>
          {(pack.shortQuestions ?? []).map((q, i) => (
            <View key={i} style={rowStyle}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: t.onSurface, lineHeight: 20, marginBottom: 8 }}>
                {i + 1}. {q.question}
              </Text>
              <View style={{ height: 1, backgroundColor: t.separator, marginBottom: 8 }} />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: t.onSurface, lineHeight: 20 }}>
                {q.answer}
              </Text>
            </View>
          ))}
        </View>
      )}

      {(pack.longQuestions ?? []).length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <SectionLabel>Long Questions — Self Practice (10 × 10 marks)</SectionLabel>
          <View style={{ backgroundColor: t.iconBg, borderRadius: 16, borderWidth: 1, borderColor: t.cardBorder, padding: 4 }}>
            {(pack.longQuestions ?? []).map((q, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderBottomWidth: i < (pack.longQuestions?.length ?? 0) - 1 ? 1 : 0, borderBottomColor: t.separator }}>
                <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 14, color: subjectTextColor, marginRight: 10, lineHeight: 21 }}>{i + 1}.</Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: t.onSurface, flex: 1, lineHeight: 21 }}>{q}</Text>
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
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: t.onSurface, lineHeight: 20, marginBottom: 8 }}>
                {i + 1}. {q.question}
              </Text>
              <View style={{ height: 1, backgroundColor: t.separator, marginBottom: 8 }} />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: t.onSurface, lineHeight: 20 }}>
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
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: t.onSurface, lineHeight: 20, marginBottom: 6 }}>
                {i + 1}. {q.question}
              </Text>
              <TouchableOpacity
                onPress={() => setRevealedAnswers((p) => ({ ...p, [i]: !p[i] }))}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Ionicons name={revealedAnswers[i] ? 'eye-off-outline' : 'eye-outline'} size={14} color={subjectTextColor} />
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: subjectTextColor }}>
                  {revealedAnswers[i] ? 'Hide answer' : 'Reveal answer'}
                </Text>
              </TouchableOpacity>
              {revealedAnswers[i] && (
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: t.onSurface, lineHeight: 20, marginTop: 8 }}>
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
  const isDark = useThemeStore((s) => s.isDark);
  const t = getTheme(isDark);
  const subjectDarkColor = Object.entries(SUBJECT_COLORS).find(([, v]) => v === subjectColor)?.[0];
  const subjectTextColor = isDark ? subjectColor : (subjectDarkColor ? (SUBJECT_DARK_COLORS[subjectDarkColor] ?? t.primaryText) : t.primaryText);
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
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.outlineVariant }}>
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
                backgroundColor: t.iconBg,
                borderWidth: 1, borderColor: `${subjectColor}20`,
                borderRadius: 18, padding: 18,
              }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: subjectTextColor, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
                  Question {itemIdx + 1}
                </Text>
                <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 15, color: t.onSurface, lineHeight: 22, marginBottom: 14 }}>
                  {item.question}
                </Text>
                <TouchableOpacity
                  onPress={() => setRevealedMap((m) => ({ ...m, [itemIdx]: !m[itemIdx] }))}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  <Ionicons name={isRevealed ? 'eye-off-outline' : 'eye-outline'} size={14} color={subjectTextColor} />
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: subjectTextColor }}>
                    {isRevealed ? 'Hide answer' : 'Reveal answer'}
                  </Text>
                </TouchableOpacity>
                {isRevealed && (
                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: t.separator }}>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: t.onSurface, lineHeight: 22 }}>
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
  const isDark = useThemeStore((s) => s.isDark);
  const t = getTheme(isDark);
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

  const subjectColor = selectedSubject ? (SUBJECT_COLORS[selectedSubject] ?? '#cfbcff') : '#cfbcff';
  const subjectDarkColor = selectedSubject ? (SUBJECT_DARK_COLORS[selectedSubject] ?? '#5E35B1') : '#5E35B1';
  const subjectTextColor = isDark ? subjectColor : subjectDarkColor;
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
  const { data: fetchedTopics } = useQuery({
    queryKey: ['topics', selectedSubject],
    queryFn: () => examApi.getTopics(selectedSubject!),
    enabled: !!selectedSubject,
    staleTime: 5 * 60_000,
  });
  useEffect(() => {
    if (!fetchedTopics || !selectedSubject) return;
    examApi.getCustomTopics(selectedSubject).then((custom) => {
      setTopics([...fetchedTopics, ...custom]);
    }).catch(() => { setTopics(fetchedTopics); });
  }, [fetchedTopics, selectedSubject]);

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

  const handleAddTopic = async (title: string) => {
    if (!selectedSubject) return;
    try {
      const topic = await examApi.addCustomTopic(selectedSubject, title);
      addTopic(topic.id, topic.title);
    } catch {
      addTopic(`local-${Date.now()}`, title);
    }
  };

  const isCustomId = (id: string) => /^[a-f\d]{24}$/i.test(id);

  const handleEditTopic = async (id: string, title: string) => {
    editTopic(id, title);
    if (isCustomId(id)) examApi.editCustomTopic(id, title).catch(() => {});
  };

  const handleDeleteTopic = async (id: string) => {
    deleteTopic(id);
    if (isCustomId(id)) examApi.deleteCustomTopic(id).catch(() => {});
  };

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
    if (!id.startsWith('local-') && selectedSubject) examApi.completeTopic(id, selectedSubject).catch(() => {});
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Header ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 }}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.onSurfaceVariant, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>AI-Powered</Text>
          <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 36, color: t.onSurface, letterSpacing: -0.5, lineHeight: 40 }}>Exam Mode</Text>
        </View>

        {/* ── Subject pills ── */}
        <View style={{ marginBottom: 24 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}>
            {SUBJECTS.map((s) => {
              const isActive = selectedSubject === s;
              const color = SUBJECT_COLORS[s];
              return (
                <TouchableOpacity key={s} onPress={() => { if (selectedSubject !== s) { reset(); setSubject(s); setViewingPackIndex(null); } }} activeOpacity={0.75}
                  style={{ paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999, marginRight: 8, backgroundColor: isActive ? color : t.card, borderWidth: 1, borderColor: isActive ? color : t.cardBorder }}>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: isActive ? '#1a0a3a' : t.onSurfaceVariant }}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {selectedSubject && (
            <View style={{ height: 1.5, marginTop: 12, marginHorizontal: 20, backgroundColor: t.separator, borderRadius: 1, overflow: 'hidden' }}>
              <View style={{ width: 48, height: '100%', backgroundColor: subjectColor, borderRadius: 1, opacity: 0.6 }} />
            </View>
          )}
        </View>

        {selectedSubject ? (
          <>
            {/* ── Daily usage ── */}
            <View style={{ marginHorizontal: 20, marginBottom: 20, flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, backgroundColor: t.card, borderRadius: 16, borderWidth: 1, borderColor: t.cardBorder, padding: 14 }}>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: t.outlineVariant, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Packs Today</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 22, color: limitReached ? '#ffb4ab' : t.onSurface }}>{packsUsed}</Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: t.outlineVariant }}>/ {MAX_PACKS}</Text>
                </View>
                <View style={{ height: 3, backgroundColor: t.separator, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.min((packsUsed / MAX_PACKS) * 100, 100)}%`, height: '100%', backgroundColor: limitReached ? '#ffb4ab' : subjectColor, borderRadius: 2 }} />
                </View>
              </View>
              <View style={{ flex: 1, backgroundColor: t.card, borderRadius: 16, borderWidth: 1, borderColor: t.cardBorder, padding: 14 }}>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: t.outlineVariant, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Viva Today</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 22, color: vivaLimitReached ? '#ffb4ab' : t.onSurface }}>{dailyUsage?.vivaUsed ?? 0}</Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: t.outlineVariant }}>/ {MAX_VIVA}</Text>
                </View>
                <View style={{ height: 3, backgroundColor: t.separator, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.min(((dailyUsage?.vivaUsed ?? 0) / MAX_VIVA) * 100, 100)}%`, height: '100%', backgroundColor: vivaLimitReached ? '#ffb4ab' : '#4ade80', borderRadius: 2 }} />
                </View>
              </View>
            </View>

            {/* ── Pack type + generate — unified card ── */}
            <View style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: t.card, borderRadius: 24, borderWidth: 1, borderColor: t.cardBorder, overflow: 'hidden' }}>
              {/* Type selector rows */}
              {EXAM_TYPES.map((et) => {
                const isActive = selectedExamType === et.value;
                return (
                  <TouchableOpacity key={et.value} onPress={() => setSelectedExamType(et.value)} activeOpacity={0.75}
                    style={{
                      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
                      backgroundColor: isActive ? `${subjectColor}${isDark ? '20' : '22'}` : 'transparent',
                      borderBottomWidth: 1,
                      borderBottomColor: isActive ? `${subjectColor}${isDark ? '28' : '35'}` : t.separator,
                    }}>
                    {/* Selection indicator */}
                    <View style={{
                      width: 20, height: 20, borderRadius: 10, marginRight: 14,
                      borderWidth: 1.5,
                      borderColor: isActive ? subjectColor : t.outlineVariant,
                      backgroundColor: isActive ? `${subjectColor}${isDark ? '35' : '40'}` : 'transparent',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isActive && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: subjectColor }} />}
                    </View>
                    <Text style={{ fontSize: 18, marginRight: 12 }}>{et.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: isActive ? subjectTextColor : t.onSurface, marginBottom: 1 }}>{et.label}</Text>
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: isActive ? (isDark ? `${subjectColor}aa` : subjectTextColor) : t.outlineVariant, opacity: isActive ? 0.85 : 1 }}>{et.desc}</Text>
                    </View>
                    {isActive && (
                      <Ionicons name="checkmark-circle" size={18} color={subjectColor} style={{ marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Generate CTA — anchored to the bottom of the card */}
              <TouchableOpacity
                onPress={() => { if (!limitReached && !isGenerating) setShowTopicsModal(true); }}
                disabled={limitReached || isGenerating}
                activeOpacity={0.85}
                style={{ opacity: (limitReached || isGenerating) ? 0.55 : 1 }}
              >
                <LinearGradient
                  colors={[`${subjectColor}${isDark ? '55' : '70'}`, `${subjectColor}${isDark ? '30' : '40'}`]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ paddingVertical: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                >
                  {isGenerating
                    ? <><ActivityIndicator color={subjectTextColor} /><Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 16, color: isDark ? '#ffffff' : t.onSurface, letterSpacing: -0.2 }}>Generating in background…</Text></>
                    : <><Text style={{ fontSize: 18 }}>🧠</Text><Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 16, color: isDark ? '#ffffff' : t.onSurface, letterSpacing: -0.2 }}>{limitReached ? 'Daily Limit Reached' : `Generate ${selectedSubject} Pack`}</Text><Ionicons name="arrow-forward" size={16} color={isDark ? '#ffffff' : t.onSurface} style={{ marginLeft: 2 }} /></>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* ── Saved packs ── */}
            {activePacks.length > 0 && (
              <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.onSurfaceVariant, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Your Packs (valid 24h)</Text>
                {activePacks.map((sp, i) => (
                  <PackCard key={sp.pack._id ?? sp.generatedAt} stored={sp}
                    active={viewingPackIndex === i && sp.pack.status === 'done'}
                    onSelect={() => { if (sp.pack.status !== 'done') return; setViewingPackIndex(viewingPackIndex === i ? null : i); }}
                    subjectColor={subjectColor} />
                ))}
              </View>
            )}

            {/* ── Viva Practice ── */}
            <View style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: t.card, borderRadius: 28, borderWidth: 1, borderColor: t.cardBorder, padding: 22 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 18, color: t.onSurface, letterSpacing: -0.2 }}>Viva Practice</Text>
                <Text style={{ fontSize: 18 }}>🎙️</Text>
              </View>
              {vivaTopics.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: t.onSurfaceVariant, flex: 1 }} numberOfLines={1}>Topics: {vivaTopics.join(', ')}</Text>
                  <TouchableOpacity onPress={() => { setVivaTopics([]); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: t.outlineVariant }}>Change</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!vivaTopics.length && <View style={{ height: 14 }} />}
              <TouchableOpacity onPress={handleAskViva} disabled={isAskingViva || vivaLimitReached} activeOpacity={0.8}
                style={{ borderRadius: 18, overflow: 'hidden', marginBottom: vivaQuestions.length > 0 ? 20 : 0, opacity: vivaLimitReached ? 0.45 : 1 }}>
                <LinearGradient colors={[`${subjectColor}${isDark ? '55' : '70'}`, `${subjectColor}${isDark ? '30' : '40'}`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ borderWidth: 1, borderColor: `${subjectColor}${isDark ? '50' : '90'}`, borderRadius: 18, paddingVertical: 14, alignItems: 'center' }}>
                {isAskingViva
                  ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><ActivityIndicator size="small" color={subjectTextColor} /><Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: subjectTextColor }}>Generating…</Text></View>
                  : <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: vivaLimitReached ? '#ffb4ab' : subjectTextColor }}>
                      {vivaLimitReached ? `Daily limit reached (${MAX_VIVA}/day)` : vivaTopics.length > 0 ? 'Ask Another Viva Question' : 'Set Topics & Start Viva'}
                    </Text>
                }
                </LinearGradient>
              </TouchableOpacity>
              <VivaCards questions={vivaQuestions} subjectColor={subjectColor} />
            </View>

            {/* ── Topics Checklist ── */}
            <View style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: t.card, borderRadius: 28, borderWidth: 1, borderColor: t.cardBorder, padding: 22 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 18, color: t.onSurface, letterSpacing: -0.2 }}>High-Yield Topics</Text>
                {topics.length > 0 && (
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: `${subjectColor}${isDark ? '28' : '35'}`, borderWidth: 1, borderColor: `${subjectColor}${isDark ? '40' : '60'}` }}>
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: subjectTextColor, letterSpacing: 1 }}>{completedCount}/{topics.length}</Text>
                  </View>
                )}
              </View>
              <TopicChecklist topics={topics} onToggle={handleTopicToggle} onAdd={handleAddTopic} onEdit={handleEditTopic} onDelete={handleDeleteTopic} />
            </View>
          </>
        ) : (
          <View style={{ marginHorizontal: 20, marginTop: 8, paddingBottom: 20 }}>
            <View style={{ backgroundColor: t.card, borderRadius: 28, borderWidth: 1, borderColor: t.cardBorder, padding: 24, marginBottom: 16, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: isDark ? 'rgba(207,188,255,0.06)' : 'rgba(181,153,255,0.06)' }} />
              <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: isDark ? 'rgba(207,188,255,0.12)' : 'rgba(181,153,255,0.12)', borderWidth: 1, borderColor: isDark ? 'rgba(207,188,255,0.2)' : 'rgba(181,153,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 26 }}>🧠</Text>
              </View>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.onSurfaceVariant, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>AI-Powered</Text>
              <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 26, color: t.onSurface, letterSpacing: -0.4, lineHeight: 32, marginBottom: 10 }}>Your personal{'\n'}exam coach</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: t.onSurfaceVariant, lineHeight: 21 }}>
                Pick a subject above to generate topic-specific exam packs — MCQs, short answers, viva questions — all based on your actual syllabus.
              </Text>
            </View>

            {[
              { icon: '📦', color: '#cfbcff', label: 'Full Pack', desc: '10 MCQs · 10 Short Qs · 10 Long Qs for a complete 100-mark paper' },
              { icon: '⚡', color: '#fbbf24', label: 'Quick Review', desc: '15 high-yield short Q&As — perfect for last-minute revision before exams' },
              { icon: '🎙️', color: '#4ade80', label: 'Viva Only Pack', desc: '15 examiner-style viva questions with crisp answers to ace your orals' },
              { icon: '🔁', color: '#60a5fa', label: 'Viva Practice', desc: 'One question at a time — practice answering without peeking, then reveal the answer' },
            ].map((f) => (
              <View key={f.label} style={{ backgroundColor: t.card, borderRadius: 20, borderWidth: 1, borderColor: t.cardBorder, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: `${f.color}15`, borderWidth: 1, borderColor: `${f.color}25`, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Text style={{ fontSize: 20 }}>{f.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: t.onSurface, marginBottom: 4 }}>{f.label}</Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: t.onSurfaceVariant, lineHeight: 18 }}>{f.desc}</Text>
                </View>
              </View>
            ))}

            <View style={{ marginTop: 6, backgroundColor: isDark ? 'rgba(207,188,255,0.05)' : 'rgba(181,153,255,0.07)', borderRadius: 16, borderWidth: 1, borderColor: t.cardBorder, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Text style={{ fontSize: 16 }}>💡</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: t.onSurfaceVariant, lineHeight: 18, flex: 1 }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', color: t.primaryText }}>Pro tip: </Text>
                Enter specific topics like "Krebs cycle, Glycolysis" instead of just "Biochemistry" to get laser-focused exam questions.
              </Text>
            </View>
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
