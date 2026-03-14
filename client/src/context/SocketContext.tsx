import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const SocketContext = createContext<Socket | null>(null);

export function useSocket() {
  const socket = useContext(SocketContext);
  if (!socket) throw new Error('useSocket must be used within SocketProvider');
  return socket;
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
