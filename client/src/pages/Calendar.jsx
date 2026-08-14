import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { getCars, getSeason, getSetupsList } from '../lib/api.js';
import { pageMotion, stagger } from '../lib/motion.js';
import { useCarAccent } from '../lib/useCarAccent.js';
import RoundCard from '../components/RoundCard.jsx';
import TrackTile from '../components/TrackTile.jsx';
import NextRaceCountdown from '../components/NextRaceCountdown.jsx';

const TODAY = new Date().toISOString().slice(0, 10);

export default function Calendar() {
  const { car } = useParams();
  const [seriesId, setSeriesId] = useState('team');
  const [trackQuery, setTrackQuery] = useState('');

  const { data: cars } = useQuery({ queryKey: ['cars'], queryFn: getCars });
  const carInfo = cars?.find((c) => c.id === car);
  useCarAccent(carInfo?.accentColor);

  const { data, isLoading, error } = useQuery({ queryKey: ['season', car], queryFn: () => getSeason(car) });
  const { data: setupList } = useQuery({ queryKey: ['setups', car], queryFn: () => getSetupsList(car) });

  const allTracks = useMemo(
    () => (setupList?.tracks ?? []).slice().sort((a, b) => (b.hasSetup - a.hasSetup) || a.displayName.localeCompare(b.displayName)),
    [setupList],
  );
  const filteredTracks = useMemo(() => {
    const q = trackQuery.trim().toLowerCase();
    if (!q) return allTracks;
    return allTracks.filter(
      (t) =>
        t.displayName.toLowerCase().includes(q) ||
        (t.country || '').toLowerCase().includes(q) ||
        (t.countryCode || '').toLowerCase().includes(q),
    );
  }, [allTracks, trackQuery]);

  const series = data?.series ?? [];
  const current = series.find((s) => s.id === seriesId) ?? series[0];
  const rounds = current?.rounds ?? [];

  const nextRoundObj = useMemo(() => {
    return rounds.filter((r) => r.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
  }, [rounds]);
  const nextRound = nextRoundObj?.round ?? null;
  const availableCount = rounds.filter((r) => r.hasSetup).length;

  return (
    <motion.div variants={pageMotion} initial="initial" animate="animate" exit="exit">
      <Link to="/" className="text-sm text-muted hover:text-ink transition-colors">‹ Garage</Link>

      <div className="mt-3 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-car">{data?.season?.name ?? 'Rennkalender'}</p>
          <h1 className="display text-3xl sm:text-4xl lg:text-5xl font-bold mt-1">{carInfo?.displayName ?? car}</h1>
          <p className="text-muted mt-2">{carInfo?.class} · {carInfo?.manufacturer} {carInfo?.year}</p>
        </div>
        <div className="text-sm text-muted">
          <span className="text-good">{availableCount}</span> von {rounds.length} mit Setup
        </div>
      </div>

      {current && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {series.length > 1 && (
            <div className="inline-flex glass rounded-xl p-1">
              {series.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSeriesId(s.id)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${current?.id === s.id ? 'bg-car/20 text-ink' : 'text-muted hover:text-ink'}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-muted">
            <span className="text-car">{current.name}</span> · {current.day}s · Training {current.schedule?.training} · Quali {current.schedule?.quali} · Start {current.schedule?.race}
          </p>
        </div>
      )}

      {nextRoundObj && (
        <NextRaceCountdown round={nextRoundObj} seriesName={current?.name} schedule={current?.schedule} />
      )}

      {isLoading && <p className="text-muted">lädt Kalender…</p>}
      {error && <p className="text-bad">Konnte Kalender nicht laden.</p>}

      <motion.div
        variants={stagger}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {rounds.map((r) => (
          <RoundCard key={r.round} round={r} car={car} isNext={r.round === nextRound} />
        ))}
      </motion.div>

      {/* Alle Strecken / Weitere Setups */}
      {allTracks.length > 0 && (
        <div className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="display text-xl font-semibold">Alle Strecken</h2>
              <p className="text-xs text-muted mt-0.5">Weitere Setups jenseits des Saison-Kalenders</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="search"
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value)}
                placeholder="Strecke suchen…"
                className="glass rounded-xl px-3.5 py-2 text-sm bg-transparent outline-none focus:border-car/50 w-44 sm:w-56"
              />
              <span className="text-xs text-muted whitespace-nowrap hidden sm:inline">
                <span className="text-good">{allTracks.filter((t) => t.hasSetup).length}</span> mit Setup · {allTracks.length}
              </span>
            </div>
          </div>
          <motion.div
            variants={stagger}
            initial="initial"
            animate="animate"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
          >
            {filteredTracks.map((t) => <TrackTile key={t.id} track={t} car={car} />)}
          </motion.div>
          {filteredTracks.length === 0 && (
            <p className="text-sm text-muted">Keine Strecke gefunden für „{trackQuery}".</p>
          )}
        </div>
      )}
    </motion.div>
  );
}
