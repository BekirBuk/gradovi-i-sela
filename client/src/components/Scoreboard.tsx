import { useGame } from '../context/GameContext';
import { t } from '../i18n';

const CATEGORY_ORDER = ['countries', 'cities', 'rivers', 'mountains', 'animals', 'plants', 'names'];

export default function Scoreboard() {
  const {
    room, roundResult, gameOver, nextRound, playAgain, myId, lang,
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
    if (playerId !== myId) return false;
    const r = roundResult?.answers[playerId]?.[cat];
    if (!r || r.valid || !r.answer.trim()) return false;
    if (isChallenged(playerId, cat)) return false;
    if (isBeingChallenged(playerId, cat)) return false;
    if (activeChallenge) return false;
    return true;
  }

  const needsMyVote = activeChallenge
    && !activeChallenge.resolved
    && !(myId in activeChallenge.votes);

  const playerName = (id: string) => room.players.find(p => p.id === id)?.name || '?';

  return (
    <div className="scoreboard">
      <h2>
        {gameOver
          ? t(lang, 'finalResults')
          : t(lang, 'roundResults', { round: String(room.currentRound), letter: roundResult.letter.toUpperCase() })
        }
      </h2>

      {!activeChallenge && (
        <p className="challenge-hint">
          <span className="challenge-hint-icon">?</span> {t(lang, 'challengeHint')}
        </p>
      )}

      {activeChallenge && !activeChallenge.resolved && (
        <div className="challenge-banner">
          <p className="challenge-text">
            <strong>{playerName(activeChallenge.playerId)}</strong> {t(lang, 'claims')} "<strong>{activeChallenge.answer}</strong>" {t(lang, 'isAValid')} <strong>{labels[activeChallenge.category] || activeChallenge.category}</strong>.
          </p>
          {needsMyVote ? (
            <div className="challenge-actions">
              <button
                className="btn btn-primary"
                onClick={() => voteChallenge(activeChallenge.id, true)}
              >
                {t(lang, 'accept')}
              </button>
              <button
                className="btn btn-danger"
                onClick={() => voteChallenge(activeChallenge.id, false)}
              >
                {t(lang, 'reject')}
              </button>
            </div>
          ) : (
            <p className="challenge-waiting">
              {t(lang, 'waitingForVotes')} ({Object.keys(activeChallenge.votes).length}/{room.players.length})
            </p>
          )}
        </div>
      )}

      {/* Desktop table */}
      <div className="results-table-wrapper desktop-only">
        <table className="results-table">
          <thead>
            <tr>
              <th>Player</th>
              {CATEGORY_ORDER.map(cat => (
                <th key={cat}>{labels[cat] || cat}</th>
              ))}
              <th>{gameOver ? 'Total' : t(lang, 'round')}</th>
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
                            title="Challenge"
                          >
                            ?
                          </button>
                        )}
                        {challenged && wasAccepted && (
                          <span className="challenge-badge accepted">{t(lang, 'accepted')}</span>
                        )}
                        {challenged && !wasAccepted && (
                          <span className="challenge-badge rejected">{t(lang, 'rejected')}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className={`score ${gameOver ? 'total-score' : 'round-score'}`}>{gameOver ? player.totalScore : roundScore}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="results-cards mobile-only">
        {sortedPlayers.map(player => {
          const playerResults = roundResult.answers[player.id];
          const roundScore = roundResult.scores[player.id] || 0;
          return (
            <div key={player.id} className={`result-card ${player.id === myId ? 'my-card' : ''}`}>
              <div className="result-card-header">
                <span className="player-name">{player.name}</span>
                <span className={`score ${gameOver ? 'total-score' : 'round-score'}`}>{gameOver ? player.totalScore : roundScore}</span>
              </div>
              <div className="result-card-answers">
                {CATEGORY_ORDER.map(cat => {
                  const r = playerResults?.[cat];
                  const challenged = isChallenged(player.id, cat);
                  const wasAccepted = resolvedChallenges.find(
                    c => c.playerId === player.id && c.category === cat
                  )?.accepted;

                  return (
                    <div key={cat} className={`result-card-row ${r ? (r.valid ? 'valid' : 'invalid') : 'empty'} ${challenged && wasAccepted ? 'challenge-accepted' : ''}`}>
                      <span className="result-card-label">{labels[cat] || cat}</span>
                      <span className="result-card-answer">
                        <span className="answer-text">{r?.answer || '-'}</span>
                        {r && r.points > 0 && <span className="answer-points">+{r.points}</span>}
                        {r && canChallenge(player.id, cat) && (
                          <button
                            className="btn-challenge"
                            onClick={() => challengeAnswer(player.id, cat)}
                            title="Challenge"
                          >
                            ?
                          </button>
                        )}
                        {challenged && wasAccepted && (
                          <span className="challenge-badge accepted">{t(lang, 'accepted')}</span>
                        )}
                        {challenged && !wasAccepted && (
                          <span className="challenge-badge rejected">{t(lang, 'rejected')}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {gameOver && (
        <div className="final-ranking">
          <h3>{t(lang, 'rankings')}</h3>
          <div className="ranking-list">
            {sortedPlayers.map((p, i) => (
              <div key={p.id} className={`ranking-item rank-${i + 1}`}>
                <span className="rank">#{i + 1}</span>
                <span className="name">{p.name}</span>
                <span className="total">{p.totalScore} {t(lang, 'pts')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isHost && (
        <div className="scoreboard-actions">
          {!gameOver ? (
            <button className="btn btn-primary btn-large" onClick={nextRound} disabled={!!activeChallenge}>
              {t(lang, 'nextRound')}
            </button>
          ) : (
            <button className="btn btn-primary btn-large" onClick={playAgain} disabled={!!activeChallenge}>
              {t(lang, 'playAgain')}
            </button>
          )}
        </div>
      )}

      {!isHost && (
        <p className="waiting-text">
          {gameOver ? t(lang, 'waitingForHost') : t(lang, 'waitingForNextRound')}
        </p>
      )}
    </div>
  );
}
