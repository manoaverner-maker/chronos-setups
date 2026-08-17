// Baut aus den berechneten Setup-Daten eine exportierbare JSON-Struktur bzw. einen
// lesbaren Text. WICHTIG: Das sind Anzeigewerte (psi/Grad/mm/Klicks), KEIN
// roh-encodiertes ACC-.json - im Spiel manuell uebernehmen.

export function buildSetupExport(data) {
  if (!data || data.error) return null;
  const { car, track, requestedTemp, referenceTemp, pressures, adjustment, baseline } = data;
  const recommendedColdPressures = pressures?.available
    ? Object.fromEntries(Object.entries(pressures.wheels).map(([k, v]) => [k, v.recommendedCold]))
    : null;
  return {
    _meta: {
      source: 'ASPL Racing — ACC Setup & Referenz',
      setupAuthor: data.author ?? baseline?.author ?? null,
      setupVariant: data.variant ?? baseline?.variant ?? null,
      exportedAt: new Date().toISOString(),
      note: 'Anzeigewerte, kein roh-encodiertes ACC-.json. Werte im Spiel manuell uebernehmen.',
    },
    car,
    track,
    conditions: {
      airTemp: requestedTemp?.air,
      trackTemp: requestedTemp?.track,
      referenceTemp,
      character: adjustment?.label,
      slider: adjustment?.slider,
    },
    recommendedColdPressures,
    adjustedParameters: (adjustment?.changes ?? []).reduce((o, c) => {
      o[c.key] = { from: c.from, to: c.to, unit: c.unit };
      return o;
    }, {}),
    setup: adjustment?.adjusted ?? baseline,
  };
}

export function buildSetupText(data) {
  const e = buildSetupExport(data);
  if (!e) return '';
  const L = [];
  L.push(`ASPL Racing — ${e.car} @ ${e.track}`);
  if (e._meta.setupAuthor) L.push(`Setup: ${e._meta.setupAuthor}${e._meta.setupVariant ? ` (${e._meta.setupVariant})` : ''}`);
  L.push(`Bedingungen: Luft ${e.conditions.airTemp}°C / Strecke ${e.conditions.trackTemp}°C · ${e.conditions.character}`);
  if (e.recommendedColdPressures) {
    const p = e.recommendedColdPressures;
    L.push(`Kaltdruck (psi): VL ${p.fl} · VR ${p.fr} · HL ${p.rl} · HR ${p.rr}`);
  }
  const a = e.adjustedParameters;
  if (a && Object.keys(a).length) {
    L.push('Charakter-Anpassungen:');
    for (const [k, v] of Object.entries(a)) L.push(`  ${k}: ${v.to}${v.unit}`);
  }
  L.push('(Anzeigewerte – im Spiel manuell übernehmen)');
  return L.join('\n');
}

export function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
