// Wandelt die von lowfuelmotorsport.com/accbop kopierte BoP-Tabelle in
// data/config/bop.json um. Die LFM-Seite braucht einen Steam-Login und hat keine
// oeffentliche API — deshalb der Weg ueber Kopieren/Einfuegen.
//
// Ablauf (dauert ~2 Minuten pro Woche):
//   1. Auf lowfuelmotorsport.com/accbop einloggen, ganze Seite markieren, kopieren
//   2. In data/lfm_bop_paste.txt einfuegen und speichern
//   3. node scripts/import_lfm_bop.mjs
//   4. git add -A && git commit -m "BoP aktualisiert" && git push
//
// Erwartetes Format je Block:
//   <Streckenname>
//   Track BoP Version: 52
//   Active since: 27.07.26, 09:21
//   Class Car Year Restrictor Ballast Change
//   GT3   Ferrari 296 GT3  2023  0  13 kg  0 kg
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PASTE = path.resolve(__dirname, '../data/lfm_bop_paste.txt');
const OUT = path.resolve(__dirname, '../data/config/bop.json');

// LFM-Streckenname -> Strecken-ID der App.
const TRACKS = {
  'autodromo enzo e dino ferrari': 'imola',
  'autodromo nazionale di monza': 'monza',
  'brands hatch circuit': 'brands_hatch',
  'circuit de catalunya': 'barcelona',
  'circuit de paul ricard': 'paul_ricard',
  'circuit de spa francorchamps': 'spa',
  'circuit of the americas': 'cota',
  'circuit ricardo tormo': 'valencia',
  'donington park': 'donington',
  hungaroring: 'hungaroring',
  indianapolis: 'indianapolis',
  kyalami: 'kyalami',
  'laguna seca': 'laguna_seca',
  misano: 'misano',
  'mount panorama circuit': 'mount_panorama',
  nürburgring: 'nbr_gp',
  nurburgring: 'nbr_gp',
  'nürburgring nordschleife 24h': 'nbr_24h',
  'nurburgring nordschleife 24h': 'nbr_24h',
  'oulton park': 'oulton_park',
  silverstone: 'silverstone',
  snetterton: 'snetterton',
  'spielberg - red bull ring': 'red_bull_ring',
  'suzuka circuit': 'suzuka',
  'watkins glen': 'watkins_glen',
  zandvoort: 'zandvoort',
  zolder: 'zolder',
};

// (LFM-Autoname, Baujahr) -> Auto-ID. Das Jahr ist noetig, weil LFM alte und neue
// Modelle gleich benennt (z. B. Mercedes-AMG GT3 2015 vs. 2020).
const CARS = {
  'ferrari 296 gt3|2023': 'ferrari_296_gt3',
  'amr v8 vantage|2019': 'amr_v8_vantage_gt3',
  'mercedes-amg gt3|2020': 'mercedes_amg_gt3_evo',
};

// "27.07.26, 09:21" -> "2026-07-27T09:21"
function isoDate(s) {
  const m = s.match(/(\d{2})\.(\d{2})\.(\d{2}),\s*(\d{2}:\d{2})/);
  return m ? `20${m[3]}-${m[2]}-${m[1]}T${m[4]}` : null;
}

function main() {
  if (!fs.existsSync(PASTE)) {
    console.error(`Datei fehlt: ${path.relative(process.cwd(), PASTE)}\n` +
      'LFM-BoP-Seite kopieren, dort einfuegen, dann erneut ausfuehren.');
    process.exit(1);
  }
  const lines = fs.readFileSync(PASTE, 'utf8').split('\n').map((l) => l.trim());
  const tracks = {};
  let current = null;
  const unknownTracks = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Streckenkopf erkennt man daran, dass zwei Zeilen spaeter die Version steht.
    if (/^Track BoP Version:\s*(\d+)/.test(line)) {
      const version = Number(line.match(/(\d+)/)[1]);
      // Zwischen Streckenname und Versionszeile steht beim Kopieren oft eine Leerzeile.
      let j = i - 1;
      while (j >= 0 && !lines[j]) j--;
      const raw = lines[j] ?? '';
      const id = TRACKS[raw.toLowerCase()];
      if (!id) { unknownTracks.add(raw); current = null; continue; }
      const since = isoDate(lines.slice(i + 1, i + 4).find((l) => /Active since/i.test(l)) ?? '');
      current = { version, activeSince: since, cars: {} };
      tracks[id] = current;
      continue;
    }

    const row = line.match(/^GT3\s+(.+?)\s+(\d{4})\s+(\d+)\s+(-?\d+)\s*kg\s+(-?\d+)\s*kg$/);
    if (row && current) {
      const id = CARS[`${row[1].trim().toLowerCase()}|${row[2]}`];
      if (id) current.cars[id] = { ballast: Number(row[4]), restrictor: Number(row[3]) };
    }
  }

  const found = Object.keys(tracks).length;
  if (!found) {
    console.error('Keine Strecken erkannt — Format der eingefuegten Tabelle pruefen.');
    process.exit(1);
  }

  const doc = {
    _comment: ('LFM Custom BoP (Ballast/Restrictor je Auto und Strecke), von lowfuelmotorsport.com/accbop '
      + 'uebernommen. Aendert sich woechentlich — Aktualisieren: LFM-Tabelle kopieren nach '
      + "data/lfm_bop_paste.txt, dann 'node scripts/import_lfm_bop.mjs'."),
    source: 'Low Fuel Motorsport — lowfuelmotorsport.com/accbop',
    importedAt: new Date().toISOString().slice(0, 10),
    tracks,
  };
  fs.writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n');

  const unvollstaendig = Object.entries(tracks).filter(([, t]) => Object.keys(t.cars).length < 3);
  console.log(`${found} Strecken geschrieben nach ${path.relative(process.cwd(), OUT)}`);
  if (unvollstaendig.length) {
    console.log('Unvollstaendig (nicht alle drei Team-Autos gefunden):');
    for (const [id, t] of unvollstaendig) console.log(`  ${id}: ${Object.keys(t.cars).join(', ') || 'keine'}`);
  }
  if (unknownTracks.size) console.log('Unbekannte Streckennamen (ignoriert):', [...unknownTracks].join(', '));
}

main();
