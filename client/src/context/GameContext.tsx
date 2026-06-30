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
  categoryMode: 'original' | 'custom';
  customCategories: string[];
  categoryLabels: Record<string, string>;
  categories: string[];
  currentChallenger?: string | null;
  challengePhaseOver?: boolean;
}

export interface VoteTally {
  yes: number;
  no: number;
  eligible: number;
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
  resolvedChallenges: ChallengeState[];
  voteTallies: Record<string, VoteTally>;
  myVotes: Record<string, boolean>;
  lang: 'en' | 'bs';
  setLang: (lang: 'en' | 'bs') => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  createRoom: (name: string) => Promise<RoomState>;
  joinRoom: (code: string, name: string) => Promise<RoomState>;
  leaveRoom: () => void;
  updateSettings: (language: 'en' | 'bs', totalRounds: number, roundTime?: number, gameMode?: 'timer' | 'stop', categoryMode?: 'original' | 'custom', customCategories?: string[]) => void;
  startGame: () => void;
  submitAnswers: (answers: Record<string, string>) => void;
  unsubmitAnswers: () => void;
  saveAnswers: (answers: Record<string, string>) => void;
  stopRound: () => void;
  nextRound: () => void;
  playAgain: () => void;
  voteAnswer: (targetPlayerId: string, category: string, accept: boolean) => void;
  skipPlayerReview: () => void;
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
  const [resolvedChallenges, setResolvedChallenges] = useState<ChallengeState[]>([]);
  const [voteTallies, setVoteTallies] = useState<Record<string, VoteTally>>({});
  const [myVotes, setMyVotes] = useState<Record<string, boolean>>({});
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
        setResolvedChallenges([]);
        setVoteTallies({});
        setMyVotes({});
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
      setResolvedChallenges([]);
      setVoteTallies({});
      setMyVotes({});
    });

    socket.on('player-submitted', (data: { submittedCount: number; totalPlayers: number }) => {
      setSubmittedCount(data.submittedCount);
      setTotalPlayers(data.totalPlayers);
    });

    socket.on('player-unsubmitted', (data: { submittedCount: number; totalPlayers: number }) => {
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

    socket.on('challenge-voted', (data: { challengeId: string; yes: number; no: number; eligible: number }) => {
      setVoteTallies(prev => ({ ...prev, [data.challengeId]: { yes: data.yes, no: data.no, eligible: data.eligible } }));
    });

    socket.on('challenge-resolved', (data: { challenge: ChallengeState; result: RoundResult; room: RoomState }) => {
      setResolvedChallenges(prev => [...prev, data.challenge]);
      setRoundResult(data.result);
      setRoom(data.room);
      setVoteTallies(prev => {
        const next = { ...prev };
        delete next[data.challenge.id];
        return next;
      });
    });

    return () => {
      socket.off('room-updated');
      socket.off('round-started');
      socket.off('player-submitted');
      socket.off('player-unsubmitted');
      socket.off('round-stopping');
      socket.off('round-results');
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
    setResolvedChallenges([]);
    setVoteTallies({});
    setMyVotes({});
  }, [socket]);

  const updateSettingsFn = useCallback((language: 'en' | 'bs', totalRounds: number, roundTime?: number, gameMode?: 'timer' | 'stop', categoryMode?: 'original' | 'custom', customCategories?: string[]) => {
    socket.emit('update-settings', { language, totalRounds, roundTime, gameMode, categoryMode, customCategories });
  }, [socket]);

  const startGameFn = useCallback(() => {
    socket.emit('start-game');
  }, [socket]);

  const submitAnswersFn = useCallback((answers: Record<string, string>) => {
    socket.emit('submit-answers', { answers });
  }, [socket]);

  const unsubmitAnswersFn = useCallback(() => {
    socket.emit('unsubmit-answers');
  }, [socket]);

  const saveAnswersFn = useCallback((answers: Record<string, string>) => {
    socket.volatile.emit('save-answers', { answers });
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
    setResolvedChallenges([]);
    setVoteTallies({});
    setMyVotes({});
    socket.emit('play-again');
  }, [socket]);

  const voteAnswerFn = useCallback((targetPlayerId: string, category: string, accept: boolean) => {
    // Optimistically record my vote so the buttons disable immediately.
    setMyVotes(prev => ({ ...prev, [`${targetPlayerId}-${category}`]: accept }));
    socket.emit('vote-challenge', { targetPlayerId, category, accept });
  }, [socket]);

  const skipPlayerReviewFn = useCallback(() => {
    socket.emit('skip-player-review');
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
      resolvedChallenges,
      voteTallies,
      myVotes,
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
      unsubmitAnswers: unsubmitAnswersFn,
      saveAnswers: saveAnswersFn,
      stopRound: stopRoundFn,
      nextRound: nextRoundFn,
      playAgain: playAgainFn,
      voteAnswer: voteAnswerFn,
      skipPlayerReview: skipPlayerReviewFn,
      myId,
    }}>
      {children}
    </GameContext.Provider>
  );
}
