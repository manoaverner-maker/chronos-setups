// Zentraler Daten-Speicher: liest /data beim Start komplett ein, haelt alles im RAM
// und aktualisiert sich per chokidar-Filewatcher, sobald sich eine Datei aendert.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chokidar from 'chokidar';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// /data liegt relativ zum Server-Ordner (ueberschreibbar per ENV fuer Tests/Deployment).
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '../../../data');

const CONFIG_DIR = path.join(DATA_DIR, 'config');
const SETUPS_DIR = path.join(DATA_DIR, 'setups');

const store = {
  cars: [],
  tracks: [],
  referenceTimes: {},
  pressureModel: {},
  setupAdjustments: {},
  seasons: {},
  standings: {},
  // setups[carId][trackId] = [{ temp, file, data }]  (sortiert, kann mehrere Temperaturen je Strecke enthalten)
  setups: {},
  loadedAt: null,
  errors: [],
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function safeLoad(label, fn) {
  try {
    return fn();
  } catch (err) {
    store.errors.push(`${label}: ${err.message}`);
    return null;
  }
}

function loadConfig() {
  store.cars = safeLoad('cars.json', () => readJson(path.join(CONFIG_DIR, 'cars.json')).cars) ?? [];
  store.tracks = safeLoad('tracks.json', () => readJson(path.join(CONFIG_DIR, 'tracks.json')).tracks) ?? [];
  const refTimes = safeLoad('reference_times.json', () => readJson(path.join(CONFIG_DIR, 'reference_times.json')));
  store.referenceTimes = refTimes?.times ?? {};
  store.referenceTimesEstimated = refTimes?.estimated ?? false;
  store.pressureModel = safeLoad('pressure_model.json', () => readJson(path.join(CONFIG_DIR, 'pressure_model.json'))) ?? {};
  store.setupAdjustments = safeLoad('setup_adjustments.json', () => readJson(path.join(CONFIG_DIR, 'setup_adjustments.json'))) ?? {};
  store.seasons = safeLoad('seasons.json', () => readJson(path.join(CONFIG_DIR, 'seasons.json'))) ?? {};
  store.standings = safeLoad('standings.json', () => readJson(path.join(CONFIG_DIR, 'standings.json'))) ?? {};
}

// Dateiname-Konvention: baseline_<temp>c.json  (temp = Referenz-Lufttemperatur in Grad C)
function parseTempFromFilename(filename) {
  const m = filename.match(/baseline_(\d+)c\.json$/i);
  return m ? Number(m[1]) : null;
}

function loadSetups() {
  store.setups = {};
  if (!fs.existsSync(SETUPS_DIR)) return;

  for (const carId of fs.readdirSync(SETUPS_DIR)) {
    const carDir = path.join(SETUPS_DIR, carId);
    if (!fs.statSync(carDir).isDirectory()) continue;
    store.setups[carId] = {};

    for (const trackId of fs.readdirSync(carDir)) {
      const trackDir = path.join(carDir, trackId);
      if (!fs.statSync(trackDir).isDirectory()) continue;

      const files = fs.readdirSync(trackDir).filter((f) => /baseline_\d+c\.json$/i.test(f));
      const entries = [];
      for (const file of files) {
        const data = safeLoad(`${carId}/${trackId}/${file}`, () => readJson(path.join(trackDir, file)));
        if (!data) continue;
        // Referenztemperatur: bevorzugt aus der Datei, sonst aus dem Dateinamen.
        const fileTemp = parseTempFromFilename(file);
        if (!data.referenceTemp) data.referenceTemp = { air: fileTemp, track: null };
        entries.push({ temp: data.referenceTemp.air ?? fileTemp, file, data });
      }
      if (entries.length) {
        entries.sort((a, b) => (a.temp ?? 0) - (b.temp ?? 0));
        store.setups[carId][trackId] = entries;
      }
    }
  }
}

export function loadAll() {
  store.errors = [];
  loadConfig();
  loadSetups();
  store.loadedAt = new Date().toISOString();
  return store;
}

export function getStore() {
  return store;
}

/** Liefert die Liste der Strecken, fuer die ein Auto echte Setups hat. */
export function getAvailableTracks(carId) {
  return Object.keys(store.setups[carId] ?? {});
}

/**
 * Waehlt das Baseline-Setup fuer Auto+Strecke. Bei mehreren Temperaturen
 * wird die naeheste zur gewuenschten Lufttemperatur gewaehlt.
 */
export function getBaseline(carId, trackId, preferredAirTemp = null) {
  const entries = store.setups[carId]?.[trackId];
  if (!entries || entries.length === 0) return null;
  if (preferredAirTemp == null) return entries[0];
  return entries.reduce((best, e) =>
    Math.abs((e.temp ?? 0) - preferredAirTemp) < Math.abs((best.temp ?? 0) - preferredAirTemp) ? e : best
  );
}

let watcher = null;

/** Startet den Filewatcher mit kleinem Debounce, damit Mehrfach-Events gebuendelt werden. */
export function watch() {
  if (watcher) return;
  let timer = null;
  watcher = chokidar.watch(DATA_DIR, { ignoreInitial: true, depth: 6 });
  const reload = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      loadAll();
      console.log(`[dataStore] /data neu eingelesen (${store.loadedAt}), Fehler: ${store.errors.length}`);
    }, 150);
  };
  watcher.on('add', reload).on('change', reload).on('unlink', reload);
  console.log(`[dataStore] Beobachte ${DATA_DIR}`);
}
