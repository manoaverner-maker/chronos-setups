// Holt echte Streckenverläufe aus OpenStreetMap (Overpass-API) und schreibt sie als
// normierte SVG-Pfade in data/config/tracks.json.
//
// OSM liefert eine Strecke als viele kurze Wege (je Kurve/Abschnitt ein "way").
// Das Skript verkettet sie an gemeinsamen Endpunkten zu einem Rundkurs, projiziert
// die Koordinaten (Mercator, breitengrad-korrigiert) und normiert auf 0..100.
//
// Lizenz: Kartendaten © OpenStreetMap-Mitwirkende, ODbL — im Footer der App genannt.
//
// Aufruf:  node scripts/import_track_layouts.mjs            (nur fehlende/stilisierte)
//          node scripts/import_track_layouts.mjs --all       (auch vorhandene neu holen)
//          node scripts/import_track_layouts.mjs --dry       (nichts schreiben)
//          node scripts/import_track_layouts.mjs zolder cota (nur diese Strecken)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRACKS_JSON = path.resolve(__dirname, '../data/config/tracks.json');
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const ALL = args.includes('--all');
const ONLY = args.filter((a) => !a.startsWith('--'));

const SERVERS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.osm.jp/api/interpreter',
];

// Suchbereiche je Strecke (Süd,West,Nord,Ost) + optionaler Namensfilter, wo mehrere
// Kurse dicht beieinander liegen (z. B. Nordschleife vs. GP-Strecke).
const AREAS = {
  imola: { bbox: [44.335, 11.706, 44.352, 11.732] },
  kyalami: { bbox: [-26.005, 28.060, -25.985, 28.080] },
  spa: { bbox: [50.421, 5.955, 50.450, 5.985] },
  valencia: { bbox: [39.450, -0.640, 39.475, -0.610] },
  barcelona: { bbox: [41.560, 2.250, 41.578, 2.268] },
  red_bull_ring: { bbox: [47.212, 14.756, 47.228, 14.775] },
  laguna_seca: { bbox: [36.578, -121.762, 36.598, -121.744] },
  donington: { bbox: [52.822, -1.386, 52.836, -1.366] },
  mount_panorama: { bbox: [-33.460, 149.545, -33.435, 149.575] },
  monza: { bbox: [45.607, 9.275, 45.632, 9.298] },
  zolder: { bbox: [50.985, 5.246, 51.000, 5.272] },
  brands_hatch: { bbox: [51.352, 0.255, 51.367, 0.272] },
  silverstone: { bbox: [52.062, -1.032, 52.083, -1.006] },
  paul_ricard: { bbox: [43.245, 5.780, 43.259, 5.805] },
  misano: { bbox: [43.955, 12.680, 43.968, 12.700] },
  hungaroring: { bbox: [47.575, 19.240, 47.588, 19.260] },
  zandvoort: { bbox: [52.383, 4.535, 52.396, 4.552] },
  suzuka: { bbox: [34.836, 136.523, 34.855, 136.549] },
  snetterton: { bbox: [52.455, 0.940, 52.472, 0.965] },
  oulton_park: { bbox: [53.174, -2.622, 53.190, -2.600] },
  watkins_glen: { bbox: [42.330, -76.935, 42.348, -76.912] },
  cota: { bbox: [30.126, -97.646, 30.145, -97.625] },
  indianapolis: { bbox: [39.784, -86.245, 39.801, -86.226] },
  nbr_gp: { bbox: [50.330, 6.930, 50.345, 6.952] },
  nbr_24h: { bbox: [50.325, 6.925, 50.390, 7.010] },
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function overpass(query) {
  let lastErr;
  for (const server of SERVERS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(server, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'chronos-setups/1.0' },
          body: new URLSearchParams({ data: query }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        lastErr = `${server}: ${e.message}`;
        await wait(2000 * (attempt + 1));
      }
    }
  }
  throw new Error(lastErr);
}

// Wege an gemeinsamen Endpunkten zu moeglichst langen Ketten verbinden.
// OSM-Segmente stossen exakt aneinander, darum genuegt ein Schluessel aus den Koordinaten.
//
// An Abzweigungen (Boxengasse, kuerzere Streckenvarianten wie Brands Hatch Indy oder
// Snetterton 200) ist die Verkettung mehrdeutig: greedy erwischt man leicht den Stichweg
// und der Rundkurs bleibt offen. Darum mehrere Startreihenfolgen durchprobieren und die
// beste Kette nehmen — geschlossene Runden schlagen offene, danach zaehlt die Laenge.
const keyOf = (p) => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;

