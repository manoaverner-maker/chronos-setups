import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { rise } from '../lib/motion.js';

// Kompakte Kachel für die Gesamtübersicht aller ACC-Strecken (ohne Layout).
export default function TrackTile({ track, car }) {
  const navigate = useNavigate();
  const enabled = track.hasSetup;

  return (
    <motion.button
      variants={rise}
      whileTap={enabled ? { scale: 0.97 } : {}}
      disabled={!enabled}
      onClick={() => enabled && navigate(`/${car}/${track.id}`)}
      className={`glass rounded-xl px-3.5 py-3 text-left w-full transition-all
        ${enabled ? 'cursor-pointer hover:border-car/50 hover:-translate-y-0.5' : 'opacity-50 cursor-not-allowed'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="display font-semibold text-sm leading-tight truncate">{track.displayName}</span>
        {enabled && <span className="h-1.5 w-1.5 rounded-full bg-good shrink-0" title="Setup vorhanden" />}
      </div>
      <div className="text-[11px] text-muted mt-0.5 mono">
        {track.countryCode}{track.lengthKm ? ` · ${track.lengthKm.toFixed(3)} km` : ''}
      </div>
      <div className="text-[11px] mt-1.5">
        {enabled ? <span className="text-good">Setup ›</span> : <span className="text-muted/60">kein Setup</span>}
      </div>
    </motion.button>
  );
}
