import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BRAND } from '../lib/brand.js';
import { getCurrentSeasonName } from '../lib/api.js';

// Notbremse, falls die App doch einmal auf einer alten Fassung haengenbleibt:
// Service Worker abmelden, alle Caches leeren, hart neu laden. Es gehen dabei
// keine eigenen Daten verloren — die App haelt nichts, was nicht aus /data kommt.
async function neuLadenErzwingen() {
  try {
    const registrierungen = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
    await Promise.all(registrierungen.map((r) => r.unregister()));
  } catch { /* weiter — der harte Reload holt die Seite ohnehin neu */ }
  try {
    const namen = (await caches?.keys?.()) ?? [];
    await Promise.all(namen.map((n) => caches.delete(n)));
  } catch { /* dito */ }
  window.location.reload();
}

export default function Footer() {
  const [laeuft, setLaeuft] = useState(false);
  const { data: saison } = useQuery({
    queryKey: ['saison-name'],
    queryFn: getCurrentSeasonName,
    staleTime: Infinity,
  });

  return (
    <footer className="glass border-x-0 border-b-0 mt-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row gap-4 sm:items-center justify-between text-sm">
        <div>
          <div className="display font-semibold tracking-wide">
            Chronos Motorsport <span className="text-accent">Racing Team</span>
          </div>
          <div className="text-muted text-xs mt-1">
            {BRAND.league}{saison ? ` · ${saison}` : ''} · {BRAND.domain}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {BRAND.partners.map((p) => (
            <span key={p} className="whitespace-nowrap">{p}</span>
          ))}
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-5 text-[11px] text-muted/70 leading-relaxed">
        Setups aus Team-Vorlagen transkribiert · Drücke deterministisch berechnet · Fehlende Daten werden als „—" ausgewiesen, nicht erfunden.
        <br />Streckenlayouts © OpenStreetMap-Mitwirkende (ODbL).
        {/* Versionsstempel: macht auf einen Blick sichtbar, ob die App noch aus dem
            Offline-Cache kommt (alte Version) oder aktuell ist. Daneben die Notbremse. */}
        <br />
        <span className="inline-flex flex-wrap items-center gap-2 mt-0.5">
          <span>Version <span className="mono">{__APP_BUILD__}</span></span>
          <button
            onClick={() => { setLaeuft(true); neuLadenErzwingen(); }}
            disabled={laeuft}
            title="Leert den Offline-Speicher und holt die App frisch vom Server. Nötig nur, wenn eine alte Fassung hängenbleibt."
            className="underline underline-offset-2 hover:text-ink transition-colors disabled:opacity-50"
          >
            {laeuft ? 'lädt neu…' : 'neu laden erzwingen'}
          </button>
        </span>
      </div>
    </footer>
  );
}
