# External Integrations

**Analysis Date:** 2026-05-14

## APIs & External Services

**Claude Code subprocess (currently the only external "service" wired):**
- **Claude CLI (`claude` binary)** — Invoked as local subprocess via `tauri-plugin-shell`. Communicates over stdin / stdout / stderr using `--output-format stream-json` NDJSON.
  - Frontend spawn site: `src/lib/components/ChatPanel.svelte` L156-208 (`Command.create("claude-bin", buildClaudeArgs(...))`).
  - Argument SSOT: `src/lib/spawn-args.shared.ts` (browser-safe constants) + `src/lib/spawn-args.node.ts` (Node-only `SCRATCH_DIR` resolver via `node:os`).
  - Locked spawn flags: `--print --permission-mode bypassPermissions --output-format stream-json --include-partial-messages --verbose --max-turns 30 --add-dir ~/.mneme/scratch --exclude-dynamic-system-prompt-sections <prompt>`.
  - Forbidden flags (audit-gated): `--bare` (would strip OAuth keychain reads — silent auth fail). See `scripts/audit-capabilities.sh` L56-60.
  - Stream event parser: `src/lib/stream-dispatch.ts` — 6-arm router (`system` / `stream_event` / `assistant` / `user` / `rate_limit_event` / `result`). Type-only import from vendored `vendor/claude-code-parser/src/types/protocol`.
  - Auth: user's OAuth subscription via `~/.claude/` — NO API key passed by mneme. Confirmed in `src/lib/spawn-args.shared.ts` L26-29 ("`--bare` MUST be ABSENT").

**Anthropic Claude API (HTTPS — planned, not yet wired):**
- Per `.planning/dependencies.md` Group 7, two future call sites are planned:
  - **Citations API** (Phase 9 — REQ-08 anchored mode) — Auth: API key (NOT OAuth subscription).
  - **Translation for VTT bilingual captions** (Phase 6 — REQ-05) — Auth: API key.
- Neither is implemented in the current source tree. No `@anthropic-ai/sdk`, no `fetch("https://api.anthropic.com/...")` in `src/`.

**Echo360 (USYD-scoped lecture video — planned, not yet wired):**
- Per `.planning/dependencies.md` Group 7: embedded Tauri webview, persistent cookies for USYD SSO. NO direct REST API consumption from mneme code.
- Phase 5 spike (KD-11) must validate macOS WKWebView ITP cookie behaviour before Phase 6 design.
- Placeholder UI: `src/lib/components/LectureVideo.svelte` ("EchoVideo wired in Phase 4" copy at L31).

**Canvas + Ed Discussion (planned, not yet wired):**
- Per `.planning/dependencies.md` Group 7: accessed via user's own Canvas/Ed MCP server (user OAuth, not mneme-managed). Phase 2 (REQ-03).
- ⚡ REQ-03 currently retired and pending re-write to "self-ecosystem manual import + UniBoard bridge" (see `.planning/PROJECT.md` L80).

**Ollama HTTP API (planned, not yet wired):**
- `http://localhost:11434` — future v2 vector path (`nomic-embed-text` embeddings). Per `.planning/dependencies.md` Group 7, no auth.

## Data Storage

**Databases:**
- None wired in the current codebase. Vault is filesystem-only.
- Planned (`.planning/dependencies.md` Group 4, Phase 2+): `rusqlite` (Rust SQLite client). Future v2: `sqlite-vec` 0.1.9 for embedded vector search.

**File Storage:**
- Local filesystem only (KP-01 — local-first non-negotiable).
- `~/.mneme/scratch/` — Auto-created on app startup (`src-tauri/src/lib.rs` L122-124 via `home::home_dir()`). Passed to claude CLI as `--add-dir` — the only directory the spawned subprocess may write to.
- `.dev-logs/` — Dev-only ephemeral telemetry sink (`src-tauri/src/lib.rs` L95-96). Gitignored except for `.gitkeep` + `README.md` (`.gitignore` L57-60). Files: `dev-server.pid`, `dev-server.port`, `tauri.log`, `console.log`, `network.log`, `perf.log`, `<file>.log.1` rotation backup, `screenshots/<iso-ts>.png`.
- Future planned vault root: `~/Mneme/<semester>/` (placeholder UI references: `src/lib/components/LectureVideo.svelte` L16, `src/lib/components/FilePreview.svelte` L19).

