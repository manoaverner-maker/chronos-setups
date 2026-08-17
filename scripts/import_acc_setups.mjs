// Importiert Community-Setups aus github.com/Lon3035/ACC_Setups in das App-Format.
//
// ACC speichert Setups "klick-codiert" (z. B. Reifendruck als Klick 56 statt 25.9 psi).
// Die Umrechnungstabellen pro Auto sind aus dem Open-Source-Projekt Race Element
// portiert (github.com/RiddleTime/Race-Element, Race_Element.Data.ACC/SetupParser) —
// verifiziert gegen die vom Team transkribierten In-Game-Screenshots (Caster 13.8,
// Radraten 163769/122091, Bumpstop 300/400 beim Ferrari 296 stimmen exakt überein).
//
// Aufruf:  node scripts/import_acc_setups.mjs          (lädt + schreibt data/setups/…)
//          node scripts/import_acc_setups.mjs --dry    (nur anzeigen, nichts schreiben)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = path.resolve(__dirname, '../data/setups');
const REPO = 'Lon3035/ACC_Setups';
const RAW = `https://raw.githubusercontent.com/${REPO}/master/`;
const DRY_RUN = process.argv.includes('--dry');

// ---------------------------------------------------------------------------
// Umrechnungstabellen (Quelle: Race Element, s. o.)
// ---------------------------------------------------------------------------
// Druck-Decode: Basis + 0.1 psi pro Klick. Dry-Basis 20.3 (Race Element, gegen
// Team-Screenshots verifiziert). Wet-Basis 24.0 — Race Element unterscheidet nicht,
// aber empirisch eindeutig: Wet-Setups mehrerer Ersteller (Jardier 296, BMW M4,
// Huracan Evo2) landen nur mit 24.0 im bekannten Wet-Fenster (~29.5-31 psi);
// mit 20.3 laegen alle unplausibel bei ~25-27.
const GT3_PRESSURE = (click, compound) => round((compound === 'wet' ? 24.0 : 20.3) + 0.1 * click, 1);

const CARS = {
  ferrari_296_gt3: {
    camberFront: (c) => round(-4 + 0.1 * c, 1),
    camberRear: (c) => round(-3.5 + 0.1 * c, 1),
    toe: (c) => round(-0.4 + 0.01 * c, 2),
    casters: [8.5, 8.7, 8.9, 9.1, 9.2, 9.4, 9.6, 9.8, 9.9, 10.1, 10.3, 10.5, 10.6, 10.8, 11.0, 11.2, 11.3, 11.5, 11.7, 11.9, 12.0, 12.2, 12.4, 12.6, 12.7, 12.9, 13.1, 13.3, 13.4, 13.6, 13.8],
    brakeBias: (c) => round(50 + 0.2 * c, 1),
    steeringRatio: (c) => 13 + c,
    wheelRateF: [163769, 170068, 176367, 182666, 188964, 195263, 201562, 207861, 214160],
    wheelRateR: [122091, 129273, 136455, 143637, 150818, 158000, 165182, 172364, 179546],
    bumpstopRateF: (c) => 300 + 100 * c,
    bumpstopRateR: (c) => 400 + 200 * c,
    rideHeightF: (c) => 50 + c,
    rideHeightR: (c) => 50 + c,
    rearWing: (c) => c,
    splitter: (c) => c,
  },
  mercedes_amg_gt3_evo: {
    camberFront: (c) => round(-4 + 0.1 * c, 1),
    camberRear: (c) => round(-3.5 + 0.1 * c, 1),
    toe: (c) => round(-0.4 + 0.01 * c, 2),
    casters: [6.0, 6.2, 6.4, 6.6, 6.7, 6.9, 7.1, 7.3, 7.5, 7.7, 7.9, 8.1, 8.2, 8.4, 8.6, 8.8, 9.0, 9.2, 9.4, 9.5, 9.7, 9.9, 10.1, 10.3, 10.5, 10.7, 10.8, 11.0, 11.2, 11.4, 11.6, 11.8, 11.9, 12.1, 12.3, 12.5, 12.7, 12.8, 13.0, 13.2, 13.4, 13.6, 13.7, 13.9, 14.1],
    brakeBias: (c) => round(50 + 0.2 * c, 1),
    steeringRatio: (c) => 11 + c,
    wheelRateF: [130000, 143000, 155000, 171000, 187000, 202000],
    wheelRateR: [71000, 83000, 95000, 107000, 119000, 131000],
    bumpstopRateF: (c) => 300 + 100 * c,
    bumpstopRateR: (c) => 300 + 100 * c,
    rideHeightF: (c) => 42 + c,
    rideHeightR: (c) => 67 + c,
    rearWing: (c) => c + 1,
    splitter: (c) => c + 1,
  },
  amr_v8_vantage_gt3: {
    camberFront: (c) => round(-4 + 0.1 * c, 1),
    camberRear: (c) => round(-3.5 + 0.1 * c, 1),
    toe: (c) => round(-0.4 + 0.01 * c, 2),
    casters: [10.7, 10.9, 11.1, 11.3, 11.5, 11.6, 11.8, 12.0, 12.2, 12.4, 12.5, 12.7, 12.9, 13.1, 13.3, 13.4, 13.6, 13.8, 14.0, 14.2, 14.3, 14.5, 14.7, 14.9, 15.0, 15.2, 15.4, 15.6, 15.7, 15.9, 16.1],
    brakeBias: (c) => round(57 + 0.2 * c, 1),
    steeringRatio: (c) => 14 + c,
    wheelRateF: [115000, 125000, 135000, 145000, 155000, 165000, 175000, 185000],
    wheelRateR: [105000, 115000, 125000, 135000, 145000, 155000, 165000, 175000, 185000, 195000],
    bumpstopRateF: (c) => 300 + 100 * c,
    bumpstopRateR: (c) => 300 + 100 * c,
    rideHeightF: (c) => 55 + c,
    rideHeightR: (c) => 55 + c,
    rearWing: (c) => c,
    splitter: (c) => c,
  },
};

