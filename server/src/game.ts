import { validateAnswer, getValidLetters, CATEGORIES, getCategoryLabels, Category, Language } from './validation';

export interface Player {
  id: string;
  name: string;
  totalScore: number;
}

export interface RoundAnswers {
  [playerId: string]: Record<Category, string>;
}

export interface RoundResult {
  letter: string;
  answers: {
    [playerId: string]: {
      [cat: string]: { answer: string; valid: boolean; points: number };
    };
  };
  scores: { [playerId: string]: number };
}

export interface Room {
  code: string;
  hostId: string;
  language: Language;
  totalRounds: number;
  currentRound: number;
  phase: 'lobby' | 'playing' | 'scoring' | 'finished';
  players: Map<string, Player>;
  currentLetter: string;
  roundAnswers: RoundAnswers;
  submittedPlayers: Set<string>;
  roundResults: RoundResult[];
  usedLetters: Set<string>;
  timer: ReturnType<typeof setTimeout> | null;
  roundStartTime: number;
}

const rooms = new Map<string, Room>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code: string;
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (rooms.has(code));
  return code;
}

export function createRoom(hostId: string, hostName: string): Room {
  const code = generateRoomCode();
  const room: Room = {
    code,
    hostId,
    language: 'bs',
    totalRounds: 3,
    currentRound: 0,
    phase: 'lobby',
    players: new Map([[hostId, { id: hostId, name: hostName, totalScore: 0 }]]),
    currentLetter: '',
    roundAnswers: {},
    submittedPlayers: new Set(),
    roundResults: [],
    usedLetters: new Set(),
    timer: null,
    roundStartTime: 0,
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function joinRoom(code: string, playerId: string, playerName: string): Room | null {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;
  if (room.phase !== 'lobby') return null;
  if (room.players.size >= 10) return null;

  room.players.set(playerId, { id: playerId, name: playerName, totalScore: 0 });
  return room;
}

export function removePlayer(roomCode: string, playerId: string): Room | null {
  const room = rooms.get(roomCode);
  if (!room) return null;

  room.players.delete(playerId);
  room.submittedPlayers.delete(playerId);

  if (room.players.size === 0) {
    if (room.timer) clearTimeout(room.timer);
    rooms.delete(roomCode);
    return null;
  }

  // Transfer host if host left
  if (room.hostId === playerId) {
    room.hostId = room.players.keys().next().value!;
  }

  return room;
}

export function updateSettings(roomCode: string, language: Language, totalRounds: number): Room | null {
  const room = rooms.get(roomCode);
  if (!room || room.phase !== 'lobby') return null;
  room.language = language;
  room.totalRounds = Math.max(1, Math.min(10, totalRounds));
  return room;
}

export function pickLetter(room: Room): string {
  const validLetters = getValidLetters(room.language);
  const available = validLetters.filter(l => !room.usedLetters.has(l));
  const pool = available.length > 0 ? available : validLetters;
  const letter = pool[Math.floor(Math.random() * pool.length)];
  room.usedLetters.add(letter);
  return letter;
}

export function startRound(room: Room): string {
  room.currentRound++;
  room.phase = 'playing';
  room.roundAnswers = {};
  room.submittedPlayers = new Set();
  room.currentLetter = pickLetter(room);
  room.roundStartTime = Date.now();
  return room.currentLetter;
}

export function submitAnswers(room: Room, playerId: string, answers: Record<Category, string>): boolean {
  if (room.phase !== 'playing') return false;
  if (room.submittedPlayers.has(playerId)) return false;

  room.roundAnswers[playerId] = answers;
  room.submittedPlayers.add(playerId);
  return true;
}

export function allPlayersSubmitted(room: Room): boolean {
  return room.submittedPlayers.size >= room.players.size;
}

export function scoreRound(room: Room): RoundResult {
  const result: RoundResult = {
    letter: room.currentLetter,
    answers: {},
    scores: {},
  };

  const playerIds = Array.from(room.players.keys());

  // Collect all answers per category for duplicate detection
  const answersByCategory: Record<string, Map<string, string[]>> = {};
  for (const cat of CATEGORIES) {
    answersByCategory[cat] = new Map();
    for (const pid of playerIds) {
      const answer = room.roundAnswers[pid]?.[cat] || '';
      if (answer.trim()) {
        const normalized = answer.toLowerCase().trim();
        if (!answersByCategory[cat].has(normalized)) {
          answersByCategory[cat].set(normalized, []);
        }
        answersByCategory[cat].get(normalized)!.push(pid);
      }
    }
  }

  for (const pid of playerIds) {
    result.answers[pid] = {};
    result.scores[pid] = 0;

    for (const cat of CATEGORIES) {
      const answer = room.roundAnswers[pid]?.[cat] || '';
      const valid = validateAnswer(answer, cat, room.currentLetter, room.language);

      let points = 0;
      if (valid) {
        // Count how many players have ANY valid answer in this category
        let validAnswerCount = 0;
        for (const otherId of playerIds) {
          const otherAnswer = room.roundAnswers[otherId]?.[cat] || '';
          if (validateAnswer(otherAnswer, cat, room.currentLetter, room.language)) {
            validAnswerCount++;
          }
        }

        if (validAnswerCount === 1) {
          // Only player with a valid answer in this category
          points = 20;
        } else {
          const normalized = answer.toLowerCase().trim();
          const playersWithSame = answersByCategory[cat].get(normalized) || [];
          // Unique answer vs duplicate
          points = playersWithSame.length > 1 ? 5 : 10;
        }
      }

      result.answers[pid][cat] = { answer, valid, points };
      result.scores[pid] += points;
    }

    // Update total score
    const player = room.players.get(pid);
    if (player) {
      player.totalScore += result.scores[pid];
    }
  }

  room.roundResults.push(result);
  room.phase = 'scoring';
  return result;
}

export function isGameOver(room: Room): boolean {
  return room.currentRound >= room.totalRounds;
}

export function finishGame(room: Room): void {
  room.phase = 'finished';
}

export function resetGame(room: Room): void {
  room.phase = 'lobby';
  room.currentRound = 0;
  room.roundResults = [];
  room.usedLetters = new Set();
  room.roundAnswers = {};
  room.submittedPlayers = new Set();
  for (const player of room.players.values()) {
    player.totalScore = 0;
  }
}

export function serializeRoom(room: Room) {
  return {
    code: room.code,
    hostId: room.hostId,
    language: room.language,
    totalRounds: room.totalRounds,
    currentRound: room.currentRound,
    phase: room.phase,
    players: Array.from(room.players.values()),
    currentLetter: room.currentLetter,
    submittedCount: room.submittedPlayers.size,
    categoryLabels: getCategoryLabels(room.language),
  };
}
