import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { t } from '../i18n';

const CompassRose = () => (
  <svg className="compass-rose" viewBox="0 0 200 200" width="120" height="120">
    <g transform="translate(100,100)">
      <circle r="90" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <circle r="80" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
      <polygon points="0,-85 6,-30 -6,-30" fill="currentColor" opacity="0.7" />
      <polygon points="0,85 6,30 -6,30" fill="currentColor" opacity="0.25" />
      <polygon points="-85,0 -30,6 -30,-6" fill="currentColor" opacity="0.25" />
      <polygon points="85,0 30,6 30,-6" fill="currentColor" opacity="0.25" />
      <polygon points="-60,-60 -15,-22 -22,-15" fill="currentColor" opacity="0.15" />
      <polygon points="60,-60 15,-22 22,-15" fill="currentColor" opacity="0.15" />
      <polygon points="-60,60 -15,22 -22,15" fill="currentColor" opacity="0.15" />
      <polygon points="60,60 15,22 22,15" fill="currentColor" opacity="0.15" />
      <circle r="4" fill="currentColor" opacity="0.4" />
      <circle r="2" fill="currentColor" opacity="0.7" />
      <text y="-68" textAnchor="middle" fontSize="14" fontWeight="700" fill="currentColor" opacity="0.5" fontFamily="'Playfair Display', serif">N</text>
      <text y="78" textAnchor="middle" fontSize="14" fontWeight="700" fill="currentColor" opacity="0.3" fontFamily="'Playfair Display', serif">S</text>
      <text x="-70" y="5" textAnchor="middle" fontSize="14" fontWeight="700" fill="currentColor" opacity="0.3" fontFamily="'Playfair Display', serif">W</text>
      <text x="70" y="5" textAnchor="middle" fontSize="14" fontWeight="700" fill="currentColor" opacity="0.3" fontFamily="'Playfair Display', serif">E</text>
    </g>
  </svg>
);

