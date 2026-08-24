// Gemeinsamer Zugriff auf data/config/standings.json fuer beide Importer.
// Die Datei haelt mehrere Saisons; geschrieben wird immer genau eine davon.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const STANDINGS = path.resolve(__dirname, '../../data/config/standings.json');

export function readStandings() {
  return JSON.parse(fs.readFileSync(STANDINGS, 'utf8'));
}

// Die Saison holen, in die geschrieben wird: --season=… , sonst currentSeason.
export function pickSeason(file, wanted) {
  const id = Number(wanted ?? file.currentSeason);
  const season = (file.seasons ?? []).find((s) => s.season === id);
  if (!season) {
    const da = (file.seasons ?? []).map((s) => s.season).join(', ');
    throw new Error(`Saison ${id} steht nicht in standings.json (vorhanden: ${da || 'keine'})`);
  }
  return season;
}

export function writeStandings(file) {
  fs.writeFileSync(STANDINGS, `${JSON.stringify(file, null, 2)}\n`);
}

export const heute = () => new Date().toISOString().slice(0, 10);
export const alsDatum = (iso) => iso.split('-').reverse().join('.');

// Chronos-Zeilen markieren. Zugeordnet wird ueber die Startnummer, den vollen Namen
// oder eine Abkuerzung wie "M. Verner" — aber nur, wenn sie im Kader eindeutig ist.
// Geraten wird nicht: "El. Schneider" bleibt ohne Team, weil im Kader Erik steht.
export function markChronos(season, entries) {
  const byNumber = new Map();
  const byName = new Map();
  for (const team of season.teams ?? []) {
    for (const d of team.drivers ?? []) {
      if (d.number != null) byNumber.set(d.number, team.name);
      if (d.name) byName.set(d.name.toLowerCase(), team.name);
    }
  }

  const kurz = (name) => {
    const m = name.match(/^([A-Za-zÄÖÜäöü]+)\.\s+(.+)$/);
    if (!m) return null;
    const [, initialen, nachname] = m;
    const treffer = [...byName.keys()].filter((full) => {
      const teile = full.split(' ');
      const nach = teile.slice(1).join(' ');
      return nach === nachname.toLowerCase() && teile[0].startsWith(initialen.toLowerCase());
    });
    return treffer.length === 1 ? byName.get(treffer[0]) : null;
  };

  for (const e of entries) {
    if (e.team && e.chronos) continue;
    const team = (e.number != null ? byNumber.get(e.number) : null)
      ?? byName.get(e.name.toLowerCase())
      ?? kurz(e.name);
    if (team) { e.team = team; e.chronos = true; }
  }
}

export function markChronosTeams(entries) {
  for (const e of entries) if (/^chronos\b/i.test(e.team)) e.chronos = true;
}
