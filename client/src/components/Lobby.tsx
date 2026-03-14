import { useState } from 'react';
import { useGame } from '../context/GameContext';

export default function Lobby() {
  const { room, createRoom, joinRoom, updateSettings, startGame, myId } = useGame();
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [view, setView] = useState<'menu' | 'create' | 'join'>('menu');

  const isHost = room?.hostId === myId;

  async function handleCreate() {
    if (!name.trim()) { setError('Enter your name'); return; }
    try {
      await createRoom(name.trim());
      setError('');
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleJoin() {
    if (!name.trim()) { setError('Enter your name'); return; }
    if (!joinCode.trim()) { setError('Enter room code'); return; }
    try {
      await joinRoom(joinCode.trim().toUpperCase(), name.trim());
      setError('');
    } catch (e: any) {
      setError(e.message);
    }
  }

  // Already in a room - show lobby
  if (room) {
    return (
      <div className="lobby">
        <h1>Gradovi i Sela</h1>
        <div className="room-info">
          <div className="room-code">
            <span className="label">Room Code</span>
            <span className="code">{room.code}</span>
          </div>
        </div>

        <div className="players-list">
          <h3>Players ({room.players.length})</h3>
          {room.players.map(p => (
            <div key={p.id} className={`player-item ${p.id === room.hostId ? 'host' : ''}`}>
              {p.name} {p.id === room.hostId && <span className="host-badge">HOST</span>}
              {p.id === myId && <span className="you-badge">YOU</span>}
            </div>
          ))}
        </div>

        {isHost && (
          <div className="settings">
            <h3>Settings</h3>
            <div className="setting-row">
              <label>Language</label>
              <select
                value={room.language}
                onChange={e => updateSettings(e.target.value as 'en' | 'bs', room.totalRounds)}
              >
                <option value="bs">Bosanski</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="setting-row">
              <label>Rounds</label>
              <select
                value={room.totalRounds}
                onChange={e => updateSettings(room.language, parseInt(e.target.value))}
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary btn-large" onClick={startGame} disabled={room.players.length < 1}>
              Start Game
            </button>
          </div>
        )}

        {!isHost && (
          <p className="waiting-text">Waiting for host to start the game...</p>
        )}
      </div>
    );
  }

  // Not in a room - show menu
  if (view === 'menu') {
    return (
      <div className="lobby">
        <h1>Gradovi i Sela</h1>
        <p className="subtitle">The Categories Game</p>
        <div className="menu-buttons">
          <button className="btn btn-primary btn-large" onClick={() => setView('create')}>
            Create Room
          </button>
          <button className="btn btn-secondary btn-large" onClick={() => setView('join')}>
            Join Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby">
      <h1>Gradovi i Sela</h1>
      <button className="btn-back" onClick={() => { setView('menu'); setError(''); }}>Back</button>

      <div className="form">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={20}
          autoFocus
        />

        {view === 'join' && (
          <input
            type="text"
            placeholder="Room code"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            maxLength={4}
            className="room-code-input"
          />
        )}

        {error && <p className="error">{error}</p>}

        <button
          className="btn btn-primary btn-large"
          onClick={view === 'create' ? handleCreate : handleJoin}
        >
          {view === 'create' ? 'Create' : 'Join'}
        </button>
      </div>
    </div>
  );
}
