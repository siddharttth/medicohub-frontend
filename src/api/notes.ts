import apiClient from './axios';
import { Note, Subject, NoteType } from '../types';

export type UploadNoteType = 'PDF' | 'Handwritten' | 'Diagram' | 'PYQ' | 'DOC' | 'CSV' | 'Image' | 'Other';

export interface UploadNoteData {
  title: string;
  subject: Subject;
  noteType: UploadNoteType;
  description?: string;
  tags?: string;
  fileUri: string;
  fileName: string;
  fileType: string;
}

interface NoteSearchParams {
  subject?: Subject;
  noteType?: NoteType;
  query?: string;
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

// Backend accepts: "PDF" | "Diagram" | "Summary"
export type RequestNoteType = 'PDF' | 'Diagram' | 'Summary';

interface NoteRequestData {
  subject: Subject;
  topic: string;
  noteType: RequestNoteType;
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
    apiClient.post('/notes/request', { subject: data.subject, topic: data.topic, noteType: data.noteType }).then((r) => r.data),

  upload: (data: UploadNoteData): Promise<Note> => {
    const form = new FormData();
    form.append('title', data.title);
    form.append('subject', data.subject);
    form.append('noteType', data.noteType);
    if (data.description) form.append('description', data.description);
    if (data.tags) form.append('tags', data.tags);
    // React Native FormData file object
    form.append('file', { uri: data.fileUri, name: data.fileName, type: data.fileType } as any);
    return apiClient.post('/notes/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data.note);
  },

  rate: (id: string, rating: number): Promise<Note> =>
    apiClient.post(`/notes/${id}/rate`, { rating }).then((r) => r.data.data),
};
