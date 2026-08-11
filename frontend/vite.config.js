import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Vite replacement for react-scripts (CRA). Notes for anyone diffing this
// against the old CRA setup:
// - Dev server kept on port 3000 to match every hardcoded reference to it
//   elsewhere in the repo (backend CORS allowlist, docs, README).
// - vite-plugin-pwa (generateSW strategy) replaces CRA's built-in
//   workbox-webpack-plugin + src/serviceWorkerRegistration.js. It
//   auto-injects the service worker registration script and generates
//   manifest.webmanifest from the `manifest` option below (kept in sync
//   with the old public/manifest.json, which is now redundant and removed).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        // Matches CRA's default GenerateSW precaching behavior.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
      },
      manifest: {
        short_name: 'DCMS',
        name: 'Dive Center Management System',
        description: 'Complete diving center management system for Deep Blue Diving',
        icons: [
          { src: 'logo192.png', type: 'image/png', sizes: '192x192' },
          { src: 'logo512.png', type: 'image/png', sizes: '512x512' },
        ],
        start_url: '.',
        display: 'standalone',
        theme_color: '#1976d2',
        background_color: '#ffffff',
        orientation: 'any',
        scope: '/',
        shortcuts: [
          {
            name: 'New Booking',
            short_name: 'New Booking',
            description: 'Create a new booking',
            url: '/bookings/new',
            icons: [{ src: 'logo192.png', sizes: '192x192' }],
          },
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'View dashboard',
            url: '/',
            icons: [{ src: 'logo192.png', sizes: '192x192' }],
          },
        ],
        categories: ['business', 'productivity', 'utilities'],
      },
    }),
  ],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'build',
  },
});
