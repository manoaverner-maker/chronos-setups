import { useMemo, useState } from 'react';

// Tank- & Stint-Rechner (minutenbasiert): Renndauer + frei wählbare Boxenstopp-
// Zeitpunkte (Minute) → Spritbedarf pro Stint inkl. optionaler Einführungsrunde.
// Gedacht für Zeitrennen mit Pflichtboxenstopp (z. B. 1-Stunden-Sprint).
function parseLap(str) {
  if (!str) return null;
  const m = String(str).match(/(?:(\d+):)?(\d+)(?:\.(\d+))?/);
  if (!m) return null;
  return (+(m[1] || 0)) * 60 + +m[2] + (m[3] ? +`0.${m[3]}` : 0);
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fmtMin = (m) => `${m}′`;

function Field({ label, value, onChange, step = 1, min = 1, suffix }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted">{label}</span>
      <div className="mt-1 flex items-center glass rounded-xl px-2 py-1.5">
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

function Out({ label, value, highlight }) {
  return (
    <div className="glass rounded-xl p-3 border-line text-center">
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`mono text-xl mt-0.5 tabular-nums ${highlight ? 'text-car' : 'text-ink'}`}>{value}</div>
    </div>
  );
}

export default function FuelCalculator({ lapTimeStr, lengthKm }) {
  const lapSec = parseLap(lapTimeStr) ?? 110;
  const [minutes, setMinutes] = useState(60);
  const [fuelPerLap, setFuelPerLap] = useState(lengthKm ? Math.max(1.5, +(lengthKm * 0.55).toFixed(1)) : 3.0);
  const [tank, setTank] = useState(120);
  const [formation, setFormation] = useState(true);
  const [pitTimes, setPitTimes] = useState([30]); // Pflichtstopp bei Minute 30 (60-min-Default)

  // gültige Stopp-Minuten: in (0, Renndauer), eindeutig, sortiert
  const valid = useMemo(
    () => [...new Set(pitTimes.map((t) => clamp(Math.round(t), 1, minutes - 1)))]
      .filter((t) => t > 0 && t < minutes)
      .sort((a, b) => a - b),
    [pitTimes, minutes],
  );

  const r = useMemo(() => {
    const raceLaps = Math.max(1, Math.ceil((minutes * 60) / lapSec) + 1); // +1 = Zieldurchfahrt
    const lapAt = (min) => Math.round((min * 60) / lapSec);
    const reserve = fuelPerLap;            // 1 Runde Reserve je Stint
    const formationFuel = formation ? fuelPerLap : 0;

    // Stint-Grenzen in Runden (kumuliert, streng steigend)
    const bounds = [0];
    for (const t of valid) {
      const lp = clamp(lapAt(t), bounds[bounds.length - 1] + 1, raceLaps - 1);
      bounds.push(lp);
    }
    bounds.push(raceLaps);

    const plan = [];
    for (let i = 0; i < bounds.length - 1; i++) {
      const laps = bounds[i + 1] - bounds[i];
      const fuel = Math.ceil(laps * fuelPerLap + reserve + (i === 0 ? formationFuel : 0));
      plan.push({
        stint: i + 1,
        fromLap: bounds[i] + 1,
        toLap: bounds[i + 1],
        fromMin: i === 0 ? 0 : valid[i - 1],
        toMin: i < valid.length ? valid[i] : minutes,
        laps,
        fuel,
        overTank: fuel > tank,
      });
    }

    const totalFuel = Math.ceil(raceLaps * fuelPerLap + formationFuel + reserve);
    const minStopsTank = Math.max(0, Math.ceil(totalFuel / tank) - 1);
    const startFuel = plan[0]?.fuel ?? totalFuel;
    const anyOverTank = plan.some((s) => s.overTank);

    return { raceLaps, plan, totalFuel, minStopsTank, startFuel, anyOverTank };
  }, [minutes, fuelPerLap, tank, formation, valid, lapSec]);

  // Stopp am Mittelpunkt der größten Lücke einfügen (sinnvoller Default)
  function addStop() {
    const pts = [0, ...valid, minutes];
    let bestGap = -1, mid = Math.round(minutes / 2);
    for (let i = 0; i < pts.length - 1; i++) {
      const gap = pts[i + 1] - pts[i];
      if (gap > bestGap) { bestGap = gap; mid = Math.round((pts[i] + pts[i + 1]) / 2); }
    }
    setPitTimes([...valid, clamp(mid, 1, minutes - 1)]);
  }
  function setStopAt(idx, val) {
    const next = [...valid];
    next[idx] = clamp(Math.round(val), 1, minutes - 1);
    setPitTimes(next);
  }
  function removeStop(idx) {
    setPitTimes(valid.filter((_, i) => i !== idx));
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="display text-lg font-semibold">Tank- &amp; Stint-Rechner</h3>
        <span className="text-[11px] text-muted">Runde ~{lapTimeStr ?? `${lapSec}s`}</span>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mt-4">
        <Field label="Renndauer" value={minutes} onChange={setMinutes} suffix="min" />
        <Field label="Sprit/Runde" value={fuelPerLap} onChange={setFuelPerLap} step={0.1} min={0.5} suffix="L" />
        <Field label="Tank" value={tank} onChange={setTank} step={5} suffix="L" />
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer select-none mt-3">
        <input type="checkbox" checked={formation} onChange={(e) => setFormation(e.target.checked)} className="accent-[color:var(--car-accent)] w-4 h-4" />
        Einführungsrunde
      </label>

      {/* Boxenstopp-Zeitpunkte (Minute) */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] uppercase tracking-wider text-muted">Boxenstopp bei Minute</span>
          <button onClick={addStop} className="text-[11px] text-car hover:underline">+ Stopp</button>
        </div>
        {valid.length === 0 ? (
          <p className="text-[11px] text-muted">Kein Stopp — Rennen in einem Stint. „+ Stopp“ für Pflichtboxenstopp.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {valid.map((t, i) => (
              <div key={i} className="flex items-center glass rounded-lg pl-2 pr-1 py-1">
                <input
                  type="number" value={t} min={1} max={minutes - 1}
                  onChange={(e) => setStopAt(i, Number(e.target.value))}
                  className="w-12 bg-transparent outline-none mono text-ink text-sm text-right"
                />
                <span className="text-xs text-muted ml-0.5">min</span>
                <button onClick={() => removeStop(i)} className="ml-1 w-5 h-5 leading-none text-muted hover:text-ink" aria-label="Stopp entfernen">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2.5 mt-4">
        <Out label="Renndistanz" value={`${r.raceLaps} Rdn`} />
        <Out label="Startfüllung" value={`${r.startFuel} L`} highlight />
        <Out label="Boxenstopps" value={valid.length} />
      </div>

      {/* Stint-Plan */}
      <div className="mt-4">
        <div className="text-[11px] uppercase tracking-wider text-muted mb-2">Stint-Plan ({r.plan.length} Stints)</div>
        <div className="space-y-1.5">
          {r.plan.map((s, i) => (
            <div key={s.stint}>
              <div className={`flex items-center justify-between text-sm glass rounded-lg px-3 py-2 ${s.overTank ? 'border border-red-500/50' : ''}`}>
                <span>
                  <span className="text-muted">Stint {s.stint}</span> · {fmtMin(s.fromMin)}–{fmtMin(s.toMin)}
                  <span className="text-muted"> · Rdn {s.fromLap}–{s.toLap}</span>
                </span>
                <span className={`mono font-semibold ${s.overTank ? 'text-red-400' : 'text-car'}`}>{s.fuel} L</span>
              </div>
              {i < r.plan.length - 1 && (
                <div className="text-[11px] text-muted text-center py-0.5">
                  ↳ Boxenstopp bei Min {s.toMin} → Tank auf {r.plan[i + 1].fuel} L auffüllen
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {r.anyOverTank && (
        <p className="text-[11px] text-red-400 mt-3">
          ⚠ Ein Stint braucht mehr als der Tank fasst ({tank} L) — früher boxen oder Stopp hinzufügen (mind. {r.minStopsTank}).
        </p>
      )}
      <p className="text-[11px] text-muted mt-2">
        Richtwert inkl. {formation ? 'Einführungsrunde + ' : ''}1 Rd. Reserve je Stint. Tank {tank} L ·
        mind. {r.minStopsTank} Stopp{r.minStopsTank === 1 ? '' : 's'} nötig. Verbrauch je nach Fahrstil anpassen.
      </p>
    </div>
  );
}