**Caching:**
- None. The Marker subprocess (Phase 4 future) will auto-download model weights into a local cache on first run (`.planning/dependencies.md` Group 8).

## Authentication & Identity

**Auth Provider:**
- **Indirect — Claude OAuth subscription via the `claude` CLI's own keychain reads.** mneme never sees credentials.
  - Implementation: spawn `claude` with NO `--bare` flag so it can read `~/.claude/`. `src/lib/spawn-args.shared.ts` L26-29 documents the failure mode if `--bare` is added: silent auth failure (spike F4/F6).
  - Defense: audit script greps `src-tauri/capabilities/default.json` for any validator regex containing `"bare"` and fails the build (`scripts/audit-capabilities.sh` L56-60).
- No mneme-side login UI, no token storage, no session cookies for the chat subprocess.
- Future Echo360 will use USYD SSO via embedded webview (cookie-scoped).
- Future Canvas / Ed via user's own MCP server's OAuth (delegated, not mneme-managed).

## Monitoring & Observability

**Error Tracking:**
- None. No Sentry / Datadog / Rollbar / Bugsnag.
- Dev-only forwarder pipeline (`#[cfg(debug_assertions)]`-gated):
  - Frontend `src/lib/dev/console-forwarder.ts` patches `console.{log,info,debug,warn,error}` + `window error` + `unhandledrejection` + `securitypolicyviolation` + `fetch` + `XMLHttpRequest` + `PerformanceObserver` → invokes Tauri commands.
  - Rust handlers in `src-tauri/src/dev.rs` (`dev_log_console_entry`, `dev_log_network_entry`, `dev_log_perf_entry`) write into `.dev-logs/console.log`, `.dev-logs/network.log`, `.dev-logs/perf.log` via mpsc + 100 ms debounced batched writer with 10 MB rotation backup.
  - Production builds tree-shake the entire forwarder branch (`src/routes/+layout.svelte` L26-30 `if (import.meta.env.DEV)`). Verified via grep on `dist/` per `D-SF-05`.

**Logs:**
- Frontend `console.*` chained to native console (via captured original refs at install time, `src/lib/dev/console-forwarder.ts` L129-141) — preserved so devtools still see output. In parallel, every line is dispatched to the Rust writer task.
- Rust side uses `eprintln!` / silent `let _ =` swallow for I/O errors per `D-SF-04` (`src-tauri/src/dev.rs` L223-228). No structured logger (`tracing` / `log`) wired.

## CI/CD & Deployment

**Hosting:**
- None — desktop app, single-user. Per project `CLAUDE.md` L4: "personal use only; not distributed".

**CI Pipeline:**
- No GitHub Actions / GitLab CI / CircleCI config present.
- Local pre-commit gate via husky: `.husky/pre-commit` runs `scripts/audit-capabilities.sh` (REQ-4 audit) + `npx vitest run --changed` (changed-file vitest). Sub-5s target.
- `prebuild` npm script (`package.json` L14) runs `node --experimental-strip-types scripts/gen-capabilities.ts && bash scripts/audit-capabilities.sh` before every `npm run build`.

## Environment Configuration

**Required env vars:**
- None for the current codebase. App is fully self-contained against the local file system + `claude` CLI subprocess.
- Future (planned, not wired): no env-var leak surface yet — `.gitignore` already defensively excludes `.env*`.

**Secrets location:**
- No mneme-owned secrets. Subprocess Claude credentials live in `~/.claude/` (managed entirely by the upstream `claude` CLI; mneme has no read path).

## Webhooks & Callbacks

**Incoming:**
- None. No HTTP server runs in the app.

**Outgoing:**
- None at code level (the chat flow is a stdin/stdout dialogue with a local subprocess, not network egress from mneme itself).
- Dev-only: Vite HMR WebSocket (`ws://localhost:5173`) — internal dev tooling, dev profile only. CSP `connect-src 'self' ws: http://localhost:*` (`svelte.config.js` L30) only widens dev CSP for this loop.

