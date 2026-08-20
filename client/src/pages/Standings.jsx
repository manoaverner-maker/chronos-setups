import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { getStandings } from '../lib/api.js';
import { pageMotion, stagger, rise } from '../lib/motion.js';
import Tabs from '../components/Tabs.jsx';

const CAR_COLOR = {
  'Ferrari 296 GT3': '#E8002D',
  'Mercedes-AMG GT3': '#00A19B',
  'Aston Martin Vantage GT3': '#1f6f5c',
};
// Laendercode -> Flaggen-Emoji (zwei Regional Indicator Symbols).
function flag(code) {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function DriverRosterRow({ d }) {
  const color = CAR_COLOR[d.car] || 'var(--muted)';
  return (
    <div className="flex items-center gap-3 py-2 border-b border-line/50 last:border-0">
      {d.number ? (
        <span className="mono text-xs w-8 text-center rounded bg-white/5 border border-line py-0.5 shrink-0">{d.number}</span>
      ) : (
        <span className="w-8 shrink-0 text-center text-muted/40">—</span>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{d.driver} {flag(d.country)}</div>
        {d.name && <div className="text-[11px] text-muted">{d.name}</div>}
      </div>
      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} title={d.car} />
      <span className="text-[11px] text-muted whitespace-nowrap hidden sm:inline">{d.car}</span>
    </div>
  );
}

function PointsGrid({ title, points }) {
  return (
    <div>
      <h4 className="text-[11px] uppercase tracking-wider text-muted mb-2">{title}</h4>
      <div className="grid grid-cols-5 gap-1.5">
        {points.map((p, i) => (
          <div key={i} className="glass rounded-lg px-1 py-1.5 text-center">
            <div className="text-[10px] text-muted">P{i + 1}</div>
            <div className="mono text-sm font-semibold text-car">{p}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Segmentierter Umschalter fuer die beiden Fahrerwertungen (Solo / Team Series).
function SeriesSwitch({ options, value, onChange }) {
  return (
    <div className="flex gap-1 glass rounded-xl p-1">
      {options.map((o) => {
        const selected = o.id === value;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            aria-pressed={selected}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${selected ? 'text-ink' : 'text-muted hover:text-ink'}`}
            style={selected ? { background: 'color-mix(in srgb, var(--car-accent) 18%, transparent)' } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Ein Rundenergebnis: Platzierung, DNS/DNF/DSQ oder "—" (nicht gestartet/gewertet).
function ResultCell({ value }) {
  if (value == null) return <td className="hidden sm:table-cell py-2 px-1 text-center text-muted/40 mono text-xs">—</td>;
  const podium = typeof value === 'number' && value <= 3;
  return (
    <td className={`hidden sm:table-cell py-2 px-1 text-center mono text-xs ${podium ? 'text-car font-semibold' : 'text-muted'}`}>{value}</td>
  );
}

// Eine Zeile der Fahrerwertung. Chronos-Zeilen werden hervorgehoben, damit man die
// eigenen Leute in der ligaweiten Tabelle sofort findet.
function DriverStandingRow({ d, roundCols }) {
  const sub = [d.number ? `#${d.number}` : null, d.car, d.team].filter(Boolean).join(' · ');
  return (
    <tr className="border-b border-line/50 last:border-0" style={d.chronos ? { background: 'color-mix(in srgb, var(--car-accent) 10%, transparent)' } : undefined}>
      <td className="py-2 pl-2 text-muted mono">{d.pos}</td>
      <td className="py-2 pr-3 min-w-[170px]">
        <div className={`leading-tight ${d.chronos ? 'font-semibold' : 'font-medium'}`}>
          {flag(d.country) && <span className="mr-1">{flag(d.country)}</span>}{d.name}
        </div>
        {sub && <div className="text-[11px] text-muted">{sub}</div>}
      </td>
      {roundCols.map((i) => <ResultCell key={i} value={d.results?.[i] ?? null} />)}
      <td className="hidden sm:table-cell py-2 px-1 text-center mono text-xs text-warn">{d.pen || ''}</td>
      <td className="py-2 pr-2 text-right mono font-semibold text-car whitespace-nowrap">
        {d.points}{d.mark && <span className="text-muted font-normal" title="Markierung aus der Liga-Tabelle">{d.mark}</span>}
      </td>
    </tr>
  );
}

// Eine Zeile der Team-Meisterschaft.
function TeamStandingRow({ t }) {
  return (
    <tr className="border-b border-line/50 last:border-0" style={t.chronos ? { background: 'color-mix(in srgb, var(--car-accent) 10%, transparent)' } : undefined}>
      <td className="py-2 pl-2 text-muted mono">{t.pos}</td>
      <td className={`py-2 ${t.chronos ? 'font-semibold' : 'font-medium'}`}>{t.team}</td>
      <td className="py-2 pr-2 text-right mono font-semibold text-car">{t.points}</td>
    </tr>
  );
}

// Herkunft und Stand einer einzelnen Tabelle — die drei Tabellen kommen aus
// unterschiedlichen Quellen und koennen unterschiedlich aktuell sein.
function SourceLine({ source }) {
  if (!source) return null;
  return (
    <p className="text-[11px] text-muted mt-3">
      Quelle:{' '}
      {source.url
        ? <a className="underline hover:text-ink" href={source.url} target="_blank" rel="noreferrer">{source.name}</a>
        : source.name}
      {source.importedAt ? ` · eingelesen ${source.importedAt.split('-').reverse().join('.')}` : ''}
    </p>
  );
}

export default function Standings() {
  const { data, isLoading } = useQuery({ queryKey: ['standings'], queryFn: getStandings });
  const teams = data?.teams ?? [];
  const ps = data?.pointsSystem;
  const reserve = data?.reservePool ?? [];
  const driverStandings = data?.driverStandings ?? [];
  const soloStandings = data?.soloStandings ?? [];
  const teamStandings = data?.teamStandings ?? [];
  const hasPoints = driverStandings.length > 0 || soloStandings.length > 0 || teamStandings.length > 0;

  // Die Liga fuehrt zwei Fahrerwertungen (Solo- und Team-Series) — beide kommen
  // aus derselben Quelle, deshalb ein Umschalter statt zweier langer Tabellen.
  const seriesOptions = [
    soloStandings.length > 0 && { id: 'solo', label: 'Solo Series', rows: soloStandings },
    driverStandings.length > 0 && { id: 'team', label: 'Team Series', rows: driverStandings },
  ].filter(Boolean);
  const [series, setSeries] = useState('team');
  const activeSeries = seriesOptions.find((o) => o.id === series) ?? seriesOptions[0];
  const sources = data?.sources;
  // Rundenspalten aus den Daten ableiten und die leeren weglassen: die Team-Series
  // faehrt nicht jede Runde der Liga-Tabelle mit. Die Nummern bleiben die der Liga.
  const roundCount = Math.max(0, ...(activeSeries?.rows ?? []).map((d) => d.results?.length ?? 0));
  const roundCols = Array.from({ length: roundCount }, (_, i) => i)
    .filter((i) => (activeSeries?.rows ?? []).some((d) => d.results?.[i] != null));

  return (
    <motion.div variants={pageMotion} initial="initial" animate="animate" exit="exit">
      <Link to="/" className="text-sm text-muted hover:text-ink transition-colors">‹ Garage</Link>
      <div className="mt-3 mb-6">
        {/* Die Tabellen decken beide Serien ab, deshalb hier nicht mehr nur "Team Series". */}
        <p className="text-xs uppercase tracking-[0.25em] text-car">ASPL Racing Series · Saison {data?.season ?? 2}</p>
        <h1 className="display text-3xl sm:text-4xl lg:text-5xl font-bold mt-1">Championship</h1>
        {data?.principals?.length > 0 && (
          <p className="text-sm text-muted mt-2">Teamleitung: {data.principals.join('  ·  ')}</p>
        )}
      </div>

      {isLoading && <p className="text-muted">lädt…</p>}

      {/* Gleiche Gliederung wie auf der Setup-Seite: die Seite war 4580 px lang,
          weil Wertung, Kader und Punktesystem ungetrennt untereinander standen. */}
      <Tabs
        tabs={[
          {
            id: 'wertung',
            label: 'Wertung',
            hint: 'Fahrer & Teams',
            content: (
              <>
              {hasPoints && (
                <>
                  {data?.note && (
                    <p className="text-[11px] text-warn mb-4 glass rounded-xl px-3 py-2 inline-block">ℹ {data.note}</p>
                  )}
                  {/* Fahrerwertung — ligaweit, umschaltbar zwischen Solo- und Team-Series.
                      Die Rundenspalten sind breit, deshalb volle Breite und horizontal scrollbar. */}
                  <div className="glass rounded-2xl p-5 mb-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <h2 className="display text-lg font-semibold">Fahrerwertung</h2>
                      {seriesOptions.length > 1 && (
                        <SeriesSwitch options={seriesOptions} value={activeSeries?.id} onChange={setSeries} />
                      )}
                    </div>
                    <div className="overflow-x-auto -mx-2 px-2">
                      <table className="w-full text-sm sm:min-w-[640px]">
                        <thead>
                          <tr className="text-[11px] uppercase tracking-wider text-muted border-b border-line">
                            <th className="py-2 pl-2 text-left w-7">#</th>
                            <th className="py-2 text-left">Fahrer</th>
                            {roundCols.map((i) => (
                              <th key={i} className="hidden sm:table-cell py-2 px-1 text-center w-8 font-normal">R{i + 1}</th>
                            ))}
                            <th className="hidden sm:table-cell py-2 px-1 text-center w-10 font-normal">Pen</th>
                            <th className="py-2 pr-2 text-right w-12">Pkt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(activeSeries?.rows ?? []).map((d) => (
                            <DriverStandingRow key={`${d.pos}-${d.name}`} d={d} roundCols={roundCols} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[11px] text-muted mt-3">
                      <span className="hidden sm:inline">
                        R-Spalten sind die Runden der Liga-Tabelle; nicht gefahrene Runden sind ausgeblendet,
                        deshalb decken sich die Nummern nicht mit dem Rennkalender. „—" = kein Ergebnis.
                      </span>
                      <span className="sm:hidden">Rundenergebnisse ab Tablet-Breite sichtbar.</span>
                    </p>
                    <SourceLine source={sources?.[activeSeries?.id === 'solo' ? 'soloStandings' : 'driverStandings']} />
                  </div>

                  {/* Team-Meisterschaft — ebenfalls ligaweit */}
                  <div className="glass rounded-2xl p-5 mb-8 lg:max-w-md">
                    <h2 className="display text-lg font-semibold mb-3">Team-Meisterschaft</h2>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[11px] uppercase tracking-wider text-muted border-b border-line">
                          <th className="py-2 pl-2 text-left w-7">#</th>
                          <th className="py-2 text-left">Team</th>
                          <th className="py-2 pr-2 text-right w-12">Pkt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamStandings.map((t) => <TeamStandingRow key={`${t.pos}-${t.team}`} t={t} />)}
                      </tbody>
                    </table>
                    <SourceLine source={sources?.teamStandings} />
                  </div>
                </>
              )}
              </>
            ),
          },
          {
            id: 'kader',
            label: 'Teams',
            hint: 'Fahrer & Ersatz',
            content: (
              <>
              <h2 className="display text-xl font-semibold mb-3">Teams &amp; Fahrer</h2>
              <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {teams.map((t, i) => (
                  <motion.div key={i} variants={rise} className="glass rounded-2xl p-5">
                    <h3 className="display text-lg font-semibold">{t.name}</h3>
                    <div className="mt-2">
                      {t.drivers.map((d, j) => <DriverRosterRow key={j} d={d} />)}
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {reserve.length > 0 && (
                <div className="glass rounded-2xl p-5 mb-8">
                  <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2.5">Ersatzfahrer-Pool</h3>
                  <div className="flex flex-wrap gap-2">
                    {reserve.map((d, i) => (
                      <span key={i} className="text-sm glass rounded-lg px-3 py-1.5">
                        {d.name || d.driver}{d.number ? ` · #${d.number}` : ''} <span className="text-muted text-xs">· {d.car}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              </>
            ),
          },
          {
            id: 'punkte',
            label: 'Punkte',
            hint: 'Punktesystem',
            content: (
              <>
              {ps && (
                <div className="glass rounded-2xl p-5">
                  <h2 className="display text-lg font-semibold mb-4">Punktesystem</h2>
                  <div className="space-y-5">
                    <PointsGrid title="Rennpunkte (P1–P15)" points={ps.race} />
                    <div className="max-w-[220px]"><PointsGrid title="Qualifying-Bonus" points={ps.qualiBonus} /></div>
                    {ps.note && <p className="text-xs text-muted">ℹ {ps.note}</p>}
                  </div>
                </div>
              )}
              </>
            ),
          },
        ]}
      />
    </motion.div>
  );
}
