import { defineConfig, mergeConfig } from 'vite';
import viteConfig from './vite.config.js';

// Separate from vite.config.js on purpose: importing the real vite.config
// (mergeConfig) keeps plugin/resolve parity with dev+build, but Vitest's
// own `test` block doesn't belong inside the config Vite itself reads, and
// mixing them trips up some editor/IDE tooling that expects a plain
// vite.config.js.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/setupTests.js'],
      css: true,
    },
  })
);
