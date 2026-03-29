/// <reference types="vite/client" />
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket) {
      socket = io(import.meta.env.VITE_APP_URL || window.location.origin);
      
      socket.on('connect', () => {
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });
    }

    return () => {
      // Don't disconnect on unmount to keep connection alive across components
    };
  }, []);

  return { socket, isConnected };
};
