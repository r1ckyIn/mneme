import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
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
