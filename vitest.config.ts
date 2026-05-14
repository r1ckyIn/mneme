import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  // Resolve the `browser` condition so `svelte` resolves to its client entry
  // (which exports `mount`/`unmount`) instead of the server entry. Required
  // for component-mount tests (tests/splitter-restore.test.ts) that exercise
  // onMount restore behavior in jsdom. Verified no regressions across the
  // existing 139-test suite.
  resolve: {
    conditions: ['browser']
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // Phase 01.1-07: extend discovery to scripts/__tests__/*.test.mjs so the
    // npm-script bridge helpers (Node-only, ESM) are covered by `npm test`.
    include: [
      'tests/**/*.test.ts',
      'src/**/*.test.ts',
      'scripts/__tests__/**/*.test.mjs'
    ]
  }
});
