import { useEffect } from 'react';

// Self-contained "game temporarily unavailable" screen. Rendered in place of
// the whole app (before any socket/game providers) when MAINTENANCE_MODE is on,
// so no connections are opened while we work on improvements.
export default function Maintenance() {
  // Honour the player's saved theme even though GameProvider isn't mounted.
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') {
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  return (
    <div className="maintenance">
      <div className="maintenance-card">
        <div className="maintenance-compass" aria-hidden="true">&#129517;</div>
        <h1 className="maintenance-title">Gradova i Sela</h1>

        <div className="maintenance-block">
          <h2 className="maintenance-heading">Radimo na pobolj&#353;anjima</h2>
          <p className="maintenance-text">
            Igra je trenutno nedostupna dok dodajemo nove stvari i popravljamo
            poneku sitnicu. Vratite se uskoro &mdash; hvala na strpljenju!
          </p>
        </div>

        <div className="maintenance-divider" aria-hidden="true" />

        <div className="maintenance-block">
          <h2 className="maintenance-heading">We&rsquo;re making improvements</h2>
          <p className="maintenance-text">
            The game is temporarily unavailable while we work on some upgrades.
            Please check back soon &mdash; thanks for your patience!
          </p>
        </div>
      </div>
    </div>
  );
}
