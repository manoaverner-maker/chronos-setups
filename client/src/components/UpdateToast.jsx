import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Update-Hinweis der PWA.
//
// Die App laeuft auf 'autoUpdate' (siehe vite.config.js): eine neue Fassung wird vom
// Service Worker sofort uebernommen, niemand haengt auf einer alten fest. Die bereits
// geoeffnete Seite zeigt aber weiter den alten Code, bis sie neu geladen wird —
// deshalb dieses Banner: es erscheint, sobald die neue Fassung bereitsteht, und ein
// Tippen laedt sie. Ohne die App zu schliessen.
//
// Erkannt wird das ueber drei Wege, weil je nach Browser und Zeitpunkt ein anderer
// zuerst greift:
//   1. 'controllerchange' — der neue Service Worker hat gerade uebernommen
//   2. needRefresh von workbox-window — eine Fassung wartet auf Freigabe
//   3. registration.waiting beim Start — es wartete schon eine, bevor wir zusahen
//
// Gesucht wird sofort beim Start, bei jeder Rueckkehr in den Vordergrund und alle
// fuenf Minuten.
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

export default function UpdateToast() {
  const [bereit, setBereit] = useState(false);
  const [laedt, setLaedt] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;
      // Fall 3: Beim Start steht schon eine neue Fassung bereit.
      if (registration.waiting) setBereit(true);

      const pruefen = () => registration.update().catch(() => {});
      pruefen();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') pruefen();
      });
      window.addEventListener('focus', pruefen);
      setInterval(pruefen, CHECK_INTERVAL_MS);

      // Fall 2 (indirekt): eine Fassung installiert sich gerade und legt sich hin.
      registration.addEventListener('updatefound', () => {
        const neu = registration.installing;
        if (!neu) return;
        neu.addEventListener('statechange', () => {
          if (neu.state === 'installed' && navigator.serviceWorker.controller) setBereit(true);
        });
      });
    },
  });

  // Fall 1: Der neue Service Worker hat die Kontrolle uebernommen. Hier bewusst KEIN
  // automatisches Neuladen — das reisst einem sonst mitten im Tippen die Seite weg.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    const beiWechsel = () => setBereit(true);
    navigator.serviceWorker.addEventListener('controllerchange', beiWechsel);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', beiWechsel);
  }, []);

  const zeigen = bereit || needRefresh;
  if (!zeigen) return null;

  const anwenden = async () => {
    setLaedt(true);
    // Wartet noch eine Fassung, zuerst freigeben; danach in jedem Fall neu laden.
    try { await updateServiceWorker(false); } catch { /* dann eben nur neu laden */ }
    window.location.reload();
  };

  return (
    <div
      role="alert"
      className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-50
        glass rounded-2xl px-4 py-3 shadow-glow border-car/50
        flex items-center justify-between gap-3 sm:gap-4"
      style={{ background: 'color-mix(in srgb, var(--car-accent) 12%, rgba(13,16,22,.96))' }}
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-tight">Neue Version verfügbar</div>
        <div className="text-[11px] text-muted leading-tight mt-0.5">Tippen lädt die App neu.</div>
      </div>
      <button
        onClick={anwenden}
        disabled={laedt}
        className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-black
          active:scale-[0.97] transition-transform disabled:opacity-60"
        style={{ background: 'var(--car-accent, var(--accent))' }}
      >
        {laedt ? 'lädt…' : 'Aktualisieren'}
      </button>
    </div>
  );
}