// Repo-Ordner -> Strecken-ID der App (Ordner gibt es teils gross- und kleingeschrieben).
const TRACK_MAP = { nurburgring: 'nbr_gp', nurburgring_24h: 'nbr_24h' };
const APP_TRACKS = ['imola', 'kyalami', 'nbr_24h', 'nbr_gp', 'spa', 'valencia', 'barcelona', 'red_bull_ring', 'laguna_seca', 'donington', 'mount_panorama', 'monza', 'zolder', 'brands_hatch', 'silverstone', 'paul_ricard', 'misano', 'hungaroring', 'zandvoort', 'suzuka', 'snetterton', 'oulton_park', 'watkins_glen', 'cota', 'indianapolis'];
function trackId(folder) {
  const k = folder.toLowerCase();
  const id = TRACK_MAP[k] ?? k;
  return APP_TRACKS.includes(id) ? id : null;
}

const round = (v, d = 0) => Math.round(v * 10 ** d) / 10 ** d;
const W = ['fl', 'fr', 'rl', 'rr'];
const perWheel = (arr, fn) => Object.fromEntries(W.map((w, i) => [w, fn(arr[i], i)]));

// ---------------------------------------------------------------------------
// Metadaten aus dem Dateinamen: Autor, Session-Label, Referenztemperaturen.
// ---------------------------------------------------------------------------
function parseMeta(file) {
  const name = path.basename(file, '.json');
  let m;
  if ((m = name.match(/^FRI3_.*?_(Q2|Q|RS|R|BASE|LFMLICENSE)(?:_(\d{2})_(\d{2}))?_v([\d.]+)$/i))) {
    const label = { Q: 'Quali', Q2: 'Quali 2', RS: 'Rennen (stabil)', R: 'Rennen', BASE: 'Basis', LFMLICENSE: 'LFM-Lizenz' }[m[1].toUpperCase()];
    const air = m[2] ? +m[2] : 20;
    const trk = m[3] ? +m[3] : 25;
    return { author: 'Fri3d0lf', label, air, track: trk, estimated: !m[2], version: m[4], groupKey: name.replace(/_v[\d.]+$/, '') };
  }
  if ((m = name.match(/^OhneSpeed_(\d{2})c(\d{2})c_(DRY|WET)_(Q|R)_evo(\d+)$/i))) {
    return { author: 'OhneSpeed', label: (m[4].toUpperCase() === 'Q' ? 'Quali' : 'Rennen') + ` ${+m[1]}°/${+m[2]}°`, air: +m[1], track: +m[2], estimated: false, version: m[5], groupKey: name.replace(/_evo\d+$/, '') };
  }
  if ((m = name.match(/^\((Jardier|Flickerdox[^)]*)\)\((\d+)-(\d{4})\)\s+(DRY|WET)\s+(\d+)C(?:\s+(Q|R))?$/i))) {
    const wet = m[4].toUpperCase() === 'WET';
    const air = +m[5];
    return {
      author: m[1].split('-')[0], label: m[6] ? (m[6].toUpperCase() === 'Q' ? 'Quali' : 'Rennen') : 'Allround',
      air, track: wet ? air + 2 : air + 9, estimated: true, wetName: wet,
      version: `${m[3]}.${String(m[2]).padStart(2, '0')}`, groupKey: name.replace(/\(\d+-\d{4}\)\s*/, ''),
    };
  }
  return null; // unbekanntes Namensschema (z. B. basic.json) -> ueberspringen
}

