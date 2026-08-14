import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { rise } from '../lib/motion.js';
import TrackLayout from './TrackLayout.jsx';

export default function TrackCard({ track }) {
  const { car } = useParams();
  const navigate = useNavigate();
  const enabled = track.hasSetup;

  return (
    <motion.button
      variants={rise}
      whileHover={enabled ? { y: -5 } : {}}
      whileTap={enabled ? { scale: 0.985 } : {}}
      disabled={!enabled}
      onClick={() => enabled && navigate(`/${car}/${track.id}`)}
      className={`group relative glass rounded-2xl p-5 text-left w-full overflow-hidden
        ${enabled ? 'cursor-pointer hover:shadow-glow' : 'opacity-55 cursor-not-allowed'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-muted mono">
            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-line">R{track.calendarRound}</span>
            <span>{track.countryCode}</span>
          </div>
          <h3 className="display text-xl font-semibold mt-1.5 leading-tight">{track.displayName}</h3>
          <p className="text-xs text-muted mt-0.5">{track.lengthKm?.toFixed(3)} km · {track.sectors} Sektoren</p>
        </div>
        <div className="w-20 h-20 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
          <TrackLayout svg={track.layout?.svg} status={track.layout?.status} viewBox={track.layout?.viewBox} className="w-full h-full" />
        </div>
      </div>
      <div className="mt-3 text-xs">
        {enabled ? (
          <span className="text-good">Setup vorhanden ›</span>
        ) : (
          <span className="text-warn">Setup in Transkription</span>
        )}
      </div>
    </motion.button>
  );
}
