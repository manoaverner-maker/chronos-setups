import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'framer-motion';

// Zeichnet das (stilisierte) Streckenlayout aus tracks.json — mit Glow, animiertem
// Nachzeichnen und Start/Ziel-Marker. status==='placeholder' => klar als stilisiert
// gekennzeichnet (kein massstabsgetreues Layout). Echte Layout-SVGs sind drop-in.
export default function TrackLayout({ svg, status, viewBox = '0 0 100 100', className = '', animate = false }) {
  const id = useId().replace(/[:]/g, '');
  const pathRef = useRef(null);
  const [start, setStart] = useState(null);

  useEffect(() => {
    if (pathRef.current?.getPointAtLength) {
      try {
        const p = pathRef.current.getPointAtLength(0);
        setStart({ x: p.x, y: p.y });
      } catch { /* ignore */ }
    }
  }, [svg]);

  if (!svg) {
    return <div className={`flex items-center justify-center text-muted text-xs ${className}`}>Layout folgt</div>;
  }

  // Die Pfade sind auf 0..100 normalisiert und beruehren damit den Rand. Ohne Puffer
  // schneidet der Viewport die 4.5 breite Linie (plus Glow) an den Raendern ab.
  const padded = (() => {
    const p = String(viewBox).trim().split(/[\s,]+/).map(Number);
    if (p.length !== 4 || p.some((n) => !Number.isFinite(n))) return viewBox;
    const pad = Math.max(p[2], p[3]) * 0.05;
    return `${p[0] - pad} ${p[1] - pad} ${p[2] + pad * 2} ${p[3] + pad * 2}`;
  })();

  return (
    <svg viewBox={padded} className={className} aria-hidden preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id={`glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Schatten-/Grundlinie */}
      <path d={svg} fill="none" stroke="var(--line)" strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Akzentlinie mit Glow */}
      <motion.path
        ref={pathRef}
        d={svg}
        fill="none"
        stroke="var(--car-accent)"
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        filter={`url(#glow-${id})`}
        initial={animate ? { pathLength: 0, opacity: 0.35 } : false}
        animate={animate ? { pathLength: 1, opacity: 1 } : false}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      />
      {/* Start/Ziel-Marker */}
      {start && (
        <circle cx={start.x} cy={start.y} r="2.8" fill="#fff" stroke="var(--car-accent)" strokeWidth="1.6" />
      )}
      {status === 'placeholder' && (
        <text x="50" y="98.5" textAnchor="middle" fontSize="4.3" fill="var(--muted)" opacity="0.7">stilisiert</text>
      )}
    </svg>
  );
}