## Subprocess / IPC Surfaces

**`tauri-plugin-shell` allowlist (`src-tauri/capabilities/default.json`):**
- Single command allowed: `claude-bin` → resolves to `claude` binary on PATH.
- Per-arg `validator` regex enforces the exact 12-arg spawn shape from `src/lib/spawn-args.shared.ts`:
  1. `^--print$`
  2. `^--permission-mode$`
  3. `^bypassPermissions$`
  4. `^--output-format$`
  5. `^stream-json$`
  6. `^--include-partial-messages$`
  7. `^--verbose$`
  8. `^--max-turns$`
  9. `^30$`
  10. `^--add-dir$`
  11. `^/Users/[^/]+/\.mneme/scratch$` (SCRATCH_DIR_REGEX)
  12. `^--exclude-dynamic-system-prompt-sections$`
  13. `.+` (free-form prompt — last positional)
- Both `shell:allow-spawn` and `shell:allow-execute` use the same allowlist (`src-tauri/capabilities/default.json`).

**Tauri IPC commands (frontend → Rust):**
- Production (always available):
  - `register_session_pid(pid: u32)` — Frontend reports spawned subprocess PID after `Command.spawn()` for tracking. `src-tauri/src/lib.rs` L54-59.
  - `clear_session_pid()` — Frontend reports subprocess naturally closed. `src-tauri/src/lib.rs` L61-66.
  - `stop_session()` — Stop button triggers `kill_all()` (SIGTERM → 2s grace → SIGKILL on the entire process group). `src-tauri/src/lib.rs` L68-74.
- Debug-only (`#[cfg(debug_assertions)]`-gated, not present in release builds):
  - `dev_log_console_entry`, `dev_log_network_entry`, `dev_log_perf_entry` — Sink dev forwarder signals into `.dev-logs/*.log` (`src-tauri/src/dev.rs` L298-351).
  - `dev_capture_screenshot(scope: "webview"|"window")` — Shells out to `/usr/sbin/screencapture` with `-l <CGWindowID>` or `-R x,y,w,h` (`src-tauri/src/dev.rs` L361-410).
  - `dev_query_state()` — Evals JS in the webview to invoke `globalThis.__mnemeDevSnapshot__()` and pipe the result back via `dev_log_console_entry` (`src-tauri/src/dev.rs` L450-485).

**Tauri lifecycle hooks (Rust → process):**
- `WindowEvent::CloseRequested` AND `RunEvent::ExitRequested` both call `SessionRegistry::kill_all()` (`src-tauri/src/lib.rs` L127-147). Defense-in-depth per Tauri issue #9198 (one or the other may silently no-op on some macOS versions).
- Process group cleanup via `nix::killpg` SIGTERM → 2s sleep → SIGKILL (`src-tauri/src/lib.rs` L41-48). Closes T-1-01 (zombie subprocess accumulation on Cmd+Q).

**Dev-only CLI binary:**
- `src-tauri/target/debug/dev-invoke` — Built only when `cargo build --bin dev-invoke --features dev-invoke` is invoked. Provides host-shell entry point for the npm-script bridge (`scripts/gsd-dev-screenshot.mjs`, `scripts/gsd-dev-snapshot.mjs`) without an in-app round-trip. Triple-gated: `#![cfg(debug_assertions)]` + `required-features = ["dev-invoke"]` + invoke-handler split in `lib.rs`.

## MCP Servers (environment-provided, dev-only)

Wired by the GSD verify-work workflow, not by mneme runtime. Listed for context (consumers of `.dev-logs/`):
- `chrome-devtools-mcp` — Chromium-surface signals: `list_console_messages`, `list_network_requests`, `take_screenshot`. Not applicable to the Tauri shell branch; mneme uses the macOS-native `screencapture` path instead.
- `playwright` MCP — Accessibility-tree + visual diff. Used optionally per phase by the `automated_ui_verification` branch.
- See `.planning/dependencies.md` Group 11 for the full table.

---

*Integration audit: 2026-05-14*
