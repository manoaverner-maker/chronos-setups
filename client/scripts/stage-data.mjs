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

// Setup-Index: car -> track -> [{ file, temp, trackTemp, compound, author, label, estimated }]
// Die Metadaten kommen aus den Setup-JSONs selbst (author/variant/referenceTemp),
// nicht mehr aus dem Dateinamen — so funktionieren auch importierte Community-Setups.
// Sortierung: Team-Setups (bernagk1) zuerst, dann Renn- vor Quali-Varianten, Regen ans Ende.
function sortKey(e) {
  const teamRank = e.author?.startsWith('bernagk1') ? 0 : 1;
  const wetRank = e.compound === 'wet' ? 1 : 0;
  const labelRank = /stabil/i.test(e.label) ? 0 : /rennen|allround/i.test(e.label) ? 1 : /quali(?! 2)/i.test(e.label) ? 2 : 3;
  return [wetRank, teamRank, labelRank];
}
const index = {};
const setupsDir = path.join(dataDir, 'setups');
for (const car of fs.readdirSync(setupsDir)) {
  const cd = path.join(setupsDir, car);
  if (!fs.statSync(cd).isDirectory()) continue;
  index[car] = {};
  for (const track of fs.readdirSync(cd)) {
    const td = path.join(cd, track);
    if (!fs.statSync(td).isDirectory()) continue;
    const entries = [];
    for (const f of fs.readdirSync(td)) {
      if (!f.endsWith('.json')) continue;
      let s;
      try {
        s = JSON.parse(fs.readFileSync(path.join(td, f), 'utf8'));
      } catch {
        console.warn(`[stage-data] ${car}/${track}/${f}: kein gueltiges JSON — uebersprungen`);
        continue;
      }
      entries.push({
        file: f,
        temp: s.referenceTemp?.air ?? null,
        trackTemp: s.referenceTemp?.track ?? null,
        estimated: s.referenceTemp?.estimated ?? false,
        compound: s.basicSetup?.tyres?.compound ?? 'dry',
        author: s.author ?? 'Chronos Team',
        label: s.variant ?? 'Baseline',
      });
    }
    entries.sort((a, b) => {
      const ka = sortKey(a), kb = sortKey(b);
      for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
      return (a.temp ?? 99) - (b.temp ?? 99);
    });
    if (entries.length) index[car][track] = entries;
  }
}
fs.writeFileSync(path.join(pub, 'data', 'setups-index.json'), JSON.stringify(index, null, 2));
console.log('[stage-data] Config, Setups, Bilder + Index nach client/public gestaged.');
