import { useEffect } from 'react';
import { useDropsStore } from '../store/dropsStore';
import { useAuthStore } from '../store/authStore';

export const useSocket = () => {
  const { initSocket, disconnect, socket, isTyping, onlineCount } = useDropsStore();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (accessToken) {
      initSocket(accessToken);
    }
    return () => {
      disconnect();
    };
  }, [accessToken]);

  return { socket, isTyping, onlineCount };
};
