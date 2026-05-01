import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { notesApi } from '../../src/api/notes';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { Chip } from '../../src/components/ui/Chip';
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

// Backend accepts only these 3 values for note requests
const REQUEST_NOTE_TYPES: { label: string; value: 'PDF' | 'Diagram' | 'Summary' }[] = [
  { label: 'PDF', value: 'PDF' },
  { label: 'Diagram', value: 'Diagram' },
  { label: 'Summary', value: 'Summary' },
];

const NOTE_TYPE_ICONS: Record<NoteType, string> = {
  pdf: '📄',
  handwritten: '✍️',
  diagram: '🎨',
  pyq: '📝',
};

export default function NotesScreen() {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedType, setSelectedType] = useState<NoteType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestTopic, setRequestTopic] = useState('');
  const [requestNoteType, setRequestNoteType] = useState<'PDF' | 'Diagram' | 'Summary'>('PDF');

  const { data, isLoading } = useQuery({
    queryKey: ['notes', selectedSubject, selectedType, searchQuery],
    queryFn: () =>
      notesApi.search({
        subject: selectedSubject ?? undefined,
        noteType: selectedType ?? undefined,
        query: searchQuery || undefined,
      }),
  });

  const downloadMutation = useMutation({
    mutationFn: (id: string) => notesApi.download(id),
    onSuccess: (res) => {
      Linking.openURL(res.url);
      Toast.show({ type: 'success', text1: 'Download started!' });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Download failed' }),
  });

  const requestMutation = useMutation({
    mutationFn: () => {
      if (!requestTopic.trim()) return Promise.reject(new Error('Topic required'));
      return notesApi.requestNote({
        subject: selectedSubject ?? 'Anatomy',
        topic: requestTopic.trim(),
        noteType: requestNoteType,
      });
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Request sent!', text2: 'Seniors will upload soon.' });
      setShowRequestForm(false);
      setRequestTopic('');
      setRequestNoteType('PDF');
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Request failed';
      Toast.show({ type: 'error', text1: msg });
    },
  });

  const renderNote = ({ item }: { item: Note }) => (
    <GlassCard className="mx-5 mb-3 p-4">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center mb-1">
            <Text style={{ fontSize: 14, marginRight: 6 }}>{NOTE_TYPE_ICONS[item.noteType]}</Text>
            <View className="bg-primary-container rounded-full px-2 py-0.5">
              <Text className="text-on-primary text-xs font-inter-medium">{item.subject}</Text>
            </View>
          </View>
          <Text className="text-on-surface font-inter-semibold text-base" numberOfLines={2}>
            {item.title}
          </Text>
          <Text className="text-on-surface-variant font-inter text-sm mt-1">by {item.author?.name ?? 'Senior'}</Text>
        </View>
        <TouchableOpacity
          onPress={() => downloadMutation.mutate(item.id)}
          className="bg-primary rounded-xl px-3 py-2"
          activeOpacity={0.8}
        >
          <Ionicons name="download-outline" size={18} color="#39197c" />
        </TouchableOpacity>
      </View>

      <View className="flex-row flex-wrap gap-1 mb-2">
        {(item.tags ?? []).map((tag) => (
          <View key={tag} className="bg-surface-container-high rounded-full px-2 py-0.5">
            <Text className="text-on-surface-variant text-xs font-inter">#{tag}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row items-center">
        <Text style={{ color: '#cfbcff', fontSize: 12 }}>★ {(item.rating ?? 0).toFixed(1)}</Text>
        <Text className="text-outline text-xs ml-3">↓ {item.downloads ?? 0} downloads</Text>
      </View>
    </GlassCard>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-on-surface font-inter-bold text-2xl mb-4">Senior Notes 📚</Text>

        {/* Search */}
        <View className="bg-surface-container border border-outline-variant rounded-2xl flex-row items-center px-4 py-3 mb-4">
          <Ionicons name="search-outline" size={18} color="#948e9d" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search notes..."
            placeholderTextColor="#494551"
            className="flex-1 ml-2 text-on-surface font-inter"
            style={{ fontSize: 15 }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#948e9d" />
            </TouchableOpacity>
          )}
        </View>

        {/* Subject chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
          <Chip label="All" selected={!selectedSubject} onPress={() => setSelectedSubject(null)} />
          {SUBJECTS.map((s) => (
            <Chip
              key={s}
              label={s}
              selected={selectedSubject === s}
              onPress={() => setSelectedSubject(selectedSubject === s ? null : s)}
            />
          ))}
        </ScrollView>

        {/* Note type tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label="All Types" selected={!selectedType} onPress={() => setSelectedType(null)} />
          {NOTE_TYPES.map((t) => (
            <Chip
              key={t.value}
              label={t.label}
              selected={selectedType === t.value}
              onPress={() => setSelectedType(selectedType === t.value ? null : t.value)}
            />
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <LoadingSpinner size={36} />
        </View>
      ) : (
        <FlatList
          data={data?.notes ?? []}
          renderItem={renderNote}
          keyExtractor={(item, index) => item.id ?? index.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Text style={{ fontSize: 40 }}>📭</Text>
              <Text className="text-on-surface-variant font-inter-medium text-base mt-3">No notes found</Text>
              <Text className="text-outline font-inter text-sm mt-1">Try different filters or request one below</Text>
            </View>
          }
          ListFooterComponent={
            <View className="mx-5 mb-6">
              <GlassCard className="p-4" purpleGlow>
                <Text className="text-on-surface font-inter-semibold text-base mb-1">
                  Can't find what you need?
                </Text>
                <Text className="text-on-surface-variant font-inter text-sm mb-3">
                  Request a custom note from our senior contributors.
                </Text>

                {showRequestForm ? (
                  <>
                    {/* Topic input */}
                    <Text className="text-on-surface-variant font-inter-medium text-sm mb-1">Topic</Text>
                    <TextInput
                      value={requestTopic}
                      onChangeText={setRequestTopic}
                      placeholder="e.g. Brachial Plexus, Krebs Cycle..."
                      placeholderTextColor="#494551"
                      className="bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-on-surface font-inter mb-3"
                      style={{ fontSize: 14 }}
                    />

                    {/* Note type selector */}
                    <Text className="text-on-surface-variant font-inter-medium text-sm mb-2">Note Type</Text>
                    <View className="flex-row gap-2 mb-4">
                      {REQUEST_NOTE_TYPES.map((t) => (
                        <TouchableOpacity
                          key={t.value}
                          onPress={() => setRequestNoteType(t.value)}
                          className="flex-1 py-2 rounded-xl items-center border"
                          style={{
                            backgroundColor: requestNoteType === t.value ? '#cfbcff' : 'transparent',
                            borderColor: requestNoteType === t.value ? '#cfbcff' : '#494551',
                          }}
                        >
                          <Text style={{
                            color: requestNoteType === t.value ? '#39197c' : '#948e9d',
                            fontSize: 12,
                            fontWeight: '500',
                          }}>
                            {t.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Subject context */}
                    <Text className="text-outline font-inter text-xs mb-3">
                      Subject: {selectedSubject ?? 'Anatomy (select a subject above to change)'}
                    </Text>

                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => { setShowRequestForm(false); setRequestTopic(''); }}
                        className="flex-1 border border-outline rounded-xl py-3 items-center"
                      >
                        <Text className="text-on-surface-variant font-inter-medium text-sm">Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => requestMutation.mutate()}
                        disabled={requestMutation.isPending || !requestTopic.trim()}
                        className="flex-1 bg-primary rounded-xl py-3 items-center"
                        style={{ opacity: requestTopic.trim() ? 1 : 0.5 }}
                      >
                        <Text className="text-on-primary font-inter-medium text-sm">
                          {requestMutation.isPending ? 'Sending...' : 'Send Request'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <TouchableOpacity
                    onPress={() => setShowRequestForm(true)}
                    className="bg-primary rounded-xl py-3 items-center"
                  >
                    <Text className="text-on-primary font-inter-medium text-sm">Request Custom Note</Text>
                  </TouchableOpacity>
                )}
              </GlassCard>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
