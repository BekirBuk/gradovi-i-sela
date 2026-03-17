import { useState, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { t } from '../i18n';
import Timer from './Timer';

const DEFAULT_CATEGORY_ORDER = ['countries', 'cities', 'rivers', 'mountains', 'animals', 'plants', 'names'];

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
  const { room, submitAnswers, unsubmitAnswers, saveAnswers, stopRound, submittedCount, totalPlayers, timeLeft, roundStopping, lang } = useGame();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const submittedRef = useRef(submitted);
  submittedRef.current = submitted;

  useEffect(() => {
    setAnswers({});
    setSubmitted(false);
    inputRefs.current[0]?.focus();
  }, [room?.currentRound, room?.currentLetter]);

  // Auto-submit when timer runs out or round is stopping
  useEffect(() => {
    if ((timeLeft === 0 || roundStopping) && !submittedRef.current) {
      setSubmitted(true);
      submitAnswers(answersRef.current);
    }
  }, [timeLeft, roundStopping, submitAnswers]);

  if (!room) return null;

  const categoryOrder = room.categories || DEFAULT_categoryOrder;
  const labels = room.categoryLabels;
  const isCustom = room.categoryMode === 'custom';

  function handleChange(cat: string, value: string) {
    const updated = { ...answers, [cat]: value };
    setAnswers(updated);
    saveAnswers(updated);
  }

  function handleSubmit() {
    if (submitted) return;
    setSubmitted(true);
    submitAnswers(answers);
  }

  function handleCancel() {
    if (!submitted || timeLeft === 0 || roundStopping) return;
    setSubmitted(false);
    unsubmitAnswers();
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
      if (index < categoryOrder.length - 1) {
        inputRefs.current[index + 1]?.focus();
      } else {
        handleSubmit();
      }
    }
  }

  const allFilled = categoryOrder.every(cat => answers[cat]?.trim());
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

      <p className="game-hint">{t(lang, 'spellingHint', { letter: room.currentLetter.toUpperCase() })}</p>
      {isCustom && <p className="game-hint game-hint-custom">{t(lang, 'customCategoryReminder')}</p>}

      <div className="categories-form">
        <div className="form-margin-line" />
        {categoryOrder.map((cat, i) => (
          <div key={cat} className="category-row">
            <label>
              {CATEGORY_ICONS[cat] && <span className="cat-icon">{CATEGORY_ICONS[cat]}</span>}
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
          <>
            <p className="submitted-text">{t(lang, 'answersSubmitted')}</p>
            {timeLeft > 0 && !roundStopping && (
              <button className="btn btn-secondary" onClick={handleCancel}>
                {t(lang, 'cancelSubmission')}
              </button>
            )}
          </>
        )}

        {allFilled && !roundStopping && timeLeft > 0 && room.gameMode === 'stop' && (
          <button className="btn btn-stop" onClick={handleStop}>
            {t(lang, 'stop')}
          </button>
        )}
      </div>
    </div>
  );
}