// ---------------------------------------------------------------------------
// Klick-Decode: rohes ACC-JSON -> App-Anzeigewerte
// ---------------------------------------------------------------------------
function decode(carId, raw, meta, srcPath, warnings) {
  const T = CARS[carId];
  const bs = raw.basicSetup, adv = raw.advancedSetup;
  const compound = bs.tyres.tyreCompound === 1 ? 'wet' : 'dry';
  if (meta.wetName && compound !== 'wet') warnings.push(`${srcPath}: Dateiname sagt WET, Datei ist dry`);

  const idx = (list, i, what) => {
    if (list[i] == null) throw new Error(`${what}: Klick ${i} ausserhalb der Tabelle`);
    return list[i];
  };
  // Daempfer sind im Roh-Format pro Rad; die App zeigt pro Achse (links als Referenz).
  for (const k of ['bumpSlow', 'bumpFast', 'reboundSlow', 'reboundFast']) {
    const v = adv.dampers[k];
    if (v[0] !== v[1] || v[2] !== v[3]) warnings.push(`${srcPath}: asymmetrische Daempfer (${k}: ${v.join(',')}) — linke Seite uebernommen`);
  }

  return {
    carName: carId,
    author: meta.author,
    variant: meta.label + (compound === 'wet' ? ' · Regen' : ''),
    _source: `${meta.author} — importiert aus github.com/${REPO} (${srcPath}), klick-dekodiert mit Race-Element-Tabellen (github.com/RiddleTime/Race-Element)`,
    referenceTemp: { air: meta.air, track: meta.track, ...(meta.estimated ? { estimated: true } : {}) },
    basicSetup: {
      tyres: { compound, coldPressure: perWheel(bs.tyres.tyrePressure, (c) => GT3_PRESSURE(c, compound)) },
      alignment: {
        camber: perWheel(bs.alignment.camber, (c, i) => (i < 2 ? T.camberFront(c) : T.camberRear(c))),
        toe: perWheel(bs.alignment.toe, (c) => T.toe(c)),
        caster: idx(T.casters, bs.alignment.casterLF, 'Caster'),
      },
      electronics: { tc1: bs.electronics.tC1, tc2: bs.electronics.tC2, abs: bs.electronics.abs, ecuMap: bs.electronics.eCUMap + 1 },
      strategy: {
        fuel: bs.strategy.fuel, tyreSet: bs.strategy.tyreSet + 1,
        frontBrakePad: bs.strategy.frontBrakePadCompound + 1, rearBrakePad: bs.strategy.rearBrakePadCompound + 1,
      },
    },
    advancedSetup: {
      mechanicalBalance: {
        arbFront: adv.mechanicalBalance.aRBFront, arbRear: adv.mechanicalBalance.aRBRear,
        brakeTorque: 80 + adv.mechanicalBalance.brakeTorque, brakeBias: T.brakeBias(adv.mechanicalBalance.brakeBias),
        steeringRatio: T.steeringRatio(bs.alignment.steerRatio), preload: 20 + 10 * adv.drivetrain.preload,
        wheelRate: { front: idx(T.wheelRateF, adv.mechanicalBalance.wheelRate[0], 'Radrate v'), rear: idx(T.wheelRateR, adv.mechanicalBalance.wheelRate[2], 'Radrate h') },
        bumpstopRate: { front: T.bumpstopRateF(adv.mechanicalBalance.bumpStopRateUp[0]), rear: T.bumpstopRateR(adv.mechanicalBalance.bumpStopRateUp[2]) },
        bumpstopRange: { front: adv.mechanicalBalance.bumpStopWindow[0], rear: adv.mechanicalBalance.bumpStopWindow[2] },
      },
      dampers: {
        front: { bumpSlow: adv.dampers.bumpSlow[0], bumpFast: adv.dampers.bumpFast[0], reboundSlow: adv.dampers.reboundSlow[0], reboundFast: adv.dampers.reboundFast[0] },
        rear: { bumpSlow: adv.dampers.bumpSlow[2], bumpFast: adv.dampers.bumpFast[2], reboundSlow: adv.dampers.reboundSlow[2], reboundFast: adv.dampers.reboundFast[2] },
      },
      aeroBalance: {
        rideHeightFront: T.rideHeightF(adv.aeroBalance.rideHeight[0]), rideHeightRear: T.rideHeightR(adv.aeroBalance.rideHeight[2]),
        rearWing: T.rearWing(adv.aeroBalance.rearWing), diffusor: T.splitter(adv.aeroBalance.splitter),
        brakeDuctFront: adv.aeroBalance.brakeDuct[0], brakeDuctRear: adv.aeroBalance.brakeDuct[1],
      },
    },
  };
}

