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
  nbr_gp: { bbox: [50.325, 6.925, 50.350, 6.962] }, // weiter gefasst: Teile der GP-Strecke lagen ausserhalb
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

// Aus den OSM-Wegstuecken die Rennstrecke rekonstruieren.
//
// Eine Strecke besteht aus vielen kurzen "ways", die sich an Knoten treffen. An
// Kreuzungen (Boxengassenein-/ausfahrt, Verbindung zur Nordschleife, kuerzere
// Varianten wie Snetterton 200) ist nicht eindeutig, wie es weitergeht. Blindes
// Anhaengen fuehrt dort in Sackgassen — deshalb wird an jedem Knoten der Weg
// gewaehlt, der die Fahrtrichtung am wenigsten aendert (geradeaus weiter), so wie
// ein Auto der Ideallinie folgt. Zusaetzlich entscheidet die bekannte Streckenlaenge,
// welche der gefundenen Runden die richtige ist.
const keyOf = (p) => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;

function laengeKm(punkte) {
  let km = 0;
  for (let i = 1; i < punkte.length; i++) {
    const a = punkte[i - 1], b = punkte[i];
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLon = ((b.lon - a.lon) * Math.PI) / 180;
    const la = (a.lat * Math.PI) / 180, lb = (b.lat * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLon / 2) ** 2;
    km += 6371 * 2 * Math.asin(Math.sqrt(h));
  }
  return km;
}

// Kompassrichtung von a nach b in Grad.
function peilung(a, b) {
  const la = (a.lat * Math.PI) / 180, lb = (b.lat * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lb);
  const x = Math.cos(la) * Math.sin(lb) - Math.sin(la) * Math.cos(lb) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
const winkelDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

// Rundensuche ab einem Startsegment.
//
// An Kreuzungen reicht "moeglichst geradeaus" nicht: Nuerburgring GP und die kuerzere
// Sprintstrecke teilen sich Streckenteile, ebenso Snetterton 300/200/100 und der
// Indianapolis-Roadcourse mit dem Oval. Geradeaus fuehrt dort systematisch auf die
// falsche (kuerzere) Variante. Darum werden an jeder Kreuzung ALLE Fortsetzungen
// verfolgt (Tiefensuche) und am Ende die geschlossene Runde genommen, deren Laenge
// am besten zur bekannten Streckenlaenge passt. Begrenzungen verhindern, dass die
// Suche im Streckennetz (z. B. Nordschleife) ausufert.
function sucheRunden(segmente, knoten, startIdx, rueckwaerts, sollKm) {
  const maxKm = sollKm ? sollKm * 1.35 : Infinity;
  const treffer = [];
  let schritte = 0;
  const MAX_SCHRITTE = 40000;

  const start = rueckwaerts ? segmente[startIdx].slice().reverse() : segmente[startIdx].slice();
  const startKnoten = keyOf(start[0]);

  (function weiter(punkte, benutzt, km) {
    if (schritte++ > MAX_SCHRITTE || treffer.length > 40) return;
    const ende = punkte[punkte.length - 1];
    const hier = keyOf(ende);

    if (punkte.length > 1 && hier === startKnoten) {
      treffer.push({ punkte: punkte.slice(), geschlossen: true, km });
      return;
    }
    if (km > maxKm) return;

    const vorher = punkte[punkte.length - 2] ?? punkte[0];
    const einfahrt = peilung(vorher, ende);

    // Fortsetzungen nach Kurvigkeit sortieren: geradeaus zuerst, aber alle probieren.
    const optionen = (knoten.get(hier) ?? [])
      .filter((k) => !benutzt.has(k.idx))
      .map((k) => {
        const seg = segmente[k.idx];
        const gedreht = k.amEnde ? seg.slice().reverse() : seg.slice();
        return { idx: k.idx, punkte: gedreht, abw: winkelDiff(einfahrt, peilung(gedreht[0], gedreht[1])) };
      })
      .filter((o) => o.abw <= 120) // ueber 120 Grad waere eine Kehrtwende
      .sort((a, b) => a.abw - b.abw);

    for (const o of optionen) {
      benutzt.add(o.idx);
      weiter(punkte.concat(o.punkte.slice(1)), benutzt, km + laengeKm(o.punkte));
      benutzt.delete(o.idx);
    }
  })(start, new Set([startIdx]), laengeKm(start));

  return treffer;
}

function chain(ways, sollKm) {
  const segmente = ways.map((w) => w.geometry).filter((g) => g && g.length > 1);
  if (!segmente.length) return [];

  const knoten = new Map();
  segmente.forEach((seg, idx) => {
    for (const [punkt, amEnde] of [[seg[0], false], [seg[seg.length - 1], true]]) {
      const k = keyOf(punkt);
      if (!knoten.has(k)) knoten.set(k, []);
      knoten.get(k).push({ idx, amEnde });
    }
  });

  const alle = [];
  for (let i = 0; i < segmente.length; i++) {
    for (const rueckwaerts of [false, true]) {
      alle.push(...sucheRunden(segmente, knoten, i, rueckwaerts, sollKm));
      // Sobald eine Runde sehr genau passt, ist die Suche fertig.
      if (sollKm && alle.some((k) => Math.abs(k.km - sollKm) < sollKm * 0.03)) break;
    }
    if (sollKm && alle.some((k) => Math.abs(k.km - sollKm) < sollKm * 0.03)) break;
  }

  if (!alle.length) return [];
  const abweichung = (k) => (sollKm ? Math.abs(k.km - sollKm) : -k.punkte.length);
  alle.sort((a, b) => abweichung(a) - abweichung(b));
  const beste = alle[0];
  beste.punkte._km = beste.km;
  return beste.punkte;
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
      const points = chain(ways, t.lengthKm);
      if (points.length < 20) throw new Error(`Kette zu kurz (${points.length} Punkte)`);
      const { path: svg, points: n, closed } = toSvgPath(points);
      const istKm = points._km ?? 0;
      const passt = t.lengthKm ? Math.abs(istKm - t.lengthKm) <= 0.35 : true;
      console.log(`${t.id.padEnd(16)} ${String(n).padStart(4)} Punkte  ${istKm.toFixed(2)}/${t.lengthKm ?? '?'} km  `
        + `${closed ? 'geschlossen' : 'OFFEN'}  ${passt ? 'Laenge passt' : 'LAENGE WEICHT AB'}`);
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
