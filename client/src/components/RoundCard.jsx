import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { rise } from '../lib/motion.js';
import TrackLayout from './TrackLayout.jsx';

const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Eine Runde im Rennkalender (Strecke + Datum + Setup-Status).
export default function RoundCard({ round, car, isNext }) {
  const navigate = useNavigate();
  const t = round.track;
  const enabled = round.hasSetup;

  return (
    <motion.button
      variants={rise}
      whileHover={enabled ? { y: -5 } : {}}
      whileTap={enabled ? { scale: 0.985 } : {}}
      disabled={!enabled}
      onClick={() => enabled && navigate(`/${car}/${t.id}`)}
      className={`group relative glass rounded-2xl p-5 text-left w-full overflow-hidden
        ${isNext ? 'ring-1 ring-car shadow-glow' : ''}
        ${enabled ? 'cursor-pointer hover:shadow-glow' : 'opacity-60 cursor-not-allowed'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] text-muted mono">
            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-line">R{round.round}</span>
            <span>{t.countryCode}</span>
          </div>
          <h3 className="display text-xl font-semibold mt-1.5 leading-tight truncate">{t.displayName}</h3>
          <p className="text-xs text-muted mt-0.5">
            {fmtDate(round.date)}{t.lengthKm ? ` · ${t.lengthKm.toFixed(3)} km` : ''}
          </p>
        </div>
        <div className="w-20 h-20 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
          <TrackLayout svg={t.layout?.svg} status={t.layout?.status} viewBox={t.layout?.viewBox} className="w-full h-full" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        {enabled ? <span className="text-good">Setup vorhanden ›</span> : <span className="text-warn">kein Setup</span>}
        {isNext && (
          <span className="text-[10px] uppercase tracking-wider text-car border border-car/40 rounded-full px-2 py-0.5 whitespace-nowrap">
            Nächstes Rennen
          </span>
        )}
      </div>
    </motion.button>
  );
}
