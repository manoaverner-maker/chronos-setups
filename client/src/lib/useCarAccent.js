import { useEffect } from 'react';

// Setzt die globale --car-accent-CSS-Variable auf die Farbe des gewaehlten Autos
// (oder zurueck auf das Marken-Gold). Faerbt Hintergrund, Slider, Glows etc. ein.
export function useCarAccent(color) {
  useEffect(() => {
    document.documentElement.style.setProperty('--car-accent', color || '#f2b705');
  }, [color]);
}
