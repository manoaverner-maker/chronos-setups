import { fmtNum } from '../lib/format.js';
import CarPressureDiagram from './CarPressureDiagram.jsx';

// Feature 2a: temperaturkorrigierter Reifendruck, visualisiert am Fahrzeugschema.
export default function PressurePanel({ pressures }) {
  if (!pressures?.available) {
    return (
      <div className="glass rounded-2xl p-5">
        <h3 className="display text-lg font-semibold">Reifendruck</h3>
        <p className="text-warn text-sm mt-2">{pressures?.reason ?? 'Keine Druckberechnung möglich.'}</p>
      </div>
    );
  }
  const [lo, hi] = pressures.hotPressureWindow;
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h3 className="display text-lg font-semibold">Reifendruck</h3>
        <span className="text-xs text-muted">
          Ziel {fmtNum(pressures.targetHotPressure)} psi heiß · Fenster {lo}–{hi}
        </span>
      </div>

      <div className="mt-2 flex justify-center">
        <CarPressureDiagram wheels={pressures.wheels} />
      </div>

      <div className="flex items-center justify-center gap-4 text-[11px] text-muted -mt-1">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--good)' }} /> im Fenster</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--warn)' }} /> Randbereich</span>
      </div>

      <p className="text-[11px] text-muted mt-3">
        Temp-Delta {pressures.weightedDelta >= 0 ? '+' : ''}{pressures.weightedDelta} · Kaltdruck aufs Zielfenster angepasst
      </p>
    </div>
  );
}
