// Staging-Skript: kopiert /data (Config, Setups, Bilder) in client/public, damit das
// Frontend als reine statische Seite (ohne Backend) laufen kann. Erzeugt zusätzlich
// einen Setup-Index (welche Baseline-Dateien existieren). Läuft vor jedem Build.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..'); // client/
const dataDir = path.resolve(root, '../data'); // data/
const pub = path.join(root, 'public');

// Saubere Neu-Erzeugung der gestageten Daten.
fs.rmSync(path.join(pub, 'data'), { recursive: true, force: true });
fs.mkdirSync(path.join(pub, 'data', 'config'), { recursive: true });

// Config-JSONs.
for (const f of fs.readdirSync(path.join(dataDir, 'config'))) {
  if (f.endsWith('.json')) fs.copyFileSync(path.join(dataDir, 'config', f), path.join(pub, 'data', 'config', f));
}

// Setups + Bilder rekursiv.
fs.cpSync(path.join(dataDir, 'setups'), path.join(pub, 'data', 'setups'), { recursive: true });
fs.cpSync(path.join(dataDir, 'images'), path.join(pub, 'images'), { recursive: true });

// Setup-Index: car -> track -> [{ temp, file }]
const index = {};
const setupsDir = path.join(dataDir, 'setups');
for (const car of fs.readdirSync(setupsDir)) {
  const cd = path.join(setupsDir, car);
  if (!fs.statSync(cd).isDirectory()) continue;
  index[car] = {};
  for (const track of fs.readdirSync(cd)) {
    const td = path.join(cd, track);
    if (!fs.statSync(td).isDirectory()) continue;
    const entries = fs.readdirSync(td)
      .filter((f) => /baseline_\d+c\.json$/i.test(f))
      .map((f) => ({ temp: Number(f.match(/baseline_(\d+)c/i)[1]), file: f }))
      .sort((a, b) => a.temp - b.temp);
    if (entries.length) index[car][track] = entries;
  }
}
fs.writeFileSync(path.join(pub, 'data', 'setups-index.json'), JSON.stringify(index, null, 2));
console.log('[stage-data] Config, Setups, Bilder + Index nach client/public gestaged.');
