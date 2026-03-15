import { useState, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { t } from '../i18n';
import Timer from './Timer';

const CATEGORY_ORDER = ['countries', 'cities', 'rivers', 'mountains', 'animals', 'plants', 'names'];

const CATEGORY_ICONS: Record<string, string> = {
  countries: '\u{1F3F3}',
  cities: '\u{1F3DB}',
  rivers: '\u{1F30A}',
  mountains: '\u{26F0}',
  animals: '\u{1F43E}',
  plants: '\u{1F33F}',
  names: '\u{270D}',
};

export default function GameBoard() {
  const { room, submitAnswers, stopRound, submittedCount, totalPlayers, timeLeft, roundStopping, lang } = useGame();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setAnswers({});
    setSubmitted(false);
    inputRefs.current[0]?.focus();
  }, [room?.currentRound, room?.currentLetter]);

  if (!room) return null;

  const labels = room.categoryLabels;

  function handleChange(cat: string, value: string) {
    setAnswers(prev => ({ ...prev, [cat]: value }));
  }

  function handleSubmit() {
    if (submitted) return;
    setSubmitted(true);
    submitAnswers(answers);
  }

  function handleStop() {
    if (!submitted) {
      setSubmitted(true);
      submitAnswers(answers);
    }
    stopRound();
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index < CATEGORY_ORDER.length - 1) {
        inputRefs.current[index + 1]?.focus();
      } else {
        handleSubmit();
      }
    }
  }

  const allFilled = CATEGORY_ORDER.every(cat => answers[cat]?.trim());
  const disabled = submitted || timeLeft === 0;

  return (
    <div className="game-board">
      <div className="game-header">
        <div className="round-info">
          <span className="round-label">{t(lang, 'round')}</span>
          <span className="round-number">{room.currentRound}/{room.totalRounds}</span>
        </div>
        <Timer />
        <div className="submitted-info">
          {submittedCount}/{totalPlayers} {t(lang, 'submitted')}
        </div>
      </div>

      <div className="letter-display">
        <div className="letter-frame">
          <span className="letter">{room.currentLetter.toUpperCase()}</span>
        </div>
      </div>

      <div className="categories-form">
        <div className="form-margin-line" />
        {CATEGORY_ORDER.map((cat, i) => (
          <div key={cat} className="category-row">
            <label>
              <span className="cat-icon">{CATEGORY_ICONS[cat]}</span>
              {labels[cat] || cat}
            </label>
            <input
              ref={el => { inputRefs.current[i] = el; }}
              type="text"
              value={answers[cat] || ''}
              onChange={e => handleChange(cat, e.target.value)}
              onKeyDown={e => handleKeyDown(e, i)}
              disabled={disabled}
              placeholder={`${labels[cat] || cat}...`}
              autoComplete="off"
            />
          </div>
        ))}
      </div>

      <div className="game-actions">
        {!submitted ? (
          <button className="btn btn-primary" onClick={handleSubmit} disabled={disabled}>
            {t(lang, 'submitAnswers')}
          </button>
        ) : (
          <p className="submitted-text">{t(lang, 'answersSubmitted')}</p>
        )}

        {allFilled && !roundStopping && timeLeft > 0 && (
          <button className="btn btn-stop" onClick={handleStop}>
            {t(lang, 'stop')}
          </button>
        )}
      </div>
    </div>
  );
}
