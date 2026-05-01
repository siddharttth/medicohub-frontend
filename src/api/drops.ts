import apiClient from './axios';
import { Message, Subject } from '../types';

interface SendMessageData {
  subject: Subject;
  text: string;
}

interface Pagination {
  total: number;
  limit: number;
  skip: number;
}

interface MessagesResponse {
  messages: Message[];
  pagination: Pagination;
}

export const dropsApi = {
  getMessages: (subject: Subject, limit = 50, skip = 0): Promise<MessagesResponse> =>
    apiClient
      .get('/drops/messages', { params: { subject, limit, skip } })
      .then((r) => ({
        messages: r.data.data ?? [],
        pagination: r.data.pagination ?? { total: 0, limit, skip },
      })),

  sendMessage: (data: SendMessageData): Promise<Message> =>
    apiClient.post('/drops/messages', data).then((r) => r.data.data),
};
