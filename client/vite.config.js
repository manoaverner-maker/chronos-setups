import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Dev-Server proxyt API/Bilder ans Express-Backend (Port 4000).
// VitePWA macht die App installierbar (Handy-Homescreen) und offline-faehig.
// base: die Seite liegt auf GitHub Pages unter einem Unterordner
// (https://manoaverner-maker.github.io/chronos-setups/). Lokal (npm run dev) '/'.
export default defineConfig({
  base: process.env.APP_BASE || '/',
  // Build-Zeitpunkt als Versionsstempel im Footer — so ist sofort erkennbar, ob
  // eine alte Fassung aus dem Offline-Cache angezeigt wird.
  define: {
    __APP_BUILD__: JSON.stringify(
      new Date().toLocaleString('de-CH', { timeZone: 'Europe/Zurich', dateStyle: 'short', timeStyle: 'short' }),
    ),
  },
  plugins: [
    react(),
    VitePWA({
      // 'prompt': die neue Fassung wird NICHT von selbst uebernommen. 'autoUpdate'
      // laedt die Seite dafuer ungefragt neu — mitten im Einstellen von Druecken ist
      // das aergerlich. Stattdessen meldet sich UpdateToast.jsx mit einem Banner und
      // laedt erst auf Tippen neu. Damit das Banner zuverlaessig erscheint (genau
      // daran hing es frueher), sucht es auf drei Wegen nach einer neuen Fassung.
      registerType: 'prompt',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Chronos Motorsport Racing Team — Setups',
        short_name: 'Chronos Setups',
        description: 'ACC Setups, temperaturbasierte Reifendruck-Berechnung und Streckenreferenzen.',
        lang: 'de',
        theme_color: '#0d1016',
        background_color: '#07080b',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Pfade base-unabhaengig pruefen (lokal /data/…, auf Pages /chronos-setups/data/…).
        navigateFallbackDenylist: [/\/data\//, /\/images\//],
        // Alte Caches beim Wechsel wegraeumen. skipWaiting/clientsClaim bewusst NICHT:
        // die neue Fassung soll warten, bis der Nutzer das Banner antippt — sonst
        // uebernimmt sie mitten in der laufenden Seite.
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Saemtliche Inhalte der App (Tabellen, Kalender, Setups) kommen aus
            // /data. Vorher stand hier StaleWhileRevalidate: das liefert erst die
            // alte Fassung aus dem Cache und holt die neue nur im Hintergrund —
            // neue Tabellen wurden also fruehestens beim uebernaechsten Start
            // sichtbar. NetworkFirst zeigt sie sofort und faellt nur ohne Netz
            // auf den Cache zurueck, die App bleibt also offline-faehig.
            urlPattern: ({ url }) => url.pathname.includes('/data/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'cmrt-data',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 200, maxAgeSeconds: 604800 },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.includes('/images/'),
            handler: 'CacheFirst',
            options: { cacheName: 'cmrt-images', expiration: { maxEntries: 80, maxAgeSeconds: 604800 } },
          },
        ],
      },
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/images': 'http://localhost:4000',
    },
  },
});
