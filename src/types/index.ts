export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  college: string;
  year: string;
  avatar?: string;
  role: string;
  streakDays: number;
  notesShared: number;
  createdAt?: string;
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
  ratingCount: number;
  downloads: number;
  tags: string[];
  fileUrl: string;
  previewUrl?: string;
  createdAt: string;
  hasRated?: boolean;
}

export interface ExamPackTopic {
  id: string;
  title: string;
  yield: 'high' | 'medium' | 'low';
}

export interface ExamPackPYQ {
  year: number;
  marks: number;
  type: string;
}

export interface ExamPackMCQ {
  question: string;
  options: string[];
  answer: string;
}

export interface ExamPackQA {
  question: string;
  answer: string;
}

export interface ExamPack {
  _id?: string;
  status?: 'pending' | 'done' | 'failed';
  subject: string;
  packType?: string;
  inputTopics?: string[];
  // full-pack
  mcqs?: ExamPackMCQ[];
  shortQuestions?: ExamPackQA[];
  longQuestions?: string[];
  // quick-review
  reviewQuestions?: ExamPackQA[];
  // viva-only
  vivaQuestions?: ExamPackQA[];
  generatedAt?: string;
}

export interface VivaQ {
  question: string;
  answer: string;
}

export interface DailyUsage {
  packsUsed: number;
  packsLimit: number;
  packsRemaining: number;
  vivaUsed: number;
  vivaLimit: number;
  vivaRemaining: number;
}

export interface Topic {
  id: string;
  title: string;
  yield: 'high' | 'medium' | 'low';
  completed: boolean;
}

export interface Message {
  id: string;
  content: string;
  text?: string;
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
  _id: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
  progress: { current: number; target: number };
  requirements: Record<string, number>;
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
  isActive: boolean;
  minutesSpent: number;
}

export interface Stats {
  streakDays: number;
  notesShared: number;
  totalStudyHours: number;
  notesDownloaded: number;
  messagesPosted: number;
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

export type ExamType = 'full-pack' | 'viva-only' | 'quick-review';

export interface NoteRequest {
  id: string;
  _id?: string;
  subject: Subject;
  topic: string;
  noteType: string;
  requestedBy: { id: string; name: string };
  status: 'pending' | 'fulfilled';
  fulfilledNote?: Note;
  createdAt: string;
}
