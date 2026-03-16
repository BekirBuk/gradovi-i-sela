import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSocket, getPlayerId, getSessionInfo, saveSession, clearSession } from './SocketContext';

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

export interface ChallengeState {
  id: string;
  playerId: string;
  category: string;
  answer: string;
  votes: Record<string, boolean>;
  resolved: boolean;
  accepted: boolean;
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
  activeChallenge: ChallengeState | null;
  resolvedChallenges: ChallengeState[];
  lang: 'en' | 'bs';
  setLang: (lang: 'en' | 'bs') => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  createRoom: (name: string) => Promise<RoomState>;
  joinRoom: (code: string, name: string) => Promise<RoomState>;
  leaveRoom: () => void;
  updateSettings: (language: 'en' | 'bs', totalRounds: number, roundTime?: number, gameMode?: 'timer' | 'stop') => void;
  startGame: () => void;
  submitAnswers: (answers: Record<string, string>) => void;
  stopRound: () => void;
  nextRound: () => void;
  playAgain: () => void;
  challengeAnswer: (playerId: string, category: string) => void;
  voteChallenge: (challengeId: string, accept: boolean) => void;
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
  const [lang, setLang] = useState<'en' | 'bs'>('bs');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  }, []);
  const [allResults, setAllResults] = useState<RoundResult[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeState | null>(null);
  const [resolvedChallenges, setResolvedChallenges] = useState<ChallengeState[]>([]);
  const [myId] = useState(() => getPlayerId());

  // Attempt to rejoin on connect/reconnect
  useEffect(() => {
    function tryRejoin() {
      const session = getSessionInfo();
      if (!session) return;

      socket.emit('rejoin-room', { roomCode: session.roomCode, playerId: session.playerId },
        (res: { success: boolean; room?: RoomState; roundResult?: RoundResult; gameOver?: boolean; timeRemaining?: number; error?: string }) => {
          if (res.success && res.room) {
            setRoom(res.room);
            setLang(res.room.language);
            setTotalPlayers(res.room.players.length);
            setSubmittedCount(res.room.submittedCount);
            if (res.roundResult) {
              setRoundResult(res.roundResult);
            }
            if (res.gameOver !== undefined) {
              setGameOver(res.gameOver);
            }
            if (res.timeRemaining && res.timeRemaining > 0) {
              setTimeLeft(res.timeRemaining);
            }
          } else {
            clearSession();
          }
        }
      );
    }

    if (socket.connected) {
      tryRejoin();
    }
    socket.on('connect', tryRejoin);

    return () => {
      socket.off('connect', tryRejoin);
    };
  }, [socket]);

  useEffect(() => {
    socket.on('room-updated', (roomData: RoomState) => {
      setRoom(roomData);
      setLang(roomData.language);
      if (roomData.phase === 'lobby') {
        setRoundResult(null);
        setGameOver(false);
        setAllResults([]);
        setActiveChallenge(null);
        setResolvedChallenges([]);
      }
    });

    socket.on('round-started', (data: { letter: string; round: number; totalRounds: number; room: RoomState; duration: number }) => {
      setRoom(data.room);
      setRoundResult(null);
      setRoundStopping(false);
      setSubmittedCount(0);
      setTotalPlayers(data.room.players.length);
      setTimeLeft(data.duration);
      setGameOver(false);
      setActiveChallenge(null);
      setResolvedChallenges([]);
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

    socket.on('challenge-started', (challenge: ChallengeState) => {
      setActiveChallenge(challenge);
    });

    socket.on('challenge-voted', (data: { challengeId: string; voterId: string; voteCount: number; totalPlayers: number }) => {
      setActiveChallenge(prev => {
        if (!prev || prev.id !== data.challengeId) return prev;
        return { ...prev, votes: { ...prev.votes, [data.voterId]: true } };
      });
    });

    socket.on('challenge-resolved', (data: { challenge: ChallengeState; result: RoundResult; room: RoomState }) => {
      setActiveChallenge(null);
      setResolvedChallenges(prev => [...prev, data.challenge]);
      setRoundResult(data.result);
      setRoom(data.room);
    });

    return () => {
      socket.off('room-updated');
      socket.off('round-started');
      socket.off('player-submitted');
      socket.off('round-stopping');
      socket.off('round-results');
      socket.off('challenge-started');
      socket.off('challenge-voted');
      socket.off('challenge-resolved');
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
      socket.emit('create-room', { playerName: name, playerId: myId, language: lang }, (res: { success: boolean; room?: RoomState; error?: string }) => {
        if (res.success && res.room) {
          setRoom(res.room);
          setAllResults([]);
          saveSession(res.room.code);
          resolve(res.room);
        } else {
          reject(new Error(res.error || 'Failed to create room'));
        }
      });
    });
  }, [socket, myId, lang]);

  const joinRoomFn = useCallback((code: string, name: string): Promise<RoomState> => {
    return new Promise((resolve, reject) => {
      socket.emit('join-room', { roomCode: code, playerName: name, playerId: myId }, (res: { success: boolean; room?: RoomState; error?: string }) => {
        if (res.success && res.room) {
          setRoom(res.room);
          setAllResults([]);
          saveSession(res.room.code);
          resolve(res.room);
        } else {
          reject(new Error(res.error || 'Failed to join room'));
        }
      });
    });
  }, [socket, myId]);

  const leaveRoomFn = useCallback(() => {
    socket.emit('leave-room');
    setRoom(null);
    setRoundResult(null);
    setAllResults([]);
    setGameOver(false);
    setActiveChallenge(null);
    setResolvedChallenges([]);
  }, [socket]);

  const updateSettingsFn = useCallback((language: 'en' | 'bs', totalRounds: number, roundTime?: number, gameMode?: 'timer' | 'stop') => {
    socket.emit('update-settings', { language, totalRounds, roundTime, gameMode });
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
    setActiveChallenge(null);
    setResolvedChallenges([]);
    socket.emit('play-again');
  }, [socket]);

  const challengeAnswerFn = useCallback((playerIdTarget: string, category: string) => {
    socket.emit('challenge-answer', { playerIdTarget, category });
  }, [socket]);

  const voteChallengeFn = useCallback((challengeId: string, accept: boolean) => {
    socket.emit('vote-challenge', { challengeId, accept });
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
      activeChallenge,
      resolvedChallenges,
      lang,
      setLang,
      theme,
      toggleTheme,
      createRoom: createRoomFn,
      joinRoom: joinRoomFn,
      leaveRoom: leaveRoomFn,
      updateSettings: updateSettingsFn,
      startGame: startGameFn,
      submitAnswers: submitAnswersFn,
      stopRound: stopRoundFn,
      nextRound: nextRoundFn,
      playAgain: playAgainFn,
      challengeAnswer: challengeAnswerFn,
      voteChallenge: voteChallengeFn,
      myId,
    }}>
      {children}
    </GameContext.Provider>
  );
}
