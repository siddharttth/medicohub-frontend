export interface User {
  id: string;
  name: string;
  email: string;
  college: string;
  year: number;
  avatar?: string;
  streak: number;
  notesShared: number;
  studyHours: number;
  survivalRate: number;
  isPro: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Note {
  id: string;
  title: string;
  subject: string;
  noteType: 'pdf' | 'handwritten' | 'diagram' | 'pyq';
  author: User;
  rating: number;
  downloads: number;
  tags: string[];
  fileUrl: string;
  previewUrl?: string;
  createdAt: string;
}

export interface ExamPack {
  id: string;
  subject: string;
  highYieldTopics: string[];
  keyPoints: string[];
  mnemonics: string[];
  generatedAt: string;
}

export interface VivaQ {
  id: string;
  question: string;
  answer: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Topic {
  id: string;
  title: string;
  subject: string;
  isCompleted: boolean;
  isHighYield: boolean;
}

export interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  type: 'user' | 'ai' | 'other';
  isPinned: boolean;
  createdAt: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  isUnlocked: boolean;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'note' | 'exam' | 'drop' | 'achievement';
  isRead: boolean;
  createdAt: string;
}

export interface StreakDay {
  date: string;
  count: number;
}

export interface Stats {
  streakDays: number;
  notesShared: number;
  survivalRate: number;
  studyHours: number;
}

export interface OnboardingData {
  name: string;
  email: string;
  college: string;
  year: string;
  password: string;
}

export type Subject =
  | 'Anatomy'
  | 'Physiology'
  | 'Biochemistry'
  | 'Pathology'
  | 'Pharmacology'
  | 'Microbiology'
  | 'Surgery'
  | 'Medicine';

export type NoteType = 'pdf' | 'handwritten' | 'diagram' | 'pyq';
