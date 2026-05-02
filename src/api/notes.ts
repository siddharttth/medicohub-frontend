import apiClient from './axios';
import { Note, Subject, NoteType, NoteRequest } from '../types';

export type UploadNoteType = 'PDF' | 'Handwritten' | 'Diagram' | 'PYQ';

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

const normalizeRating = (rating: any): number => {
  if (typeof rating === 'number') return rating;
  if (rating && typeof rating === 'object') {
    return Number(rating.averageScore ?? rating.average ?? rating.value ?? 0);
  }
  return 0;
};

const normalizeNote = (n: any): Note => ({
  ...n,
  id: n._id ?? n.id,
  noteType: (n.noteType ?? '').toLowerCase() as Note['noteType'],
  rating: normalizeRating(n.rating),
  author: (n.author ?? n.uploadedBy)
    ? { ...(n.author ?? n.uploadedBy), id: (n.author ?? n.uploadedBy)?._id ?? (n.author ?? n.uploadedBy)?.id }
    : undefined,
});

export const notesApi = {
  search: (params: NoteSearchParams): Promise<NoteSearchResponse> =>
    apiClient.get('/notes/search', { params }).then((r) => ({
      notes: (r.data.data ?? []).map(normalizeNote),
      pagination: r.data.pagination ?? { total: 0, limit: 20, skip: 0 },
    })),

  getTrending: (): Promise<Note[]> =>
    apiClient.get('/notes/trending').then((r) => (r.data.data.notes ?? []).map(normalizeNote)),

  getById: (id: string): Promise<Note> =>
    apiClient.get(`/notes/${id}`).then((r) => normalizeNote(r.data.data)),

  getMyNotes: (): Promise<Note[]> =>
    apiClient.get('/notes/me').then((r) => (r.data.data ?? []).map(normalizeNote)),

  download: (id: string): Promise<{ url: string; fileName?: string }> =>
    apiClient.get(`/notes/${id}/download`).then((r) => ({
      url: r.data.data?.downloadUrl ?? r.data.data?.url,
      fileName: r.data.data?.fileName,
    })),

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
    }).then((r) => normalizeNote(r.data.data.note));
  },

  rate: (id: string, rating: number): Promise<Note> =>
    apiClient.post(`/notes/${id}/rate`, { rating }).then((r) => normalizeNote(r.data.data)),

  // Note requests
  getAllRequests: (): Promise<NoteRequest[]> =>
    apiClient.get('/notes/requests', { params: { status: 'pending' } }).then((r) => {
      const list = r.data.data?.requests ?? r.data.data ?? [];
      return list
        .map((req: any) => ({
          ...req,
          id: req._id ?? req.id,
          status: req.status === 'open' ? 'pending' : req.status,
          requestedBy: { id: req.requestedBy?._id ?? req.requestedBy?.id ?? '', name: req.requestedBy?.name ?? 'Unknown' },
        }))
        .filter((req: any) => req.status === 'pending');
    }),

  getMyRequests: (): Promise<NoteRequest[]> =>
    apiClient.get('/notes/requests/mine').then((r) => {
      const list = r.data.data?.requests ?? r.data.data ?? [];
      return list.map((req: any) => ({
        ...req,
        id: req._id ?? req.id,
        status: req.status === 'open' ? 'pending' : req.status,
        requestedBy: { id: req.requestedBy?._id ?? req.requestedBy?.id ?? '', name: req.requestedBy?.name ?? 'Unknown' },
        fulfilledNote: req.fulfilledNote ? normalizeNote(req.fulfilledNote) : undefined,
      }));
    }),

  fulfillRequest: (requestId: string, noteId: string): Promise<void> =>
    apiClient.patch(`/notes/requests/${requestId}/fulfill`, { noteId }).then((r) => r.data),
};
