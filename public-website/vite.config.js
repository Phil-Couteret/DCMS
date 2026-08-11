import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite replacement for react-scripts (CRA). Simpler than frontend/vite.config.js -
// no vite-plugin-pwa here, since public-website's service worker
// (public/service-worker.js) is a hand-authored file with real custom
// caching/push-notification logic, not CRA's auto-generated workbox output.
// Vite's public/ directory copies it (and manifest.json, logo.svg,
// pwa-icons/, .htaccess) straight through to the build output untouched,
// exactly like CRA did - no plugin needed to preserve that behavior.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
  },
  build: {
    outDir: 'build', // keep "build" (not Vite's default "dist") - Dockerfile/nginx copy this path
  },
});
