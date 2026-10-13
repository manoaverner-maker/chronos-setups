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
        Temp-Delta {pressures.weightedDelta >= 0 ? '+' : ''}{pressures.weightedDelta}° (75 % Strecke, 25 % Luft) · Kaltdruck
        {' '}−{fmtNum(pressures.psiPerDegC)} psi pro Grad, damit der Heißdruck im Fenster bleibt
      </p>

      <BrakeDucts ducts={pressures.brakeDucts} />
      <HotPressureInfo windows={pressures.compoundWindows} compound={pressures.compound} />
    </div>
  );
}

// Bremsluftkanaele: Empfehlung nach Temperatur + Ziel-Bremstemperaturen zum Gegenpruefen.
function BrakeDucts({ ducts }) {
  if (!ducts) return null;
  const row = (label, d) => {
    const diff = d.recommended - d.baseline;
    return (
      <div className="flex items-center justify-between text-sm py-1">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums">
          {diff !== 0 && <span className="text-muted/60 line-through mr-1.5">{d.baseline}</span>}
          <span className="font-semibold" style={diff !== 0 ? { color: 'var(--car-accent)' } : undefined}>{d.recommended}</span>
          {diff !== 0 && <span className="ml-1.5 text-[11px] text-muted">({diff > 0 ? '+' : ''}{diff})</span>}
          {d.tempWindow && <span className="ml-2 text-[11px] text-muted">Ziel {d.tempWindow[0]}–{d.tempWindow[1]} °C</span>}
        </span>
      </div>
    );
  };
  const hint = ducts.clicks > 0 ? 'Wärmer als die Baseline: Kanäle öffnen, damit die Bremsen nicht überhitzen.'
    : ducts.clicks < 0 ? 'Kälter als die Baseline: Kanäle schließen, damit die Bremsen auf Temperatur kommen.'
    : `Kanäle wie in der Baseline (Änderung erst ab ±${ducts.degPerClick / 2}° Temp-Delta).`;
  return (
    <div className="mt-4 pt-3 border-t border-line/60">
      <div className="flex items-baseline justify-between">
        <h4 className="text-[11px] uppercase tracking-[0.18em] text-muted">Bremsluft (0 = zu · 6 = offen)</h4>
        <span className="text-[11px] text-muted">1 Klick pro {ducts.degPerClick}°</span>
      </div>
      <div className="mt-1 divide-y divide-line/60">
        {row(`Vorne · Belag ${ducts.front.pad}`, ducts.front)}
        {row(`Hinten · Belag ${ducts.rear.pad}`, ducts.rear)}
      </div>
      <p className="text-[11px] text-muted mt-1.5">
        {hint} Richtwert — maßgeblich ist die Bremstemperatur im Spiel. Seit ACC v1.8 ändern die Kanäle die
        Reifentemperatur kaum noch, deshalb bleibt der Reifendruck davon unberührt.
      </p>
    </div>
  );
}

// Empfohlene Heissdruecke fuer Trocken- und Regenreifen (Zielwerte nach ein paar Runden).
function HotPressureInfo({ windows, compound }) {
  if (!windows || !Object.keys(windows).length) return null;
  const names = { dry: 'Trocken (Slicks)', wet: 'Regen' };
  return (
    <div className="mt-4 pt-3 border-t border-line/60">
      <h4 className="text-[11px] uppercase tracking-[0.18em] text-muted">Empfohlener Heißdruck</h4>
      <div className="mt-1 divide-y divide-line/60">
        {['dry', 'wet'].filter((c) => windows[c]).map((c) => (
          <div key={c} className="flex items-center justify-between text-sm py-1">
            <span className={c === compound ? 'font-medium' : 'text-muted'}>
              {c === 'wet' && <span aria-hidden className="mr-1">🌧</span>}{names[c]}
              {c === compound && <span className="ml-1.5 text-[10px] text-muted">(dieses Setup)</span>}
            </span>
            <span className="tabular-nums">
              <span className="font-semibold">{windows[c].window[0]}–{windows[c].window[1]} psi</span>
              <span className="ml-2 text-[11px] text-muted">Ziel {fmtNum(windows[c].target)}</span>
            </span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted mt-1.5">
        Heißdruck = Druck nach 3–4 schnellen Runden (im Spiel im Reifen-Menü bzw. MFD). Liegt er darüber, Kaltdruck senken;
        darunter, erhöhen — 0,1 psi kalt ≈ 0,1 psi heiß.
      </p>
    </div>
  );
}
