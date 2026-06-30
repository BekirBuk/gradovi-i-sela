import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import Maintenance from './components/Maintenance'
import { SocketProvider } from './context/SocketContext'
import { GameProvider } from './context/GameContext'

// Flip to false to bring the game back online.
const MAINTENANCE_MODE = true

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {MAINTENANCE_MODE ? (
      <Maintenance />
    ) : (
      <SocketProvider>
        <GameProvider>
          <App />
        </GameProvider>
      </SocketProvider>
    )}
  </StrictMode>,
)
