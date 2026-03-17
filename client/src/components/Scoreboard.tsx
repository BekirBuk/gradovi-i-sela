import { useGame } from '../context/GameContext';
import { t } from '../i18n';

const DEFAULT_categoryOrder = ['countries', 'cities', 'rivers', 'mountains', 'animals', 'plants', 'names'];

export default function Scoreboard() {
  const {
    room, roundResult, gameOver, nextRound, playAgain, myId, lang,
    challengeAnswer, voteChallenge, skipChallenges, activeChallenge, resolvedChallenges
  } = useGame();

  if (!room || !roundResult) return null;

  const isHost = room.hostId === myId;
  const labels = room.categoryLabels;
  const categoryOrder = room.categories || DEFAULT_categoryOrder;
  const sortedPlayers = [...room.players].sort((a, b) => b.totalScore - a.totalScore);

  const currentChallenger = room.currentChallenger;
  const challengePhaseOver = room.challengePhaseOver;
  const isMyTurn = currentChallenger === myId;

  function isChallenged(playerId: string, cat: string) {
    return resolvedChallenges.some(c => c.playerId === playerId && c.category === cat);
  }

  function isBeingChallenged(playerId: string, cat: string) {
    return activeChallenge?.playerId === playerId && activeChallenge?.category === cat;
  }

  function canChallenge(playerId: string, cat: string) {
    if (playerId !== myId) return false;
    if (!isMyTurn) return false;
    if (activeChallenge) return false;
    const r = roundResult?.answers[playerId]?.[cat];
    if (!r || r.valid || !r.answer.trim()) return false;
    if (isChallenged(playerId, cat)) return false;
    if (isBeingChallenged(playerId, cat)) return false;
    return true;
  }

  const needsMyVote = activeChallenge
    && !activeChallenge.resolved
    && !(myId in activeChallenge.votes);

  const playerName = (id: string) => room.players.find(p => p.id === id)?.name || '?';

  const challengerName = currentChallenger ? playerName(currentChallenger) : '';

  return (
    <div className="scoreboard">
      <h2>
        {gameOver
          ? t(lang, 'finalResults')
          : t(lang, 'roundResults', { round: String(room.currentRound), letter: roundResult.letter.toUpperCase() })
        }
      </h2>

      {/* Challenge turn indicator */}
      {!challengePhaseOver && !activeChallenge && (
        <div className="challenge-turn-banner">
          {isMyTurn ? (
            <>
              <p className="challenge-turn-text challenge-your-turn">
                <span className="challenge-hint-icon">?</span> {t(lang, 'challengeYourTurn')}
              </p>
              <p className="challenge-hint-sub">{t(lang, 'challengeHint')}</p>
              <button className="btn btn-secondary" onClick={skipChallenges}>
                {t(lang, 'skipChallenges')}
              </button>
            </>
          ) : (
            <p className="challenge-turn-text">
              {t(lang, 'challengeTurn', { name: challengerName })}
            </p>
          )}
        </div>
      )}

      {challengePhaseOver && !activeChallenge && (
        <p className="challenge-hint">{t(lang, 'noChallenges')}</p>
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
              {categoryOrder.map(cat => (
                <th key={cat}>{labels[cat] || cat}</th>
              ))}
              <th>{gameOver ? 'Total' : t(lang, 'round')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map(player => {
              const playerResults = roundResult.answers[player.id];
              const roundScore = roundResult.scores[player.id] || 0;
              const isCurrentChallenger = player.id === currentChallenger && !challengePhaseOver;
              return (
                <tr key={player.id} className={`${player.id === myId ? 'my-row' : ''} ${isCurrentChallenger ? 'challenger-row' : ''}`}>
                  <td className="player-name">
                    {player.name}
                    {isCurrentChallenger && <span className="challenger-indicator"> &#9998;</span>}
                  </td>
                  {categoryOrder.map(cat => {
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
          const isCurrentChallenger = player.id === currentChallenger && !challengePhaseOver;
          return (
            <div key={player.id} className={`result-card ${player.id === myId ? 'my-card' : ''} ${isCurrentChallenger ? 'challenger-card' : ''}`}>
              <div className="result-card-header">
                <span className="player-name">
                  {player.name}
                  {isCurrentChallenger && <span className="challenger-indicator"> &#9998;</span>}
                </span>
                <span className={`score ${gameOver ? 'total-score' : 'round-score'}`}>{gameOver ? player.totalScore : roundScore}</span>
              </div>
              <div className="result-card-answers">
                {categoryOrder.map(cat => {
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
            <button className="btn btn-primary btn-large" onClick={nextRound} disabled={!!activeChallenge || !challengePhaseOver}>
              {t(lang, 'nextRound')}
            </button>
          ) : (
            <button className="btn btn-primary btn-large" onClick={playAgain} disabled={!!activeChallenge || !challengePhaseOver}>
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
