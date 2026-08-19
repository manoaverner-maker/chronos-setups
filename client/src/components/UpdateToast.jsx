import { useRegisterSW } from 'virtual:pwa-register/react';

// Update-Hinweis der PWA: Statt die neue Version beim naechsten Start stillschweigend
// zu uebernehmen, erscheint ein Banner mit "Aktualisieren"-Knopf — die App muss nicht
// geschlossen/neu gestartet werden. Geprueft wird sofort beim Start, bei jeder
// Rueckkehr in den Vordergrund und alle 15 Minuten.
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

export default function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;
      const pruefen = () => registration.update().catch(() => {});
      // Sofort beim Start pruefen — sonst faellt ein Update erst beim naechsten
      // Intervall auf, und wer die App nur kurz oeffnet, sieht nie einen Hinweis.
      pruefen();
      // Und jedes Mal, wenn die App wieder in den Vordergrund kommt (Handy!).
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') pruefen();
      });
      window.addEventListener('focus', pruefen);
      setInterval(pruefen, CHECK_INTERVAL_MS);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 glass rounded-2xl px-4 py-3
        flex items-center gap-3 shadow-glow border-car/40 max-w-[92vw]"
    >
      <span className="text-sm whitespace-nowrap">Neue Version verfügbar</span>
      <button
        onClick={() => updateServiceWorker(true)}
        className="rounded-xl px-3.5 py-1.5 text-sm font-semibold text-black whitespace-nowrap
          active:scale-[0.97] transition-transform"
        style={{ background: 'var(--car-accent, var(--accent))' }}
      >
        Aktualisieren
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        aria-label="Später aktualisieren"
        className="w-6 h-6 leading-none text-muted hover:text-ink"
      >
        ×
      </button>
    </div>
  );
}
