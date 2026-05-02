import apiClient from './axios';
import { Message, Subject } from '../types';

interface SendMessageData {
  subject: Subject;
  text: string;
}

interface Pagination {
  totalCount: number;
  limit: number;
  skip: number;
  page: number;
  totalPages: number;
}

interface MessagesResponse {
  messages: Message[];
  pagination: Pagination;
}

// Normalize backend drop shape → our Message shape
// Backend: { _id, author: {_id, name}, text, isPinned, createdAt, ... }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const normalizeDrop = (d: any): Message => ({
  id: d._id ?? d.id,
  content: d.text ?? d.content ?? '',
  text: d.text ?? d.content ?? '',
  sender: {
    id: d.author?._id ?? d.author?.id ?? '',
    name: d.author?.name ?? d.authorName ?? 'Unknown',
    avatar: d.author?.avatar,
  },
  type: d.isAI ? 'ai' : 'other',
  isPinned: d.isPinned ?? false,
  createdAt: d.createdAt,
});

export const dropsApi = {
  getMessages: (subject: Subject, limit = 50, skip = 0): Promise<MessagesResponse> =>
    apiClient
      .get('/drops/messages', { params: { subject, limit, skip } })
      .then((r) => ({
        messages: (r.data.data ?? []).map(normalizeDrop),
        pagination: r.data.pagination ?? { totalCount: 0, limit, skip, page: 1, totalPages: 0 },
      })),

  sendMessage: (data: SendMessageData): Promise<Message> =>
    apiClient
      .post('/drops/messages', data)
      .then((r) => normalizeDrop(r.data.data?.drop ?? r.data.data)),
};
