import React, { useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import { notesApi, UploadNoteType } from '../../src/api/notes';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore, getTheme } from '../../src/store/themeStore';
import { NoteRequest } from '../../src/types';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import { Subject, NoteType, Note } from '../../src/types';

const SUBJECTS: Subject[] = [
  'Anatomy', 'Physiology', 'Biochemistry', 'Pathology',
  'Pharmacology', 'Microbiology', 'Surgery', 'Medicine',
];

const NOTE_TYPES: { label: string; value: NoteType }[] = [
  { label: 'PDFs', value: 'pdf' },
  { label: 'Handwritten', value: 'handwritten' },
  { label: 'Diagrams', value: 'diagram' },
  { label: 'PYQs', value: 'pyq' },
];

const REQUEST_NOTE_TYPES: { label: string; value: 'PDF' | 'Diagram' | 'Summary' }[] = [
  { label: 'PDF', value: 'PDF' },
  { label: 'Diagram', value: 'Diagram' },
  { label: 'Summary', value: 'Summary' },
];

const NOTE_TYPE_ICONS: Record<NoteType, { icon: string; color: string }> = {
  pdf: { icon: 'document-text-outline', color: '#cfbcff' },
  handwritten: { icon: 'pencil-outline', color: '#fb923c' },
  diagram: { icon: 'color-palette-outline', color: '#4ade80' },
  pyq: { icon: 'layers-outline', color: '#60a5fa' },
};

const UPLOAD_NOTE_TYPES: { label: string; value: UploadNoteType; icon: string }[] = [
  { label: 'PDF', value: 'PDF', icon: '📄' },
  { label: 'Handwritten', value: 'Handwritten', icon: '✍️' },
  { label: 'Diagram', value: 'Diagram', icon: '🎨' },
  { label: 'PYQ', value: 'PYQ', icon: '📝' },
];

const SUBJECT_FILL_COLORS: Record<string, string> = {
  Anatomy: '#cfbcff', Physiology: '#4ade80', Biochemistry: '#60a5fa',
  Pathology: '#fb923c', Pharmacology: '#f472b6', Microbiology: '#22d3ee',
  Surgery: '#fbbf24', Medicine: '#a78bfa',
};

const SUBJECT_COLORS_DARK: Record<string, { bg: string; text: string; border: string }> = {
  Anatomy:      { bg: 'rgba(207,188,255,0.12)', text: '#cfbcff', border: 'rgba(207,188,255,0.18)' },
  Physiology:   { bg: 'rgba(74,222,128,0.12)',  text: '#4ade80', border: 'rgba(74,222,128,0.18)' },
  Biochemistry: { bg: 'rgba(96,165,250,0.12)',  text: '#60a5fa', border: 'rgba(96,165,250,0.18)' },
  Pathology:    { bg: 'rgba(251,146,60,0.12)',  text: '#fb923c', border: 'rgba(251,146,60,0.18)' },
  Pharmacology: { bg: 'rgba(244,114,182,0.12)', text: '#f472b6', border: 'rgba(244,114,182,0.18)' },
  Microbiology: { bg: 'rgba(34,211,238,0.12)',  text: '#22d3ee', border: 'rgba(34,211,238,0.18)' },
  Surgery:      { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24', border: 'rgba(251,191,36,0.18)' },
  Medicine:     { bg: 'rgba(167,139,250,0.12)', text: '#a78bfa', border: 'rgba(167,139,250,0.18)' },
};

const SUBJECT_COLORS_LIGHT: Record<string, { bg: string; text: string; border: string }> = {
  Anatomy:      { bg: 'rgba(94,53,177,0.08)',  text: '#5E35B1', border: 'rgba(94,53,177,0.18)' },
  Physiology:   { bg: 'rgba(22,163,74,0.08)',  text: '#16A34A', border: 'rgba(22,163,74,0.18)' },
  Biochemistry: { bg: 'rgba(37,99,235,0.08)',  text: '#2563EB', border: 'rgba(37,99,235,0.18)' },
  Pathology:    { bg: 'rgba(194,65,12,0.08)',  text: '#C2410C', border: 'rgba(194,65,12,0.18)' },
  Pharmacology: { bg: 'rgba(190,24,93,0.08)',  text: '#BE185D', border: 'rgba(190,24,93,0.18)' },
  Microbiology: { bg: 'rgba(8,145,178,0.08)',  text: '#0891B2', border: 'rgba(8,145,178,0.18)' },
  Surgery:      { bg: 'rgba(180,83,9,0.08)',   text: '#B45309', border: 'rgba(180,83,9,0.18)' },
  Medicine:     { bg: 'rgba(109,40,217,0.08)', text: '#6D28D9', border: 'rgba(109,40,217,0.18)' },
};

const getSubjectColor = (s: string, isDark: boolean) => {
  const map = isDark ? SUBJECT_COLORS_DARK : SUBJECT_COLORS_LIGHT;
  const fallback = isDark
    ? { bg: 'rgba(207,188,255,0.12)', text: '#cfbcff', border: 'rgba(207,188,255,0.18)' }
    : { bg: 'rgba(94,53,177,0.08)', text: '#5E35B1', border: 'rgba(94,53,177,0.18)' };
  return map[s] ?? fallback;
};

type PickedFile = { uri: string; name: string; mimeType: string; size?: number };

// ─── Filter chip ────────────────────────────────────────────────────────────
function FilterChip({
  label, selected, onPress, activeColor,
}: {
  label: string; selected: boolean; onPress: () => void; activeColor?: string;
}) {
  const isDark = useThemeStore((s) => s.isDark);
  const t = getTheme(isDark);
  const color = activeColor ?? t.primaryContainer;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{ paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999, marginRight: 8, backgroundColor: selected ? color : t.card, borderWidth: 1, borderColor: selected ? color : t.cardBorder }}
    >
      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: selected ? '#1a0a3a' : t.onSurfaceVariant }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Note card ───────────────────────────────────────────────────────────────
