import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExamPack, VivaQ, Topic, Subject, DailyUsage } from '../types';

const PACK_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_PACKS_PER_SUBJECT = 3;

export interface StoredPack {
  pack: ExamPack & { _id?: string; status?: string };
  generatedAt: number;
  examType: string;
  topics?: string[];
}

interface ExamState {
  selectedSubject: Subject | null;
  packsBySubject: Record<string, StoredPack[]>;
  // viva questions per subject (today's session)
  vivasBySubject: Record<string, VivaQ[]>;
  vivaTopics: string[];
  completionsBySubject: Record<string, Record<string, boolean>>;
  topics: Topic[];
  isGenerating: boolean;
  isAskingViva: boolean;
  dailyUsage: DailyUsage | null;

  setSubject: (s: Subject) => void;
  addPack: (pack: ExamPack & { _id?: string; status?: string }, examType: string, topics: string[]) => void;
  updatePack: (packId: string, updated: Partial<ExamPack & { _id?: string; status?: string }>) => void;
  getActivePacks: (subject: Subject) => StoredPack[];
  setPacksForSubject: (subject: Subject, packs: Array<ExamPack & { _id?: string; status?: string }>) => void;

  addVivaQuestion: (subject: Subject, q: VivaQ) => void;
  setVivaQuestions: (subject: Subject, qs: VivaQ[]) => void;
  getVivaQuestions: (subject: Subject) => VivaQ[];
  setVivaTopics: (t: string[]) => void;

  setTopics: (topics: Topic[]) => void;
  toggleTopic: (id: string) => void;
  addTopic: (title: string) => void;
  editTopic: (id: string, title: string) => void;
  deleteTopic: (id: string) => void;
  setIsGenerating: (v: boolean) => void;
  setIsAskingViva: (v: boolean) => void;
  setDailyUsage: (u: DailyUsage) => void;
  reset: () => void;

  // legacy compat
  generatedPack: ExamPack | null;
  setPack: (p: ExamPack) => void;
  vivaQuestion: VivaQ | null;
  setVivaQuestion: (q: VivaQ | null) => void;
}

export const useExamStore = create<ExamState>()(
  persist(
    (set, get) => ({
      selectedSubject: null,
      packsBySubject: {},
      vivasBySubject: {},
      generatedPack: null,
      vivaQuestion: null,
      vivaTopics: [],
      completionsBySubject: {},
      topics: [],
      isGenerating: false,
      isAskingViva: false,
      dailyUsage: null,

      setSubject: (s) => {
        const state = get();
        const completions = state.completionsBySubject[s] ?? {};
        const rehydrated = state.topics.map((t) =>
          completions[t.id] !== undefined ? { ...t, completed: completions[t.id] } : t
        );
        set({ selectedSubject: s, topics: rehydrated, vivaTopics: [] });
      },

      addPack: (pack, examType, topics) =>
        set((state) => {
          const subject = (pack.subject ?? state.selectedSubject ?? '') as Subject;
          const existing = (state.packsBySubject[subject] ?? []).filter(
            (p) => Date.now() - p.generatedAt < PACK_TTL_MS
          );
          const updated = [...existing, { pack, generatedAt: Date.now(), examType, topics }]
            .slice(-MAX_PACKS_PER_SUBJECT);
          return {
            packsBySubject: { ...state.packsBySubject, [subject]: updated },
            generatedPack: pack,
          };
        }),

      updatePack: (packId, updated) =>
        set((state) => {
          const next: Record<string, StoredPack[]> = {};
          for (const [subj, packs] of Object.entries(state.packsBySubject)) {
            next[subj] = packs.map((sp) =>
              sp.pack._id === packId ? { ...sp, pack: { ...sp.pack, ...updated } } : sp
            );
          }
          return { packsBySubject: next };
        }),

      setPacksForSubject: (subject, packs) =>
        set((state) => {
          const mapped: StoredPack[] = packs.map((p) => ({
            pack: p,
            generatedAt: p.generatedAt ? new Date(p.generatedAt).getTime() : Date.now(),
            examType: p.packType ?? 'full-pack',
            topics: p.inputTopics ?? [],
          }));
          return { packsBySubject: { ...state.packsBySubject, [subject]: mapped } };
        }),

      getActivePacks: (subject) =>
        (get().packsBySubject[subject] ?? []).filter(
          (p) => Date.now() - p.generatedAt < PACK_TTL_MS
        ),

      addVivaQuestion: (subject, q) =>
        set((state) => {
          const existing = state.vivasBySubject[subject] ?? [];
          return { vivasBySubject: { ...state.vivasBySubject, [subject]: [...existing, q] } };
        }),

      setVivaQuestions: (subject, qs) =>
        set((state) => ({ vivasBySubject: { ...state.vivasBySubject, [subject]: qs } })),

      getVivaQuestions: (subject) => get().vivasBySubject[subject] ?? [],

      setPack: (p) => set({ generatedPack: p }),
      setVivaQuestion: (q) => set({ vivaQuestion: q }),
      setVivaTopics: (t) => set({ vivaTopics: t }),
      setDailyUsage: (u) => set({ dailyUsage: u }),

      setTopics: (topics) =>
        set((state) => {
          const subject = state.selectedSubject;
          if (!subject) return { topics };
          const completions = state.completionsBySubject[subject] ?? {};
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
          topics: [...state.topics, { id: `local-${Date.now()}`, title, yield: 'medium', completed: false }],
        })),

      editTopic: (id, title) =>
        set((state) => ({ topics: state.topics.map((t) => (t.id === id ? { ...t, title } : t)) })),

      deleteTopic: (id) =>
        set((state) => ({ topics: state.topics.filter((t) => t.id !== id) })),

      reset: () =>
        set({
          selectedSubject: null,
          generatedPack: null,
          vivaQuestion: null,
          vivaTopics: [],
          topics: [],
          isGenerating: false,
          isAskingViva: false,
        }),
    }),
    {
      name: 'exam-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        packsBySubject: state.packsBySubject,
        vivasBySubject: state.vivasBySubject,
        completionsBySubject: state.completionsBySubject,
        vivaTopics: state.vivaTopics,
      }),
    }
  )
);
