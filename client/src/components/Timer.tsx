import { useGame } from '../context/GameContext';

export default function Timer() {
  const { timeLeft, roundStopping } = useGame();

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const urgent = timeLeft <= 10 && timeLeft > 0;

  return (
    <div className={`timer ${urgent ? 'timer-urgent' : ''} ${roundStopping ? 'timer-stopping' : ''}`}>
      {roundStopping ? (
        <span className="timer-text">STOP! Locking answers...</span>
      ) : (
        <span className="timer-text">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      )}
    </div>
  );
}
