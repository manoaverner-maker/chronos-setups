// Statische Datenschicht: lädt die eingebetteten JSON-Dateien (/data/...) und rechnet
// Reifendruck + Slider im Browser. Kein Backend nötig -> die App ist eine reine
// statische Seite und überall dauerhaft hostbar. Gleiche Funktionssignaturen wie zuvor.
import { computePressures } from './pressureEngine.js';
import { applyAdjustments } from './adjustmentEngine.js';
import { assetUrl } from './assetUrl.js';

const _cache = new Map();
function load(path) {
  const url = assetUrl(path);
  if (!_cache.has(url)) {
    _cache.set(url, fetch(url).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status} bei ${url}`);
      return r.json();
    }));
  }
  return _cache.get(url);
}
const cfg = (name) => load(`/data/config/${name}.json`);
const setupIndex = () => load('/data/setups-index.json');

export async function getCars() {
  const [{ cars }, index] = await Promise.all([cfg('cars'), setupIndex()]);
  return cars.map((c) => ({ ...c, availableTracks: Object.keys(index[c.id] || {}) }));
}

export async function getTracks() {
  return (await cfg('tracks')).tracks;
}

export async function getSetupsList(car) {
  const [tracks, index] = await Promise.all([getTracks(), setupIndex()]);
  const avail = Object.keys(index[car] || {});
  return { car, tracks: tracks.map((t) => ({ ...t, hasSetup: avail.includes(t.id) })) };
}

export async function getSeason(car) {
  const [data, tracks, index] = await Promise.all([cfg('seasons'), getTracks(), setupIndex()]);
  const seasons = data.seasons || [];
  const season = seasons.find((s) => s.id === data.currentSeason) || seasons[0];
  if (!season) return { season: null, series: [] };
  const byId = Object.fromEntries(tracks.map((t) => [t.id, t]));
  const avail = Object.keys(index[car] || {});
  const series = (season.series || []).map((s) => ({
    id: s.id,
    name: s.name,
    day: s.day,
    schedule: s.schedule,
    midSeasonPause: s.midSeasonPause || null,
    rounds: (s.rounds || []).map((r) => ({
      round: r.round,
      date: r.date,
      trackId: r.track,
      track: byId[r.track] || { id: r.track, displayName: r.track },
      hasSetup: avail.includes(r.track),
    })),
  }));
  return { season: { id: season.id, name: season.name }, series };
}

export async function getSetup(car, track, { airTemp, trackTemp, slider } = {}) {
  const index = await setupIndex();
  const entries = index[car]?.[track];
  if (!entries || !entries.length) {
    return { error: 'Kein Setup vorhanden', message: `Für ${car} / ${track} liegen keine transkribierten Setup-Daten vor.` };
  }
  let entry = entries[0];
  if (airTemp != null) {
    entry = entries.reduce((best, e) => (Math.abs(e.temp - airTemp) < Math.abs(best.temp - airTemp) ? e : best));
  }
  const [baseline, model, adjustments, refTimesAll] = await Promise.all([
    load(`/data/setups/${car}/${track}/${entry.file}`),
    cfg('pressure_model'),
    cfg('setup_adjustments'),
    cfg('reference_times'),
  ]);
  const ref = baseline.referenceTemp || {};
  const air = airTemp ?? ref.air;
  const trk = trackTemp ?? ref.track;
  const sld = slider ?? 0;
  const pressures = computePressures({ baseline, model, carId: car, airTemp: air, trackTemp: trk });
  const adjustment = applyAdjustments({ baseline, adjustments, slider: sld });
  const referenceTimes = refTimesAll.times?.[car]?.[track] ?? null;
  return {
    car, track, sourceFile: entry.file,
    referenceTemp: ref, requestedTemp: { air, track: trk },
    baseline, pressures, adjustment,
    referenceTimes,
    referenceTimesAvailable: !!referenceTimes && Object.values(referenceTimes).some((v) => v != null),
    referenceTimesEstimated: refTimesAll.estimated ?? false,
  };
}

export async function getStandings() {
  return cfg('standings');
}

export const getHealth = async () => ({ ok: true, mode: 'static' });
