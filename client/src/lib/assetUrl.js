// Alle statischen Pfade (/data, /images) muessen den Vite-Base-Pfad beruecksichtigen,
// weil die Seite unter einem Unterordner liegt (GitHub Pages: /chronos-setups/).
// Lokal ist BASE_URL '/', d.h. die Funktion aendert dort nichts.
const BASE = import.meta.env.BASE_URL || '/';

export function assetUrl(path) {
  if (!path) return path;
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path;
  return BASE.replace(/\/$/, '') + '/' + String(path).replace(/^\//, '');
}
