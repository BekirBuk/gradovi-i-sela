import { useGame } from '../context/GameContext';

const CATEGORY_ORDER = ['countries', 'cities', 'rivers', 'mountains', 'animals', 'plants', 'names'];

export default function Scoreboard() {
  const {
    room, roundResult, gameOver, nextRound, playAgain, myId,
    challengeAnswer, voteChallenge, activeChallenge, resolvedChallenges
  } = useGame();

  if (!room || !roundResult) return null;

  const isHost = room.hostId === myId;
  const labels = room.categoryLabels;
  const sortedPlayers = [...room.players].sort((a, b) => b.totalScore - a.totalScore);

  function isChallenged(playerId: string, cat: string) {
    return resolvedChallenges.some(c => c.playerId === playerId && c.category === cat);
  }

  function isBeingChallenged(playerId: string, cat: string) {
    return activeChallenge?.playerId === playerId && activeChallenge?.category === cat;
  }

  function canChallenge(playerId: string, cat: string) {
    const r = roundResult?.answers[playerId]?.[cat];
    if (!r || r.valid || !r.answer.trim()) return false;
    if (isChallenged(playerId, cat)) return false;
    if (isBeingChallenged(playerId, cat)) return false;
    if (activeChallenge) return false; // one at a time
    return true;
  }

  const needsMyVote = activeChallenge
    && !activeChallenge.resolved
    && !(myId in activeChallenge.votes);

  const playerName = (id: string) => room.players.find(p => p.id === id)?.name || 'Unknown';

  return (
    <div className="scoreboard">
      <h2>
        {gameOver
          ? 'Final Results'
          : `Round ${room.currentRound} Results - Letter "${roundResult.letter.toUpperCase()}"`
        }
      </h2>

      {/* Active challenge voting banner */}
      {activeChallenge && !activeChallenge.resolved && (
        <div className="challenge-banner">
          <p className="challenge-text">
            <strong>{playerName(activeChallenge.playerId)}</strong> claims
            "<strong>{activeChallenge.answer}</strong>" is a valid
            <strong> {labels[activeChallenge.category] || activeChallenge.category}</strong>.
          </p>
          {needsMyVote ? (
            <div className="challenge-actions">
              <button
                className="btn btn-primary"
                onClick={() => voteChallenge(activeChallenge.id, true)}
              >
                Accept
              </button>
              <button
                className="btn btn-danger"
                onClick={() => voteChallenge(activeChallenge.id, false)}
              >
                Reject
              </button>
            </div>
          ) : (
            <p className="challenge-waiting">
              Waiting for votes... ({Object.keys(activeChallenge.votes).length}/{room.players.length})
            </p>
          )}
        </div>
      )}

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

                    const challenged = isChallenged(player.id, cat);
                    const wasAccepted = resolvedChallenges.find(
                      c => c.playerId === player.id && c.category === cat
                    )?.accepted;

                    return (
                      <td key={cat} className={`answer ${r.valid ? 'valid' : 'invalid'} ${challenged && wasAccepted ? 'challenge-accepted' : ''}`}>
                        <span className="answer-text">{r.answer || '-'}</span>
                        <span className="answer-points">{r.points > 0 ? `+${r.points}` : ''}</span>
                        {canChallenge(player.id, cat) && (
                          <button
                            className="btn-challenge"
                            onClick={() => challengeAnswer(player.id, cat)}
                            title="Challenge this answer"
                          >
                            ?
                          </button>
                        )}
                        {challenged && wasAccepted && (
                          <span className="challenge-badge accepted">Accepted</span>
                        )}
                        {challenged && !wasAccepted && (
                          <span className="challenge-badge rejected">Rejected</span>
                        )}
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
            <button className="btn btn-primary btn-large" onClick={nextRound} disabled={!!activeChallenge}>
              Next Round
            </button>
          ) : (
            <button className="btn btn-primary btn-large" onClick={playAgain} disabled={!!activeChallenge}>
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
