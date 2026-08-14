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
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {TIERS.map((t) => {
          const v = times?.[t.key];
          return (
            <div key={t.key} className="glass rounded-xl p-3 border-line">
              <div className="text-[11px] uppercase tracking-wider text-muted">{t.label}</div>
              <div className={`mono text-lg mt-0.5 tabular-nums ${v ? 'text-ink' : 'text-muted/50'}`}>{fmtLap(v)}</div>
            </div>
          );
        })}
      </div>
      {available && estimated && (
        <p className="text-[11px] text-muted mt-3 leading-relaxed">
          Richtwerte: „Alien" = realer ACC-Hotlap-Benchmark, übrige Tiers modelliert. Offizielle ASPL-Zeiten überschreiben diese jederzeit.
        </p>
      )}
      {!available && (
        <p className="text-[11px] text-muted mt-3">
          Sobald belegte Rundenzeiten in <span className="mono">reference_times.json</span> stehen, erscheinen sie hier automatisch.
        </p>
      )}
    </div>
  );
}
