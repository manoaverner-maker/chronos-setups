// Liest die Fahrerwertungen aus einer kopierten Liga-Tabelle (Plattform-Ansicht mit
// PEN- und Rundenspalten) und schreibt sie nach data/config/standings.json.
//
// Ablauf:
//   1. Auf der Liga-Plattform die Tabelle "Team Series" markieren und kopieren
//   2. In data/standings_paste.txt einfuegen, darueber eine Zeile "Team Series:"
//      (bzw. "Solo Series:") als Trenner setzen — beide Serien passen in eine Datei
//   3. node scripts/import_standings_paste.mjs
//   4. git add -A && git commit -m "Tabellen aktualisiert" && git push
//
// Erwartetes Format je Fahrer (so, wie die Plattform es beim Kopieren ausgibt):
//   3
//   🇩🇪 Kevin Böhm
//   2,409
//    Follow
//   GT3  94 BMW M4 GT3
//   3  —  1  —  5  4  DNS  DNS  65
//
// Die letzte Zeile sind die Punkte, davor die acht Rundenspalten R1..R8, ganz vorne
// (nur wenn gesetzt) die PEN-Spalte. Die Rundennummern sind die der Plattform und
// decken sich NICHT mit den Runden in data/config/seasons.json — die Team-Series
// faehrt nicht jede Runde mit.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PASTE = path.resolve(__dirname, '../data/standings_paste.txt');
const OUT = path.resolve(__dirname, '../data/config/standings.json');
const ROUNDS = 8;

// Ueberschrift im Paste -> Schluessel in standings.json.
const SECTIONS = [
  { key: 'driverStandings', match: /^team[s]?\s*series/i, label: 'Team Series' },
  { key: 'soloStandings', match: /^solo\s*series/i, label: 'Solo Series' },
];

// Flaggen-Emoji (zwei Regional Indicator Symbols) -> Laendercode.
function countryFromFlag(s) {
  const cps = [...s].map((c) => c.codePointAt(0));
  if (cps.length !== 2 || cps.some((c) => c < 0x1f1e6 || c > 0x1f1ff)) return null;
  return cps.map((c) => String.fromCharCode(c - 0x1f1e6 + 65)).join('');
}

// "3" -> 3 · "DNS"/"DNF"/"DSQ" bleiben stehen · "—" wird zu null.
function cell(raw) {
  const v = raw.trim();
  if (!v || v === '—' || v === '-') return null;
  return /^\d+$/.test(v) ? Number(v) : v;
}

function isHeaderLine(l) {
  return /^P\s*\t?\s*STANDINGS/i.test(l) || /^Pos\b/i.test(l);
}

// Ergebniszeile: [PEN] R1..R8 PTS. Die PEN-Spalte steht nur da, wenn sie gesetzt ist.
function parseResultLine(line) {
  const cells = line.split('\t').map((c) => c.trim()).filter((c) => c !== '');
  if (cells.length < ROUNDS + 1) return null;
  const ptsRaw = cells[cells.length - 1];
  const points = Number.parseInt(ptsRaw.replace(/[^\d-]/g, ''), 10);
  if (!Number.isFinite(points)) return null;
  const mark = ptsRaw.replace(/[\d\s-]/g, '') || null; // z. B. das "†" der Plattform
  const results = cells.slice(cells.length - 1 - ROUNDS, cells.length - 1).map(cell);
  const pen = cells.slice(0, cells.length - 1 - ROUNDS).join(' ').trim() || null;
  return { pen, results, points, mark };
}

