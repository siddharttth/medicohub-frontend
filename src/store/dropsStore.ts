import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { Message } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const SOCKET_URL = API_URL.replace('/api', '');

interface DropsState {
  // per-subject message cache — messages stay across subject switches
  messagesBySubject: Record<string, Message[]>;
  pinnedMessages: Message[];
  isTyping: boolean;
  onlineCount: number;
  socket: Socket | null;

  getMessages: (subject: string) => Message[];
  addMessage: (subject: string, m: Message) => void;
  setMessages: (subject: string, messages: Message[]) => void;
  prependMessages: (subject: string, messages: Message[]) => void;
  setPinnedMessages: (messages: Message[]) => void;
  setTyping: (b: boolean) => void;
  setOnlineCount: (n: number) => void;
  initSocket: (token: string) => void;
  disconnect: () => void;
}

export const useDropsStore = create<DropsState>((set, get) => ({
  messagesBySubject: {},
  pinnedMessages: [],
  isTyping: false,
  onlineCount: 0,
  socket: null,

  getMessages: (subject) => get().messagesBySubject[subject] ?? [],

  addMessage: (subject, m) =>
    set((state) => {
      const existing = state.messagesBySubject[subject] ?? [];
      // dedupe by id
      if (existing.some((e) => e.id === m.id)) return state;
      return { messagesBySubject: { ...state.messagesBySubject, [subject]: [m, ...existing] } };
    }),

  setMessages: (subject, messages) =>
    set((state) => ({
      messagesBySubject: { ...state.messagesBySubject, [subject]: messages },
    })),

  // merge older messages (for pagination) without duplicates
  prependMessages: (subject, messages) =>
    set((state) => {
      const existing = state.messagesBySubject[subject] ?? [];
      const existingIds = new Set(existing.map((m) => m.id));
      const fresh = messages.filter((m) => !existingIds.has(m.id));
      return { messagesBySubject: { ...state.messagesBySubject, [subject]: [...existing, ...fresh] } };
    }),

  setPinnedMessages: (pinnedMessages) => set({ pinnedMessages }),
  setTyping: (b) => set({ isTyping: b }),
  setOnlineCount: (n) => set({ onlineCount: n }),

  initSocket: (token) => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => console.log('[Socket] Connected'));

    socket.on('online_count', (count: number) => set({ onlineCount: count }));

    // Socket receives messages for the currently joined room/subject
    // The subject is stored on the socket event itself if the backend sends it
    socket.on('new_message', (message: Message & { subject?: string }) => {
      const subject = message.subject ?? (socket as any)._currentSubject ?? '';
      if (subject) {
        set((state) => {
          const existing = state.messagesBySubject[subject] ?? [];
          if (existing.some((e) => e.id === message.id)) return state;
          return { messagesBySubject: { ...state.messagesBySubject, [subject]: [message, ...existing] } };
        });
      }
    });

    socket.on('typing', ({ isTyping }: { isTyping: boolean }) => set({ isTyping }));
    socket.on('disconnect', () => console.log('[Socket] Disconnected'));

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },
}));
