import { useGame } from '../context/GameContext';
import { t } from '../i18n';

const DEFAULT_categoryOrder = ['countries', 'cities', 'rivers', 'mountains', 'animals', 'plants', 'names'];

export default function Scoreboard() {
  const {
    room, roundResult, gameOver, nextRound, playAgain, myId, lang,
    voteAnswer, skipPlayerReview, resolvedChallenges, voteTallies, myVotes
  } = useGame();

  if (!room || !roundResult) return null;

  const isHost = room.hostId === myId;
  const labels = room.categoryLabels;
  const categoryOrder = room.categories || DEFAULT_categoryOrder;
  const sortedPlayers = [...room.players].sort((a, b) => b.totalScore - a.totalScore);

  const currentChallenger = room.currentChallenger;
  const challengePhaseOver = room.challengePhaseOver;

  const playerName = (id: string) => room.players.find(p => p.id === id)?.name || '?';

  function resolvedFor(playerId: string, cat: string) {
    return resolvedChallenges.find(c => c.playerId === playerId && c.category === cat);
  }

  return (
    <div className="scoreboard">
      <h2>
        {gameOver && challengePhaseOver
          ? t(lang, 'finalResults')
          : t(lang, 'roundResults', { round: String(room.currentRound), letter: roundResult.letter.toUpperCase() })
        }
      </h2>

      {/* On-stage review: one player at a time */}
      {!challengePhaseOver && currentChallenger && (() => {
        const reviewingId = currentChallenger;
        const isOwner = reviewingId === myId;
        const playerResults = roundResult.answers[reviewingId];

        return (
          <div className="review-panel">
            <div className="review-header">
              <h3 className="review-title">{t(lang, 'reviewingPlayer', { name: playerName(reviewingId) })}</h3>
              <p className="review-subtext">
                {isOwner ? t(lang, 'yourAnswersReviewed') : t(lang, 'reviewHint')}
              </p>
            </div>

            <div className="review-items">
              {categoryOrder.map(cat => {
                const r = playerResults?.[cat];
                const label = labels[cat] || cat;

                // Empty / no answer
                if (!r || !r.answer.trim()) {
                  return (
                    <div key={cat} className="review-item empty">
                      <span className="review-label">{label}</span>
                      <span className="review-answer-text">-</span>
                    </div>
                  );
                }

                // Auto-confirmed by the word list
                if (r.valid) {
                  return (
                    <div key={cat} className="review-item confirmed">
                      <span className="review-label">{label}</span>
                      <span className="review-answer">
                        <span className="review-check">&#10003;</span>
                        <span className="review-answer-text">{r.answer}</span>
                        {r.points > 0 && <span className="review-points">+{r.points}</span>}
                      </span>
                      <span className="review-status">{t(lang, 'confirmed')}</span>
                    </div>
                  );
                }

                // Needs group review
                const id = `${reviewingId}-${cat}`;
                const resolved = resolvedFor(reviewingId, cat);

                if (resolved) {
                  return (
                    <div key={cat} className={`review-item resolved ${resolved.accepted ? 'accepted' : 'rejected'}`}>
                      <span className="review-label">{label}</span>
                      <span className="review-answer">
                        <span className="review-answer-text">{r.answer}</span>
                        {resolved.accepted && r.points > 0 && <span className="review-points">+{r.points}</span>}
                      </span>
                      <span className={`challenge-badge ${resolved.accepted ? 'accepted' : 'rejected'}`}>
                        {resolved.accepted ? t(lang, 'accepted') : t(lang, 'rejected')}
                      </span>
                    </div>
                  );
                }

                // Pending vote
                const tally = voteTallies[id] || { yes: 0, no: 0, eligible: Math.max(0, room.players.length - 1) };
                const iVoted = id in myVotes;

                return (
                  <div key={cat} className="review-item pending">
                    <span className="review-label">{label}</span>
                    <span className="review-answer">
                      <span className="review-answer-text">{r.answer}</span>
                    </span>
                    {!isOwner && !iVoted ? (
                      <span className="vote-buttons">
                        <span className="vote-tally">{tally.yes}&#10003; {tally.no}&#10007;</span>
                        <button className="btn-vote btn-vote-accept" onClick={() => voteAnswer(reviewingId, cat, true)} title={t(lang, 'accept')}>&#10003;</button>
                        <button className="btn-vote btn-vote-reject" onClick={() => voteAnswer(reviewingId, cat, false)} title={t(lang, 'reject')}>&#10007;</button>
                      </span>
                    ) : (
                      <span className="review-waiting">
                        <span className="vote-tally">{tally.yes}&#10003; {tally.no}&#10007;</span>
                        <span className="review-waiting-text">
                          {isOwner ? t(lang, 'waitingForJudges') : t(lang, 'youVoted')}
                        </span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {isHost && (
              <button className="btn btn-secondary review-skip" onClick={skipPlayerReview}>
                {t(lang, 'skipPlayer')}
              </button>
            )}
          </div>
        );
      })()}

      {/* Final summary table/cards — shown once every player has been reviewed */}
      {challengePhaseOver && (
        <>
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
                  return (
                    <tr key={player.id} className={player.id === myId ? 'my-row' : ''}>
                      <td className="player-name">{player.name}</td>
                      {categoryOrder.map(cat => {
                        const r = playerResults?.[cat];
                        if (!r) return <td key={cat} className="answer empty">-</td>;

                        const resolved = resolvedFor(player.id, cat);
                        return (
                          <td key={cat} className={`answer ${r.valid ? 'valid' : 'invalid'} ${resolved?.accepted ? 'challenge-accepted' : ''}`}>
                            <span className="answer-text">{r.answer || '-'}</span>
                            <span className="answer-points">{r.points > 0 ? `+${r.points}` : ''}</span>
                            {resolved && resolved.accepted && (
                              <span className="challenge-badge accepted">{t(lang, 'accepted')}</span>
                            )}
                            {resolved && !resolved.accepted && (
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
                    {categoryOrder.map(cat => {
                      const r = playerResults?.[cat];
                      const resolved = resolvedFor(player.id, cat);
                      return (
                        <div key={cat} className={`result-card-row ${r ? (r.valid ? 'valid' : 'invalid') : 'empty'} ${resolved?.accepted ? 'challenge-accepted' : ''}`}>
                          <span className="result-card-label">{labels[cat] || cat}</span>
                          <span className="result-card-answer">
                            <span className="answer-text">{r?.answer || '-'}</span>
                            {r && r.points > 0 && <span className="answer-points">+{r.points}</span>}
                            {resolved && resolved.accepted && (
                              <span className="challenge-badge accepted">{t(lang, 'accepted')}</span>
                            )}
                            {resolved && !resolved.accepted && (
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
        </>
      )}

      {isHost && challengePhaseOver && (
        <div className="scoreboard-actions">
          {!gameOver ? (
            <button className="btn btn-primary btn-large" onClick={nextRound}>
              {t(lang, 'nextRound')}
            </button>
          ) : (
            <button className="btn btn-primary btn-large" onClick={playAgain}>
              {t(lang, 'playAgain')}
            </button>
          )}
        </div>
      )}

      {!isHost && challengePhaseOver && (
        <p className="waiting-text">
          {gameOver ? t(lang, 'waitingForHost') : t(lang, 'waitingForNextRound')}
        </p>
      )}
    </div>
  );
}
