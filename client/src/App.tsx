import { useGame } from './context/GameContext';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import Scoreboard from './components/Scoreboard';

function GameRouter() {
  const { room } = useGame();

  if (!room || room.phase === 'lobby') {
    return <Lobby />;
  }

  if (room.phase === 'playing') {
    return <GameBoard />;
  }

  if (room.phase === 'scoring' || room.phase === 'finished') {
    return <Scoreboard />;
  }

  return <Lobby />;
}

export default function App() {
  return (
    <div className="app">
      <GameRouter />
    </div>
  );
}