function buildChains(segmente) {
  const rest = segmente.map((s) => s.slice());
  const chains = [];
  while (rest.length) {
    let current = rest.pop();
    let merged = true;
    while (merged) {
      merged = false;
      for (let i = 0; i < rest.length; i++) {
        const s = rest[i];
        const head = keyOf(current[0]);
        const tail = keyOf(current[current.length - 1]);
        const sHead = keyOf(s[0]);
        const sTail = keyOf(s[s.length - 1]);
        if (tail === sHead) current = current.concat(s.slice(1));
        else if (tail === sTail) current = current.concat(s.slice().reverse().slice(1));
        else if (head === sTail) current = s.slice(0, -1).concat(current);
        else if (head === sHead) current = s.slice().reverse().slice(0, -1).concat(current);
        else continue;
        rest.splice(i, 1);
        merged = true;
        break;
      }
    }
    chains.push(current);
  }
  return chains;
}

function chain(ways) {
  const segmente = ways.map((w) => w.geometry).filter((g) => g && g.length > 1);
  if (!segmente.length) return [];

  const bewerten = (c) => [keyOf(c[0]) === keyOf(c[c.length - 1]) ? 1 : 0, c.length];
  let best = [];
  let bestScore = [-1, -1];

  // Deterministisch verschiedene Startreihenfolgen: jeweils um eine Position rotiert.
  const versuche = Math.min(12, segmente.length);
  for (let v = 0; v < versuche; v++) {
    const rotiert = segmente.slice(v).concat(segmente.slice(0, v));
    for (const c of buildChains(rotiert)) {
      const s = bewerten(c);
      if (s[0] > bestScore[0] || (s[0] === bestScore[0] && s[1] > bestScore[1])) {
        best = c;
        bestScore = s;
      }
    }
  }
  return best;
}

// Geographische Laenge/Breite -> normierte SVG-Koordinaten (0..100, Seitenverhaeltnis erhalten).
function toSvgPath(points) {
  const latMid = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const kx = Math.cos((latMid * Math.PI) / 180); // Laengengrade schrumpfen polwaerts
  const xs = points.map((p) => p.lon * kx);
  const ys = points.map((p) => -p.lat); // SVG-Y zeigt nach unten
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  // Zentriert, damit schmale Strecken nicht an einer Kante kleben.
  const offX = (span - (maxX - minX)) / 2;
  const offY = (span - (maxY - minY)) / 2;
  const round = (v) => Math.round(v * 10) / 10;

  const coords = xs.map((x, i) => [
    round(((x - minX + offX) / span) * 100),
    round(((ys[i] - minY + offY) / span) * 100),
  ]);
  // Aufeinanderfolgende identische Punkte (nach Rundung) entfernen.
  const dedup = coords.filter(([x, y], i) => i === 0 || x !== coords[i - 1][0] || y !== coords[i - 1][1]);
  const [sx, sy] = dedup[0];
  const rest = dedup.slice(1).map(([x, y]) => `L${x} ${y}`).join('');
  const closed = dedup.length > 2 && Math.hypot(dedup[0][0] - dedup.at(-1)[0], dedup[0][1] - dedup.at(-1)[1]) < 6;
  return { path: `M${sx} ${sy}${rest}${closed ? 'Z' : ''}`, points: dedup.length, closed };
}

async function main() {
  const doc = JSON.parse(fs.readFileSync(TRACKS_JSON, 'utf8'));
  const targets = doc.tracks.filter((t) => {
    if (ONLY.length) return ONLY.includes(t.id);
    if (ALL) return !!AREAS[t.id];
    const l = t.layout ?? {};
    return AREAS[t.id] && (!l.svg || l.status === 'placeholder');
  });

  console.log(`${targets.length} Strecken zu holen${DRY ? ' (Testlauf)' : ''}\n`);
  const failed = [];

  for (const t of targets) {
    const { bbox } = AREAS[t.id];
    const q = `[out:json][timeout:90];way["highway"="raceway"](${bbox.join(',')});out geom;`;
    try {
      const data = await overpass(q);
      const ways = (data.elements ?? []).filter((e) => e.type === 'way' && e.geometry?.length > 1
        && e.tags?.area !== 'yes' && !/pit|paddock|karting/i.test(e.tags?.name ?? ''));
      if (!ways.length) throw new Error('keine raceway-Wege gefunden');
      const points = chain(ways);
      if (points.length < 20) throw new Error(`Kette zu kurz (${points.length} Punkte)`);
      const { path: svg, points: n, closed } = toSvgPath(points);
      console.log(`${t.id.padEnd(16)} ${String(n).padStart(4)} Punkte  ${closed ? 'geschlossen' : 'OFFEN (Kontrolle noetig)'}`);
      if (!DRY) {
        t.layout = { svg, viewBox: '0 0 100 100', status: 'osm', source: 'OpenStreetMap (ODbL)' };
      }
    } catch (e) {
      console.log(`${t.id.padEnd(16)} FEHLER: ${e.message}`);
      failed.push(t.id);
    }
    await wait(1200); // hoeflich zum kostenlosen Overpass-Dienst
  }

  if (!DRY) {
    fs.writeFileSync(TRACKS_JSON, JSON.stringify(doc, null, 2) + '\n');
    console.log(`\ntracks.json aktualisiert.`);
  }
  if (failed.length) console.log(`Nicht geholt: ${failed.join(', ')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
