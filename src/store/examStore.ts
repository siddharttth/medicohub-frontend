import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExamPack, VivaQ, Topic, Subject } from '../types';

const PACK_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_PACKS_PER_SUBJECT = 3;

export interface StoredPack {
  pack: ExamPack;
  generatedAt: number; // timestamp
  examType: string;
}

interface ExamState {
  selectedSubject: Subject | null;
  // packs stored per subject: { [subject]: StoredPack[] }
  packsBySubject: Record<string, StoredPack[]>;
  vivaQuestion: VivaQ | null;
  // topic completion stored per subject: { [subject]: Record<topicId, boolean> }
  completionsBySubject: Record<string, Record<string, boolean>>;
  topics: Topic[];
  isGenerating: boolean;
  isAskingViva: boolean;

  setSubject: (s: Subject) => void;
  addPack: (pack: ExamPack, examType: string) => void;
  getActivePacks: (subject: Subject) => StoredPack[];
  setVivaQuestion: (q: VivaQ) => void;
  setTopics: (topics: Topic[]) => void;
  toggleTopic: (id: string) => void;
  addTopic: (title: string) => void;
  editTopic: (id: string, title: string) => void;
  deleteTopic: (id: string) => void;
  setIsGenerating: (v: boolean) => void;
  setIsAskingViva: (v: boolean) => void;
  reset: () => void;

  // legacy compat
  generatedPack: ExamPack | null;
  setPack: (p: ExamPack) => void;
}

export const useExamStore = create<ExamState>()(
  persist(
    (set, get) => ({
      selectedSubject: null,
      packsBySubject: {},
      generatedPack: null,
      vivaQuestion: null,
      completionsBySubject: {},
      topics: [],
      isGenerating: false,
      isAskingViva: false,

      setSubject: (s) => {
        const state = get();
        // Rehydrate topics with saved completions for this subject
        const completions = state.completionsBySubject[s] ?? {};
        const rehydrated = state.topics.map((t) =>
          completions[t.id] !== undefined ? { ...t, completed: completions[t.id] } : t
        );
        set({ selectedSubject: s, topics: rehydrated });
      },

      addPack: (pack, examType) =>
        set((state) => {
          const subject = pack.subject ?? state.selectedSubject ?? '';
          const existing = (state.packsBySubject[subject] ?? []).filter(
            (p) => Date.now() - p.generatedAt < PACK_TTL_MS
          );
          // cap at MAX_PACKS_PER_SUBJECT, dropping oldest if needed
          const updated = [...existing, { pack, generatedAt: Date.now(), examType }]
            .slice(-MAX_PACKS_PER_SUBJECT);
          return {
            packsBySubject: { ...state.packsBySubject, [subject]: updated },
            generatedPack: pack,
          };
        }),

      getActivePacks: (subject) => {
        const packs = get().packsBySubject[subject] ?? [];
        return packs.filter((p) => Date.now() - p.generatedAt < PACK_TTL_MS);
      },

      setPack: (p) => set({ generatedPack: p }),

      setVivaQuestion: (q) => set({ vivaQuestion: q }),

      setTopics: (topics) =>
        set((state) => {
          const subject = state.selectedSubject;
          if (!subject) return { topics };
          const completions = state.completionsBySubject[subject] ?? {};
          // Merge backend topics with locally saved completions
          const merged = topics.map((t) =>
            completions[t.id] !== undefined ? { ...t, completed: completions[t.id] } : t
          );
          return { topics: merged };
        }),

      setIsGenerating: (v) => set({ isGenerating: v }),
      setIsAskingViva: (v) => set({ isAskingViva: v }),

      toggleTopic: (id) =>
        set((state) => {
          const updated = state.topics.map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t
          );
          const subject = state.selectedSubject ?? '';
          const topic = updated.find((t) => t.id === id);
          const completions = {
            ...state.completionsBySubject,
            [subject]: {
              ...(state.completionsBySubject[subject] ?? {}),
              [id]: topic?.completed ?? false,
            },
          };
          return { topics: updated, completionsBySubject: completions };
        }),

      addTopic: (title) =>
        set((state) => ({
          topics: [
            ...state.topics,
            { id: `local-${Date.now()}`, title, yield: 'medium', completed: false },
          ],
        })),

      editTopic: (id, title) =>
        set((state) => ({
          topics: state.topics.map((t) => (t.id === id ? { ...t, title } : t)),
        })),

      deleteTopic: (id) =>
        set((state) => ({
          topics: state.topics.filter((t) => t.id !== id),
        })),

      reset: () =>
        set({
          selectedSubject: null,
          generatedPack: null,
          vivaQuestion: null,
          topics: [],
          isGenerating: false,
          isAskingViva: false,
        }),
    }),
    {
      name: 'exam-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist pack cache + completions; don't persist loading states
      partialize: (state) => ({
        packsBySubject: state.packsBySubject,
        completionsBySubject: state.completionsBySubject,
      }),
    }
  )
);
