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
import { SectionLabel } from '../../src/components/ui/SectionLabel';
import { SUBJECTS, getSubjectColor, SubjectPill } from '../../src/constants/subjects';
import { Subject, ExamType, ExamPack, VivaQ } from '../../src/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';

const { width: SCREEN_W } = Dimensions.get('window');

// Fix #6: subject fill colours come from shared util — no local duplicates needed
// These are still needed for the solid pill active state (the accent fill)
const SUBJECT_FILL_COLORS: Record<string, string> = {
  Anatomy: '#cfbcff', Physiology: '#4ade80', Biochemistry: '#60a5fa',
  Pathology: '#fb923c', Pharmacology: '#f472b6', Microbiology: '#22d3ee',
  Surgery: '#fbbf24', Medicine: '#a78bfa',
};

const EXAM_TYPES: { label: string; value: ExamType; iconName: React.ComponentProps<typeof Ionicons>['name']; desc: string }[] = [
  { label: 'Full Pack', value: 'full-pack', iconName: 'layers-outline', desc: '10 MCQs + Short + Long Qs' },
  { label: 'Quick Review', value: 'quick-review', iconName: 'flash-outline', desc: '15 high-yield short Qs' },
  { label: 'Viva Only', value: 'viva-only', iconName: 'mic-outline', desc: '15 examiner-style viva Qs' },
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
  visible, onClose, onConfirm, title, subtitle, loading, subjectColor, subjectTextColor,
}: {
  visible: boolean; onClose: () => void; onConfirm: (topics: string[]) => void;
  title: string; subtitle: string; loading: boolean;
  subjectColor: string; subjectTextColor: string;
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
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: t.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: t.cardBorder, padding: 26, paddingBottom: 36 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: t.separator, alignSelf: 'center', marginBottom: 20 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 20, color: t.onSurface, letterSpacing: -0.3 }}>{title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.iconBg, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={18} color={t.outlineVariant} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: t.onSurfaceVariant, marginBottom: 20, lineHeight: 19 }}>{subtitle}</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="e.g. Metabolism, Vitamins, DNA Replication"
              placeholderTextColor={isDark ? 'rgba(148,142,157,0.4)' : 'rgba(90,86,112,0.4)'}
              multiline
              autoFocus
              style={{ backgroundColor: t.innerSurface, borderWidth: 1, borderColor: t.cardBorder, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontFamily: 'Inter_400Regular', fontSize: 14, color: t.onSurface, minHeight: 80, textAlignVertical: 'top', marginBottom: 8 }}
            />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.outlineVariant, marginBottom: 24 }}>Separate multiple topics with commas</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={onClose}
                style={{ flex: 1, borderWidth: 1, borderColor: t.cardBorder, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: t.onSurfaceVariant }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm} disabled={loading}
                style={{ flex: 2, borderRadius: 14, paddingVertical: 14, alignItems: 'center', opacity: loading ? 0.7 : 1, backgroundColor: `${subjectColor}${isDark ? '40' : '55'}`, borderWidth: 1, borderColor: `${subjectColor}${isDark ? '60' : '80'}` }}>
                {loading
                  ? <ActivityIndicator size="small" color={subjectTextColor} />
                  : <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: subjectTextColor }}>Generate</Text>
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
  const isDark = useThemeStore((s) => s.isDark);
  const t = getTheme(isDark);
  // Fix #7: use getSubjectColor to derive text colour — no hardcoded dark values
  const sc = getSubjectColor(stored.pack.subject ?? '', isDark);
  const subjectTextColor = sc.text;
  const isPending = stored.pack.status === 'pending';
  const isFailed = stored.pack.status === 'failed';

  const typeIconName = EXAM_TYPES.find((et) => et.value === stored.examType)?.iconName ?? 'layers-outline';
  const typeLabel = stored.examType.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <View style={{
      marginBottom: 10, borderRadius: 20, borderWidth: 1,
      borderColor: active ? `${subjectColor}${isDark ? '50' : '70'}` : isFailed ? 'rgba(255,180,171,0.25)' : t.cardBorder,
      overflow: 'hidden',
    }}>
      <TouchableOpacity onPress={onSelect} disabled={isPending} activeOpacity={0.8}
        style={{ backgroundColor: active ? `${subjectColor}${isDark ? '18' : '20'}` : t.card, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: active ? `${subjectColor}${isDark ? '30' : '35'}` : t.iconBg, borderWidth: 1, borderColor: active ? `${subjectColor}${isDark ? '45' : '55'}` : t.cardBorder, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 }}>
          {isPending
            ? <ActivityIndicator size="small" color={subjectTextColor} />
            : isFailed
              ? <Ionicons name="warning-outline" size={18} color={t.error} />
              : <Ionicons name={typeIconName} size={18} color={active ? subjectTextColor : t.onSurfaceVariant} />
          }
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: active ? subjectTextColor : t.onSurface, marginBottom: 2 }}>
            {typeLabel}
          </Text>
          {(stored.topics ?? []).length > 0 && (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.onSurfaceVariant, marginBottom: 1 }} numberOfLines={1}>
              {(stored.topics ?? []).join(', ')}
            </Text>
          )}
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: isFailed ? '#ef4444' : isPending ? t.onSurfaceVariant : t.outlineVariant }}>
            {isFailed ? 'Generation failed — tap to retry' : isPending ? 'Generating…' : timeLeft(stored.generatedAt)}
          </Text>
        </View>

        {!isPending && !isFailed && (
          <Ionicons
            name={active ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={active ? subjectTextColor : t.outlineVariant}
            style={{ marginLeft: 8 }}
          />
        )}
      </TouchableOpacity>

      {active && stored.pack.status === 'done' && (
        <View style={{ backgroundColor: t.card, borderTopWidth: 1, borderTopColor: `${subjectColor}${isDark ? '25' : '35'}`, padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: `${subjectColor}${isDark ? '20' : '28'}`, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="checkmark-circle" size={16} color={subjectTextColor} />
            </View>
            <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 14, color: subjectTextColor, letterSpacing: -0.2 }}>
              {stored.pack.subject} — {typeLabel}
            </Text>
          </View>
          <PackContent pack={stored.pack} subjectColor={subjectColor} />
        </View>
      )}
    </View>
  );
}

