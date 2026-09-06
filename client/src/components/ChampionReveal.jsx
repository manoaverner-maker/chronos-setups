import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// Feste Streuung statt Math.random(): sonst springen die Partikel bei jedem Re-Render
// an neue Stellen. 18 Stueck reichen fuer den Effekt, ohne die Karte zuzupflastern.
const KONFETTI = Array.from({ length: 18 }, (_, i) => {
  const winkel = (i / 18) * Math.PI * 2;
  return {
    x: Math.cos(winkel) * (90 + (i % 5) * 26),
    y: Math.sin(winkel) * (48 + (i % 4) * 20) - 20,
    dreh: (i % 2 ? 1 : -1) * (120 + i * 24),
    verzug: 0.18 + (i % 6) * 0.045,
    gross: i % 3 === 0,
  };
});

function Pokal() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4.5a2.5 2.5 0 0 0 2.5 2.5M17 6h2.5A2.5 2.5 0 0 1 17 8.5" />
      <path d="M12 14v3M9 20h6M10 17h4" />
    </svg>
  );
}

/**
 * Champion-Einblendung fuer eine abgeschlossene Saison.
 * Die Animation laeuft bei jedem Serienwechsel neu — dafuer setzt der Aufrufer `key`.
 */
export default function ChampionReveal({ champion, seasonName, seriesName }) {
  const wenigerBewegung = useReducedMotion();
  const konfetti = useMemo(() => (wenigerBewegung ? [] : KONFETTI), [wenigerBewegung]);
  if (!champion) return null;

  const istTeam = champion.kind === 'team';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden glass rounded-2xl px-5 py-6 sm:px-7 sm:py-7 mb-5"
      style={{ borderColor: 'color-mix(in srgb, var(--car-accent) 45%, transparent)' }}
    >
      {/* Lichtschein, der einmal von links nach rechts wandert */}
      {!wenigerBewegung && (
        <motion.div
          aria-hidden="true"
          initial={{ x: '-120%' }}
          animate={{ x: '130%' }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.25 }}
          className="pointer-events-none absolute inset-y-0 w-1/3"
          style={{ background: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--car-accent) 22%, transparent), transparent)' }}
        />
      )}

      {/* Konfetti aus der Mitte des Pokals */}
      <div aria-hidden="true" className="pointer-events-none absolute left-8 top-8">
        {konfetti.map((k, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
            animate={{ opacity: [0, 1, 1, 0], x: k.x, y: [0, k.y, k.y + 70], rotate: k.dreh }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: k.verzug, times: [0, 0.15, 0.6, 1] }}
            className="absolute rounded-[1px]"
            style={{
              width: k.gross ? 7 : 4,
              height: k.gross ? 3 : 4,
              background: i % 3 === 0 ? 'var(--car-accent)' : i % 3 === 1 ? 'var(--good)' : 'var(--warn)',
            }}
          />
        ))}
      </div>

      <div className="relative flex items-start gap-4">
        <motion.div
          initial={{ scale: 0.4, rotate: -18, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.1 }}
          className="shrink-0 rounded-xl p-2.5 text-car"
          style={{ background: 'color-mix(in srgb, var(--car-accent) 16%, transparent)' }}
        >
          <Pokal />
        </motion.div>

        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.25em] text-car">
            {istTeam ? 'Teammeister' : 'Champion'} · {seasonName}
          </p>
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="display text-2xl sm:text-4xl font-bold mt-1 leading-tight break-words"
          >
            {champion.name}
          </motion.h3>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.42 }}
            className="text-sm text-muted mt-1.5"
          >
            {seriesName}
            {champion.team && !istTeam ? ` · ${champion.team}` : ''}
            {champion.points != null && (
              <> · <span className="mono text-car font-semibold">{champion.points}</span> Punkte</>
            )}
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}
