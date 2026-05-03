import apiClient from './axios';
import { ExamPack, VivaQ, Topic, Subject, ExamType, DailyUsage } from '../types';

const flattenPack = (raw: any): ExamPack => ({
  _id: raw?._id,
  status: raw?.status ?? 'done',
  subject: raw?.subject,
  packType: raw?.packType,
  inputTopics: raw?.inputTopics,
  generatedAt: raw?.generatedAt,
  ...raw?.content,
});

export const examApi = {
  // Starts async generation — returns pack with status:'pending'
  generate: (
    subject: Subject,
    type: ExamType,
    topics: string[],
  ): Promise<{ pack: ExamPack; packsRemainingToday: number }> =>
    apiClient.post('/exam/generate', { subject, type, topics }).then((r) => ({
      pack: flattenPack(r.data.data?.pack),
      packsRemainingToday: r.data.data?.packsRemainingToday ?? 0,
    })),

  // Poll pack status by ID
  getPackById: (id: string): Promise<ExamPack> =>
    apiClient.get(`/exam/pack/${id}`).then((r) => flattenPack(r.data.data?.pack)),

  // Starts async viva — returns packId to poll
  getViva: (
    subject: Subject,
    topics: string[],
  ): Promise<{ packId: string; vivaRemainingToday: number }> =>
    apiClient.post('/exam/viva', { subject, topics }).then((r) => ({
      packId: r.data.data?.packId,
      vivaRemainingToday: r.data.data?.vivaRemainingToday ?? 0,
    })),

  // Poll viva job status
  getVivaById: (id: string): Promise<{ status: 'pending' | 'done' | 'failed'; viva?: VivaQ; error?: string }> =>
    apiClient.get(`/exam/viva-job/${id}`).then((r) => r.data.data),

  getDailyUsage: (): Promise<DailyUsage> =>
    apiClient.get('/exam/usage').then((r) => r.data.data),

  // Fetch user's own non-expired packs from DB
  getMyPacks: (subject: Subject): Promise<ExamPack[]> =>
    apiClient.get('/exam/my-packs', { params: { subject } }).then((r) =>
      (r.data.data?.packs ?? []).map(flattenPack)
    ),

  // Fetch today's viva questions for subject
  getMyViva: (subject: Subject): Promise<VivaQ[]> =>
    apiClient.get('/exam/my-viva', { params: { subject } }).then((r) => r.data.data?.questions ?? []),

  getTopics: (subject: Subject): Promise<Topic[]> =>
    apiClient.get(`/topics/${subject}`).then((r) => r.data.data.topics),

  completeTopic: (topicId: string): Promise<Topic> =>
    apiClient.patch(`/topics/${topicId}/complete`).then((r) => r.data.data),
};
