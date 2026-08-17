import TrackLayout from './TrackLayout.jsx';
import { assetUrl } from '../lib/assetUrl.js';

// Feature 3: Streckenansicht mit Layout-SVG, Kurvennamen, Sektoren.
// Wenn ein Streckenfoto vorliegt, dient es als stimmungsvoller Hero-Hintergrund.
export default function TrackHero({ track }) {
  if (!track) return null;
  const showRound = track.calendarRound && track.calendarRound < 90;
  const shadow = track.photo ? { textShadow: '0 1px 8px rgba(0,0,0,0.7)' } : undefined;

  return (
    <div className="glass rounded-2xl overflow-hidden relative">
      {track.photo && (
        <div className="absolute inset-0">
          <img src={assetUrl(track.photo)} alt="" loading="lazy" className="w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, var(--bg) 5%, rgba(7,8,11,0.5) 55%, rgba(7,8,11,0.35)), linear-gradient(to right, rgba(7,8,11,0.88), rgba(7,8,11,0.35) 90%)',
            }}
          />
        </div>
      )}

      <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row gap-6">
        <div className="w-40 h-40 shrink-0 mx-auto sm:mx-0">
          <TrackLayout svg={track.layout?.svg} status={track.layout?.status} viewBox={track.layout?.viewBox} className="w-full h-full" animate />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-[0.25em] text-car">
            {showRound ? `Runde ${track.calendarRound} · ` : ''}{track.country}
          </p>
          <h1 className="display text-3xl sm:text-4xl font-bold mt-1" style={shadow}>{track.displayName}</h1>
          <p className="text-muted text-sm mt-1" style={shadow}>{track.fullName}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm" style={shadow}>
            <span className="tabular-nums"><b>{track.lengthKm?.toFixed(3)}</b> <span className="text-muted">km</span></span>
            <span><b>{track.sectors}</b> <span className="text-muted">Sektoren</span></span>
            <span><b>{track.corners?.length}</b> <span className="text-muted">Kurven</span></span>
          </div>
          {track.corners?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {track.corners.map((c) => (
                <span key={c} className="text-[11px] px-2 py-1 rounded-full border border-line text-muted bg-black/20 backdrop-blur-sm">{c}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
