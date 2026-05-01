import apiClient from './axios';
import { Message } from '../types';

interface SendMessageData {
  content: string;
}

interface MessagesResponse {
  messages: Message[];
  total: number;
}

export const dropsApi = {
  getMessages: (page = 1, limit = 50): Promise<MessagesResponse> =>
    apiClient.get('/drops/messages', { params: { page, limit } }).then((r) => r.data),

  sendMessage: (data: SendMessageData): Promise<Message> =>
    apiClient.post('/drops/messages', data).then((r) => r.data),

  getPinnedMessages: (): Promise<Message[]> =>
    apiClient.get('/drops/messages/pinned').then((r) => r.data),

  pinMessage: (id: string): Promise<Message> =>
    apiClient.post(`/drops/messages/${id}/pin`).then((r) => r.data),
};
