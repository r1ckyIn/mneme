# Technology Stack

**Analysis Date:** 2026-05-14

## Languages

**Primary:**
- TypeScript 5.7.x — Frontend application code under `src/`, build / capability generators under `scripts/`. Strict mode (`tsconfig.json` L4-12).
- Rust 1.88 (pinned via `rust-toolchain.toml`) — Tauri backend under `src-tauri/src/` (`lib.rs`, `session.rs`, `dev.rs`, `bin/dev_invoke.rs`). Edition 2021.
- Svelte 5.55.x — UI component layer (`src/lib/components/*.svelte`, `src/routes/*.svelte`). Uses runes (`$state`, `$props`, `$state.svelte.ts` module files like `src/lib/connection-state.svelte.ts`).

**Secondary:**
- JavaScript (ESM, Node) — Dev-loop bridge scripts (`scripts/gsd-dev-screenshot.mjs`, `scripts/gsd-dev-snapshot.mjs`, `scripts/gsd-dev-scan-logs.mjs`, `scripts/__tests__/*.test.mjs`). Run under Node ≥22 via `--experimental-strip-types` for the TS prebuild step (`package.json` L14).
- Shell (`bash`) — Pre-commit / pre-build audit (`scripts/audit-capabilities.sh`, `tests/audit/test-audit-script.sh`).
- CSS — Design tokens (`src/lib/styles/tokens.css`) + per-component scoped styles inside `.svelte` files.

## Runtime

**Environment:**
- Node ≥22 (uses `node --experimental-strip-types` to load `scripts/gen-capabilities.ts` at prebuild time, `package.json` L14)
- Rust 1.88 toolchain pinned via `rust-toolchain.toml`
- Target OS: macOS Ventura 13.4 Intel — single-user, single-device, never distributed (per project `CLAUDE.md` L4)
- Tauri 2 binary embeds a system WebKit2 webview (WKWebView on macOS; provided by OS, not bundled). Confirmed by `wry 0.55.1` + `webkit2gtk 2.0.2` in `src-tauri/Cargo.lock`.

**Package Manager:**
- npm (uses `package-lock.json`, `package.json` L1; no `pnpm-lock.yaml` / `yarn.lock` present)
- Lockfile: `package-lock.json` (present, 105KB)
- Rust: cargo workspace at `src-tauri/Cargo.toml` with `Cargo.lock` committed (410 transitive crates)

## Frameworks

**Core:**
- Tauri 2.11.1 — Desktop shell framework. Crate: `tauri = "2"` (`src-tauri/Cargo.toml` L16). Frontend bundle served from `../build` (built static files), dev URL `http://localhost:5173` (`src-tauri/tauri.conf.json` L9-11).
- SvelteKit 2.59.x (`@sveltejs/kit`) — Frontend metaframework using `@sveltejs/adapter-static` 3.0.x for prerendered SPA output (`svelte.config.js` L1-13). `prerender = true`, `ssr = false` (`src/routes/+layout.ts`).
- Svelte 5.55.x — UI runtime, runes-enabled (`$state`, `$props`).
- Vite 6.0.x — Bundler, configured at `vite.config.ts`. HMR on `ws://localhost:5173`, `strictPort: true`.

**Testing:**
- Vitest 4.1.x — JavaScript / TypeScript test runner. Configured at `vitest.config.ts`. Environment: `jsdom`. Test discovery: `tests/**/*.test.ts`, `src/**/*.test.ts`, `scripts/__tests__/**/*.test.mjs`.
- jsdom 25.0.x — Browser DOM emulation for unit tests (`package.json` L37).
- Rust `cargo test` — Backend unit + integration tests (`src-tauri/tests/kill_pgid.rs`, `src-tauri/tests/dev_log_rotation.rs`). Tokio test util dev-dep at `src-tauri/Cargo.toml` L43-45.
- No Playwright / E2E framework installed in this repo — visual verification driven externally by Claude Code dev-feedback-loop (`scripts/gsd-dev-screenshot.mjs`, `scripts/gsd-dev-snapshot.mjs`).

