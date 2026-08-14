import { motion } from 'framer-motion';
import { fmtNum } from '../lib/format.js';

// Top-Down-Fahrzeugschema (eigene Zeichnung) mit 4 Reifen, eingefärbt nach Druckfenster.
const POS = {
  fl: { x: 60, y: 104, label: 'VL' },
  fr: { x: 200, y: 104, label: 'VR' },
  rl: { x: 60, y: 286, label: 'HL' },
  rr: { x: 200, y: 286, label: 'HR' },
};

function Wheel({ p, w }) {
  if (!w) return null;
  const color = w.inWindow ? 'var(--good)' : 'var(--warn)';
  return (
    <g>
      <motion.rect
        x={p.x - 19} y={p.y - 34} width="38" height="68" rx="9"
        fill={color} stroke={color} strokeWidth="2"
        initial={{ opacity: 0.15 }} animate={{ fillOpacity: 0.22, opacity: 1 }}
      />
      <text x={p.x} y={p.y - 40} textAnchor="middle" fontSize="11" fill="var(--muted)">{p.label}</text>
      <text x={p.x} y={p.y - 2} textAnchor="middle" fontSize="19" fontWeight="700" fill="var(--ink)" fontFamily="'JetBrains Mono', monospace">{fmtNum(w.recommendedCold)}</text>
      <text x={p.x} y={p.y + 13} textAnchor="middle" fontSize="9" fill="var(--muted)">psi kalt</text>
      <text x={p.x} y={p.y + 27} textAnchor="middle" fontSize="8.5" fill="var(--muted)" opacity="0.8">▲{fmtNum(w.expectedHot)} heiß</text>
    </g>
  );
}

export default function CarPressureDiagram({ wheels }) {
  return (
    <svg viewBox="0 0 260 390" className="w-full h-auto max-h-[340px]" role="img" aria-label="Reifendruck-Schema">
      {/* Karosserie (Top-Down, eigene Silhouette – kein Markenfoto) */}
      <path
        d="M130 18 C92 22 74 52 72 96 L70 300 C70 344 96 372 130 374 C164 372 190 344 190 300 L188 96 C186 52 168 22 130 18 Z"
        fill="rgba(255,255,255,0.035)" stroke="var(--line)" strokeWidth="2"
      />
      {/* Front-Splitter + Heckflügel-Andeutung */}
      <line x1="84" y1="30" x2="176" y2="30" stroke="var(--line)" strokeWidth="2" />
      <line x1="78" y1="360" x2="182" y2="360" stroke="var(--car-accent)" strokeWidth="3" opacity="0.6" />
      {/* Cockpit */}
      <ellipse cx="130" cy="175" rx="30" ry="52" fill="rgba(255,255,255,0.03)" stroke="var(--line)" strokeWidth="1.5" />
      {Object.entries(POS).map(([k, p]) => <Wheel key={k} p={p} w={wheels?.[k]} />)}
    </svg>
  );
}
