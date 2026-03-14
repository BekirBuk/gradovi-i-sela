import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSocket } from './SocketContext';

export interface Player {
  id: string;
  name: string;
  totalScore: number;
}

export interface CategoryResult {
  answer: string;
  valid: boolean;
  points: number;
}

export interface RoundResult {
  letter: string;
  answers: Record<string, Record<string, CategoryResult>>;
  scores: Record<string, number>;
}

export interface RoomState {
  code: string;
  hostId: string;
  language: 'en' | 'bs';
  totalRounds: number;
  currentRound: number;
  phase: 'lobby' | 'playing' | 'scoring' | 'finished';
  players: Player[];
  currentLetter: string;
  submittedCount: number;
  categoryLabels: Record<string, string>;
}

interface GameState {
  room: RoomState | null;
  roundResult: RoundResult | null;
  timeLeft: number;
  roundStopping: boolean;
  submittedCount: number;
  totalPlayers: number;
  gameOver: boolean;
  allResults: RoundResult[];
  createRoom: (name: string) => Promise<RoomState>;
  joinRoom: (code: string, name: string) => Promise<RoomState>;
  updateSettings: (language: 'en' | 'bs', totalRounds: number) => void;
  startGame: () => void;
  submitAnswers: (answers: Record<string, string>) => void;
  stopRound: () => void;
  nextRound: () => void;
  playAgain: () => void;
  myId: string;
}

const GameContext = createContext<GameState | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const socket = useSocket();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [roundStopping, setRoundStopping] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [allResults, setAllResults] = useState<RoundResult[]>([]);

  useEffect(() => {
    socket.on('room-updated', (roomData: RoomState) => {
      setRoom(roomData);
    });

    socket.on('round-started', (data: { letter: string; round: number; totalRounds: number; room: RoomState; duration: number }) => {
      setRoom(data.room);
      setRoundResult(null);
      setRoundStopping(false);
      setSubmittedCount(0);
      setTotalPlayers(data.room.players.length);
      setTimeLeft(data.duration);
      setGameOver(false);
    });

    socket.on('player-submitted', (data: { submittedCount: number; totalPlayers: number }) => {
      setSubmittedCount(data.submittedCount);
      setTotalPlayers(data.totalPlayers);
    });

    socket.on('round-stopping', () => {
      setRoundStopping(true);
    });

    socket.on('round-results', (data: { result: RoundResult; room: RoomState; gameOver: boolean }) => {
      setRoom(data.room);
      setRoundResult(data.result);
      setGameOver(data.gameOver);
      setAllResults(prev => [...prev, data.result]);
      setTimeLeft(0);
      setRoundStopping(false);
    });

    return () => {
      socket.off('room-updated');
      socket.off('round-started');
      socket.off('player-submitted');
      socket.off('round-stopping');
      socket.off('round-results');
    };
  }, [socket]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const createRoomFn = useCallback((name: string): Promise<RoomState> => {
    return new Promise((resolve, reject) => {
      socket.emit('create-room', { playerName: name }, (res: { success: boolean; room?: RoomState; error?: string }) => {
        if (res.success && res.room) {
          setRoom(res.room);
          setAllResults([]);
          resolve(res.room);
        } else {
          reject(new Error(res.error || 'Failed to create room'));
        }
      });
    });
  }, [socket]);

  const joinRoomFn = useCallback((code: string, name: string): Promise<RoomState> => {
    return new Promise((resolve, reject) => {
      socket.emit('join-room', { roomCode: code, playerName: name }, (res: { success: boolean; room?: RoomState; error?: string }) => {
        if (res.success && res.room) {
          setRoom(res.room);
          setAllResults([]);
          resolve(res.room);
        } else {
          reject(new Error(res.error || 'Failed to join room'));
        }
      });
    });
  }, [socket]);

  const updateSettingsFn = useCallback((language: 'en' | 'bs', totalRounds: number) => {
    socket.emit('update-settings', { language, totalRounds });
  }, [socket]);

  const startGameFn = useCallback(() => {
    socket.emit('start-game');
  }, [socket]);

  const submitAnswersFn = useCallback((answers: Record<string, string>) => {
    socket.emit('submit-answers', { answers });
  }, [socket]);

  const stopRoundFn = useCallback(() => {
    socket.emit('stop-round');
  }, [socket]);

  const nextRoundFn = useCallback(() => {
    socket.emit('next-round');
  }, [socket]);

  const playAgainFn = useCallback(() => {
    setAllResults([]);
    setGameOver(false);
    setRoundResult(null);
    socket.emit('play-again');
  }, [socket]);

  return (
    <GameContext.Provider value={{
      room,
      roundResult,
      timeLeft,
      roundStopping,
      submittedCount,
      totalPlayers,
      gameOver,
      allResults,
      createRoom: createRoomFn,
      joinRoom: joinRoomFn,
      updateSettings: updateSettingsFn,
      startGame: startGameFn,
      submitAnswers: submitAnswersFn,
      stopRound: stopRoundFn,
      nextRound: nextRoundFn,
      playAgain: playAgainFn,
      myId: socket.id || '',
    }}>
      {children}
    </GameContext.Provider>
  );
}
