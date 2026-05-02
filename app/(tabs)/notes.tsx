import React, { useState } from 'react';
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
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import { notesApi, UploadNoteType } from '../../src/api/notes';
import { NoteRequest } from '../../src/types';
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

const UPLOAD_NOTE_TYPES: { label: string; value: UploadNoteType; icon: string }[] = [
  { label: 'PDF', value: 'PDF', icon: '📄' },
  { label: 'Handwritten', value: 'Handwritten', icon: '✍️' },
  { label: 'Diagram', value: 'Diagram', icon: '🎨' },
  { label: 'PYQ', value: 'PYQ', icon: '📝' },
  { label: 'DOC', value: 'DOC', icon: '📃' },
  { label: 'Image', value: 'Image', icon: '🖼️' },
  { label: 'Other', value: 'Other', icon: '📎' },
];

type PickedFile = { uri: string; name: string; mimeType: string; size?: number };

export default function NotesScreen() {
  const queryClient = useQueryClient();
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedType, setSelectedType] = useState<NoteType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestTopic, setRequestTopic] = useState('');
  const [requestNoteType, setRequestNoteType] = useState<'PDF' | 'Diagram' | 'Summary'>('PDF');

  // Upload modal state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSubject, setUploadSubject] = useState<Subject>('Anatomy');
  const [uploadNoteType, setUploadNoteType] = useState<UploadNoteType>('PDF');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);

  const resetUploadForm = () => {
    setUploadTitle(''); setUploadSubject('Anatomy'); setUploadNoteType('PDF');
    setUploadDesc(''); setUploadTags(''); setPickedFile(null);
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/csv'],
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
        title: uploadTitle.trim(),
        subject: uploadSubject,
        noteType: uploadNoteType,
        description: uploadDesc.trim() || undefined,
        tags: uploadTags.trim() || undefined,
        fileUri: pickedFile.uri,
        fileName: pickedFile.name,
        fileType: pickedFile.mimeType,
      });
    },
    onSuccess: async (note) => {
      // If uploaded to fulfill a request, link them
      if (fulfillRequestId) {
        await fulfillMutation.mutateAsync({ requestId: fulfillRequestId, noteId: note.id }).catch(() => {});
        setFulfillRequestId(null);
      }
      Toast.show({ type: 'success', text1: 'Note uploaded!', text2: fulfillRequestId ? 'Request fulfilled 🎉' : 'Thanks for contributing.' });
      setShowUpload(false);
      resetUploadForm();
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Upload failed';
      Toast.show({ type: 'error', text1: msg });
    },
  });

  const { data: allRequests = [] } = useQuery<NoteRequest[]>({
    queryKey: ['note-requests'],
    queryFn: notesApi.getAllRequests,
    staleTime: 30_000,
  });

  const pendingRequests = allRequests.filter((r) => r.status === 'pending');

  const fulfillMutation = useMutation({
    mutationFn: ({ requestId, noteId }: { requestId: string; noteId: string }) =>
      notesApi.fulfillRequest(requestId, noteId),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Request fulfilled!', text2: 'Note is now public.' });
      queryClient.invalidateQueries({ queryKey: ['note-requests'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: (e: any) => {
      Toast.show({ type: 'error', text1: e?.response?.data?.message ?? 'Failed to fulfill' });
    },
  });

  const [fulfillRequestId, setFulfillRequestId] = useState<string | null>(null);

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
    onSuccess: async (res) => {
      try {
        const localUri = (FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '') + (res.fileName ?? 'download');
        const { uri } = await FileSystem.downloadAsync(res.url, localUri);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert('Downloaded', 'File saved to device.');
        }
      } catch (e: any) {
        Alert.alert('Download failed', e.message);
      }
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
          disabled={downloadMutation.isPending}
        >
          {downloadMutation.isPending && downloadMutation.variables === item.id ? (
            <ActivityIndicator size="small" color="#39197c" />
          ) : (
            <Ionicons name="download-outline" size={18} color="#39197c" />
          )}
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
        <Text style={{ color: '#cfbcff', fontSize: 12 }}>★ {Number(item.rating ?? 0).toFixed(1)}</Text>
        <Text className="text-outline text-xs ml-3">↓ {item.downloads ?? 0} downloads</Text>
      </View>
    </GlassCard>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-on-surface font-inter-bold text-2xl">Senior Notes 📚</Text>
          <TouchableOpacity
            onPress={() => setShowUpload(true)}
            className="bg-primary rounded-xl px-3 py-2 flex-row items-center"
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-upload-outline" size={16} color="#39197c" />
            <Text className="text-on-primary font-inter-medium text-xs ml-1">Upload</Text>
          </TouchableOpacity>
        </View>

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
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Text style={{ fontSize: 40 }}>📭</Text>
              <Text className="text-on-surface-variant font-inter-medium text-base mt-3">No notes found</Text>
              <Text className="text-outline font-inter text-sm mt-1">Try different filters or request one below</Text>
            </View>
          }
          ListFooterComponent={
            <View className="mx-5 mb-6">
              {/* ── Open Requests ── */}
              {pendingRequests.length > 0 && (
                <View className="mb-4">
                  <Text className="text-on-surface font-inter-semibold text-base mb-2">
                    Open Requests 📬 <Text className="text-outline font-inter-medium text-sm">({pendingRequests.length})</Text>
                  </Text>
                  {pendingRequests.map((req) => (
                    <GlassCard key={req.id} className="p-3 mb-2">
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 mr-3">
                          <View className="flex-row items-center mb-1 gap-2">
                            <View className="bg-primary-container rounded-full px-2 py-0.5">
                              <Text className="text-on-primary text-xs font-inter-medium">{req.subject}</Text>
                            </View>
                            <View className="bg-surface-container-high rounded-full px-2 py-0.5">
                              <Text className="text-outline text-xs font-inter">{req.noteType}</Text>
                            </View>
                          </View>
                          <Text className="text-on-surface font-inter-semibold text-sm">{req.topic}</Text>
                          <Text className="text-outline font-inter text-xs mt-0.5">
                            Requested by {req.requestedBy?.name ?? 'Someone'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            setFulfillRequestId(req.id);
                            setUploadSubject(req.subject as any);
                            setShowUpload(true);
                          }}
                          className="bg-primary rounded-xl px-3 py-2"
                          activeOpacity={0.8}
                        >
                          <Text className="text-on-primary font-inter-medium text-xs">Fulfill</Text>
                        </TouchableOpacity>
                      </View>
                    </GlassCard>
                  ))}
                </View>
              )}

              {/* ── Request a note ── */}
              <GlassCard className="p-4" purpleGlow>
                <Text className="text-on-surface font-inter-semibold text-base mb-1">
                  Can't find what you need?
                </Text>
                <Text className="text-on-surface-variant font-inter text-sm mb-3">
                  Request a custom note from our senior contributors.
                </Text>

                {showRequestForm ? (
                  <>
                    <Text className="text-on-surface-variant font-inter-medium text-sm mb-1">Topic</Text>
                    <TextInput
                      value={requestTopic}
                      onChangeText={setRequestTopic}
                      placeholder="e.g. Brachial Plexus, Krebs Cycle..."
                      placeholderTextColor="#494551"
                      className="bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-on-surface font-inter mb-3"
                      style={{ fontSize: 14 }}
                    />

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
                          <Text style={{ color: requestNoteType === t.value ? '#39197c' : '#948e9d', fontSize: 12, fontWeight: '500' }}>
                            {t.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

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

      {/* Upload Modal */}
      <Modal visible={showUpload} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowUpload(false); resetUploadForm(); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-outline-variant">
              <TouchableOpacity onPress={() => { setShowUpload(false); resetUploadForm(); }}>
                <Ionicons name="close" size={24} color="#948e9d" />
              </TouchableOpacity>
              <Text className="text-on-surface font-inter-semibold text-base">Upload Note</Text>
              <TouchableOpacity
                onPress={() => uploadMutation.mutate()}
                disabled={uploadMutation.isPending || !uploadTitle.trim() || !pickedFile}
                style={{ opacity: uploadTitle.trim() && pickedFile ? 1 : 0.4 }}
              >
                {uploadMutation.isPending ? (
                  <ActivityIndicator size="small" color="#cfbcff" />
                ) : (
                  <Text className="text-primary font-inter-semibold text-sm">Post</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              {/* Title */}
              <Text className="text-on-surface-variant font-inter-medium text-sm mb-1">Title *</Text>
              <TextInput
                value={uploadTitle}
                onChangeText={setUploadTitle}
                placeholder="e.g. Brachial Plexus Complete Notes"
                placeholderTextColor="#494551"
                className="bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-on-surface font-inter mb-4"
                style={{ fontSize: 14 }}
              />

              {/* Subject */}
              <Text className="text-on-surface-variant font-inter-medium text-sm mb-2">Subject *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                {SUBJECTS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setUploadSubject(s)}
                    className="mr-2 px-3 py-1.5 rounded-full border"
                    style={{
                      backgroundColor: uploadSubject === s ? '#cfbcff' : 'transparent',
                      borderColor: uploadSubject === s ? '#cfbcff' : '#494551',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '500', color: uploadSubject === s ? '#39197c' : '#948e9d' }}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Note Type */}
              <Text className="text-on-surface-variant font-inter-medium text-sm mb-2">Note Type *</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {UPLOAD_NOTE_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => setUploadNoteType(t.value)}
                    className="px-3 py-2 rounded-xl border flex-row items-center"
                    style={{
                      backgroundColor: uploadNoteType === t.value ? '#cfbcff' : 'transparent',
                      borderColor: uploadNoteType === t.value ? '#cfbcff' : '#494551',
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>{t.icon}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '500', marginLeft: 4, color: uploadNoteType === t.value ? '#39197c' : '#948e9d' }}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Description */}
              <Text className="text-on-surface-variant font-inter-medium text-sm mb-1">Description (optional)</Text>
              <TextInput
                value={uploadDesc}
                onChangeText={setUploadDesc}
                placeholder="Brief description of the note..."
                placeholderTextColor="#494551"
                multiline
                numberOfLines={3}
                className="bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-on-surface font-inter mb-4"
                style={{ fontSize: 14, textAlignVertical: 'top', minHeight: 80 }}
              />

              {/* Tags */}
              <Text className="text-on-surface-variant font-inter-medium text-sm mb-1">Tags (optional)</Text>
              <TextInput
                value={uploadTags}
                onChangeText={setUploadTags}
                placeholder="e.g. upper limb, nerve, anatomy"
                placeholderTextColor="#494551"
                className="bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-on-surface font-inter mb-4"
                style={{ fontSize: 14 }}
              />

              {/* File Picker */}
              <Text className="text-on-surface-variant font-inter-medium text-sm mb-2">File *</Text>
              <TouchableOpacity
                onPress={pickFile}
                className="border-2 border-dashed border-outline-variant rounded-xl py-6 items-center justify-center mb-2"
                style={{ borderColor: pickedFile ? '#cfbcff' : '#494551' }}
                activeOpacity={0.7}
              >
                {pickedFile ? (
                  <>
                    <Ionicons name="document-attach" size={28} color="#cfbcff" />
                    <Text className="text-primary font-inter-medium text-sm mt-2" numberOfLines={1} style={{ maxWidth: '80%' }}>
                      {pickedFile.name}
                    </Text>
                    <Text className="text-outline font-inter text-xs mt-1">
                      {pickedFile.size ? `${(pickedFile.size / 1024).toFixed(1)} KB` : ''}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={28} color="#494551" />
                    <Text className="text-outline font-inter text-sm mt-2">Tap to pick a file</Text>
                    <Text className="text-outline font-inter text-xs mt-1">PDF, Images, Word, CSV</Text>
                  </>
                )}
              </TouchableOpacity>
              {pickedFile && (
                <TouchableOpacity onPress={() => setPickedFile(null)} className="items-center py-1">
                  <Text className="text-outline font-inter text-xs">Remove file</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
