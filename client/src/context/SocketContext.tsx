import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const SocketContext = createContext<Socket | null>(null);

export function useSocket() {
  const socket = useContext(SocketContext);
  if (!socket) throw new Error('useSocket must be used within SocketProvider');
  return socket;
}

// Generate or retrieve a persistent player ID
export function getPlayerId(): string {
  let id = sessionStorage.getItem('playerId');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('playerId', id);
  }
  return id;
}

export function getSessionInfo(): { roomCode: string; playerId: string } | null {
  const roomCode = sessionStorage.getItem('roomCode');
  const playerId = sessionStorage.getItem('playerId');
  if (roomCode && playerId) return { roomCode, playerId };
  return null;
}

export function saveSession(roomCode: string) {
  sessionStorage.setItem('roomCode', roomCode);
}

export function clearSession() {
  sessionStorage.removeItem('roomCode');
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = io(SERVER_URL);
    setSocket(s);
    return () => { s.disconnect(); };
  }, []);

  if (!socket) return <div className="loading">Connecting...</div>;

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}
