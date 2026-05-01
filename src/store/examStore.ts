import { create } from 'zustand';
import { ExamPack, VivaQ, Topic, Subject } from '../types';

interface ExamState {
  selectedSubject: Subject | null;
  generatedPack: ExamPack | null;
  vivaQuestion: VivaQ | null;
  topics: Topic[];
  isGenerating: boolean;
  isAskingViva: boolean;
  setSubject: (s: Subject) => void;
  setPack: (p: ExamPack) => void;
  setVivaQuestion: (q: VivaQ) => void;
  setTopics: (topics: Topic[]) => void;
  toggleTopic: (id: string) => void;
  setIsGenerating: (v: boolean) => void;
  setIsAskingViva: (v: boolean) => void;
  reset: () => void;
}

export const useExamStore = create<ExamState>((set) => ({
  selectedSubject: null,
  generatedPack: null,
  vivaQuestion: null,
  topics: [],
  isGenerating: false,
  isAskingViva: false,

  setSubject: (s) => set({ selectedSubject: s }),
  setPack: (p) => set({ generatedPack: p }),
  setVivaQuestion: (q) => set({ vivaQuestion: q }),
  setTopics: (topics) => set({ topics }),
  setIsGenerating: (v) => set({ isGenerating: v }),
  setIsAskingViva: (v) => set({ isAskingViva: v }),

  toggleTopic: (id) =>
    set((state) => ({
      topics: state.topics.map((t) =>
        t.id === id ? { ...t, isCompleted: !t.isCompleted } : t
      ),
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
}));
