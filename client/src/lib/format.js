// Anzeige-Helfer.

export const TIERS = [
  { key: 'alien', label: 'Alien' },
  { key: 'pro', label: 'Pro' },
  { key: 'proam', label: 'Pro-Am' },
  { key: 'am', label: 'Am' },
];

export const WHEELS = [
  { key: 'fl', label: 'VL' },
  { key: 'fr', label: 'VR' },
  { key: 'rl', label: 'HL' },
  { key: 'rr', label: 'HR' },
];

// Rundenzeit nur anzeigen, wenn echt vorhanden — sonst ehrliches "—".
export function fmtLap(v) {
  return v == null || v === '' ? '—' : v;
}

export function fmtNum(v, digits = 1) {
  if (v == null || Number.isNaN(v)) return '—';
  return Number(v).toFixed(digits);
}

export function signed(v, digits = 1) {
  if (v == null) return '—';
  const n = Number(v);
  return (n > 0 ? '+' : '') + n.toFixed(digits);
}