// Plausibilitaets-Check: alles muss in ACC-realistischen Bereichen liegen.
function validate(s, srcPath) {
  const errs = [];
  const chk = (val, lo, hi, what) => { if (!(typeof val === 'number' && val >= lo && val <= hi)) errs.push(`${what}=${val}`); };
  const wet = s.basicSetup.tyres.compound === 'wet';
  for (const w of W) chk(s.basicSetup.tyres.coldPressure[w], wet ? 27 : 20, wet ? 35 : 30, `Druck ${w}`);
  for (const w of W) chk(s.basicSetup.alignment.camber[w], -5, 0, `Sturz ${w}`);
  for (const w of W) chk(s.basicSetup.alignment.toe[w], -0.5, 0.5, `Spur ${w}`);
  chk(s.advancedSetup.mechanicalBalance.brakeBias, 44, 80, 'BrakeBias');
  chk(s.advancedSetup.mechanicalBalance.preload, 20, 300, 'Preload');
  chk(s.advancedSetup.aeroBalance.rideHeightFront, 40, 100, 'RideHeight v');
  chk(s.advancedSetup.aeroBalance.rideHeightRear, 40, 120, 'RideHeight h');
  if (errs.length) throw new Error(`${srcPath}: unplausible Werte: ${errs.join(', ')}`);
}

// ---------------------------------------------------------------------------
async function main() {
  const tree = await (await fetch(`https://api.github.com/repos/${REPO}/git/trees/master?recursive=1`)).json();
  if (!tree.tree) throw new Error('GitHub-Tree nicht ladbar: ' + JSON.stringify(tree).slice(0, 200));

  const candidates = [];
  for (const { path: p } of tree.tree) {
    const [car, folder, file] = p.split('/');
    if (!CARS[car] || !file || !file.endsWith('.json')) continue;
    if (/_32kg/i.test(file)) continue; // Ballast-Varianten auslassen
    const tid = trackId(folder);
    if (!tid) { console.warn(`? unbekannte Strecke: ${p}`); continue; }
    const meta = parseMeta(file);
    if (!meta) continue; // basic.json u. ae.
    candidates.push({ car, tid, path: p, meta });
  }

  // Dedupe: pro (car, strecke, groupKey) nur die neueste Version behalten.
  const byGroup = new Map();
  for (const c of candidates) {
    const key = `${c.car}|${c.tid}|${c.meta.groupKey}`;
    const prev = byGroup.get(key);
    if (!prev || compareVersions(c.meta.version, prev.meta.version) > 0) byGroup.set(key, c);
  }
  const picked = [...byGroup.values()];
  console.log(`${candidates.length} Kandidaten -> ${picked.length} nach Dedupe. ${DRY_RUN ? '(Testlauf)' : ''}`);

  const warnings = [];
  let written = 0;
  for (const c of picked) {
    const raw = await (await fetch(RAW + c.path.split('/').map(encodeURIComponent).join('/'))).json();
    let setup;
    try {
      setup = decode(c.car, raw, c.meta, c.path, warnings);
      setup.track = c.tid;
      validate(setup, c.path);
    } catch (e) {
      warnings.push(`ÜBERSPRUNGEN ${c.path}: ${e.message}`);
      continue;
    }
    const slug = `${c.meta.author}_${c.meta.groupKey.replace(/^\((Jardier|Flickerdox[^)]*)\)\s*/i, '')}`
      .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
    const dir = path.join(OUT_ROOT, c.car, c.tid);
    const out = path.join(dir, `${slug}.json`);
    if (DRY_RUN) { console.log(`wuerde schreiben: ${path.relative(OUT_ROOT, out)}`); continue; }
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(out, JSON.stringify(setup, null, 2) + '\n');
    written++;
  }

  console.log(`\n${written} Setups geschrieben.`);
  if (warnings.length) {
    console.log(`\n${warnings.length} Hinweise:`);
    for (const w of warnings) console.log('  - ' + w);
  }
}

function compareVersions(a = '0', b = '0') {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

main().catch((e) => { console.error(e); process.exit(1); });
