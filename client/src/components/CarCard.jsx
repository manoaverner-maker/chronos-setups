import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { rise } from '../lib/motion.js';
import { assetUrl } from '../lib/assetUrl.js';

// Fallback-Silhouette, falls (noch) kein Foto in /data/images/cars/ liegt.
function CarSilhouette({ color }) {
  return (
    <svg viewBox="0 0 240 80" className="w-3/4 h-auto" aria-hidden>
      <path
        d="M8 58 Q12 50 26 48 L60 44 Q78 30 104 28 L150 27 Q180 28 196 42 L222 47 Q232 49 232 57 L232 60 Q232 62 230 62 L12 62 Q8 62 8 60 Z"
        fill={color} opacity="0.9"
      />
      <path d="M70 44 Q88 33 104 32 L142 31 Q150 31 156 35 L120 44 Z" fill="#000" opacity="0.35" />
      <circle cx="62" cy="62" r="13" fill="#0a0a0a" stroke={color} strokeWidth="3" />
      <circle cx="186" cy="62" r="13" fill="#0a0a0a" stroke={color} strokeWidth="3" />
    </svg>
  );
}

export default function CarCard({ car }) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const accent = car.accentColor || 'var(--accent)';
  const available = car.available;
  const hasPhoto = car.image && !imgError;

  return (
    <motion.button
      variants={rise}
      whileHover={available ? { y: -6 } : {}}
      whileTap={available ? { scale: 0.985 } : {}}
      disabled={!available}
      onClick={() => available && navigate(`/${car.id}`)}
      style={{ '--car-accent': accent }}
      className={`group relative text-left glass rounded-2xl overflow-hidden w-full
        ${available ? 'cursor-pointer hover:shadow-glow' : 'opacity-70 cursor-not-allowed'}`}
    >
      {/* Bildbereich */}
      <div className="relative h-44 sm:h-48 overflow-hidden bg-black/30">
        {hasPhoto ? (
          <img
            src={assetUrl(car.image)}
            alt={car.displayName}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <CarSilhouette color={accent} />
          </div>
        )}
        {/* Verlauf für Lesbarkeit + Akzent */}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(to top, var(--bg) 4%, transparent 50%), linear-gradient(135deg, ${accent}1f, transparent 55%)` }}
        />
        <div className="absolute top-3 left-4 right-4 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.2em] text-ink/90" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
            {car.manufacturer}
          </span>
          <span className="text-[11px] mono px-2 py-0.5 rounded-full bg-black/45 border border-white/15 backdrop-blur-sm">
            {car.class} · {car.year}
          </span>
        </div>
      </div>

      {/* Fußzeile */}
      <div className="relative px-5 pb-5 pt-2 flex items-end justify-between gap-2">
        <h3 className="display text-xl font-semibold leading-tight">{car.displayName}</h3>
        {/* Es gibt inzwischen mehrere Setups je Strecke — deshalb Strecken zaehlen,
            nicht Setups (sonst waere die Zahl irrefuehrend). */}
        {available ? (
          <span className="text-xs text-good whitespace-nowrap">{car.availableTracks.length} Strecken ›</span>
        ) : (
          <span className="text-xs text-muted whitespace-nowrap">keine Setups</span>
        )}
      </div>
    </motion.button>
  );
}
