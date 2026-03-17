import { useGame } from '../context/GameContext';
import { t } from '../i18n';

export default function Timer() {
  const { timeLeft, roundStopping, lang } = useGame();

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const warning = timeLeft <= 15 && timeLeft > 10;
  const urgent = timeLeft <= 10 && timeLeft > 0;

  return (
    <div className={`timer ${urgent ? 'timer-urgent' : warning ? 'timer-warning' : ''} ${roundStopping ? 'timer-stopping' : ''}`}>
      {roundStopping ? (
        <span className="timer-text">{t(lang, 'lockingAnswers')}</span>
      ) : (
        <span className="timer-text">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      )}
    </div>
  );
}
