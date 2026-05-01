import apiClient from './axios';
import { Note, Subject, NoteType } from '../types';

interface NoteSearchParams {
  subject?: Subject;
  noteType?: NoteType;
  query?: string;
  page?: number;
  limit?: number;
}

interface NoteSearchResponse {
  notes: Note[];
  total: number;
  page: number;
  totalPages: number;
}

interface NoteRequestData {
  subject: Subject;
  description: string;
  noteType: NoteType;
}

export const notesApi = {
  search: (params: NoteSearchParams): Promise<NoteSearchResponse> =>
    apiClient.get('/notes/search', { params }).then((r) => r.data),

  getById: (id: string): Promise<Note> =>
    apiClient.get(`/notes/${id}`).then((r) => r.data),

  getMyNotes: (): Promise<Note[]> =>
    apiClient.get('/notes/me').then((r) => r.data),

  download: (id: string): Promise<{ url: string }> =>
    apiClient.post(`/notes/${id}/download`).then((r) => r.data),

  requestNote: (data: NoteRequestData): Promise<void> =>
    apiClient.post('/notes/request', data).then((r) => r.data),

  rate: (id: string, rating: number): Promise<Note> =>
    apiClient.post(`/notes/${id}/rate`, { rating }).then((r) => r.data),
};
