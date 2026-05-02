import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { Message } from '../types';
import { normalizeDrop } from '../api/drops';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const SOCKET_URL = API_URL.replace('/api', '');

interface DropsState {
  messages: Message[];
  pinnedMessages: Message[];
  isTyping: boolean;
  onlineCount: number;
  socket: Socket | null;
  addMessage: (m: Message) => void;
  setMessages: (messages: Message[]) => void;
  setPinnedMessages: (messages: Message[]) => void;
  setTyping: (b: boolean) => void;
  setOnlineCount: (n: number) => void;
  initSocket: (token: string) => void;
  joinSubject: (subject: string) => void;
  disconnect: () => void;
}

export const useDropsStore = create<DropsState>((set, get) => ({
  messages: [],
  pinnedMessages: [],
  isTyping: false,
  onlineCount: 0,
  socket: null,

  // Deduplicate by id to prevent double-add from API + socket
  addMessage: (m) =>
    set((state) => {
      if (state.messages.some((msg) => msg.id === m.id)) return state;
      return { messages: [m, ...state.messages] };
    }),

  setMessages: (messages) => set({ messages }),
  setPinnedMessages: (pinnedMessages) => set({ pinnedMessages }),
  setTyping: (b) => set({ isTyping: b }),
  setOnlineCount: (n) => set({ onlineCount: n }),

  joinSubject: (subject) => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('join-subject', subject);
    }
  },

  initSocket: (token) => {
    const existing = get().socket;
    if (existing?.connected) return;

    // Fix 1: connect to /drops namespace
    const socket = io(`${SOCKET_URL}/drops`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to /drops');
    });

    socket.on('online_count', (count: number) => {
      set({ onlineCount: count });
    });

    // Fix 2: listen for 'new-drop' (backend event name)
    // Fix 3: normalize raw MongoDB doc → Message shape
    socket.on('new-drop', (rawDrop: any) => {
      const message = normalizeDrop(rawDrop);
      set((state) => {
        // Fix 4: deduplicate — skip if already added via API response
        if (state.messages.some((m) => m.id === message.id)) return state;
        return { messages: [message, ...state.messages] };
      });
    });

    socket.on('typing', ({ isTyping }: { isTyping: boolean }) => {
      set({ isTyping });
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

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
