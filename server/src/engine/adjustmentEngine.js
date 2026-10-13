// Safe/Aggressiv-Slider-Engine.
//
// Der Slider s laeuft von -3 (sicher/stabil) bis +3 (aggressiv/drehfreudig).
// Jede Regel aus setup_adjustments.json veraendert genau einen Parameter relativ
// zur Baseline: neuer_wert = clamp(baseline + s * perStep, min, max).
// Es werden nur Parameter angefasst, die in der Baseline tatsaechlich existieren.
//
// Grenzen kommen pro Auto aus carLimits (im Spiel einstellbarer Bereich), sonst aus
// der Regel. Der Baseline-Wert liegt immer im erlaubten Bereich: Bei s = 0 bleibt
// das Setup unveraendert, auch wenn eine hinterlegte Grenze zu eng ist.

import { deepClone, getByPath, setByPath, clamp, roundTo } from '../lib/setupUtils.js';

export function applyAdjustments({ baseline, adjustments, slider, carId }) {
  const [lo, hi] = adjustments.sliderRange ?? [-3, 3];
  const s = clamp(Math.round(slider), lo, hi);
  const carLimits = adjustments.carLimits?.[carId] ?? {};

  const adjusted = deepClone(baseline);
  const changes = [];

  for (const rule of adjustments.rules ?? []) {
    const baseVal = getByPath(baseline, rule.path);
    if (typeof baseVal !== 'number') continue; // Parameter fehlt in dieser Baseline -> ueberspringen

    const decimals = rule.decimals ?? 0;
    const [limMin, limMax] = carLimits[rule.key] ?? [rule.min, rule.max];
    const min = Math.min(limMin, baseVal);
    const max = Math.max(limMax, baseVal);
    const wanted = roundTo(baseVal + s * rule.perStep, decimals);
    const newVal = roundTo(clamp(wanted, min, max), decimals);
    setByPath(adjusted, rule.path, newVal);

    changes.push({
      key: rule.key,
      label: rule.label ?? rule.key,
      path: rule.path,
      from: baseVal,
      to: newVal,
      delta: roundTo(newVal - baseVal, decimals),
      unit: rule.unit ?? '',
      reasoning: rule.reasoning ?? '',
      atLimit: newVal !== wanted, // Spiel-Grenze erreicht, Slider wirkt hier nicht weiter
    });
  }

  return {
    slider: s,
    label: adjustments.labels?.[String(s)] ?? null,
    changes,
    adjusted,
  };
}
