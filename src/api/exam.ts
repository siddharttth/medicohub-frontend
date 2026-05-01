import apiClient from './axios';
import { ExamPack, VivaQ, Topic, Subject } from '../types';

export const examApi = {
  generatePack: (subject: Subject): Promise<ExamPack> =>
    apiClient.post('/exam/generate', { subject }).then((r) => r.data),

  askViva: (subject: Subject): Promise<VivaQ> =>
    apiClient.post('/exam/viva', { subject }).then((r) => r.data),

  getTopics: (subject: Subject): Promise<Topic[]> =>
    apiClient.get('/exam/topics', { params: { subject } }).then((r) => r.data),

  completeTopic: (topicId: string, isCompleted: boolean): Promise<Topic> =>
    apiClient.patch(`/topics/${topicId}/complete`, { isCompleted }).then((r) => r.data),

  getSavedPacks: (): Promise<ExamPack[]> =>
    apiClient.get('/exam/saved').then((r) => r.data),
};
