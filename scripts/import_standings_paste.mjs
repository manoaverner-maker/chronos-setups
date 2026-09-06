// Liest kopierte Liga-Tabellen aus data/standings_paste.txt und schreibt sie nach
// data/config/standings.json.
//
// Ablauf:
//   1. Tabelle auf der Liga-Plattform (oder im Discord-Post) markieren und kopieren
//   2. In data/standings_paste.txt einfuegen, darueber eine Abschnittszeile setzen
//   3. node scripts/import_standings_paste.mjs [--season=2]
//   4. git add -A && git commit -m "Tabellen aktualisiert" && git push
//
// Abschnittszeilen (spaetere gewinnen, so ueberschreibt ein Endstand einen Zwischenstand):
//   "Solo Series:"            -> Fahrerwertung Solo Series
//   "Team Series:"            -> Fahrerwertung Team Series
//   "Teamwertung:"            -> Teamwertung
//   … jeweils mit "Endstand" im Titel -> Tabelle gilt als final, der Erste wird Champion
//
// Zwei Zeilenformate werden erkannt:
//
//   a) Plattform-Ansicht mit Rundenspalten (mehrzeilig je Fahrer):
//        3
//        🇩🇪 Kevin Böhm
//        2,409
//         Follow
//        GT3  94 BMW M4 GT3
//        3  —  1  —  5  4  DNS  DNS  65
//      Letzte Zeile = Punkte, davor R1..R8, ganz vorne (nur wenn gesetzt) die PEN-Spalte.
//      Die Rundennummern sind die der Plattform und decken sich NICHT mit seasons.json.
//
//   b) Schlichte Tabelle, eine Zeile je Eintrag:
//        1	E. Sprott	164
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readStandings, pickSeason, writeStandings, heute, alsDatum, markChronos, markChronosTeams,
} from './lib/standingsFile.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PASTE = path.resolve(__dirname, '../data/standings_paste.txt');
const ROUNDS = 8;

const SECTIONS = [
  { key: 'driverStandings', kind: 'driver', match: /^team[s]?\s*series/i, label: 'Team Series' },
  { key: 'soloStandings', kind: 'driver', match: /^solo\s*series/i, label: 'Solo Series' },
  { key: 'teamStandings', kind: 'team', match: /^team(wertung|meisterschaft|-meisterschaft)/i, label: 'Teamwertung' },
];

const args = process.argv.slice(2);
const arg = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

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
  return /^(P|Pos|Platz)\b/i.test(l) && /(standings|name|team|fahrer|punkte|pts)/i.test(l);
}

// Ergebniszeile der Plattform: [PEN] R1..R8 PTS. PEN steht nur da, wenn sie gesetzt ist.
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

// Schlichte Zeile: Platz, Name, Punkte.
function parseSimpleLine(line, kind) {
  const cells = line.split('\t').map((c) => c.trim()).filter((c) => c !== '');
  if (cells.length !== 3) return null;
  const [posRaw, name, ptsRaw] = cells;
  const pos = Number.parseInt(posRaw, 10);
  const points = Number.parseInt(ptsRaw.replace(/[^\d-]/g, ''), 10);
  if (!Number.isFinite(pos) || !Number.isFinite(points) || !name) return null;
  return kind === 'team' ? { pos, team: name, points } : { pos, name, points };
}

function parseSection(lines, kind) {
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

    // Schlichtes Format zuerst — es steht komplett in einer Zeile.
    const simple = !cur && parseSimpleLine(line, kind);
    if (simple) { entries.push(simple); continue; }

    // Eine Zeile, die nur die Position enthaelt, beginnt einen neuen Fahrer.
    if (/^\d{1,3}$/.test(text) && (!cur || cur.done)) { flush(); cur = { pos: Number(text) }; continue; }
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

const paste = fs.readFileSync(PASTE, 'utf8').split('\n');

// Paste in Abschnitte schneiden.
const blocks = [];
for (const line of paste) {
  const titel = line.trim().replace(/:$/, '');
  const spec = titel.length < 40 && SECTIONS.find((s) => s.match.test(titel));
  if (spec) { blocks.push({ spec, titel, final: /endstand|final/i.test(titel), lines: [] }); continue; }
  blocks[blocks.length - 1]?.lines.push(line);
}
if (blocks.length === 0) {
  throw new Error('Keine Abschnittsueberschrift gefunden (z. B. "Solo Series:" oder "Teamwertung Endstand:")');
}

const file = readStandings();
const season = pickSeason(file, arg('season'));
const today = heute();
const summary = [];
const champions = { ...(season.champions ?? {}) };

for (const { spec, titel, final, lines } of blocks) {
  const entries = parseSection(lines, spec.kind);
  if (entries.length === 0) throw new Error(`Abschnitt "${titel}" enthaelt keine Zeilen`);
  if (spec.kind === 'team') markChronosTeams(entries); else markChronos(season, entries);

  season[spec.key] = entries;
  season.sources = {
    ...season.sources,
    [spec.key]: {
      name: 'ASPL Liga-Tabelle',
      via: 'data/standings_paste.txt',
      importedAt: today,
      entries: entries.length,
      final,
      ...(entries[0]?.results ? { rounds: ROUNDS } : {}),
    },
  };

  // Bei einem Endstand steht der Meister fest — der Erste der Tabelle.
  if (final) {
    const erster = entries[0];
    const serie = spec.key === 'soloStandings' ? 'solo' : 'team';
    champions[serie] = {
      kind: spec.kind,
      name: spec.kind === 'team' ? erster.team : erster.name,
      points: erster.points,
      ...(spec.kind === 'driver' && erster.team ? { team: erster.team } : {}),
    };
  }
  summary.push(`${titel}: ${entries.length}${final ? ' (final)' : ''}`);
}

season.champions = Object.keys(champions).length > 0 ? champions : null;
season.lastUpdated = `Stand ${alsDatum(today)}`;
if (season.status === 'final') {
  season.lastUpdated = 'Endstand';
}
writeStandings(file);

console.log(`[standings] Saison ${season.season} · ${summary.join(' · ')}`);
console.log(`[standings] geschrieben nach ${path.relative(process.cwd(), '/home/user/chronos-setups/data/config/standings.json')}`);
