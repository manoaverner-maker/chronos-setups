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
      // 'prompt': neue Version wird nicht still uebernommen, sondern per
      // "Aktualisieren"-Banner angeboten (siehe components/UpdateToast.jsx).
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
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/data/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'cmrt-data', expiration: { maxEntries: 200, maxAgeSeconds: 86400 } },
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