// ── Pack content renderer ────────────────────────────────────────────────────
function PackContent({ pack, subjectColor }: { pack: ExamPack; subjectColor: string }) {
  const [expandedMCQ, setExpandedMCQ] = useState<number | null>(null);
  const [selectedOption, setSelectedOption] = useState<Record<number, number>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const isDark = useThemeStore((s) => s.isDark);
  const t = getTheme(isDark);
  // Fix #7: derive text colour from shared util — no hardcoded SUBJECT_DARK_COLORS lookup
  const sc = getSubjectColor(pack.subject ?? '', isDark);
  const subjectTextColor = sc.text;

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
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}  // Fix #25
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
function VivaCards({ questions, subjectColor, isDark }: { questions: VivaQ[]; subjectColor: string; isDark: boolean }) {
  const [index, setIndex] = useState(questions.length > 0 ? questions.length - 1 : 0);
  const [revealedMap, setRevealedMap] = useState<Record<number, boolean>>({});
  const t = getTheme(isDark);
  // Fix #7: derive text colour via shared util
  const sc = getSubjectColor('', isDark);
  const subjectEntry = Object.entries(SUBJECT_FILL_COLORS).find(([, v]) => v === subjectColor);
  const subjectTextColor = subjectEntry ? getSubjectColor(subjectEntry[0], isDark).text : sc.text;
  const flatRef = useRef<FlatList>(null);

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

  const CARD_W = SCREEN_W - 40;
  const INNER_PAD = 22;

  return (
    <View style={{ marginTop: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <SectionLabel>Practice Cards</SectionLabel>
        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: t.outlineVariant }}>
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
              <View style={{ backgroundColor: t.iconBg, borderWidth: 1, borderColor: `${subjectColor}${isDark ? '25' : '30'}`, borderRadius: 18, padding: 18 }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: subjectTextColor, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
                  Question {itemIdx + 1}
                </Text>
                <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 15, color: t.onSurface, lineHeight: 22, marginBottom: 14 }}>
                  {item.question}
                </Text>
                <TouchableOpacity
                  onPress={() => setRevealedMap((m) => ({ ...m, [itemIdx]: !m[itemIdx] }))}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}  // Fix #25
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
            <View key={i} style={{
              width: i === index ? 16 : 5, height: 5, borderRadius: 3,
              backgroundColor: i === index ? subjectColor : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'),
            }} />
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

  // Fix #7: use shared getSubjectColor — eliminates SUBJECT_DARK_COLORS lookup
  const subjectFill = selectedSubject ? (SUBJECT_FILL_COLORS[selectedSubject] ?? '#cfbcff') : '#cfbcff';
  const subjectSc = selectedSubject ? getSubjectColor(selectedSubject, isDark) : getSubjectColor('', isDark);
  const subjectColor = subjectFill;  // used for gradient bg tints (needs the raw fill)
  const subjectTextColor = subjectSc.text;

  const completedCount = topics.filter((tp) => tp.completed).length;

  const packsUsed = dailyUsage?.packsUsed ?? 0;
  const packsRemaining = dailyUsage?.packsRemaining ?? MAX_PACKS;
  const vivaRemaining = dailyUsage?.vivaRemaining ?? MAX_VIVA;
  const limitReached = packsRemaining <= 0;
  const vivaLimitReached = vivaRemaining <= 0;

  useQuery({
    queryKey: ['exam-usage'],
    queryFn: async () => {
      const u = await examApi.getDailyUsage();
      setDailyUsage(u);
      return u;
    },
    staleTime: 60_000,
  });

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

  useFocusEffect(
    useCallback(() => {
      if (!selectedSubject) return;
      examApi.getMyPacks(selectedSubject).then((packs) => setPacksForSubject(selectedSubject, packs)).catch(() => {});
      examApi.getMyViva(selectedSubject).then((qs) => setVivaQuestions(selectedSubject, qs)).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['exam-usage'] });
    }, [selectedSubject])
  );

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
          Toast.show({ type: 'success', text1: 'Pack ready!' });
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* ── Header ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 }}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.onSurfaceVariant, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>AI-Powered</Text>
          <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 36, color: t.onSurface, letterSpacing: -0.5, lineHeight: 42 }}>Exam Mode</Text>
        </View>

        {/* ── Subject pills — Fix #2: use shared SubjectPill ── */}
        <View style={{ marginBottom: 20 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}>
            {SUBJECTS.map((s) => (
              <SubjectPill
                key={s}
                subject={s}
                active={selectedSubject === s}
                variant="pill"
                onPress={() => { if (selectedSubject !== s) { reset(); setSubject(s); setViewingPackIndex(null); } }}
              />
            ))}
          </ScrollView>
        </View>

        {selectedSubject ? (
          <>
            {/* ── Daily usage strip ── */}
            <View style={{ marginHorizontal: 20, marginBottom: 16, flexDirection: 'row', gap: 8 }}>
              {/* Packs remaining */}
              <View style={{ flex: 1, backgroundColor: t.card, borderRadius: 14, borderWidth: 1, borderColor: limitReached ? 'rgba(255,180,171,0.3)' : t.cardBorder, padding: 12 }}>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: t.outlineVariant, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Packs Left</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                  <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 20, color: limitReached ? '#ef4444' : t.onSurface }}>{packsRemaining}</Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.outlineVariant }}> / {MAX_PACKS}</Text>
                </View>
                <View style={{ height: 3, borderRadius: 2, marginTop: 6, flexDirection: 'row', overflow: 'hidden', backgroundColor: t.separator }}>
                  <View style={{ flex: Math.max(packsRemaining, 0), height: 3, backgroundColor: limitReached ? '#ef4444' : subjectColor, borderRadius: 2 }} />
                  <View style={{ flex: MAX_PACKS - Math.max(packsRemaining, 0) }} />
                </View>
              </View>
              {/* Viva remaining — Fix #20: use subjectTextColor instead of hardcoded green */}
              <View style={{ flex: 1, backgroundColor: t.card, borderRadius: 14, borderWidth: 1, borderColor: vivaLimitReached ? 'rgba(255,180,171,0.3)' : t.cardBorder, padding: 12 }}>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: t.outlineVariant, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Viva Left</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                  <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 20, color: vivaLimitReached ? '#ef4444' : t.onSurface }}>{vivaRemaining}</Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.outlineVariant }}> / {MAX_VIVA}</Text>
                </View>
                <View style={{ height: 3, borderRadius: 2, marginTop: 6, flexDirection: 'row', overflow: 'hidden', backgroundColor: t.separator }}>
                  <View style={{ flex: Math.max(vivaRemaining, 0), height: 3, backgroundColor: vivaLimitReached ? '#ef4444' : subjectColor, borderRadius: 2 }} />
                  <View style={{ flex: MAX_VIVA - Math.max(vivaRemaining, 0) }} />
                </View>
              </View>
            </View>

            {/* ── Pack type + generate ── */}
            <View style={{ marginHorizontal: 20, marginBottom: 16, backgroundColor: t.card, borderRadius: 22, borderWidth: 1, borderColor: t.cardBorder, overflow: 'hidden' }}>
              <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: t.separator }}>
                <SectionLabel style={{ marginBottom: 0 }}>Choose Pack Type</SectionLabel>
              </View>

              {EXAM_TYPES.map((et, idx) => {
                const isActive = selectedExamType === et.value;
                const isLast = idx === EXAM_TYPES.length - 1;
                return (
                  <TouchableOpacity key={et.value} onPress={() => setSelectedExamType(et.value)} activeOpacity={0.7}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingHorizontal: 16, paddingVertical: 13,
                      backgroundColor: isActive ? `${subjectColor}${isDark ? '18' : '18'}` : 'transparent',
                      borderBottomWidth: isLast ? 0 : 1,
                      borderBottomColor: t.separator,
                    }}>
                    <View style={{
                      width: 18, height: 18, borderRadius: 9, marginRight: 12,
                      borderWidth: isActive ? 5 : 1.5,
                      borderColor: isActive ? subjectColor : t.outlineVariant,
                      backgroundColor: 'transparent',
                    }} />
                    <Ionicons name={et.iconName} size={17} color={isActive ? subjectTextColor : t.onSurfaceVariant} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: isActive ? subjectTextColor : t.onSurface }}>
                        {et.label}
                      </Text>
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.outlineVariant, marginTop: 1 }}>
                        {et.desc}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <View style={{ height: 1, backgroundColor: `${subjectColor}${isDark ? '30' : '40'}` }} />

              {/* Fix #14 + #15: CTA uses Inter_700Bold 15px — consistent with rest of app */}
              <TouchableOpacity
                onPress={() => { if (!limitReached && !isGenerating) setShowTopicsModal(true); }}
                disabled={limitReached || isGenerating}
                activeOpacity={0.82}
              >
                <LinearGradient
                  colors={
                    limitReached
                      ? (isDark ? ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)'] : ['rgba(0,0,0,0.04)', 'rgba(0,0,0,0.02)'])
                      : [`${subjectColor}${isDark ? '50' : '65'}`, `${subjectColor}${isDark ? '28' : '38'}`]
                  }
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ paddingVertical: 17, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                >
                  {isGenerating ? (
                    <>
                      <ActivityIndicator size="small" color={subjectTextColor} />
                      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: subjectTextColor }}>
                        Generating…
                      </Text>
                    </>
                  ) : limitReached ? (
                    <>
                      <Ionicons name="lock-closed-outline" size={16} color={t.outlineVariant} />
                      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: t.outlineVariant }}>
                        Daily limit reached
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="flash" size={17} color={isDark ? '#ffffff' : t.onSurface} />
                      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: isDark ? '#ffffff' : t.onSurface }}>
                        Generate {selectedSubject} Pack
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* ── Saved packs ── */}
            {activePacks.length > 0 && (
              <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <SectionLabel style={{ marginBottom: 0 }}>Your Packs</SectionLabel>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.outlineVariant }}>valid 24h</Text>
                </View>
                {activePacks.map((sp, i) => (
                  <PackCard key={sp.pack._id ?? sp.generatedAt} stored={sp}
                    active={viewingPackIndex === i && sp.pack.status === 'done'}
                    onSelect={() => { if (sp.pack.status !== 'done') return; setViewingPackIndex(viewingPackIndex === i ? null : i); }}
                    subjectColor={subjectColor} />
                ))}
              </View>
            )}

            {/* ── Viva Practice ── */}
            <View style={{ marginHorizontal: 20, marginBottom: 16, backgroundColor: t.card, borderRadius: 22, borderWidth: 1, borderColor: t.cardBorder, overflow: 'hidden' }}>
              <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: vivaQuestions.length > 0 || vivaTopics.length > 0 ? 1 : 0, borderBottomColor: t.separator }}>
                <View>
                  <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 17, color: t.onSurface, letterSpacing: -0.2 }}>Viva Practice</Text>
                  {vivaTopics.length > 0 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: t.onSurfaceVariant, maxWidth: SCREEN_W - 140 }} numberOfLines={1}>
                        {vivaTopics.join(', ')}
                      </Text>
                      <TouchableOpacity onPress={() => setVivaTopics([])} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: subjectTextColor }}>Change</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: t.outlineVariant, marginTop: 2 }}>
                      One question at a time
                    </Text>
                  )}
                </View>
                <Ionicons name="mic-outline" size={20} color={t.onSurfaceVariant} />
              </View>

              {/* Fix #15: Viva CTA also uses Inter_700Bold 15px — matches Generate CTA */}
              <TouchableOpacity onPress={handleAskViva} disabled={isAskingViva || vivaLimitReached} activeOpacity={0.82}>
                <LinearGradient
                  colors={
                    vivaLimitReached
                      ? (isDark ? ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)'] : ['rgba(0,0,0,0.04)', 'rgba(0,0,0,0.02)'])
                      : [`${subjectColor}${isDark ? '48' : '60'}`, `${subjectColor}${isDark ? '25' : '35'}`]
                  }
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ paddingVertical: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                >
                  {isAskingViva ? (
                    <>
                      <ActivityIndicator size="small" color={subjectTextColor} />
                      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: subjectTextColor }}>Generating…</Text>
                    </>
                  ) : vivaLimitReached ? (
                    <>
                      <Ionicons name="lock-closed-outline" size={15} color={t.outlineVariant} />
                      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: t.outlineVariant }}>
                        Daily limit reached ({MAX_VIVA}/day)
                      </Text>
                    </>
                  ) : (
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: subjectTextColor }}>
                      {vivaTopics.length > 0 ? 'Ask Another Question' : 'Set Topics & Start Viva'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {vivaQuestions.length > 0 && (
                <View style={{ padding: 22, paddingTop: 0 }}>
                  <VivaCards questions={vivaQuestions} subjectColor={subjectColor} isDark={isDark} />
                </View>
              )}
            </View>

            {/* ── Topics Checklist ── */}
            <View style={{ marginHorizontal: 20, marginBottom: 16, backgroundColor: t.card, borderRadius: 22, borderWidth: 1, borderColor: t.cardBorder, padding: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 17, color: t.onSurface, letterSpacing: -0.2 }}>High-Yield Topics</Text>
                {topics.length > 0 && (
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: `${subjectColor}${isDark ? '28' : '30'}`, borderWidth: 1, borderColor: `${subjectColor}${isDark ? '45' : '55'}` }}>
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: subjectTextColor, letterSpacing: 1 }}>
                      {completedCount}/{topics.length}
                    </Text>
                  </View>
                )}
              </View>
              <TopicChecklist topics={topics} onToggle={handleTopicToggle} onAdd={handleAddTopic} onEdit={handleEditTopic} onDelete={handleDeleteTopic} />
            </View>
          </>
        ) : (
          <View style={{ marginHorizontal: 20, marginTop: 4, paddingBottom: 20 }}>
            <View style={{ backgroundColor: t.card, borderRadius: 22, borderWidth: 1, borderColor: t.cardBorder, padding: 24, marginBottom: 16, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: isDark ? 'rgba(207,188,255,0.06)' : 'rgba(181,153,255,0.06)' }} />
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: isDark ? 'rgba(207,188,255,0.12)' : 'rgba(181,153,255,0.12)', borderWidth: 1, borderColor: isDark ? 'rgba(207,188,255,0.2)' : 'rgba(181,153,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Ionicons name="school-outline" size={24} color={isDark ? '#cfbcff' : '#7C5CBF'} />
              </View>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.onSurfaceVariant, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>AI-Powered</Text>
              <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 24, color: t.onSurface, letterSpacing: -0.4, lineHeight: 30, marginBottom: 10 }}>Your personal{'\n'}exam coach</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: t.onSurfaceVariant, lineHeight: 21 }}>
                Pick a subject above to generate topic-specific exam packs — MCQs, short answers, viva questions — all based on your actual syllabus.
              </Text>
            </View>

            {([
              { iconName: 'layers-outline' as const, color: '#cfbcff', label: 'Full Pack', desc: '10 MCQs · 10 Short Qs · 10 Long Qs for a complete 100-mark paper' },
              { iconName: 'flash-outline' as const, color: '#fbbf24', label: 'Quick Review', desc: '15 high-yield short Q&As — perfect for last-minute revision before exams' },
              { iconName: 'mic-outline' as const, color: '#4ade80', label: 'Viva Only Pack', desc: '15 examiner-style viva questions with crisp answers to ace your orals' },
              { iconName: 'refresh-outline' as const, color: '#60a5fa', label: 'Viva Practice', desc: 'One question at a time — practice answering without peeking, then reveal the answer' },
            ] as const).map((f) => (
              <View key={f.label} style={{ backgroundColor: t.card, borderRadius: 18, borderWidth: 1, borderColor: t.cardBorder, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: `${f.color}15`, borderWidth: 1, borderColor: `${f.color}25`, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Ionicons name={f.iconName} size={20} color={f.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: t.onSurface, marginBottom: 3 }}>{f.label}</Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: t.onSurfaceVariant, lineHeight: 18 }}>{f.desc}</Text>
                </View>
              </View>
            ))}

            <View style={{ marginTop: 4, backgroundColor: isDark ? 'rgba(207,188,255,0.05)' : 'rgba(181,153,255,0.07)', borderRadius: 14, borderWidth: 1, borderColor: t.cardBorder, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Ionicons name="information-circle-outline" size={16} color={t.onSurfaceVariant} style={{ marginTop: 1 }} />
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
        subjectColor={subjectColor}
        subjectTextColor={subjectTextColor}
      />

      <TopicsModal
        visible={showVivaTopicsModal}
        onClose={() => setShowVivaTopicsModal(false)}
        onConfirm={(tp) => { setVivaTopics(tp); vivaMutation.mutate(tp); }}
        loading={vivaMutation.isPending ?? false}
        title="Viva Practice Topics"
        subtitle="Enter topics for your viva practice. All questions will come from these topics only."
        subjectColor={subjectColor}
        subjectTextColor={subjectTextColor}
      />
    </SafeAreaView>
  );
}
