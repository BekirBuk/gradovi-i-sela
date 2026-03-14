import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { loadWordLists, CATEGORIES, Category, Language } from './validation';
import {
  createRoom, getRoom, joinRoom, removePlayer, updateSettings,
  startRound, submitAnswers, allPlayersSubmitted, scoreRound,
  isGameOver, finishGame, resetGame, serializeRoom, Room
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

const ROUND_TIME = 60; // seconds

// Track which room each socket is in
const socketRooms = new Map<string, string>();

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
  console.log(`Player connected: ${socket.id}`);

  socket.on('create-room', ({ playerName }: { playerName: string }, callback) => {
    const room = createRoom(socket.id, playerName);
    socket.join(room.code);
    socketRooms.set(socket.id, room.code);
    callback({ success: true, room: serializeRoom(room) });
  });

  socket.on('join-room', ({ roomCode, playerName }: { roomCode: string; playerName: string }, callback) => {
    const room = joinRoom(roomCode, socket.id, playerName);
    if (!room) {
      callback({ success: false, error: 'Room not found, full, or game already started.' });
      return;
    }
    socket.join(room.code);
    socketRooms.set(socket.id, room.code);
    callback({ success: true, room: serializeRoom(room) });
    socket.to(room.code).emit('room-updated', serializeRoom(room));
  });

  socket.on('update-settings', ({ language, totalRounds }: { language: Language; totalRounds: number }) => {
    const roomCode = socketRooms.get(socket.id);
    if (!roomCode) return;
    const room = updateSettings(roomCode, language, totalRounds);
    if (room) {
      io.to(room.code).emit('room-updated', serializeRoom(room));
    }
  });

  socket.on('start-game', () => {
    const roomCode = socketRooms.get(socket.id);
    if (!roomCode) return;
    const room = getRoom(roomCode);
    if (!room || room.hostId !== socket.id) return;

    const letter = startRound(room);
    io.to(room.code).emit('round-started', {
      letter,
      round: room.currentRound,
      totalRounds: room.totalRounds,
      room: serializeRoom(room),
      duration: ROUND_TIME,
    });

    // Start timer
    room.timer = setTimeout(() => {
      endRound(room);
    }, ROUND_TIME * 1000);
  });

  socket.on('submit-answers', ({ answers }: { answers: Record<Category, string> }) => {
    const roomCode = socketRooms.get(socket.id);
    if (!roomCode) return;
    const room = getRoom(roomCode);
    if (!room) return;

    submitAnswers(room, socket.id, answers);
    io.to(room.code).emit('player-submitted', {
      playerId: socket.id,
      submittedCount: room.submittedPlayers.size,
      totalPlayers: room.players.size,
    });

    if (allPlayersSubmitted(room)) {
      endRound(room);
    }
  });

  socket.on('stop-round', () => {
    const roomCode = socketRooms.get(socket.id);
    if (!roomCode) return;
    const room = getRoom(roomCode);
    if (!room || room.phase !== 'playing') return;

    // Notify everyone the round is being stopped, give 3 seconds
    io.to(room.code).emit('round-stopping', { stoppedBy: socket.id });

    setTimeout(() => {
      if (room.phase === 'playing') {
        endRound(room);
      }
    }, 3000);
  });

  socket.on('next-round', () => {
    const roomCode = socketRooms.get(socket.id);
    if (!roomCode) return;
    const room = getRoom(roomCode);
    if (!room || room.hostId !== socket.id) return;

    const letter = startRound(room);
    io.to(room.code).emit('round-started', {
      letter,
      round: room.currentRound,
      totalRounds: room.totalRounds,
      room: serializeRoom(room),
      duration: ROUND_TIME,
    });

    room.timer = setTimeout(() => {
      endRound(room);
    }, ROUND_TIME * 1000);
  });

  socket.on('play-again', () => {
    const roomCode = socketRooms.get(socket.id);
    if (!roomCode) return;
    const room = getRoom(roomCode);
    if (!room || room.hostId !== socket.id) return;

    resetGame(room);
    io.to(room.code).emit('room-updated', serializeRoom(room));
  });

  socket.on('disconnect', () => {
    const roomCode = socketRooms.get(socket.id);
    if (roomCode) {
      const room = removePlayer(roomCode, socket.id);
      socketRooms.delete(socket.id);
      if (room) {
        io.to(room.code).emit('room-updated', serializeRoom(room));
        // If during playing and all remaining players submitted, end round
        if (room.phase === 'playing' && allPlayersSubmitted(room)) {
          endRound(room);
        }
      }
    }
    console.log(`Player disconnected: ${socket.id}`);
  });
});

// Load word lists then start server
loadWordLists();

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
