import { useMemo, useState } from 'react';

// Tankrechner. Bewusst schlank: die eine Zahl, die man wirklich braucht, ist die
// Startfuellung. Alles Weitere (Tankgroesse, Einfuehrungsrunde, Stopp-Zeitpunkte,
// Stint-Plan) liegt hinter "Details" — vorhanden, aber nicht im Weg.
function parseLap(str) {
  if (!str) return null;
  const m = String(str).match(/(?:(\d+):)?(\d+)(?:[.,](\d+))?/);
  if (!m) return null;
  return (+(m[1] || 0)) * 60 + +m[2] + (m[3] ? +`0.${m[3]}` : 0);
}
const fmtLap = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function Feld({ label, value, onChange, step = 1, min = 1, suffix }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted">{label}</span>
      <div className="mt-1 flex items-center glass rounded-xl px-2.5 py-1.5">
        <input
          type="number" value={value} step={step} min={min}
          onChange={(e) => onChange(Math.max(min, Number(e.target.value)))}
          className="w-full bg-transparent outline-none mono text-ink text-base"
        />
        {suffix && <span className="text-xs text-muted ml-1">{suffix}</span>}
      </div>
    </label>
  );
}

export default function FuelCalculator({ lapTimeStr, lengthKm, titel = 'Tank- & Stint-Rechner' }) {
  const refLap = parseLap(lapTimeStr);
  const [lapText, setLapText] = useState(refLap ? fmtLap(refLap) : '1:50.0');
  const lapSec = parseLap(refLap ? lapTimeStr : lapText) ?? 110;

  const [minuten, setMinuten] = useState(60);
  const [proRunde, setProRunde] = useState(lengthKm ? Math.max(1.5, +(lengthKm * 0.55).toFixed(1)) : 2.8);
  const [tank, setTank] = useState(120);
  const [formation, setFormation] = useState(true);
  const [stopps, setStopps] = useState([30]);
  const [details, setDetails] = useState(false);

  const gueltig = useMemo(
    () => [...new Set(stopps.map((t) => clamp(Math.round(t), 1, minuten - 1)))]
      .filter((t) => t > 0 && t < minuten).sort((a, b) => a - b),
    [stopps, minuten],
  );

  const r = useMemo(() => {
    const runden = Math.max(1, Math.ceil((minuten * 60) / lapSec) + 1);
    const reserve = proRunde;
    const formationSprit = formation ? proRunde : 0;
    const grenzen = [0];
    for (const t of gueltig) {
      grenzen.push(clamp(Math.round((t * 60) / lapSec), grenzen[grenzen.length - 1] + 1, runden - 1));
    }
    grenzen.push(runden);

    const plan = [];
    for (let i = 0; i < grenzen.length - 1; i++) {
      const laps = grenzen[i + 1] - grenzen[i];
      const sprit = Math.ceil(laps * proRunde + reserve + (i === 0 ? formationSprit : 0));
      plan.push({
        stint: i + 1, vonRunde: grenzen[i] + 1, bisRunde: grenzen[i + 1],
        vonMin: i === 0 ? 0 : gueltig[i - 1], bisMin: i < gueltig.length ? gueltig[i] : minuten,
        laps, sprit, ueberTank: sprit > tank,
      });
    }
    const gesamt = Math.ceil(runden * proRunde + formationSprit + reserve);
    return {
      runden, plan, gesamt,
      minStopps: Math.max(0, Math.ceil(gesamt / tank) - 1),
      start: plan[0]?.sprit ?? gesamt,
      problem: plan.some((s) => s.ueberTank),
    };
  }, [minuten, proRunde, tank, formation, gueltig, lapSec]);

  function stoppHinzu() {
    const pts = [0, ...gueltig, minuten];
    let groessteLuecke = -1, mitte = Math.round(minuten / 2);
    for (let i = 0; i < pts.length - 1; i++) {
      if (pts[i + 1] - pts[i] > groessteLuecke) {
        groessteLuecke = pts[i + 1] - pts[i];
        mitte = Math.round((pts[i] + pts[i + 1]) / 2);
      }
    }
    setStopps([...gueltig, clamp(mitte, 1, minuten - 1)]);
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="display text-lg font-semibold">{titel}</h3>
        <span className="text-[11px] text-muted">Runde {fmtLap(lapSec)}</span>
      </div>

      {/* Die drei Angaben, die das Ergebnis wirklich bestimmen. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4">
        <Feld label="Renndauer" value={minuten} onChange={setMinuten} suffix="min" />
        <Feld label="Sprit/Runde" value={proRunde} onChange={setProRunde} step={0.1} min={0.5} suffix="L" />
        {!refLap && (
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted">Rundenzeit</span>
            <div className="mt-1 flex items-center glass rounded-xl px-2.5 py-1.5">
              <input
                value={lapText}
                onChange={(e) => setLapText(e.target.value)}
                placeholder="1:50.0"
                className="w-full bg-transparent outline-none mono text-ink text-base"
              />
            </div>
          </label>
        )}
      </div>

      {/* Das Ergebnis, um das es geht. */}
      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted">Startfüllung</div>
          <div className="mono text-4xl font-semibold tabular-nums" style={{ color: 'var(--car-accent)' }}>
            {r.start}<span className="text-lg text-muted ml-1">L</span>
          </div>
        </div>
        <div className="text-right text-sm text-muted leading-relaxed">
          {r.runden} Runden<br />
          {gueltig.length === 0 ? 'ohne Stopp' : `${gueltig.length} Stopp${gueltig.length > 1 ? 's' : ''}`}
        </div>
      </div>

      {r.problem && (
        <p className="text-[11px] text-red-400 mt-2">
          ⚠ Ein Stint passt nicht in den {tank}-L-Tank — mind. {r.minStopps} Stopp{r.minStopps === 1 ? '' : 's'} nötig.
        </p>
      )}

      <button
        onClick={() => setDetails((d) => !d)}
        className="mt-4 text-xs text-muted hover:text-ink transition-colors"
      >
        {details ? 'Details ausblenden ▴' : 'Details ▾'}
      </button>

      {details && (
        <div className="mt-3 pt-3 border-t border-line/60 space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <Feld label="Tank" value={tank} onChange={setTank} step={5} suffix="L" />
            <label className="flex items-end gap-2 text-sm cursor-pointer select-none pb-2">
              <input
                type="checkbox" checked={formation} onChange={(e) => setFormation(e.target.checked)}
                className="accent-[color:var(--car-accent)] w-4 h-4"
              />
              Einführungsrunde
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] uppercase tracking-wider text-muted">Boxenstopp bei Minute</span>
              <button onClick={stoppHinzu} className="text-[11px] text-car hover:underline">+ Stopp</button>
            </div>
            {gueltig.length === 0 ? (
              <p className="text-[11px] text-muted">Kein Stopp — Rennen in einem Stint.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {gueltig.map((t, i) => (
                  <div key={i} className="flex items-center glass rounded-lg pl-2 pr-1 py-1">
                    <input
                      type="number" value={t} min={1} max={minuten - 1}
                      onChange={(e) => {
                        const next = [...gueltig];
                        next[i] = clamp(Math.round(Number(e.target.value)), 1, minuten - 1);
                        setStopps(next);
                      }}
                      className="w-12 bg-transparent outline-none mono text-ink text-sm text-right"
                    />
                    <span className="text-xs text-muted ml-0.5">min</span>
                    <button
                      onClick={() => setStopps(gueltig.filter((_, j) => j !== i))}
                      className="ml-1 w-5 h-5 leading-none text-muted hover:text-ink"
                      aria-label="Stopp entfernen"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted mb-2">Stint-Plan</div>
            <div className="divide-y divide-line/60">
              {r.plan.map((s) => (
                <div key={s.stint} className="flex items-center justify-between text-sm py-2">
                  <span className="text-muted">
                    Stint {s.stint} · Min {s.vonMin}–{s.bisMin} · Rd {s.vonRunde}–{s.bisRunde}
                  </span>
                  <span className={`mono font-semibold ${s.ueberTank ? 'text-red-400' : 'text-car'}`}>{s.sprit} L</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-muted">
            Inkl. {formation ? 'Einführungsrunde und ' : ''}1 Runde Reserve je Stint. Verbrauch je nach Fahrstil anpassen.
          </p>
        </div>
      )}
    </div>
  );
}
