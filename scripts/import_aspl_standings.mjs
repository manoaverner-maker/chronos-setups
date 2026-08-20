// Liest die Meisterschaftstabellen der ASPL-Website (Abschnitt "07 — Ergebnisse")
// und schreibt sie nach data/config/standings.json.
//
// Ablauf:
//   node scripts/import_aspl_standings.mjs                 # alle drei Tabellen
//   node scripts/import_aspl_standings.mjs --tables=teams  # nur die Team-Meisterschaft
//   node scripts/import_aspl_standings.mjs --html=seite.html   # aus lokaler Kopie
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
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../data/config/standings.json');
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

// Chronos-Zeilen markieren, damit die App die eigenen Leute hervorheben kann.
// Nur exakte Treffer aus dem Kader — geraten wird nicht (auf der Seite stehen
// z. B. "Er. Schneider" und "El. Schneider", die sich nicht sicher zuordnen lassen).
function markChronos(previous, data) {
  const roster = new Map();
  for (const team of previous.teams ?? []) {
    for (const d of team.drivers ?? []) if (d.name) roster.set(d.name, team.name);
  }
  for (const key of ['soloStandings', 'driverStandings']) {
    for (const row of data[key] ?? []) {
      const team = roster.get(row.name);
      if (team) { row.team = team; row.chronos = true; }
    }
  }
  for (const row of data.teamStandings ?? []) {
    if (/^chronos/i.test(row.team)) row.chronos = true;
  }
}

const html = await fetchHtml(arg('html'));
const tables = parseTables(resultsSection(html));
const data = {};
const summary = [];

for (const spec of TABLES.filter((t) => wanted.includes(t.id))) {
  const hit = tables.find((t) => spec.match.test(t.heading));
  if (!hit || hit.rows.length === 0) throw new Error(`Tabelle "${spec.label}" nicht gefunden — Seitenaufbau geaendert?`);
  data[spec.key] = toEntries(hit.rows, spec.kind);
  summary.push(`${spec.label}: ${data[spec.key].length} Zeilen`);
}

const previous = JSON.parse(fs.readFileSync(OUT, 'utf8'));
markChronos(previous, data);

const today = new Date().toISOString().slice(0, 10);
const next = { ...previous, ...data };
delete next.drivers;
delete next.source;
for (const spec of TABLES.filter((t) => wanted.includes(t.id))) {
  next.sources = {
    ...next.sources,
    [spec.key]: {
      name: 'asplracing.com',
      url: `${SOURCE_URL}#results`,
      importedAt: today,
      entries: data[spec.key].length,
    },
  };
}
next.lastUpdated = `Stand ${today.split('-').reverse().join('.')}`;

fs.writeFileSync(OUT, `${JSON.stringify(next, null, 2)}\n`);
console.log(`[standings] ${summary.join(' · ')}`);
console.log(`[standings] geschrieben nach ${path.relative(process.cwd(), OUT)}`);
