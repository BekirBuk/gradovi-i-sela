import { useGame } from '../context/GameContext';

const CATEGORY_ORDER = ['countries', 'cities', 'rivers', 'mountains', 'animals', 'plants', 'names'];

export default function Scoreboard() {
  const { room, roundResult, gameOver, nextRound, playAgain, myId } = useGame();

  if (!room || !roundResult) return null;

  const isHost = room.hostId === myId;
  const labels = room.categoryLabels;
  const sortedPlayers = [...room.players].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div className="scoreboard">
      <h2>
        {gameOver
          ? 'Final Results'
          : `Round ${room.currentRound} Results - Letter "${roundResult.letter.toUpperCase()}"`
        }
      </h2>

      <div className="results-table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              <th>Player</th>
              {CATEGORY_ORDER.map(cat => (
                <th key={cat}>{labels[cat] || cat}</th>
              ))}
              <th>Round</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map(player => {
              const playerResults = roundResult.answers[player.id];
              const roundScore = roundResult.scores[player.id] || 0;
              return (
                <tr key={player.id} className={player.id === myId ? 'my-row' : ''}>
                  <td className="player-name">{player.name}</td>
                  {CATEGORY_ORDER.map(cat => {
                    const r = playerResults?.[cat];
                    if (!r) return <td key={cat} className="answer empty">-</td>;
                    return (
                      <td key={cat} className={`answer ${r.valid ? 'valid' : 'invalid'}`}>
                        <span className="answer-text">{r.answer || '-'}</span>
                        <span className="answer-points">{r.points > 0 ? `+${r.points}` : ''}</span>
                      </td>
                    );
                  })}
                  <td className="score round-score">{roundScore}</td>
                  <td className="score total-score">{player.totalScore}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {gameOver && (
        <div className="final-ranking">
          <h3>Rankings</h3>
          <div className="ranking-list">
            {sortedPlayers.map((p, i) => (
              <div key={p.id} className={`ranking-item rank-${i + 1}`}>
                <span className="rank">#{i + 1}</span>
                <span className="name">{p.name}</span>
                <span className="total">{p.totalScore} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isHost && (
        <div className="scoreboard-actions">
          {!gameOver ? (
            <button className="btn btn-primary btn-large" onClick={nextRound}>
              Next Round
            </button>
          ) : (
            <button className="btn btn-primary btn-large" onClick={playAgain}>
              Play Again
            </button>
          )}
        </div>
      )}

      {!isHost && (
        <p className="waiting-text">
          {gameOver ? 'Waiting for host...' : 'Waiting for host to start next round...'}
        </p>
      )}
    </div>
  );
}
