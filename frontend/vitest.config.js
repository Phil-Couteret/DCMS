import { defineConfig, mergeConfig } from 'vite';
import viteConfig from './vite.config.js';

// Separate from vite.config.js on purpose: importing the real vite.config
// (mergeConfig) keeps plugin/resolve parity with dev+build, but Vitest's
// own `test` block doesn't belong inside the config Vite itself reads, and
// mixing them trips up some editor/IDE tooling that expects a plain
// vite.config.js.

// Node 25.x (and only 25.x) ships a native `localStorage` global enabled by
// default that's an unusable stub unless `--localstorage-file=<path>` is
// given - it shadows jsdom's own working localStorage implementation and
// breaks every test that touches it ("localStorage.clear is not a
// function"). Fixed upstream in Node 26 (falls back to `undefined` instead
// of a broken stub, which jsdom handles correctly) and never present before
// 22.4 (opt-in only, via --experimental-webstorage). See
// https://github.com/vitest-dev/vitest/issues/8757 and docs/roadmap.md item 18.
// `--no-webstorage` isn't a recognized flag at all outside that window (Node
// 22 rejects it outright: "bad option"), so this must be conditional, not a
// blanket flag in the `test` npm script or CI.
const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
const needsWebStorageFix = nodeMajor === 25;
const execArgv = needsWebStorageFix ? ['--no-webstorage'] : [];

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/setupTests.js'],
      css: true,
      poolOptions: {
        forks: { execArgv },
        threads: { execArgv },
      },
    },
  })
);
