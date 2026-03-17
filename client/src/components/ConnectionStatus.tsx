import { useConnectionStatus } from '../context/SocketContext';
import { useGame } from '../context/GameContext';
import { t } from '../i18n';

export default function ConnectionStatus() {
  const status = useConnectionStatus();
  const { lang } = useGame();

  if (status === 'connected') return null;

  return (
    <div className={`connection-banner ${status}`}>
      <span className="connection-dot" />
      {status === 'reconnecting'
        ? t(lang, 'reconnecting')
        : t(lang, 'disconnected')
      }
    </div>
  );
}