export default function Lobby() {
  const { room, createRoom, joinRoom, leaveRoom, updateSettings, startGame, myId, lang, setLang } = useGame();
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [view, setView] = useState<'menu' | 'create' | 'join'>('menu');
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [page, setPage] = useState<'about' | 'rules' | 'privacy' | null>(null);

  const isHost = room?.hostId === myId;

  async function handleCreate() {
    if (!name.trim()) { setError(t(lang, 'enterName')); return; }
    try {
      await createRoom(name.trim());
      setError('');
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleJoin() {
    if (!name.trim()) { setError(t(lang, 'enterName')); return; }
    if (!joinCode.trim()) { setError(t(lang, 'enterRoomCode')); return; }
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
          <h1>{t(lang, 'appTitle')}</h1>
        </div>
        <button className="btn-back" onClick={leaveRoom}>{t(lang, 'back')}</button>
        <div className="room-info">
          <div className="room-code">
            <span className="label">{t(lang, 'roomCode')}</span>
            <span className="code">{room.code}</span>
          </div>
        </div>

        <div className="players-list">
          <h3>{t(lang, 'explorers')} ({room.players.length})</h3>
          {room.players.map(p => (
            <div key={p.id} className={`player-item ${p.id === room.hostId ? 'host' : ''}`}>
              <span className="player-icon">&#9873;</span>
              {p.name} {p.id === room.hostId && <span className="host-badge">{t(lang, 'host')}</span>}
              {p.id === myId && <span className="you-badge">{t(lang, 'you')}</span>}
            </div>
          ))}
        </div>

        {isHost && (
          <div className="settings">
            <h3>{t(lang, 'expeditionSettings')}</h3>
            <div className="setting-row">
              <label>
                {t(lang, 'rounds')}
                <span className="setting-tooltip-trigger" onClick={() => setTooltip(tooltip === 'rounds' ? null : 'rounds')}>?</span>
              </label>
              <select
                value={room.totalRounds}
                onChange={e => updateSettings(room.language, parseInt(e.target.value), room.roundTime)}
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              {tooltip === 'rounds' && <div className="setting-tooltip">{t(lang, 'roundsTooltip')}</div>}
            </div>
            <div className="setting-row">
              <label>
                {t(lang, 'roundTime')}
                <span className="setting-tooltip-trigger" onClick={() => setTooltip(tooltip === 'roundTime' ? null : 'roundTime')}>?</span>
              </label>
              <select
                value={room.roundTime}
                onChange={e => updateSettings(room.language, room.totalRounds, parseInt(e.target.value), room.gameMode)}
              >
                {[60, 90, 120, 150, 180].map(s => (
                  <option key={s} value={s}>{Math.floor(s / 60)}:{(s % 60).toString().padStart(2, '0')}</option>
                ))}
              </select>
              {tooltip === 'roundTime' && <div className="setting-tooltip">{t(lang, 'roundTimeTooltip')}</div>}
            </div>
            <div className="setting-row">
              <label>
                {t(lang, 'gameMode')}
                <span className="setting-tooltip-trigger" onClick={() => setTooltip(tooltip === 'gameMode' ? null : 'gameMode')}>?</span>
              </label>
              <select
                value={room.gameMode}
                onChange={e => updateSettings(room.language, room.totalRounds, room.roundTime, e.target.value as 'timer' | 'stop')}
              >
                <option value="stop">{t(lang, 'gameModeStop')}</option>
                <option value="timer">{t(lang, 'gameModeTimer')}</option>
              </select>
              {tooltip === 'gameMode' && <div className="setting-tooltip">{t(lang, 'gameModeTooltip')}</div>}
            </div>
            <button className="btn btn-primary btn-large" onClick={startGame} disabled={room.players.length < 1}>
              {t(lang, 'beginExpedition')}
            </button>
          </div>
        )}

        {!isHost && (
          <p className="waiting-text">{t(lang, 'waitingForLeader')}</p>
        )}
      </div>
    );
  }

  if (page) {
    return (
      <div className="lobby">
        <div className="lobby-header">
          <h1>{t(lang, 'appTitle')}</h1>
        </div>
        <button className="btn-back" onClick={() => setPage(null)}>{t(lang, 'back')}</button>
        <div className="info-page">
          <h2>{t(lang, page === 'about' ? 'aboutTitle' : page === 'rules' ? 'rulesTitle' : 'privacyTitle')}</h2>
          <div className="info-content">{t(lang, page === 'about' ? 'aboutContent' : page === 'rules' ? 'rulesContent' : 'privacyContent')}</div>
        </div>
      </div>
    );
  }

  if (view === 'menu') {
    return (
      <div className="lobby">
        <div className="lobby-header">
          <CompassRose />
          <h1>{t(lang, 'appTitle')}</h1>
          <p className="subtitle">{t(lang, 'subtitle')}</p>
        </div>
        <div className="lobby-lang-toggle">
          <button
            className={`lang-btn ${lang === 'bs' ? 'active' : ''}`}
            onClick={() => setLang('bs')}
          >
            BS
          </button>
          <button
            className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
            onClick={() => setLang('en')}
          >
            EN
          </button>
        </div>
        <div className="menu-buttons">
          <button className="btn btn-primary btn-large" onClick={() => setView('create')}>
            {t(lang, 'createRoom')}
          </button>
          <button className="btn btn-secondary btn-large" onClick={() => setView('join')}>
            {t(lang, 'joinRoom')}
          </button>
        </div>
        <div className="lobby-coordinates">
          {t(lang, 'coordinates')}
        </div>
        <div className="lobby-footer-links">
          <button onClick={() => setPage('about')}>{t(lang, 'aboutTitle')}</button>
          <span className="footer-sep">&middot;</span>
          <button onClick={() => setPage('rules')}>{t(lang, 'rulesTitle')}</button>
          <span className="footer-sep">&middot;</span>
          <button onClick={() => setPage('privacy')}>{t(lang, 'privacyTitle')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby">
      <div className="lobby-header">
        <h1>{t(lang, 'appTitle')}</h1>
      </div>
      <button className="btn-back" onClick={() => { setView('menu'); setError(''); }}>{t(lang, 'back')}</button>

      <div className="form">
        <input
          type="text"
          placeholder={t(lang, 'explorerName')}
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={20}
          autoFocus
        />

        {view === 'join' && (
          <input
            type="text"
            placeholder={t(lang, 'roomCode')}
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
          {view === 'create' ? t(lang, 'create') : t(lang, 'join')}
        </button>
      </div>
    </div>
  );
}
