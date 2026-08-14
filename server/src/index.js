// Server-Einstieg: Express-App, statische Bilder, API-Routen, Filewatcher.
// In Produktion liefert der Server zusätzlich das gebaute Frontend (client/dist)
// aus -> alles unter einer Adresse (ideal zum Teilen/Deployen).

import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll, watch, getStore, DATA_DIR } from './lib/dataStore.js';
import apiRouter from './routes/api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');
const PORT = process.env.PORT || 4000;

loadAll();
watch();

const store = getStore();
console.log(`[server] Daten geladen: ${store.cars.length} Autos, ${store.tracks.length} Strecken`);
if (store.errors.length) console.warn('[server] Daten-Warnungen:', store.errors);

const app = express();
app.use(cors());
app.use(express.json());

// Bilder (Autos/Strecken).
app.use('/images', express.static(path.join(DATA_DIR, 'images')));

// API.
app.use('/api', apiRouter);

// Frontend-Produktionsbuild ausliefern (falls vorhanden) + SPA-Fallback.
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/images')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
  console.log('[server] Frontend-Build wird ausgeliefert (client/dist)');
} else {
  app.get('/', (req, res) => res.json({ name: 'ASPL Racing API', status: 'ok', docs: '/api/health' }));
  console.log('[server] Kein Frontend-Build gefunden – nur API. (npm run build im client/)');
}

app.listen(PORT, () => {
  console.log(`[server] ASPL Racing laeuft auf http://localhost:${PORT}`);
});
