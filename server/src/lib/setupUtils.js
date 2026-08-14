// Kleine Hilfsfunktionen fuer den Umgang mit Setup-Objekten.

/** Tiefe Kopie ueber JSON (Setups sind reine Daten ohne Funktionen). */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/** Liest einen Wert ueber einen Punkt-Pfad, z.B. "advancedSetup.aeroBalance.rearWing". */
export function getByPath(obj, dotPath) {
  return dotPath.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

/** Setzt einen Wert ueber einen Punkt-Pfad und legt fehlende Zwischenobjekte an. */
export function setByPath(obj, dotPath, value) {
  const keys = dotPath.split('.');
  let node = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (node[keys[i]] == null || typeof node[keys[i]] !== 'object') node[keys[i]] = {};
    node = node[keys[i]];
  }
  node[keys[keys.length - 1]] = value;
}

/** Begrenzt einen Wert auf [min, max]. */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Rundet auf n Nachkommastellen (vermeidet Float-Artefakte). */
export function roundTo(value, decimals = 0) {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
