// Reifendruck-Temperatur-Engine (deterministisch, physikbasiert).
//
// Idee: Ein Baseline-Setup wurde bei einer Referenztemperatur (Luft/Strecke) gebaut.
// Bei abweichender Temperatur baut der Reifen anders Druck auf. Damit der Heissdruck
// im Zielfenster bleibt, wird der KALTDRUCK angepasst:
//
//   empfohlener_kaltdruck = baseline_kaltdruck - psiPerDegC * gewichtetes_temp_delta
//
// gewichtetes_temp_delta = wTrack*(trackTemp - refTrack) + wAir*(airTemp - refAir)
//
// Der erwartete Heissdruck ergibt sich aus einem geschaetzten, konstanten Druckaufbau B
// (B = Zielheissdruck - mittlerer Baseline-Kaltdruck), sodass das Baseline-Setup bei
// Referenztemperatur per Definition im Ziel landet.

import { roundTo } from './setupUtils.js';

const WHEELS = ['fl', 'fr', 'rl', 'rr'];

/**
 * Bremsluftkanal-Empfehlung: pro `degPerClick` Grad gewichteter Temperaturabweichung
 * 1 Klick (waermer -> oeffnen, kaelter -> schliessen), auf den Spielbereich geklemmt.
 * Die Kanaele steuern seit ACC v1.8 fast nur die Bremstemperatur — der Reifendruck
 * wird deshalb bewusst NICHT ueber die Kanaele korrigiert.
 */
export function computeBrakeDucts({ baseline, model, weightedDelta }) {
  const cfg = model?.brakeDucts;
  const ae = baseline?.advancedSetup?.aeroBalance;
  if (!cfg || typeof ae?.brakeDuctFront !== 'number' || typeof ae?.brakeDuctRear !== 'number') return null;
  const [lo, hi] = cfg.range ?? [0, 6];
  // Math.round rundet -0.5 nach oben; symmetrisch runden, damit +5 und -5 Grad gleich behandelt werden.
  const raw = weightedDelta / (cfg.degPerClick ?? 10);
  const clicks = Math.sign(raw) * Math.round(Math.abs(raw));
  const rec = (b) => Math.min(hi, Math.max(lo, b + clicks));
  const st = baseline?.basicSetup?.strategy ?? {};
  const padF = st.frontBrakePad === 2 ? 2 : 1;
  const padR = st.rearBrakePad === 2 ? 2 : 1;
  const win = cfg.brakeTempWindows ?? {};
  return {
    clicks,
    front: { baseline: ae.brakeDuctFront, recommended: rec(ae.brakeDuctFront), pad: padF, tempWindow: win[`pad${padF}`]?.front ?? null },
    rear: { baseline: ae.brakeDuctRear, recommended: rec(ae.brakeDuctRear), pad: padR, tempWindow: win[`pad${padR}`]?.rear ?? null },
    degPerClick: cfg.degPerClick ?? 10,
  };
}

export function classForCar(carId, model) {
  return model?.carClassMap?.[carId] ?? null;
}

/**
 * @returns { available, reason?, ...details, wheels: { fl|fr|rl|rr: {...} } }
 */
export function computePressures({ baseline, model, carId, airTemp, trackTemp }) {
  const cls = classForCar(carId, model);
  const base = model?.classes?.[cls];
  if (!base) {
    return { available: false, reason: `Kein Druckmodell fuer Klasse "${cls}" (Auto ${carId}).` };
  }
  // Regenreifen haben ein eigenes Zielfenster (~30 psi statt 26.5) — die
  // compound-spezifischen Werte ueberlagern die Klassen-Defaults.
  const compound = baseline?.basicSetup?.tyres?.compound === 'wet' ? 'wet' : 'dry';
  const params = { ...base, ...(base.compounds?.[compound] ?? {}) };

  const cold = baseline?.basicSetup?.tyres?.coldPressure;
  const ref = baseline?.referenceTemp;
  if (!cold || ref?.air == null || ref?.track == null) {
    return { available: false, reason: 'Baseline ohne Kaltdruck oder Referenztemperatur - Berechnung nicht moeglich.' };
  }

  const wTrack = params.tempWeights?.track ?? 0.75;
  const wAir = params.tempWeights?.air ?? 0.25;
  const k = params.psiPerDegC;
  const [winLo, winHi] = params.hotPressureWindow;

  const weightedDelta = wTrack * (trackTemp - ref.track) + wAir * (airTemp - ref.air);

  const baseVals = WHEELS.map((w) => cold[w]).filter((v) => typeof v === 'number');
  const meanBase = baseVals.reduce((a, b) => a + b, 0) / baseVals.length;
  const buildup = params.targetHotPressure - meanBase; // geschaetzter Druckaufbau

  // Im Spiel einstellbarer Kaltdruck (Klick-Basis wie im Import: dry 20.3, wet 24.0; max 35.0).
  const [pMin, pMax] = compound === 'wet' ? [24.0, 35.0] : [20.3, 35.0];

  const wheels = {};
  for (const w of WHEELS) {
    const base = cold[w];
    const recommendedCold = roundTo(Math.min(pMax, Math.max(pMin, base - k * weightedDelta)), 1);
    // Mit empfohlenem Kaltdruck landet der Heissdruck wieder bei base + buildup (= Referenzniveau).
    const expectedHot = roundTo(base + buildup, 1);
    // Ohne Anpassung (gleicher Kaltdruck wie Baseline) driftet der Heissdruck mit der Temperatur.
    const expectedHotIfUnchanged = roundTo(base + buildup + k * weightedDelta, 1);
    wheels[w] = {
      baselineCold: base,
      recommendedCold,
      expectedHot,
      expectedHotIfUnchanged,
      inWindow: expectedHot >= winLo && expectedHot <= winHi,
    };
  }

  return {
    available: true,
    compound,
    carClass: cls,
    compoundWindows: Object.fromEntries(
      Object.entries(base.compounds ?? {}).map(([c, v]) => [c, { target: v.targetHotPressure, window: v.hotPressureWindow }]),
    ),
    brakeDucts: computeBrakeDucts({ baseline, model, weightedDelta }),
    targetHotPressure: params.targetHotPressure,
    hotPressureWindow: params.hotPressureWindow,
    psiPerDegC: k,
    tempWeights: { track: wTrack, air: wAir },
    referenceTemp: { air: ref.air, track: ref.track },
    requestedTemp: { air: airTemp, track: trackTemp },
    weightedDelta: roundTo(weightedDelta, 2),
    wheels,
  };
}
