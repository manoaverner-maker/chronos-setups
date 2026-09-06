// Liest die Meisterschaftstabellen der ASPL-Website (Abschnitt "07 — Ergebnisse")
// und schreibt sie nach data/config/standings.json.
//
// Ablauf:
//   node scripts/import_aspl_standings.mjs                 # alle drei Tabellen
//   node scripts/import_aspl_standings.mjs --tables=teams  # nur die Team-Meisterschaft
//   node scripts/import_aspl_standings.mjs --html=seite.html   # aus lokaler Kopie
//   node scripts/import_aspl_standings.mjs --season=3      # in eine andere Saison schreiben
//   git add -A && git commit -m "Tabellen aktualisiert" && git push
//
// Die Seite liefert drei Tabellen: Solo Series (Fahrer), Teams Series (Fahrer)
// und Team-Meisterschaft. Kader, Punktesystem und Teamleitung stehen NICHT auf der
// Seite — die bleiben unangetastet in standings.json stehen.
//
// Wichtig: Die Fahrerwertungen der Liga-Plattform (scripts/import_standings_paste.mjs)
// sind meist aktueller als die Seite. Stehen sie schon in standings.json, hier mit
// --tables=teams nur die Team-Meisterschaft nachziehen.
import fs from 'node:fs';
import path from 'node:path';
import {
  readStandings, pickSeason, writeStandings, heute, alsDatum, markChronos, markChronosTeams,
} from './lib/standingsFile.mjs';

const SOURCE_URL = 'https://asplracing.com/';

// Ueberschrift auf der Seite -> Schluessel in standings.json. 'id' ist der Name
// fuer --tables=…
const TABLES = [
  { id: 'solo', key: 'soloStandings', match: /solo\s*series/i, kind: 'driver', label: 'Solo Series' },
  { id: 'team', key: 'driverStandings', match: /teams?\s*series/i, kind: 'driver', label: 'Team Series' },
  { id: 'teams', key: 'teamStandings', match: /team[-\s]?meisterschaft|team\s*championship/i, kind: 'team', label: 'Team-Meisterschaft' },
];

const args = process.argv.slice(2);
const arg = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const wanted = arg('tables')?.split(',').map((s) => s.trim()).filter(Boolean) ?? TABLES.map((t) => t.id);
for (const id of wanted) {
  if (!TABLES.some((t) => t.id === id)) {
    throw new Error(`Unbekannte Tabelle "${id}" — erlaubt: ${TABLES.map((t) => t.id).join(', ')}`);
  }
}

function decode(s) {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchHtml(arg) {
  if (arg) return fs.readFileSync(path.resolve(arg), 'utf8');
  const res = await fetch(SOURCE_URL, { headers: { 'user-agent': 'aspl-racing-app/standings-import' } });
  if (!res.ok) throw new Error(`${SOURCE_URL} antwortet mit HTTP ${res.status}`);
  return res.text();
}

// Schneidet den Ergebnis-Abschnitt heraus, damit die Regeltabellen weiter unten
// (Strafenkatalog usw.) nicht mitgelesen werden.
function resultsSection(html) {
  const start = html.search(/<section[^>]*id="results"/i);
  if (start < 0) throw new Error('Abschnitt <section id="results"> nicht gefunden — Seitenaufbau geaendert?');
  const end = html.indexOf('</section>', start);
  return html.slice(start, end < 0 ? html.length : end);
}

// Liefert [{ heading, rows: [[zelle, ...], ...] }, ...] in Seitenreihenfolge.
function parseTables(section) {
  const out = [];
  const blocks = section.split(/<h3\b/i).slice(1);
  for (const block of blocks) {
    const heading = decode(block.slice(0, block.indexOf('</h3>')));
    const body = block.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
    if (!body) continue;
    const rows = [...body[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((tr) =>
      [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((td) => decode(td[1])),
    );
    out.push({ heading, rows: rows.filter((r) => r.length >= 3) });
  }
  return out;
}

function toEntries(rows, kind) {
  return rows.map((cells, i) => {
    const [posRaw, name, pointsRaw] = cells;
    const pos = Number.parseInt(posRaw, 10);
    const points = Number.parseInt(pointsRaw.replace(/[^\d-]/g, ''), 10);
    if (!Number.isFinite(pos) || !Number.isFinite(points) || !name) {
      throw new Error(`Zeile ${i + 1} unlesbar: ${JSON.stringify(cells)}`);
    }
    return kind === 'team' ? { pos, team: name, points } : { pos, name, points };
  });
}

const html = await fetchHtml(arg('html'));
const tables = parseTables(resultsSection(html));
const data = {};
const summary = [];

for (const spec of TABLES.filter((t) => wanted.includes(t.id))) {
  const hit = tables.find((t) => spec.match.test(t.heading));
  if (!hit || hit.rows.length === 0) throw new Error(`Tabelle "${spec.label}" nicht gefunden — Seitenaufbau geaendert?`);
  data[spec.key] = toEntries(hit.rows, spec.kind);
}

const file = readStandings();
const season = pickSeason(file, arg('season'));
const today = heute();

for (const spec of TABLES.filter((t) => wanted.includes(t.id))) {
  // Einen eingetragenen Endstand nicht versehentlich mit einem aelteren Seitenstand
  // ueberschreiben — die Seite hinkt der Liga-Plattform regelmaessig hinterher.
  if (season.sources?.[spec.key]?.final && !args.includes('--force')) {
    console.log(`[standings] "${spec.label}" ist als Endstand hinterlegt — uebersprungen (--force ueberschreibt).`);
    continue;
  }
  const entries = data[spec.key];
  if (spec.kind === 'team') markChronosTeams(entries); else markChronos(season, entries);
  season[spec.key] = entries;
  summary.push(`${spec.label}: ${entries.length} Zeilen`);
  season.sources = {
    ...season.sources,
    [spec.key]: {
      name: 'asplracing.com',
      url: `${SOURCE_URL}#results`,
      importedAt: today,
      entries: entries.length,
      final: false,
    },
  };
}
// Bei einer abgeschlossenen Saison bleibt "Endstand" stehen.
if (season.status !== 'final') season.lastUpdated = `Stand ${alsDatum(today)}`;

if (summary.length === 0) {
  console.log('[standings] Nichts geschrieben.');
  process.exit(0);
}
writeStandings(file);
console.log(`[standings] Saison ${season.season} · ${summary.join(' · ')}`);
console.log('[standings] geschrieben nach data/config/standings.json');
