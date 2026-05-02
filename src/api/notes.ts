import apiClient from './axios';
import { Note, Subject, NoteType } from '../types';

// Map frontend lowercase noteType → backend enum values
const NOTE_TYPE_MAP: Record<NoteType, string> = {
  pdf: 'PDF',
  handwritten: 'Handwritten',
  diagram: 'Diagram',
  pyq: 'PYQ',
};

interface NoteSearchParams {
  subject?: Subject;
  noteType?: NoteType;
  sortBy?: string;
  q?: string;
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

export type RequestNoteType = 'PDF' | 'Diagram' | 'Summary';

interface NoteRequestData {
  subject: Subject;
  topic: string;
  noteType: RequestNoteType;
}

// Normalize backend note → frontend Note shape
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeNote = (n: any): Note => ({
  id: n._id ?? n.id,
  title: n.title,
  subject: n.subject,
  noteType: (n.noteType?.toLowerCase() ?? 'pdf') as NoteType,
  author: n.uploadedBy ?? n.author ?? { name: 'Senior' },
  rating: typeof n.rating === 'object' ? n.rating?.averageScore ?? 0 : n.rating ?? 0,
  downloads: n.downloads ?? 0,
  tags: n.tags ?? [],
  fileUrl: n.fileUrl ?? '',
  createdAt: n.createdAt,
});

export const notesApi = {
  search: (params: NoteSearchParams): Promise<NoteSearchResponse> => {
    const backendParams: Record<string, any> = {
      ...(params.subject && { subject: params.subject }),
      ...(params.noteType && { noteType: NOTE_TYPE_MAP[params.noteType] }),
      ...(params.sortBy && { sortBy: params.sortBy }),
      ...(params.q && { q: params.q }),
      ...(params.limit && { limit: params.limit }),
      ...(params.skip && { skip: params.skip }),
    };
    return apiClient.get('/notes/search', { params: backendParams }).then((r) => ({
      notes: (r.data.data ?? []).map(normalizeNote),
      pagination: r.data.pagination ?? { total: 0, limit: 20, skip: 0 },
    }));
  },

  getTrending: (): Promise<Note[]> =>
    apiClient.get('/notes/trending').then((r) =>
      (r.data.data?.notes ?? []).map(normalizeNote)
    ),

  getById: (id: string): Promise<Note> =>
    apiClient.get(`/notes/${id}`).then((r) => normalizeNote(r.data.data?.note ?? r.data.data)),

  getMyNotes: (): Promise<Note[]> =>
    apiClient.get('/notes/me').then((r) => (r.data.data ?? []).map(normalizeNote)),

  // Fix: GET not POST, and map fileUrl → url
  download: (id: string): Promise<{ url: string }> =>
    apiClient.get(`/notes/${id}/download`).then((r) => ({
      url: r.data.data?.fileUrl ?? r.data.data?.url ?? '',
    })),

  requestNote: (data: NoteRequestData): Promise<void> =>
    apiClient.post('/notes/request', {
      subject: data.subject,
      topic: data.topic,
      noteType: data.noteType,
    }).then((r) => r.data),

  rate: (id: string, score: number): Promise<Note> =>
    apiClient.post(`/notes/${id}/rate`, { score }).then((r) => normalizeNote(r.data.data)),
};
