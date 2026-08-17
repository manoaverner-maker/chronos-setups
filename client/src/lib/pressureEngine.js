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

  const wheels = {};
  for (const w of WHEELS) {
    const base = cold[w];
    const recommendedCold = roundTo(base - k * weightedDelta, 1);
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
    carClass: cls,
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
