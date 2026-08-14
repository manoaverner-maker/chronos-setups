import { motion } from 'framer-motion';
import { signed } from '../lib/format.js';

// Feature 2b: Safe/Aggressiv-Slider. Zeigt je Regel die Aenderung gegenueber Baseline.
export default function SafetySlider({ adjustment, value, onChange }) {
  const changes = adjustment?.changes ?? [];
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="display text-lg font-semibold">Charakter</h3>
        <span className="text-sm font-medium" style={{ color: 'var(--car-accent)' }}>{adjustment?.label}</span>
      </div>

      <input type="range" min={-3} max={3} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full mt-4" />
      <div className="flex justify-between text-[10px] text-muted mt-1">
        <span>Sicher</span><span>Baseline</span><span>Aggressiv</span>
      </div>

      <div className="mt-4 space-y-1.5">
        {changes.length === 0 && <p className="text-xs text-muted">Baseline — keine Änderungen.</p>}
        {changes.map((c) => (
          <motion.div
            key={c.key}
            layout
            className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg hover:bg-white/5"
            title={c.reasoning}
          >
            <span className="text-muted capitalize">{c.key}</span>
            <span className="tabular-nums">
              <span className="text-muted/70">{c.from}</span>
              <span className="mx-1 opacity-40">→</span>
              <span className="font-semibold">{c.to}{c.unit}</span>
              {c.delta !== 0 && (
                <span className="ml-2 text-[11px]" style={{ color: 'var(--car-accent)' }}>({signed(c.delta, Number.isInteger(c.delta) ? 0 : 1)})</span>
              )}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