function parseSection(lines) {
  const entries = [];
  let cur = null;
  const flush = () => {
    if (!cur) return;
    if (!cur.done) throw new Error(`Ergebniszeile fehlt bei "${cur.name ?? `P${cur.pos}`}"`);
    delete cur.done;
    entries.push(cur);
    cur = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const text = line.trim();
    if (!text || isHeaderLine(text) || /^Follow(ing)?$/i.test(text)) continue;

    // Eine Zeile, die nur die Position enthaelt, beginnt einen neuen Fahrer.
    if (/^\d{1,3}$/.test(text) && !cur) { cur = { pos: Number(text) }; continue; }
    if (/^\d{1,3}$/.test(text) && cur?.done) { flush(); cur = { pos: Number(text) }; continue; }
    if (!cur) continue;

    if (cur.name === undefined) {
      const parts = text.split(' ');
      const country = countryFromFlag(parts[0]);
      cur.country = country;
      cur.name = (country ? parts.slice(1).join(' ') : text).trim();
      continue;
    }
    if (cur.rating === undefined && /^[\d,.]+$/.test(text)) {
      cur.rating = Number(text.replace(/[.,]/g, ''));
      continue;
    }
    const car = text.match(/^(GT\d|GTC|TCX)\s+(\d+)\s+(.*)$/);
    if (car && cur.car === undefined) {
      cur.class = car[1];
      cur.number = Number(car[2]);
      cur.car = car[3].trim();
      continue;
    }
    const res = parseResultLine(line);
    if (res) { Object.assign(cur, res, { done: true }); continue; }
  }
  flush();
  return entries;
}

// Chronos-Zeilen markieren: erst ueber die Startnummer aus dem Kader, sonst ueber den
// Namen. Geraten wird nicht — wer nicht sicher zuzuordnen ist, bleibt ohne Team.
function markChronos(previous, entries) {
  const byNumber = new Map();
  const byName = new Map();
  for (const team of previous.teams ?? []) {
    for (const d of team.drivers ?? []) {
      if (d.number != null) byNumber.set(d.number, team.name);
      if (d.name) byName.set(d.name.toLowerCase(), team.name);
    }
  }
  for (const e of entries) {
    const team = byNumber.get(e.number) ?? byName.get(e.name.toLowerCase());
    if (team) { e.team = team; e.chronos = true; }
  }
}

const paste = fs.readFileSync(PASTE, 'utf8').split('\n');

// Paste in Abschnitte schneiden (Zeile "Team Series:" / "Solo Series:").
const blocks = [];
for (const line of paste) {
  const head = SECTIONS.find((s) => s.match.test(line.trim().replace(/:$/, '')) && line.trim().length < 40);
  if (head) { blocks.push({ spec: head, lines: [] }); continue; }
  blocks[blocks.length - 1]?.lines.push(line);
}
if (blocks.length === 0) throw new Error('Keine Abschnittsueberschrift ("Team Series:" / "Solo Series:") gefunden');

const previous = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const next = { ...previous };
const summary = [];

for (const { spec, lines } of blocks) {
  const entries = parseSection(lines);
  if (entries.length === 0) throw new Error(`Abschnitt "${spec.label}" enthaelt keine Fahrer`);
  markChronos(previous, entries);
  next[spec.key] = entries;
  next.sources = {
    ...next.sources,
    [spec.key]: {
      name: 'ASPL Liga-Tabelle',
      via: 'data/standings_paste.txt',
      importedAt: today,
      rounds: ROUNDS,
      entries: entries.length,
    },
  };
  summary.push(`${spec.label}: ${entries.length} Fahrer`);
}

next._comment =
  'Meisterschaftstabellen ASPL Season 2. Fahrerwertungen (driverStandings = Team Series, soloStandings = Solo Series) '
  + 'kommen ueber scripts/import_standings_paste.mjs aus data/standings_paste.txt, die Team-Meisterschaft ueber '
  + 'scripts/import_aspl_standings.mjs von asplracing.com — siehe "sources", die Staende koennen sich unterscheiden. '
  + 'results = Rundenspalten R1..R8 der Liga-Plattform (null = kein Ergebnis); diese Nummerierung deckt sich NICHT mit '
  + 'den Runden in seasons.json. mark = Markierung der Plattform (z. B. "†"), unveraendert uebernommen. '
  + 'teams/reservePool/pointsSystem/principals werden hier von Hand gepflegt.';
next.lastUpdated = `Stand ${today.split('-').reverse().join('.')}`;
next.note = 'Fahrerwertungen aus der Liga-Tabelle übernommen (inkl. R8). Die Team-Meisterschaft stammt weiterhin von asplracing.com und ist dort noch ohne R8.';
delete next.source;

fs.writeFileSync(OUT, `${JSON.stringify(next, null, 2)}\n`);
console.log(`[standings] ${summary.join(' · ')}`);
console.log(`[standings] geschrieben nach ${path.relative(process.cwd(), OUT)}`);
