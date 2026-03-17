import { validateAnswer, addWord, getValidLetters, CATEGORIES, getCategoryLabels, Category, Language } from './validation';

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

export interface Challenge {
  id: string;
  playerId: string;
  category: Category;
  answer: string;
  votes: Map<string, boolean>; // playerId -> accepted
  resolved: boolean;
  accepted: boolean;
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
  roundTime: number; // seconds
  gameMode: 'timer' | 'stop';
  timer: ReturnType<typeof setTimeout> | null;
  roundStartTime: number;
  activeChallenges: Map<string, Challenge>;
  challengeOrder: string[]; // player IDs who have invalid answers
  currentChallengerIndex: number;
}

const rooms = new Map<string, Room>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code: string;
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (rooms.has(code));
  return code;
}

export function createRoom(hostId: string, hostName: string, language?: Language): Room {
  const code = generateRoomCode();
  const room: Room = {
    code,
    hostId,
    language: language || 'bs',
    totalRounds: 3,
    currentRound: 0,
    phase: 'lobby',
    players: new Map([[hostId, { id: hostId, name: hostName, totalScore: 0 }]]),
    currentLetter: '',
    roundAnswers: {},
    submittedPlayers: new Set(),
    roundResults: [],
    usedLetters: new Set(),
    roundTime: 60,
    gameMode: 'stop',
    timer: null,
    roundStartTime: 0,
    activeChallenges: new Map(),
    challengeOrder: [],
    currentChallengerIndex: 0,
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

  // Remove from challenge order if present
  const challengeIdx = room.challengeOrder.indexOf(playerId);
  if (challengeIdx !== -1) {
    room.challengeOrder.splice(challengeIdx, 1);
    if (challengeIdx < room.currentChallengerIndex) {
      room.currentChallengerIndex--;
    }
  }

  // Transfer host if host left
  if (room.hostId === playerId) {
    room.hostId = room.players.keys().next().value!;
  }

  return room;
}

export function updateSettings(roomCode: string, language: Language, totalRounds: number, roundTime?: number, gameMode?: 'timer' | 'stop'): Room | null {
  const room = rooms.get(roomCode);
  if (!room || room.phase !== 'lobby') return null;
  room.language = language;
  room.totalRounds = Math.max(1, Math.min(10, totalRounds));
  if (roundTime !== undefined) {
    room.roundTime = Math.max(60, Math.min(180, Math.round(roundTime / 30) * 30));
  }
  if (gameMode !== undefined) {
    room.gameMode = gameMode;
  }
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
  room.activeChallenges = new Map();
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

export function unsubmitAnswers(room: Room, playerId: string): boolean {
  if (room.phase !== 'playing') return false;
  if (!room.submittedPlayers.has(playerId)) return false;
  room.submittedPlayers.delete(playerId);
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

  // Compute challenge order: players who have at least one invalid answer with text
  room.challengeOrder = playerIds.filter(pid => {
    return CATEGORIES.some(cat => {
      const r = result.answers[pid]?.[cat];
      return r && !r.valid && r.answer.trim();
    });
  });
  room.currentChallengerIndex = 0;

  return result;
}

export function getCurrentChallenger(room: Room): string | null {
  if (room.currentChallengerIndex >= room.challengeOrder.length) return null;
  return room.challengeOrder[room.currentChallengerIndex];
}

export function advanceChallenger(room: Room): string | null {
  room.currentChallengerIndex++;
  return getCurrentChallenger(room);
}

export function isChallengePhaseOver(room: Room): boolean {
  return room.currentChallengerIndex >= room.challengeOrder.length;
}

export function hasRemainingChallenges(room: Room, playerId: string): boolean {
  const lastResult = room.roundResults[room.roundResults.length - 1];
  if (!lastResult) return false;
  return CATEGORIES.some(cat => {
    const r = lastResult.answers[playerId]?.[cat];
    if (!r || r.valid || !r.answer.trim()) return false;
    // Already challenged (resolved or active)
    if (room.activeChallenges.has(`${playerId}-${cat}`)) return false;
    return true;
  });
}

export function createChallenge(room: Room, playerId: string, category: Category, answer: string): Challenge | null {
  if (room.phase !== 'scoring' && room.phase !== 'finished') return null;

  const id = `${playerId}-${category}`;
  if (room.activeChallenges.has(id)) return null;

  const challenge: Challenge = {
    id,
    playerId,
    category,
    answer,
    votes: new Map(),
    resolved: false,
    accepted: false,
  };

  // The challenger automatically votes yes
  challenge.votes.set(playerId, true);

  room.activeChallenges.set(id, challenge);
  return challenge;
}

export function checkStaleChallenges(room: Room): Challenge[] {
  const resolved: Challenge[] = [];
  for (const challenge of room.activeChallenges.values()) {
    if (challenge.resolved) continue;
    // Count only votes from players still in the room
    const relevantVotes = new Map<string, boolean>();
    for (const [voterId, vote] of challenge.votes) {
      if (room.players.has(voterId)) {
        relevantVotes.set(voterId, vote);
      }
    }
    challenge.votes = relevantVotes;
    if (challenge.votes.size >= room.players.size) {
      challenge.resolved = true;
      challenge.accepted = Array.from(challenge.votes.values()).every(v => v);
      if (challenge.accepted) {
        addWord(challenge.answer, challenge.category, room.language);
        recalculateLastRound(room);
      }
      resolved.push(challenge);
    }
  }
  return resolved;
}

export function voteChallenge(room: Room, challengeId: string, voterId: string, accept: boolean): Challenge | null {
  const challenge = room.activeChallenges.get(challengeId);
  if (!challenge || challenge.resolved) return null;

  challenge.votes.set(voterId, accept);

  // Check if all current players have voted
  if (challenge.votes.size >= room.players.size) {
    challenge.resolved = true;
    challenge.accepted = Array.from(challenge.votes.values()).every(v => v);

    if (challenge.accepted) {
      // Add word to word list
      addWord(challenge.answer, challenge.category, room.language);
      // Recalculate the current round result
      recalculateLastRound(room);
    }
  }

  return challenge;
}

function recalculateLastRound(room: Room): void {
  const result = room.roundResults[room.roundResults.length - 1];
  if (!result) return;

  const playerIds = Array.from(room.players.keys());

  // Reset player total scores by subtracting old round scores
  for (const pid of playerIds) {
    const player = room.players.get(pid);
    if (player && result.scores[pid] !== undefined) {
      player.totalScore -= result.scores[pid];
    }
  }

  // Recalculate with duplicate detection
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
    result.scores[pid] = 0;
    for (const cat of CATEGORIES) {
      const answer = room.roundAnswers[pid]?.[cat] || '';
      const valid = validateAnswer(answer, cat, result.letter, room.language);

      let points = 0;
      if (valid) {
        let validAnswerCount = 0;
        for (const otherId of playerIds) {
          const otherAnswer = room.roundAnswers[otherId]?.[cat] || '';
          if (validateAnswer(otherAnswer, cat, result.letter, room.language)) {
            validAnswerCount++;
          }
        }
        if (validAnswerCount === 1) {
          points = 20;
        } else {
          const normalized = answer.toLowerCase().trim();
          const playersWithSame = answersByCategory[cat].get(normalized) || [];
          points = playersWithSame.length > 1 ? 5 : 10;
        }
      }

      result.answers[pid][cat] = { answer, valid, points };
      result.scores[pid] += points;
    }

    const player = room.players.get(pid);
    if (player) {
      player.totalScore += result.scores[pid];
    }
  }
}

export function serializeChallenge(challenge: Challenge) {
  return {
    id: challenge.id,
    playerId: challenge.playerId,
    category: challenge.category,
    answer: challenge.answer,
    votes: Object.fromEntries(challenge.votes),
    resolved: challenge.resolved,
    accepted: challenge.accepted,
  };
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
  room.activeChallenges = new Map();
  room.challengeOrder = [];
  room.currentChallengerIndex = 0;
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
    roundTime: room.roundTime,
    gameMode: room.gameMode,
    currentRound: room.currentRound,
    phase: room.phase,
    players: Array.from(room.players.values()),
    currentLetter: room.currentLetter,
    submittedCount: room.submittedPlayers.size,
    categoryLabels: getCategoryLabels(room.language),
    currentChallenger: getCurrentChallenger(room),
    challengePhaseOver: isChallengePhaseOver(room),
  };
}