**Build/Dev:**
- svelte-check 4.1.x — Type-checking Svelte components, invoked via `npm run check` (`package.json` L10).
- TypeScript 5.7.x — Standalone type-checker.
- husky 9.1.x — Git hook manager (`.husky/pre-commit` runs `audit-capabilities.sh` + `npx vitest run --changed`).
- `tauri-build` 2.6.x — Rust build script for codegen (`src-tauri/build.rs` calls `tauri_build::build()`).

## Key Dependencies

**Critical (npm — `package.json`):**
- `@tauri-apps/api` ^2.11.0 — Frontend IPC bridge to Rust backend. Consumed via `@tauri-apps/api/core` (`invoke`) and `@tauri-apps/api/path` (`homeDir`) in `src/lib/components/ChatPanel.svelte` L40-41 and `src/lib/dev/console-forwarder.ts` L33.
- `@tauri-apps/plugin-shell` ^2.3.5 — Subprocess spawn surface. Imports `Command` in `src/lib/components/ChatPanel.svelte` L39 (`Command.create("claude-bin", ...)`).
- `dompurify` ^3.4.2 — HTML sanitizer. Used in `src/lib/sanitize.ts` for post-marked and post-KaTeX sanitization. Hardened with `uponSanitizeAttribute` hook stripping `on*` attrs (`src/lib/sanitize.ts` L24-28).
- `katex` ^0.16.45 — Math rendering. Called with `trust:false strict:true maxExpand:1000 throwOnError:false` (`src/lib/sanitize.ts` L52-60).
- `marked` ^18.0.3 — Markdown → HTML parser. Called with `gfm:true breaks:true` (`src/lib/sanitize.ts` L46).

**Critical (Rust — `src-tauri/Cargo.toml`):**
- `tauri` 2.x — Desktop app framework (resolved version 2.11.1 in `Cargo.lock`).
- `tauri-plugin-shell` 2.3.5 — Backend half of the shell plugin (`src-tauri/src/lib.rs` L88 `tauri_plugin_shell::init()`).
- `serde` 1.x + `serde_json` 1.x — JSON serialization for Tauri IPC.
- `nix` 0.31.x — Unix signal / process group APIs. Used in `src-tauri/src/lib.rs` L41-48 for `killpg(SIGTERM)` → 2s grace → `killpg(SIGKILL)` cleanup of Claude CLI subprocess group.
- `home` 0.5.x — Home directory resolver, used in `src-tauri/src/lib.rs` L122 to create `~/.mneme/scratch` on startup.
- `tokio` 1.x — Async runtime (features: `sync rt rt-multi-thread macros process time fs io-util`). Dev-only writer task pipeline in `src-tauri/src/dev.rs` (mpsc + debounced batched log writer).
- `objc2` 0.6.x + `objc2-app-kit` 0.3.x — macOS-only deps (`target.'cfg(target_os = "macos")'`). Resolve `CGWindowID` from `WebviewWindow::ns_window()` via `NSWindow::windowNumber()` for `screencapture -l <id>` (`src-tauri/src/dev.rs` L417-431).

**Infrastructure:**
- `wry` 0.55.1 (Tauri transitive) — Cross-platform webview wrapper.
- `tao` 0.35.2 (Tauri transitive) — Windowing.
- `reqwest` 0.13.3 (Tauri transitive) — HTTP client. NOT used directly by mneme code.
- `tempfile` 3.x (dev-only) — Rust test isolation.

**Vendored (not via package manager):**
- `claude-code-parser` (MIT, frozen snapshot 2026-05-09, upstream commit `61fa32c5b7004fde32c47c0e95abb657316b224e`) — Lives at `vendor/claude-code-parser/`. Types-only consumption: `src/lib/stream-dispatch.ts` L21 imports `ClaudeEvent` from `vendor/claude-code-parser/src/types/protocol`. Per KD-12, must NEVER appear in `package.json` (audit gate `scripts/audit-capabilities.sh` L73-76 enforces).

## Configuration

