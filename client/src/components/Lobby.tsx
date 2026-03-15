import { useState } from 'react';
import { useGame } from '../context/GameContext';

const CompassRose = () => (
  <svg className="compass-rose" viewBox="0 0 200 200" width="120" height="120">
    <g transform="translate(100,100)">
      {/* Outer ring */}
      <circle r="90" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <circle r="80" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
      {/* Cardinal points */}
      <polygon points="0,-85 6,-30 -6,-30" fill="currentColor" opacity="0.7" />
      <polygon points="0,85 6,30 -6,30" fill="currentColor" opacity="0.25" />
      <polygon points="-85,0 -30,6 -30,-6" fill="currentColor" opacity="0.25" />
      <polygon points="85,0 30,6 30,-6" fill="currentColor" opacity="0.25" />
      {/* Intercardinal points */}
      <polygon points="-60,-60 -15,-22 -22,-15" fill="currentColor" opacity="0.15" />
      <polygon points="60,-60 15,-22 22,-15" fill="currentColor" opacity="0.15" />
      <polygon points="-60,60 -15,22 -22,15" fill="currentColor" opacity="0.15" />
      <polygon points="60,60 15,22 22,15" fill="currentColor" opacity="0.15" />
      {/* Center */}
      <circle r="4" fill="currentColor" opacity="0.4" />
      <circle r="2" fill="currentColor" opacity="0.7" />
      {/* Letters */}
      <text y="-68" textAnchor="middle" fontSize="14" fontWeight="700" fill="currentColor" opacity="0.5" fontFamily="'Playfair Display', serif">N</text>
      <text y="78" textAnchor="middle" fontSize="14" fontWeight="700" fill="currentColor" opacity="0.3" fontFamily="'Playfair Display', serif">S</text>
      <text x="-70" y="5" textAnchor="middle" fontSize="14" fontWeight="700" fill="currentColor" opacity="0.3" fontFamily="'Playfair Display', serif">W</text>
      <text x="70" y="5" textAnchor="middle" fontSize="14" fontWeight="700" fill="currentColor" opacity="0.3" fontFamily="'Playfair Display', serif">E</text>
    </g>
  </svg>
);

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

  if (room) {
    return (
      <div className="lobby">
        <div className="lobby-header">
          <CompassRose />
          <h1>Gradovi i Sela</h1>
        </div>
        <div className="room-info">
          <div className="room-code">
            <span className="label">Room Code</span>
            <span className="code">{room.code}</span>
          </div>
        </div>

        <div className="players-list">
          <h3>Explorers ({room.players.length})</h3>
          {room.players.map(p => (
            <div key={p.id} className={`player-item ${p.id === room.hostId ? 'host' : ''}`}>
              <span className="player-icon">&#9873;</span>
              {p.name} {p.id === room.hostId && <span className="host-badge">HOST</span>}
              {p.id === myId && <span className="you-badge">YOU</span>}
            </div>
          ))}
        </div>

        {isHost && (
          <div className="settings">
            <h3>Expedition Settings</h3>
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
              Begin Expedition
            </button>
          </div>
        )}

        {!isHost && (
          <p className="waiting-text">Waiting for the expedition leader...</p>
        )}
      </div>
    );
  }

  if (view === 'menu') {
    return (
      <div className="lobby">
        <div className="lobby-header">
          <CompassRose />
          <h1>Gradovi i Sela</h1>
          <p className="subtitle">A Geography Challenge</p>
        </div>
        <div className="menu-buttons">
          <button className="btn btn-primary btn-large" onClick={() => setView('create')}>
            Create Room
          </button>
          <button className="btn btn-secondary btn-large" onClick={() => setView('join')}>
            Join Room
          </button>
        </div>
        <div className="lobby-coordinates">
          43.8563&deg;N &middot; 18.4131&deg;E
        </div>
      </div>
    );
  }

  return (
    <div className="lobby">
      <div className="lobby-header">
        <h1>Gradovi i Sela</h1>
      </div>
      <button className="btn-back" onClick={() => { setView('menu'); setError(''); }}>&larr; Back</button>

      <div className="form">
        <input
          type="text"
          placeholder="Explorer name"
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
