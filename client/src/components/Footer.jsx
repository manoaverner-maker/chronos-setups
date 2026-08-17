import { BRAND } from '../lib/brand.js';

export default function Footer() {
  return (
    <footer className="glass border-x-0 border-b-0 mt-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row gap-4 sm:items-center justify-between text-sm">
        <div>
          <div className="display font-semibold tracking-wide">
            Chronos Motorsport <span className="text-accent">Racing Team</span>
          </div>
          <div className="text-muted text-xs mt-1">{BRAND.league} · Saison 2 · {BRAND.domain}</div>
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
            Offline-Cache kommt (alte Version) oder aktuell ist. */}
        <br />Version <span className="mono">{__APP_BUILD__}</span>
      </div>
    </footer>
  );
}
