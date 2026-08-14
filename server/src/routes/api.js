// REST-API. Endpunkte gemaess Prompt: /cars, /tracks, /setups/:car/:track
// plus Referenzzeiten und ein Health-Check, der fehlende Daten ehrlich offenlegt.

import { Router } from 'express';
import { getStore, getAvailableTracks, getBaseline } from '../lib/dataStore.js';
import { computePressures } from '../engine/pressureEngine.js';
import { applyAdjustments } from '../engine/adjustmentEngine.js';

const router = Router();

// --- Health / Diagnose ---------------------------------------------------
router.get('/health', (req, res) => {
  const store = getStore();
  res.json({
    ok: store.errors.length === 0,
    loadedAt: store.loadedAt,
    counts: {
      cars: store.cars.length,
      tracks: store.tracks.length,
      carsWithSetups: Object.keys(store.setups).length,
    },
    errors: store.errors,
  });
});

// --- Autos ---------------------------------------------------------------
router.get('/cars', (req, res) => {
  const store = getStore();
  const cars = store.cars.map((c) => ({
    ...c,
    availableTracks: getAvailableTracks(c.id),
  }));
  res.json(cars);
});

// --- Strecken (Kalender) -------------------------------------------------
router.get('/tracks', (req, res) => {
  res.json(getStore().tracks);
});

// --- Strecken-Liste mit Setup-Verfuegbarkeit fuer ein Auto ---------------
router.get('/setups/:car', (req, res) => {
  const store = getStore();
  const { car } = req.params;
  const available = getAvailableTracks(car);
  const tracks = store.tracks.map((t) => ({
    ...t,
    hasSetup: available.includes(t.id),
  }));
  res.json({ car, tracks });
});

// --- Kernendpunkt: Baseline + berechnetes Setup --------------------------
// Query: ?airTemp=&trackTemp=&slider=
router.get('/setups/:car/:track', (req, res) => {
  const store = getStore();
  const { car, track } = req.params;

  const airTempQ = req.query.airTemp != null ? Number(req.query.airTemp) : null;
  const entry = getBaseline(car, track, airTempQ);
  if (!entry) {
    return res.status(404).json({
      error: 'Kein Setup vorhanden',
      message: `Fuer ${car} / ${track} liegen keine transkribierten Setup-Daten vor.`,
    });
  }

  const baseline = entry.data;
  const refTemp = baseline.referenceTemp ?? {};
  const airTemp = airTempQ ?? refTemp.air;
  const trackTemp = req.query.trackTemp != null ? Number(req.query.trackTemp) : refTemp.track;
  const slider = req.query.slider != null ? Number(req.query.slider) : 0;

  const pressures = computePressures({ baseline, model: store.pressureModel, carId: car, airTemp, trackTemp });
  const adjustment = applyAdjustments({ baseline, adjustments: store.setupAdjustments, slider });
  const referenceTimes = store.referenceTimes?.[car]?.[track] ?? null;

  res.json({
    car,
    track,
    sourceFile: entry.file,
    referenceTemp: refTemp,
    requestedTemp: { air: airTemp, track: trackTemp },
    baseline,
    pressures,
    adjustment,
    referenceTimes,
    referenceTimesAvailable: !!referenceTimes && Object.values(referenceTimes).some((v) => v != null),
    referenceTimesEstimated: store.referenceTimesEstimated ?? false,
  });
});

// --- Referenzzeiten ------------------------------------------------------
router.get('/reference-times/:car/:track', (req, res) => {
  const { car, track } = req.params;
  const times = getStore().referenceTimes?.[car]?.[track] ?? null;
  res.json({
    car,
    track,
    times,
    available: !!times && Object.values(times).some((v) => v != null),
  });
});

// --- Rennkalender (Saison + Series) --------------------------------------
router.get('/season/:car', (req, res) => {
  const store = getStore();
  const { car } = req.params;
  const data = store.seasons ?? {};
  const seasons = data.seasons ?? [];
  const season = seasons.find((s) => s.id === data.currentSeason) ?? seasons[0];
  if (!season) return res.json({ season: null, series: [] });

  const available = getAvailableTracks(car);
  const trackById = Object.fromEntries(store.tracks.map((t) => [t.id, t]));

  const series = (season.series ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    day: s.day,
    schedule: s.schedule,
    midSeasonPause: s.midSeasonPause ?? null,
    rounds: (s.rounds ?? []).map((r) => ({
      round: r.round,
      date: r.date,
      trackId: r.track,
      track: trackById[r.track] ?? { id: r.track, displayName: r.track },
      hasSetup: available.includes(r.track),
    })),
  }));

  res.json({ season: { id: season.id, name: season.name }, series });
});

// --- Championship-Wertung ------------------------------------------------
router.get('/standings', (req, res) => {
  const s = getStore().standings ?? {};
  res.json({
    season: s.season ?? null,
    seriesName: s.seriesName ?? null,
    status: s.status ?? 'pending',
    lastUpdated: s.lastUpdated ?? null,
    principals: s.principals ?? [],
    pointsSystem: s.pointsSystem ?? null,
    teams: s.teams ?? [],
    reservePool: s.reservePool ?? [],
    drivers: s.drivers ?? [],
    teamStandings: s.teamStandings ?? [],
  });
});

export default router;
