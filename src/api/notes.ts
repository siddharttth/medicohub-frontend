import apiClient from './axios';
import { Note, Subject, NoteType } from '../types';

interface NoteSearchParams {
  subject?: Subject;
  noteType?: NoteType;
  sortBy?: string;
  limit?: number;
  skip?: number;
}

interface Pagination {
  total: number;
  limit: number;
  skip: number;
}

interface NoteSearchResponse {
  notes: Note[];
  pagination: Pagination;
}

interface NoteRequestData {
  subject: Subject;
  description: string;
  noteType: NoteType;
}

export const notesApi = {
  search: (params: NoteSearchParams): Promise<NoteSearchResponse> =>
    apiClient.get('/notes/search', { params }).then((r) => ({
      notes: r.data.data ?? [],
      pagination: r.data.pagination ?? { total: 0, limit: 20, skip: 0 },
    })),

  getTrending: (): Promise<Note[]> =>
    apiClient.get('/notes/trending').then((r) => r.data.data.notes ?? []),

  getById: (id: string): Promise<Note> =>
    apiClient.get(`/notes/${id}`).then((r) => r.data.data),

  getMyNotes: (): Promise<Note[]> =>
    apiClient.get('/notes/me').then((r) => r.data.data ?? []),

  download: (id: string): Promise<{ url: string }> =>
    apiClient.post(`/notes/${id}/download`).then((r) => r.data.data),

  requestNote: (data: NoteRequestData): Promise<void> =>
    apiClient.post('/notes/request', data).then((r) => r.data),

  rate: (id: string, rating: number): Promise<Note> =>
    apiClient.post(`/notes/${id}/rate`, { rating }).then((r) => r.data.data),
};
