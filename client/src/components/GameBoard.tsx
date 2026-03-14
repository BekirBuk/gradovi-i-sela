import { useState, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import Timer from './Timer';

const CATEGORY_ORDER = ['countries', 'cities', 'rivers', 'mountains', 'animals', 'plants', 'names'];

export default function GameBoard() {
  const { room, submitAnswers, stopRound, submittedCount, totalPlayers, timeLeft, roundStopping } = useGame();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset answers when a new round starts
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
    // Submit current answers first, then stop
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
          Round {room.currentRound} / {room.totalRounds}
        </div>
        <Timer />
        <div className="submitted-info">
          {submittedCount}/{totalPlayers} submitted
        </div>
      </div>

      <div className="letter-display">
        <span className="letter">{room.currentLetter.toUpperCase()}</span>
      </div>

      <div className="categories-form">
        {CATEGORY_ORDER.map((cat, i) => (
          <div key={cat} className="category-row">
            <label>{labels[cat] || cat}</label>
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
            Submit Answers
          </button>
        ) : (
          <p className="submitted-text">Answers submitted! Waiting for others...</p>
        )}

        {allFilled && !roundStopping && timeLeft > 0 && (
          <button className="btn btn-danger" onClick={handleStop}>
            STOP!
          </button>
        )}
      </div>
    </div>
  );
}
