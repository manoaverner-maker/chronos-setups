// Safe/Aggressiv-Slider-Engine.
//
// Der Slider s laeuft von -3 (sicher/stabil) bis +3 (aggressiv/drehfreudig).
// Jede Regel aus setup_adjustments.json veraendert genau einen Parameter relativ
// zur Baseline: neuer_wert = clamp(baseline + s * perStep, min, max).
// Es werden nur Parameter angefasst, die in der Baseline tatsaechlich existieren.

import { deepClone, getByPath, setByPath, clamp, roundTo } from '../lib/setupUtils.js';

export function applyAdjustments({ baseline, adjustments, slider }) {
  const [lo, hi] = adjustments.sliderRange ?? [-3, 3];
  const s = clamp(Math.round(slider), lo, hi);

  const adjusted = deepClone(baseline);
  const changes = [];

  for (const rule of adjustments.rules ?? []) {
    const baseVal = getByPath(baseline, rule.path);
    if (typeof baseVal !== 'number') continue; // Parameter fehlt in dieser Baseline -> ueberspringen

    const raw = baseVal + s * rule.perStep;
    const newVal = roundTo(clamp(raw, rule.min, rule.max), rule.decimals ?? 0);
    setByPath(adjusted, rule.path, newVal);

    changes.push({
      key: rule.key,
      path: rule.path,
      from: baseVal,
      to: newVal,
      delta: roundTo(newVal - baseVal, rule.decimals ?? 0),
      unit: rule.unit ?? '',
      reasoning: rule.reasoning ?? '',
    });
  }

  return {
    slider: s,
    label: adjustments.labels?.[String(s)] ?? null,
    changes,
    adjusted,
  };
}