function NoteCard({
  item,
  onDownload,
  onStar,
  isDownloading,
  isRating,
}: {
  item: Note;
  onDownload: () => void;
  onStar: () => void;
  isDownloading: boolean;
  isRating: boolean;
}) {
  const starScale = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const [flipped, setFlipped] = useState(false);
  const isDark = useThemeStore((s) => s.isDark);
  const t = getTheme(isDark);
  const subjectColor = getSubjectColor(item.subject, isDark);
  const typeInfo = NOTE_TYPE_ICONS[item.noteType] ?? NOTE_TYPE_ICONS.pdf;

  const handleStar = () => {
    Animated.sequence([
      Animated.spring(starScale, { toValue: 1.6, useNativeDriver: true, speed: 40, bounciness: 4 }),
      Animated.spring(starScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
    ]).start(() => onStar());
  };

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleFlip = () => {
    const direction = flipped ? 1 : -1;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: direction * 18, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setFlipped((f) => !f);
      slideAnim.setValue(-direction * 18);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start();
    });
  };

  return (
    <Animated.View style={{ transform: [{ scale: cardScale }], marginHorizontal: 20, marginBottom: 16 }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleFlip}
        onPressIn={() => Animated.spring(cardScale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 0 }).start()}
        onPressOut={() => Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start()}
        style={{ backgroundColor: t.card, borderRadius: 28, borderWidth: 1, borderColor: flipped ? `${subjectColor.text}40` : `${subjectColor.text}20`, padding: 22, minHeight: 180 }}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
        {flipped ? (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: subjectColor.text, letterSpacing: 1.5, textTransform: 'uppercase' }}>About this note</Text>
            </View>
            {item.description ? (
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: t.onSurface, lineHeight: 22, marginBottom: 14 }}>{item.description}</Text>
            ) : (
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: t.onSurfaceVariant, marginBottom: 14 }}>No description provided.</Text>
            )}
            {(item.tags ?? []).length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {(item.tags ?? []).map((tag) => (
                  <View key={tag} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: t.iconBg, borderWidth: 1, borderColor: t.cardBorder }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: t.onSurfaceVariant, letterSpacing: 0.5 }}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.outlineVariant }}>Tap to flip back</Text>
          </View>
        ) : (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.iconBg, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={typeInfo.icon as any} size={20} color={typeInfo.color} />
                </View>
                <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: subjectColor.bg, borderWidth: 1, borderColor: subjectColor.border }}>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: subjectColor.text }}>{item.subject}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onDownload} disabled={isDownloading} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? 'rgba(207,188,255,0.1)' : 'rgba(181,153,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(207,188,255,0.15)' : 'rgba(181,153,255,0.2)' }}>
                {isDownloading ? <ActivityIndicator size="small" color={t.primaryText} /> : <Ionicons name="arrow-down-outline" size={18} color={t.primaryText} />}
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 20, color: t.onSurface, letterSpacing: -0.3, lineHeight: 26, marginBottom: 6 }} numberOfLines={2}>{item.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="person-outline" size={12} color={t.onSurfaceVariant} />
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: t.onSurfaceVariant }}>by {item.author?.name ?? 'Senior'}</Text>
              </View>
              {(item.tags ?? []).length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {(item.tags ?? []).map((tag) => (
                    <View key={tag} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: t.iconBg, borderWidth: 1, borderColor: t.cardBorder }}>
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: t.onSurfaceVariant, letterSpacing: 0.5 }}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTopWidth: 1, borderTopColor: t.separator }}>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name={item.ratingCount && item.ratingCount > 0 ? 'star' : 'star-outline'} size={16} color={item.ratingCount && item.ratingCount > 0 ? '#fb923c' : t.onSurfaceVariant} />
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: item.ratingCount && item.ratingCount > 0 ? t.onSurface : t.onSurfaceVariant }}>{item.ratingCount ?? 0}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="arrow-down-circle-outline" size={16} color={t.onSurfaceVariant} />
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: t.onSurfaceVariant }}>{item.downloads ?? 0}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleStar} disabled={isRating} activeOpacity={0.7}>
                <Animated.View style={{ transform: [{ scale: starScale }] }}>
                  <Ionicons name={item.hasRated ? 'star' : 'star-outline'} size={22} color={item.hasRated ? t.primaryText : t.outlineVariant} />
                </Animated.View>
              </TouchableOpacity>
            </View>
          </View>
        )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function NotesScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isDark = useThemeStore((s) => s.isDark);
  const t = getTheme(isDark);
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<NoteType[]>([]);

  const toggleSubject = (s: Subject) =>
    setSelectedSubjects((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  const toggleType = (t: NoteType) =>
    setSelectedTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'notes' | 'requests'>('notes');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestTopic, setRequestTopic] = useState('');
  const [requestNoteType, setRequestNoteType] = useState<'PDF' | 'Diagram' | 'Summary'>('PDF');

  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSubject, setUploadSubject] = useState<Subject>('Anatomy');
  const [uploadNoteType, setUploadNoteType] = useState<UploadNoteType>('PDF');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [fulfillRequestId, setFulfillRequestId] = useState<string | null>(null);

  const measuredContentHeight = useRef(300);
  const collapsibleHeightAnim = useRef(new Animated.Value(300)).current;
  const collapsibleIsExpanded = useRef(true);
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down' | null>(null);

  const handleScroll = (e: any) => {
    const y = Math.max(0, e.nativeEvent.contentOffset.y);
    const { contentSize, layoutMeasurement } = e.nativeEvent;
    const diff = y - lastScrollY.current;
    lastScrollY.current = y;

    if (Math.abs(diff) < 1) return;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - y;
    if (distanceFromBottom < 40 && diff > 0) return;

    const newDir = diff > 0 ? 'down' : 'up';
    if (newDir === scrollDirection.current) return;
    scrollDirection.current = newDir;

    const shouldCollapse = newDir === 'down';
    if (shouldCollapse === !collapsibleIsExpanded.current) return;
    collapsibleIsExpanded.current = !shouldCollapse;

    collapsibleHeightAnim.stopAnimation(() => {
      Animated.timing(collapsibleHeightAnim, {
        toValue: shouldCollapse ? 0 : measuredContentHeight.current,
        duration: 200,
        useNativeDriver: false,
        isInteraction: false,
      }).start();
    });
  };

  const collapsibleOpacity = collapsibleHeightAnim.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const normalizedSearchQuery = useMemo(
    () => searchQuery.trim().toLocaleLowerCase(),
    [searchQuery]
  );

  const resetUploadForm = () => {
    setUploadTitle(''); setUploadSubject('Anatomy'); setUploadNoteType('PDF');
    setUploadDesc(''); setUploadTags(''); setPickedFile(null);
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/csv'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const a = result.assets[0];
      setPickedFile({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'application/octet-stream', size: a.size });
    }
  };

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!uploadTitle.trim()) return Promise.reject(new Error('Title required'));
      if (!pickedFile) return Promise.reject(new Error('Please pick a file'));
      return notesApi.upload({
        title: uploadTitle.trim(), subject: uploadSubject, noteType: uploadNoteType,
        description: uploadDesc.trim() || undefined, tags: uploadTags.trim() || undefined,
        fileUri: pickedFile.uri, fileName: pickedFile.name, fileType: pickedFile.mimeType,
      });
    },
    onSuccess: async (note) => {
      const wasFulfilling = fulfillRequestId;
      if (fulfillRequestId) {
        const rid = fulfillRequestId;
        await fulfillMutation.mutateAsync({ requestId: rid, noteId: note.id }).catch(() => {});
        setFulfillRequestId(null);
        queryClient.setQueryData<NoteRequest[]>(['note-requests'], (old) => (old ?? []).filter((r) => r.id !== rid));
        queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      }
      Toast.show({
        type: 'success',
        text1: wasFulfilling ? 'Request fulfilled! 🎉' : 'Note uploaded!',
        text2: wasFulfilling ? "The note is now in the requester's profile." : 'Thanks for contributing.',
      });
      setShowUpload(false); resetUploadForm();
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['stats', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['achievements', user?.id] });
    },
    onError: (e: any) => {
      Toast.show({ type: 'error', text1: e?.response?.data?.message ?? e?.message ?? 'Upload failed' });
    },
  });

  const { data: allRequests = [] } = useQuery<NoteRequest[]>({
    queryKey: ['note-requests'],
    queryFn: notesApi.getAllRequests,
    staleTime: 30_000,
  });

  const pendingRequests = allRequests.filter((r) => r.status === 'pending');
  const sortedRequests = [...allRequests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const fulfillMutation = useMutation({
    mutationFn: ({ requestId, noteId }: { requestId: string; noteId: string }) => notesApi.fulfillRequest(requestId, noteId),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Request fulfilled!', text2: 'Note is now public.' });
      queryClient.invalidateQueries({ queryKey: ['note-requests'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: (e: any) => {
      Toast.show({ type: 'error', text1: e?.response?.data?.message ?? 'Failed to fulfill' });
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['notes', selectedSubjects, selectedTypes],
    queryFn: () => notesApi.search({
      subjects: selectedSubjects.length > 0 ? selectedSubjects : undefined,
      noteTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
      // fallback single-value fields for backends that only accept one value
      subject: selectedSubjects.length === 1 ? selectedSubjects[0] : undefined,
      noteType: selectedTypes.length === 1 ? selectedTypes[0] : undefined,
      limit: 50,
    }),
  });

  const visibleNotes = useMemo(() => {
    const notes = data?.notes ?? [];
    if (!normalizedSearchQuery) return notes;

    return notes.filter((note) =>
      note.title.toLocaleLowerCase().includes(normalizedSearchQuery)
    );
  }, [data?.notes, normalizedSearchQuery]);

  const downloadMutation = useMutation({
    mutationFn: (id: string) => notesApi.download(id),
    onSuccess: async (res) => {
      try {
        const localUri = (FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '') + (res.fileName ?? 'download');
        const { uri } = await FileSystem.downloadAsync(res.url, localUri);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert('Downloaded', 'File saved to device.');
        }
      } catch (e: any) { Alert.alert('Download failed', e.message); }
    },
    onError: () => Toast.show({ type: 'error', text1: 'Download failed' }),
  });

  const rateMutation = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: number }) => notesApi.rate(id, rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: (e: any) => {
      Toast.show({ type: 'error', text1: e?.response?.data?.message ?? 'Failed to rate' });
    },
  });

  const requestMutation = useMutation({
    mutationFn: () => {
      if (!requestTopic.trim()) return Promise.reject(new Error('Topic required'));
      return notesApi.requestNote({ subject: selectedSubjects[0] ?? 'Anatomy', topic: requestTopic.trim(), noteType: requestNoteType });
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Request sent!', text2: 'Seniors will upload soon.' });
      setShowRequestForm(false); setRequestTopic(''); setRequestNoteType('PDF');
      queryClient.invalidateQueries({ queryKey: ['note-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
    },
    onError: (e: any) => {
      Toast.show({ type: 'error', text1: e?.response?.data?.message ?? e?.message ?? 'Request failed' });
    },
  });

  // ── Request form card ─────────────────────────────────────────────────────
  const phColor = isDark ? 'rgba(148,142,157,0.4)' : 'rgba(90,86,112,0.4)';
  const RequestFormCard = (
    <View style={{ backgroundColor: t.card, borderRadius: 28, borderWidth: 1, borderColor: t.cardBorder, paddingHorizontal: 24, paddingVertical: 26, marginBottom: 28 }}>
      <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 20, lineHeight: 27, color: t.onSurface, marginBottom: 6 }}>Need something specific?</Text>
      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, color: t.onSurfaceVariant, marginBottom: 22 }}>Request a note and others will fulfill it.</Text>
      {showRequestForm ? (
        <>
          <TextInput
            value={requestTopic}
            onChangeText={setRequestTopic}
            placeholder="e.g. Brachial Plexus, Krebs Cycle..."
            placeholderTextColor={phColor}
            style={{ backgroundColor: t.innerSurface, borderWidth: 1, borderColor: t.cardBorder, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontFamily: 'Inter_400Regular', fontSize: 14, color: t.onSurface, marginBottom: 16 }}
          />
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
            {REQUEST_NOTE_TYPES.map((nt) => (
              <TouchableOpacity key={nt.value} onPress={() => setRequestNoteType(nt.value)} style={{ flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center', backgroundColor: requestNoteType === nt.value ? t.primaryContainer : 'transparent', borderWidth: 1, borderColor: requestNoteType === nt.value ? t.primaryContainer : t.cardBorder }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: requestNoteType === nt.value ? '#39197c' : t.onSurfaceVariant }}>{nt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => { setShowRequestForm(false); setRequestTopic(''); }} style={{ flex: 1, borderWidth: 1, borderColor: t.cardBorder, borderRadius: 14, paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: t.onSurfaceVariant }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => requestMutation.mutate()} disabled={requestMutation.isPending || !requestTopic.trim()} style={{ flex: 1, backgroundColor: t.primaryContainer, borderRadius: 14, paddingVertical: 12, alignItems: 'center', opacity: requestTopic.trim() ? 1 : 0.4 }}>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: '#39197c' }}>{requestMutation.isPending ? 'Sending…' : 'Send Request'}</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <TouchableOpacity onPress={() => setShowRequestForm(true)} style={{ backgroundColor: t.primaryContainer, borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: '#39197c' }}>Request Custom Note</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>

      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
          <View>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.onSurfaceVariant, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Resource Hub</Text>
            <Text style={{ fontFamily: 'NotoSerif_700Bold', fontSize: 36, color: t.onSurface, letterSpacing: -0.5, lineHeight: 40 }}>Senior Notes</Text>
          </View>
          <TouchableOpacity onPress={() => setShowUpload(true)} activeOpacity={0.85}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.primaryContainer, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, gap: 6, marginBottom: 4, shadowColor: t.primaryContainer, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 }}>
            <Ionicons name="arrow-up-outline" size={16} color="#39197c" />
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: '#39197c' }}>Upload</Text>
          </TouchableOpacity>
        </View>

        {/* Tab switcher */}
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: t.separator }}>
          {(['notes', 'requests'] as const).map((tab) => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} activeOpacity={0.7}
              style={{ paddingBottom: 13, marginRight: 28, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Text style={{ fontFamily: activeTab === tab ? 'Inter_700Bold' : 'Inter_400Regular', fontSize: 14, color: activeTab === tab ? t.onSurface : t.outlineVariant, letterSpacing: 0.2 }}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              {tab === 'requests' && pendingRequests.length > 0 && (
                <View style={{ backgroundColor: isDark ? 'rgba(207,188,255,0.15)' : 'rgba(181,153,255,0.15)', borderRadius: 8, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 1, borderColor: t.cardBorder }}>
                  <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: t.primaryText }}>{pendingRequests.length}</Text>
                </View>
              )}
              {activeTab === tab && (
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, borderRadius: 1, backgroundColor: t.primaryContainer }} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Collapsible: search + filters ── */}
      {activeTab === 'notes' && (
        <Animated.View style={{ overflow: 'hidden', height: collapsibleHeightAnim, opacity: collapsibleOpacity, minHeight: 0 }}>
          <View onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && h !== measuredContentHeight.current) {
              measuredContentHeight.current = h;
              if (collapsibleIsExpanded.current) collapsibleHeightAnim.setValue(h);
            }
          }}>
            <View style={{ paddingHorizontal: 20, marginTop: 16, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.card, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: t.cardBorder }}>
                <Ionicons name="search-outline" size={16} color={t.outlineVariant} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="never"
                  placeholder="Search note titles..."
                  placeholderTextColor={phColor}
                  style={{ flex: 1, marginLeft: 10, fontFamily: 'Inter_400Regular', fontSize: 14, color: t.onSurface }}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color={t.outlineVariant} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20, paddingRight: 12, paddingVertical: 8, alignItems: 'center' }}>
              {SUBJECTS.map((s) => (
                <FilterChip key={s} label={s} selected={selectedSubjects.includes(s)} onPress={() => toggleSubject(s)} activeColor={SUBJECT_FILL_COLORS[s]} />
              ))}
              <View style={{ width: 1, height: 18, backgroundColor: t.separator, marginRight: 7 }} />
              {NOTE_TYPES.map((nt) => (
                <FilterChip key={nt.value} label={nt.label} selected={selectedTypes.includes(nt.value)} onPress={() => toggleType(nt.value)} />
              ))}
            </ScrollView>
          </View>
        </Animated.View>
      )}

      {/* ── Content ── */}
      {activeTab === 'requests' ? (
        <ScrollView showsVerticalScrollIndicator={false} onScroll={handleScroll} scrollEventThrottle={16} decelerationRate="normal" overScrollMode="never" bounces={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}>
          {RequestFormCard}
          {sortedRequests.length > 0 && (
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: t.onSurfaceVariant, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>Open Requests</Text>
          )}
          {sortedRequests.map((req) => (
            <TouchableOpacity key={req.id} activeOpacity={0.85}
              onPress={() => { setFulfillRequestId(req.id); setUploadSubject(req.subject as any); setShowUpload(true); }}
              style={{ backgroundColor: t.card, borderRadius: 24, borderWidth: 1, borderColor: t.cardBorder, padding: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: getSubjectColor(req.subject, isDark).bg, borderWidth: 1, borderColor: getSubjectColor(req.subject, isDark).border }}>
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: getSubjectColor(req.subject, isDark).text }}>{req.subject}</Text>
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: t.iconBg, borderWidth: 1, borderColor: t.cardBorder }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 1, color: t.onSurfaceVariant }}>{req.noteType}</Text>
                  </View>
                </View>
                <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 17, lineHeight: 23, color: t.onSurface, marginBottom: 6 }}>{req.topic}</Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: t.onSurfaceVariant }}>by {req.requestedBy?.name ?? 'Someone'}</Text>
              </View>
              <View style={{ backgroundColor: isDark ? 'rgba(207,188,255,0.12)' : 'rgba(181,153,255,0.12)', borderRadius: 16, minWidth: 74, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', borderWidth: 1, borderColor: t.cardBorder }}>
                <Ionicons name="arrow-up-circle-outline" size={20} color={t.primaryText} />
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 9, color: t.primaryText, marginTop: 4, letterSpacing: 0.5 }}>FULFILL</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <LoadingSpinner size={36} />
        </View>
      ) : (
        <FlatList
          data={visibleNotes}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="normal"
          overScrollMode="never"
          bounces={false}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <NoteCard item={item} onDownload={() => downloadMutation.mutate(item.id)} onStar={() => rateMutation.mutate({ id: item.id, rating: 1 })} isDownloading={downloadMutation.isPending && downloadMutation.variables === item.id} isRating={rateMutation.isPending} />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 80 }}>
              <Text style={{ fontSize: 44 }}>📭</Text>
              <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 18, color: t.onSurface, marginTop: 14 }}>No notes found</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: t.onSurfaceVariant, marginTop: 6 }}>Try different filters or request one below</Text>
            </View>
          }
        />
      )}

      {/* ── Upload Modal ── */}
      <Modal visible={showUpload} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowUpload(false); resetUploadForm(); setFulfillRequestId(null); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: t.separator }}>
              <TouchableOpacity onPress={() => { setShowUpload(false); resetUploadForm(); setFulfillRequestId(null); }}>
                <Ionicons name="close" size={24} color={t.onSurfaceVariant} />
              </TouchableOpacity>
              <Text style={{ fontFamily: 'NotoSerif_600SemiBold', fontSize: 18, color: t.onSurface }}>{fulfillRequestId ? 'Fulfill Request' : 'Upload Note'}</Text>
              <TouchableOpacity onPress={() => uploadMutation.mutate()} disabled={uploadMutation.isPending || !uploadTitle.trim() || !pickedFile} style={{ opacity: uploadTitle.trim() && pickedFile ? 1 : 0.4 }}>
                {uploadMutation.isPending ? <ActivityIndicator size="small" color={t.primaryText} /> : <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: t.primaryText }}>Post</Text>}
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              {fulfillRequestId && (() => {
                const req = sortedRequests.find((r) => r.id === fulfillRequestId);
                return req ? (
                  <View style={{ backgroundColor: t.card, borderRadius: 16, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: t.cardBorder }}>
                    <Text style={{ fontSize: 18, marginRight: 10 }}>📬</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: t.onSurface }}>{req.topic}</Text>
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.onSurfaceVariant }}>{req.subject} · requested by {req.requestedBy?.name}</Text>
                    </View>
                  </View>
                ) : null;
              })()}

              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: t.onSurfaceVariant, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>Title *</Text>
              <TextInput value={uploadTitle} onChangeText={setUploadTitle} placeholder="e.g. Brachial Plexus Complete Notes" placeholderTextColor={phColor} style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.cardBorder, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13, fontFamily: 'Inter_400Regular', fontSize: 14, color: t.onSurface, marginBottom: 20 }} />

              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: t.onSurfaceVariant, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>Subject *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                {SUBJECTS.map((s) => {
                  const sc = getSubjectColor(s, isDark).text;
                  const isActive = uploadSubject === s;
                  return (
                    <TouchableOpacity key={s} onPress={() => setUploadSubject(s)} style={{ marginRight: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: isActive ? sc : t.card, borderWidth: 1, borderColor: isActive ? sc : t.cardBorder }}>
                      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: isActive ? '#1a0a3a' : t.onSurfaceVariant }}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: t.onSurfaceVariant, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>Note Type *</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {UPLOAD_NOTE_TYPES.map((nt) => (
                  <TouchableOpacity key={nt.value} onPress={() => setUploadNoteType(nt.value)} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: uploadNoteType === nt.value ? t.primaryContainer : t.card, borderWidth: 1, borderColor: uploadNoteType === nt.value ? t.primaryContainer : t.cardBorder }}>
                    <Text style={{ fontSize: 13 }}>{nt.icon}</Text>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: uploadNoteType === nt.value ? '#39197c' : t.onSurfaceVariant }}>{nt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: t.onSurfaceVariant, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>Description (optional)</Text>
              <TextInput value={uploadDesc} onChangeText={setUploadDesc} placeholder="Brief description..." placeholderTextColor={phColor} multiline numberOfLines={3} style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.cardBorder, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13, fontFamily: 'Inter_400Regular', fontSize: 14, color: t.onSurface, textAlignVertical: 'top', minHeight: 80, marginBottom: 20 }} />

              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: t.onSurfaceVariant, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>Tags (optional)</Text>
              <TextInput value={uploadTags} onChangeText={setUploadTags} placeholder="e.g. upper limb, nerve, anatomy" placeholderTextColor={phColor} style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.cardBorder, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13, fontFamily: 'Inter_400Regular', fontSize: 14, color: t.onSurface, marginBottom: 20 }} />

              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: t.onSurfaceVariant, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>File *</Text>
              <TouchableOpacity onPress={pickFile} activeOpacity={0.7} style={{ borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 20, paddingVertical: 28, alignItems: 'center', justifyContent: 'center', borderColor: pickedFile ? t.primaryContainer : t.cardBorder, backgroundColor: pickedFile ? `${t.primaryContainer}0D` : 'transparent', marginBottom: 8 }}>
                {pickedFile ? (
                  <>
                    <Ionicons name="document-attach" size={30} color={t.primaryText} />
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: t.primaryText, marginTop: 8, maxWidth: '80%', textAlign: 'center' }} numberOfLines={1}>{pickedFile.name}</Text>
                    {pickedFile.size ? <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.onSurfaceVariant, marginTop: 4 }}>{(pickedFile.size / 1024).toFixed(1)} KB</Text> : null}
                  </>
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={30} color={t.outlineVariant} />
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: t.onSurfaceVariant, marginTop: 8 }}>Tap to pick a file</Text>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: t.outlineVariant, marginTop: 4 }}>PDF, Images, Word, CSV</Text>
                  </>
                )}
              </TouchableOpacity>
              {pickedFile && (
                <TouchableOpacity onPress={() => setPickedFile(null)} style={{ alignItems: 'center', paddingVertical: 4 }}>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: t.onSurfaceVariant }}>Remove file</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
