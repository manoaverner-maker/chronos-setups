import { fmtNum } from '../lib/format.js';

// Feature 1: Lufttemperatur + Streckentemperatur als getrennte Regler.
// Die Referenztemperatur (Bau-Temperatur der Baseline) wird als Marker gezeigt.
function TempSlider({ label, value, min, max, refVal, onChange }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm text-muted">{label}</span>
        <span className="display text-2xl font-semibold tabular-nums">
          {fmtNum(value, 0)}<span className="text-sm text-muted ml-0.5">°C</span>
        </span>
      </div>
      <input type="range" min={min} max={max} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
      <div className="flex justify-between text-[10px] text-muted mt-1">
        <span>{min}°</span>
        {refVal != null && <span>Referenz {fmtNum(refVal, 0)}°</span>}
        <span>{max}°</span>
      </div>
    </div>
  );
}

export default function TempControls({ air, track, refTemp, onAir, onTrack }) {
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="display text-lg font-semibold mb-4">Bedingungen</h3>
      <div className="space-y-5">
        <TempSlider label="Lufttemperatur" value={air} min={10} max={40} refVal={refTemp?.air} onChange={onAir} />
        <TempSlider label="Streckentemperatur" value={track} min={15} max={55} refVal={refTemp?.track} onChange={onTrack} />
      </div>
    </div>
  );
}
