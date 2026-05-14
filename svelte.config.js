import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: false,
      strict: true
    }),
    // Plan 01-08 (gap closure for T-1-46 dev-mode CSP white-screen):
    // SvelteKit owns the meta CSP; `mode:'auto'` emits a per-request nonce in
    // dev (so its own inline bootstrap script loads) and a SHA-256 hash at
    // build time (prerender path). `'unsafe-inline'` is intentionally NEVER
    // added to script-src — that would defeat REQ-5. `style-src 'unsafe-inline'`
    // is retained because Svelte 5 emits per-component scoped inline styles;
    // narrowing it (nonce-style) is a v1.x candidate tracked in dependencies.md.
    // `connect-src ws:` + `localhost:*` is required for Vite HMR in dev; both
    // are dev-only artifacts (production webview never opens an HMR socket).
    //
    // BL-02 fix (2026-05-14): `connect-src` MUST allow the Tauri 2 IPC origin.
    // Tauri 2 mounts the IPC bridge on `ipc://localhost` (macOS uses the `ipc:`
    // scheme; Windows / fallback uses `http://ipc.localhost`). Without these,
    // every @tauri-apps/api/core `invoke()` call (register_session_pid /
    // clear_session_pid / stop_session and the Phase 01.1 dev_* surface) is
    // silently dropped by the WebView's CSP enforcement once the
    // production-mode meta CSP (SHA-256 hash mode) takes over. The runtime
    // symptom is zombie subprocesses surviving every quit cycle because
    // register_session_pid never reached Rust. This closes plan 01-11 (the
    // tracked-separately CSP gap from the dogfood walkthrough) — that plan
    // file is now obsolete and can be archived.
    csp: {
      mode: 'auto',
      directives: {
        'default-src': ['self'],
        'script-src': ['self', 'wasm-unsafe-eval'],
        'style-src': ['self', 'unsafe-inline'],
        'img-src': ['self', 'data:'],
        'connect-src': ['self', 'ipc:', 'http://ipc.localhost', 'ws:', 'http://localhost:*']
      }
    }
  }
};

export default config;
