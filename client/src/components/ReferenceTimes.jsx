import { TIERS, fmtLap } from '../lib/format.js';

// Feature 1 / M5: Referenzzeiten je Tier. Fehlende Zeiten -> ehrliches "—".
// estimated=true: Richtwerte (ca.), keine offiziellen Liga-Zeiten -> klar gekennzeichnet.
export default function ReferenceTimes({ times, available, estimated }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="display text-lg font-semibold">Referenzzeiten</h3>
        {!available && <span className="text-[11px] text-warn">noch nicht hinterlegt</span>}
        {available && estimated && (
          <span
            className="text-[11px] text-warn border border-warn/30 rounded-full px-2 py-0.5"
            title="Richtwerte aus ACC-GT3-Benchmarks, keine offiziellen ASPL-Zeiten"
          >
            ca. · nicht offiziell
          </span>
        )}
      </div>
      {/* Als Liste statt vier Kaesten — liest sich schneller und ist ruhiger. */}
      <div className="mt-3 divide-y divide-line/60">
        {TIERS.map((t) => {
          const v = times?.[t.key];
          return (
            <div key={t.key} className="flex items-baseline justify-between py-2">
              <span className="text-sm text-muted">{t.label}</span>
              <span className={`mono text-lg tabular-nums ${v ? 'text-ink' : 'text-muted/50'}`}>{fmtLap(v)}</span>
            </div>
          );
        })}
      </div>
      {available && estimated && (
        <p className="text-[11px] text-muted mt-3">Richtwerte — eigene Team-Zeiten haben Vorrang.</p>
      )}
      {!available && (
        <p className="text-[11px] text-muted mt-3">Noch keine Zeiten hinterlegt.</p>
      )}
    </div>
  );
}
