import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { loadWordLists, CATEGORIES, Category, Language } from './validation';
import {
  createRoom, getRoom, joinRoom, removePlayer, updateSettings,
  startRound, submitAnswers, allPlayersSubmitted, scoreRound,
  isGameOver, finishGame, resetGame, serializeRoom, serializeChallenge,
  createChallenge, voteChallenge, Room
} from './game';

const app = express();
app.use(cors());
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});


const DISCONNECT_GRACE_PERIOD = 30_000; // 30 seconds to reconnect

// Map playerId -> { roomCode, socketId }
const playerSessions = new Map<string, { roomCode: string; socketId: string }>();
// Map socketId -> playerId
const socketToPlayer = new Map<string, string>();
// Track pending disconnects so we can cancel them
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

function getPlayerId(socketId: string): string | undefined {
  return socketToPlayer.get(socketId);
}

function endRound(room: Room) {
  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }

  // Auto-submit empty answers for players who didn't submit
  for (const [pid] of room.players) {
    if (!room.submittedPlayers.has(pid)) {
      const emptyAnswers: Record<Category, string> = {} as Record<Category, string>;
      for (const cat of CATEGORIES) {
        emptyAnswers[cat] = room.roundAnswers[pid]?.[cat] || '';
      }
      submitAnswers(room, pid, emptyAnswers);
    }
  }

  const result = scoreRound(room);
  const gameOver = isGameOver(room);
  if (gameOver) finishGame(room);

  io.to(room.code).emit('round-results', {
    result,
    room: serializeRoom(room),
    gameOver,
  });
}

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('create-room', ({ playerName, playerId, language }: { playerName: string; playerId: string; language?: Language }, callback) => {
    const room = createRoom(playerId, playerName, language);
    socket.join(room.code);
    playerSessions.set(playerId, { roomCode: room.code, socketId: socket.id });
    socketToPlayer.set(socket.id, playerId);
    callback({ success: true, room: serializeRoom(room), playerId });
  });

  socket.on('join-room', ({ roomCode, playerName, playerId }: { roomCode: string; playerName: string; playerId: string }, callback) => {
    const room = joinRoom(roomCode, playerId, playerName);
    if (!room) {
      callback({ success: false, error: 'Room not found, full, or game already started.' });
      return;
    }
    socket.join(room.code);
    playerSessions.set(playerId, { roomCode: room.code, socketId: socket.id });
    socketToPlayer.set(socket.id, playerId);
    callback({ success: true, room: serializeRoom(room), playerId });
    socket.to(room.code).emit('room-updated', serializeRoom(room));
  });

  socket.on('rejoin-room', ({ roomCode, playerId }: { roomCode: string; playerId: string }, callback) => {
    const room = getRoom(roomCode);
    if (!room || !room.players.has(playerId)) {
      callback({ success: false, error: 'Room not found or you are no longer in it.' });
      return;
    }

    // Cancel pending disconnect removal
    const timer = disconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      disconnectTimers.delete(playerId);
    }

    // Update socket mappings
    const oldSession = playerSessions.get(playerId);
    if (oldSession) {
      socketToPlayer.delete(oldSession.socketId);
    }
    playerSessions.set(playerId, { roomCode: room.code, socketId: socket.id });
    socketToPlayer.set(socket.id, playerId);
    socket.join(room.code);

    // Send current room state and last round result if available
    const lastResult = room.roundResults.length > 0 ? room.roundResults[room.roundResults.length - 1] : null;
    const gameOver = room.phase === 'finished';
    const timeElapsed = room.phase === 'playing' ? Math.floor((Date.now() - room.roundStartTime) / 1000) : 0;
    const timeRemaining = room.phase === 'playing' ? Math.max(0, room.roundTime - timeElapsed) : 0;

    callback({
      success: true,
      room: serializeRoom(room),
      playerId,
      roundResult: lastResult,
      gameOver,
      timeRemaining,
    });
  });

  socket.on('update-settings', ({ language, totalRounds, roundTime, gameMode }: { language: Language; totalRounds: number; roundTime?: number; gameMode?: 'timer' | 'stop' }) => {
    const playerId = getPlayerId(socket.id);
    if (!playerId) return;
    const session = playerSessions.get(playerId);
    if (!session) return;
    const room = updateSettings(session.roomCode, language, totalRounds, roundTime, gameMode);
    if (room) {
      io.to(room.code).emit('room-updated', serializeRoom(room));
    }
  });

  socket.on('start-game', () => {
    const playerId = getPlayerId(socket.id);
    if (!playerId) return;
    const session = playerSessions.get(playerId);
    if (!session) return;
    const room = getRoom(session.roomCode);
    if (!room || room.hostId !== playerId) return;

    const letter = startRound(room);
    io.to(room.code).emit('round-started', {
      letter,
      round: room.currentRound,
      totalRounds: room.totalRounds,
      room: serializeRoom(room),
      duration: room.roundTime,
    });

    room.timer = setTimeout(() => {
      endRound(room);
    }, room.roundTime * 1000);
  });

  socket.on('submit-answers', ({ answers }: { answers: Record<Category, string> }) => {
    const playerId = getPlayerId(socket.id);
    if (!playerId) return;
    const session = playerSessions.get(playerId);
    if (!session) return;
    const room = getRoom(session.roomCode);
    if (!room) return;

    submitAnswers(room, playerId, answers);
    io.to(room.code).emit('player-submitted', {
      playerId,
      submittedCount: room.submittedPlayers.size,
      totalPlayers: room.players.size,
    });

    if (allPlayersSubmitted(room)) {
      endRound(room);
    }
  });

  socket.on('stop-round', () => {
    const playerId = getPlayerId(socket.id);
    if (!playerId) return;
    const session = playerSessions.get(playerId);
    if (!session) return;
    const room = getRoom(session.roomCode);
    if (!room || room.phase !== 'playing') return;
    if (room.gameMode === 'timer') return; // Stop not allowed in timer mode

    io.to(room.code).emit('round-stopping', { stoppedBy: playerId });

    setTimeout(() => {
      if (room.phase === 'playing') {
        endRound(room);
      }
    }, 3000);
  });

  socket.on('next-round', () => {
    const playerId = getPlayerId(socket.id);
    if (!playerId) return;
    const session = playerSessions.get(playerId);
    if (!session) return;
    const room = getRoom(session.roomCode);
    if (!room || room.hostId !== playerId) return;

    const letter = startRound(room);
    io.to(room.code).emit('round-started', {
      letter,
      round: room.currentRound,
      totalRounds: room.totalRounds,
      room: serializeRoom(room),
      duration: room.roundTime,
    });

    room.timer = setTimeout(() => {
      endRound(room);
    }, room.roundTime * 1000);
  });

  socket.on('challenge-answer', ({ playerIdTarget, category }: { playerIdTarget: string; category: Category }) => {
    const playerId = getPlayerId(socket.id);
    if (!playerId) return;
    const session = playerSessions.get(playerId);
    if (!session) return;
    const room = getRoom(session.roomCode);
    if (!room) return;

    // Get the answer from the last round result
    const lastResult = room.roundResults[room.roundResults.length - 1];
    if (!lastResult) return;
    const answerData = lastResult.answers[playerIdTarget]?.[category];
    if (playerId !== playerIdTarget) return; // Only the answer's owner can challenge
    if (!answerData || answerData.valid) return; // Can only challenge invalid answers

    const challenge = createChallenge(room, playerIdTarget, category as Category, answerData.answer);
    if (!challenge) return;

    // Auto-resolve if only 1 player in the room (solo testing)
    if (room.players.size === 1) {
      voteChallenge(room, challenge.id, playerId, true);
      io.to(room.code).emit('challenge-resolved', {
        challenge: serializeChallenge(challenge),
        result: lastResult,
        room: serializeRoom(room),
      });
      return;
    }

    io.to(room.code).emit('challenge-started', serializeChallenge(challenge));
  });

  socket.on('vote-challenge', ({ challengeId, accept }: { challengeId: string; accept: boolean }) => {
    const playerId = getPlayerId(socket.id);
    if (!playerId) return;
    const session = playerSessions.get(playerId);
    if (!session) return;
    const room = getRoom(session.roomCode);
    if (!room) return;

    const challenge = voteChallenge(room, challengeId, playerId, accept);
    if (!challenge) return;

    if (challenge.resolved) {
      const lastResult = room.roundResults[room.roundResults.length - 1];
      io.to(room.code).emit('challenge-resolved', {
        challenge: serializeChallenge(challenge),
        result: lastResult,
        room: serializeRoom(room),
      });
    } else {
      io.to(room.code).emit('challenge-voted', {
        challengeId: challenge.id,
        voterId: playerId,
        voteCount: challenge.votes.size,
        totalPlayers: room.players.size,
      });
    }
  });

  socket.on('play-again', () => {
    const playerId = getPlayerId(socket.id);
    if (!playerId) return;
    const session = playerSessions.get(playerId);
    if (!session) return;
    const room = getRoom(session.roomCode);
    if (!room || room.hostId !== playerId) return;

    resetGame(room);
    io.to(room.code).emit('room-updated', serializeRoom(room));
  });

  socket.on('leave-room', (callback?: () => void) => {
    const playerId = getPlayerId(socket.id);
    if (!playerId) return;
    const session = playerSessions.get(playerId);
    if (!session) return;
    const room = removePlayer(session.roomCode, playerId);
    socket.leave(session.roomCode);
    playerSessions.delete(playerId);
    socketToPlayer.delete(socket.id);
    if (room) {
      io.to(room.code).emit('room-updated', serializeRoom(room));
      if (room.phase === 'playing' && allPlayersSubmitted(room)) {
        endRound(room);
      }
    }
    if (callback) callback();
  });

  socket.on('disconnect', () => {
    const playerId = getPlayerId(socket.id);
    if (!playerId) {
      console.log(`Unknown socket disconnected: ${socket.id}`);
      return;
    }

    const session = playerSessions.get(playerId);
    if (!session) return;

    console.log(`Player ${playerId} disconnected, waiting ${DISCONNECT_GRACE_PERIOD / 1000}s for reconnect...`);

    // Give the player time to reconnect before removing them
    const timer = setTimeout(() => {
      disconnectTimers.delete(playerId);
      const currentSession = playerSessions.get(playerId);
      // Only remove if they haven't reconnected with a new socket
      if (currentSession && currentSession.socketId === socket.id) {
        const room = removePlayer(session.roomCode, playerId);
        playerSessions.delete(playerId);
        socketToPlayer.delete(socket.id);
        if (room) {
          io.to(room.code).emit('room-updated', serializeRoom(room));
          if (room.phase === 'playing' && allPlayersSubmitted(room)) {
            endRound(room);
          }
        }
        console.log(`Player ${playerId} removed after grace period.`);
      }
    }, DISCONNECT_GRACE_PERIOD);

    disconnectTimers.set(playerId, timer);
  });
});

// Load word lists then start server
loadWordLists();

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
