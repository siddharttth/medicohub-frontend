import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { Message } from '../types';

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
  disconnect: () => void;
}

export const useDropsStore = create<DropsState>((set, get) => ({
  messages: [],
  pinnedMessages: [],
  isTyping: false,
  onlineCount: 0,
  socket: null,

  addMessage: (m) =>
    set((state) => ({ messages: [m, ...state.messages] })),

  setMessages: (messages) => set({ messages }),
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
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected');
    });

    socket.on('online_count', (count: number) => {
      set({ onlineCount: count });
    });

    socket.on('new_message', (message: Message) => {
      set((state) => ({ messages: [message, ...state.messages] }));
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