**Environment:**
- No `.env*` files present in repo. None expected — app authenticates to Claude via the user's `claude` CLI OAuth subscription (`~/.claude/`), not via API keys (`src/lib/spawn-args.shared.ts` L26-29).
- `.gitignore` excludes `.env`, `.env.*`, `.env.local`, `.env.*.local` defensively (`.gitignore` L20-23).
- Scratch dir for Claude CLI `--add-dir`: `~/.mneme/scratch` (auto-created on first launch by `src-tauri/src/lib.rs` L122-124).

**Build:**
- `package.json` — npm scripts: `dev`, `build`, `preview`, `check`, `tauri`, `test`, `test:watch`, `prebuild` (capability generation + audit), `prepare` (husky), `gsd-dev-screenshot`, `gsd-dev-snapshot`, `gsd-dev-scan-logs`.
- `vite.config.ts` — `port: 5173 strictPort: true host: 'localhost'`. HMR `ws://localhost:5173`. Required because Tauri config hard-codes `devUrl: "http://localhost:5173"`.
- `svelte.config.js` — `adapter-static` with `fallback: 'index.html' strict: true`. CSP `mode: 'auto'` (nonce in dev, SHA-256 hash at build); `script-src 'self' 'wasm-unsafe-eval'` (no `'unsafe-inline'`); `style-src 'self' 'unsafe-inline'` (Svelte 5 emits scoped inline styles); `connect-src 'self' ws: http://localhost:*` (dev-only Vite HMR).
- `tsconfig.json` — `extends ./.svelte-kit/tsconfig.json`, `strict: true`, `moduleResolution: bundler`, path aliases `$lib/* → ./src/lib/*` and `$vendor/* → ./vendor/*`.
- `src-tauri/tauri.conf.json` — Window `1280×860` (min `1024×600`), `titleBarStyle: "Overlay"`, `hiddenTitle: true`, `decorations: true`, CSP `null` (SvelteKit owns the CSP via meta tag).
- `src-tauri/Cargo.toml` — Defines `dev-invoke` feature gating the `dev_invoke` binary (`required-features = ["dev-invoke"]`). Release builds NEVER opt in; `cargo build --release` omits dev-loop binary entirely (`src-tauri/src/dev.rs` L8 `#[cfg(debug_assertions)]`).
- `src-tauri/capabilities/default.json` — Auto-generated by `scripts/gen-capabilities.ts` from `src/lib/spawn-args.shared.ts` (SSOT for spawn args). Allowlists `claude-bin` (claude CLI) with strict per-arg `validator` regexes (12 positional + 1 free-form prompt). Wildcards (`"args": true`, literal `"*"`) blocked by `scripts/audit-capabilities.sh`.

**Linting / Formatting:**
- No `.eslintrc*`, `.prettierrc*`, `eslint.config.*`, `biome.json`, `.stylelintrc*` present. The project relies on `svelte-check` + `tsc --strict` + `cargo clippy` / `cargo fmt` (Rust convention) instead of dedicated linters.

## Platform Requirements

**Development:**
- macOS Ventura 13.4+ (Intel). Apple Silicon supported by all deps but not the validated baseline (`.planning/dependencies.md` L198-200).
- macOS system CLIs required for dev feedback loop: `/usr/sbin/screencapture`, `/usr/sbin/lsof`, `/usr/bin/tee` (POSIX). See `.planning/dependencies.md` Group 11.
- Node ≥22 (for `--experimental-strip-types` to read `scripts/gen-capabilities.ts`).
- Rust 1.88 pinned via `rust-toolchain.toml`.
- The `claude` CLI binary on PATH — invoked as subprocess via `tauri-plugin-shell`, authenticated by the user's interactive OAuth subscription session (`~/.claude/`).
- Chrome DevTools MCP + Playwright MCP — environment-provided via `~/.claude/settings.json` (used by `verify.*` SDK handlers). Not bundled.

**Production:**
- Single-user desktop app (`dev.mneme.app` identifier per `src-tauri/tauri.conf.json` L5). Never distributed.
- Bundle targets: `all` (i.e. `.dmg`, `.app`) — but practically the user runs `npm run tauri dev` for daily use; release binary is rarely built (per `CLAUDE.md` "personal use only" framing).
- No CI pipeline, no remote deployment.

---

*Stack analysis: 2026-05-14*
