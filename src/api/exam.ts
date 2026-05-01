import apiClient from './axios';
import { ExamPack, VivaQ, Topic, Subject, ExamType } from '../types';

export const examApi = {
  generate: (subject: Subject, type: ExamType): Promise<ExamPack> =>
    apiClient.post('/exam/generate', { subject, type }).then((r) => {
      const pack = r.data.data?.pack;
      // Flatten: merge pack root + pack.content so screen gets a single object
      return {
        subject: pack?.subject,
        packType: pack?.packType,
        generatedAt: pack?.generatedAt,
        ...pack?.content,   // topics, mnemonics, pyqs, tips
      } as ExamPack;
    }),

  getViva: (subject: Subject): Promise<VivaQ> =>
    apiClient.post('/exam/viva', { subject }).then((r) => r.data.data.viva),

  getTopics: (subject: Subject): Promise<Topic[]> =>
    apiClient.get(`/topics/${subject}`).then((r) => r.data.data.topics),

  completeTopic: (topicId: string): Promise<Topic> =>
    apiClient.patch(`/topics/${topicId}/complete`).then((r) => r.data.data),

  getPacks: (subject: Subject): Promise<ExamPack[]> =>
    apiClient.get('/exam/packs', { params: { subject } }).then((r) => r.data.data),
};
