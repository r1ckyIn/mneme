<!-- refreshed: 2026-05-14 -->
# Architecture

**Analysis Date:** 2026-05-14

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  Tauri 2 Host Window (dev.mneme.app · macOS · 1280×860 · Overlay titlebar)   │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  WebView (WKWebView · SvelteKit SPA · adapter-static · CSP nonce-mode) │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │  │  +layout.svelte  (token import · DEV-only forwarder install)     │  │  │
│  │  │  +page.svelte    (.stage · .window · titlebar · Splitter)        │  │  │
│  │  └──────────────────────────────────────────────────────────────────┘  │  │
│  │  ┌──────────────┬───────────────────────────┬──────────────────────┐   │  │
│  │  │  Left pane   │   Middle pane (2-row)     │     Right pane       │   │  │
│  │  │  FileArea    │   ┌──────────────────┐    │     ChatPanel        │   │  │
│  │  │  (Finder     │   │  LectureVideo    │    │     ├─ UserBubble    │   │  │
│  │  │   listing,   │   │  (Echo360        │    │     ├─ Assistant     │   │  │
│  │  │   mock 5     │   │   placeholder)   │    │     │   Message      │   │  │
│  │  │   rows)      │   ├──────────────────┤    │     ├─ ToolUseGroup  │   │  │
│  │  │              │   │  FilePreview     │    │     ├─ UsageMeter    │   │  │
│  │  │              │   │  (PDF/md         │    │     └─ ChatFooter    │   │  │
│  │  │              │   │   placeholder)   │    │                      │   │  │
│  │  └──────────────┴───┴──────────────────┴────┴──────────────────────┘   │  │
│  │  ┌────────────────────────────────────────────────────────────────┐    │  │
│  │  │  MindMapBar (120px bottom row · SVG mock concept chips)        │    │  │
│  │  └────────────────────────────────────────────────────────────────┘    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│            │                                                                  │
│            │  Tauri IPC (invoke / @tauri-apps/api)                            │
│            ▼                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Rust backend  (`src-tauri/src/lib.rs` — `app_lib::run()`)             │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │  │
│  │  │ SessionRegistry  │  │  kill_pgid       │  │  DevWriter           │  │  │
│  │  │ (HashMap<id,     │  │  (SIGTERM 2s →   │  │  (mpsc → 3 log       │  │  │
│  │  │  ChildHandle>)   │  │   SIGKILL on PG) │  │   writer tasks)      │  │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │  │
│  │  Invoke handlers (debug): register_session_pid, clear_session_pid,     │  │
│  │   stop_session, dev_log_console_entry, dev_log_network_entry,          │  │
│  │   dev_log_perf_entry, dev_capture_screenshot, dev_query_state          │  │
│  │  Invoke handlers (release): register_session_pid, clear_session_pid,   │  │
│  │   stop_session                                                          │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│            │                                                                  │
│            │  tauri-plugin-shell  (Command::create("claude-bin", args))       │
│            ▼                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  claude CLI subprocess (one per chat session · own process group)      │  │
│  │  argv: --print --permission-mode bypassPermissions                     │  │
│  │        --output-format stream-json --include-partial-messages          │  │
│  │        --verbose --max-turns 30 --add-dir ~/.mneme/scratch             │  │
│  │        --exclude-dynamic-system-prompt-sections <prompt>               │  │
│  │  stdout: NDJSON stream events → dispatchEvent() 6-arm router           │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  Side channel (debug builds only · gitignored):                               │
│   .dev-logs/{console,network,perf}.log + screenshots/ + dev-server.pid       │
│   ↑ produced by Svelte forwarder via dev_log_* + dev_capture_screenshot      │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Rust entry point | Thin binary main; defers to `app_lib::run()`. | `src-tauri/src/main.rs` |
| Tauri builder + lifecycle | Plugin init, registry mgmt state, debug/release invoke-handler split, `WindowEvent::CloseRequested` + `RunEvent::ExitRequested` union to drain subprocesses. | `src-tauri/src/lib.rs` |
| SessionRegistry | HashMap<SessionId, ChildHandle> behind Mutex; extension-friendly for Phase 3 multi-session. Owns `kill_all()` drain. | `src-tauri/src/session.rs` |
| kill_pgid | Process-group SIGTERM 2s grace → SIGKILL via `nix::killpg`; load-bearing for REQ-3 (zero-zombie close). | `src-tauri/src/lib.rs` (lines 41-48) |
| Dev signal sink | 5 dev-only Tauri commands (`dev_log_*`, `dev_capture_screenshot`, `dev_query_state`) + DevWriter mpsc + 3 batched writer tasks with rotation. | `src-tauri/src/dev.rs` |
| Dev CLI bridge | `dev-invoke` binary lets npm-script bridges (`gsd-dev-*.mjs`) trigger screencapture + snapshot without an in-app round trip. | `src-tauri/src/bin/dev_invoke.rs` |
| SvelteKit root layout | Imports tokens, installs DEV-only console forwarder via dynamic import + `import.meta.env.DEV` guard. | `src/routes/+layout.svelte` |
| SvelteKit SPA config | Disables SSR, enables prerender (static SPA shell). | `src/routes/+layout.ts` |
| Three-pane shell | `.stage` matte frame + `.window` cream surface + 36px overlay titlebar + `Splitter` instance. | `src/routes/+page.svelte` |
| Pane splitter | CSS-grid 3-column + 2-row layout with pointer-capture drag handles, localStorage persistence (`mneme.layout.split`). | `src/lib/components/Splitter.svelte` |
| Left pane | Finder-style mock file listing (hardcoded 5 rows) for the active course. | `src/lib/components/FileArea.svelte` |
| Middle top pane | Lecture video placeholder card (Echo360 wired in Phase 4). | `src/lib/components/LectureVideo.svelte` |
| Middle bottom pane | PDF/markdown preview placeholder card. | `src/lib/components/FilePreview.svelte` |
| Right pane | Claude conversation surface — spawns `claude-bin`, owns stream loop + UI state. | `src/lib/components/ChatPanel.svelte` |
| User bubble | Right-aligned cream-deep bubble; plain-text only. | `src/lib/components/UserBubble.svelte` |
| Assistant message | Renders pre-sanitized markdown HTML + runs `renderKatexInDom` in rAF-batched `$effect`. | `src/lib/components/AssistantMessage.svelte` |
| Tool-use group | Collapsible `<details>` driven by dispatch state's `toolUseGroup.open`; header text derived via `gerundHeader` / `pastTenseHeader`. | `src/lib/components/ToolUseGroup.svelte` |
| Usage meter | Reads `dispatchState.totalInputTokens` + session start time. | `src/lib/components/UsageMeter.svelte` |
| Chat footer | Auto-mode dropdown, vault-context toggle, model pill, send/stop slot. | `src/lib/components/ChatFooter.svelte` |
| Titlebar meta | Right-aligned `claude-code · {status} · vault: {path}` + settings cog; reads from `connection-state.svelte`. | `src/lib/components/TitlebarMeta.svelte` |
| Settings modal | Native `<dialog>` placeholder (full UI in Phase 2). | `src/lib/components/SettingsModal.svelte` |
| Mind-map bar | Bottom 120px row with static SVG concept chips (KG-derived view in Phase 7+8). | `src/lib/components/MindMapBar.svelte` |
| Drag handle | 5 reusable placeholder handles (one per region) — visual only in Phase 1. | `src/lib/components/DragHandle.svelte` |
| Stream dispatcher | 6-arm event router for `claude --output-format stream-json` (system / stream_event / assistant / user / rate_limit_event / result). | `src/lib/stream-dispatch.ts` |
| Spawn args SSOT (browser-safe) | `buildClaudeArgs(prompt, scratchDir)` + `SCRATCH_DIR_REGEX` + `MAX_TURNS`; defense-in-depth scratchDir regex check. | `src/lib/spawn-args.shared.ts` |
| Spawn args (Node-only) | Resolves `~/.mneme/scratch` for `scripts/gen-capabilities.ts`; never bundled to webview. | `src/lib/spawn-args.node.ts` |
| Sanitize pipeline | `marked` → DOMPurify → KaTeX render-to-string → DOMPurify; `renderKatexInDom` walks text nodes. | `src/lib/sanitize.ts` |
| Connection state | Module-scope `$state` for `disconnected / connecting / connected`; consumed by `TitlebarMeta`. | `src/lib/connection-state.svelte.ts` |
| Console forwarder (DEV-only) | 8 signal classes monkey-patched, invoke into Tauri dev commands, registers `__mnemeDevSnapshot__()` global. | `src/lib/dev/console-forwarder.ts` |
| Snapshot selectors | Static list of CSS selectors harvested by `__mnemeDevSnapshot__`. | `src/lib/dev/snapshot-selectors.ts` |
| Capability generator | Reads spawn-args SSOT + Node-side scratchDir; emits `src-tauri/capabilities/default.json`. | `scripts/gen-capabilities.ts` |
| Capability audit gate | Husky pre-commit + prebuild; 8 checks (SSOT drift, wildcard guard, --bare absence, etc.). | `scripts/audit-capabilities.sh` |
| Dev bridge scripts | `gsd-dev-screenshot.mjs` / `gsd-dev-snapshot.mjs` / `gsd-dev-scan-logs.mjs` — npm-script entry points used by GSD verify-work. | `scripts/gsd-dev-*.mjs` |
| Vendored stream-json parser | Type-only consumption of `ClaudeEvent` envelope; no runtime dep on the vendor module (KD-12). | `vendor/claude-code-parser/src/types/protocol.ts` |

## Pattern Overview

**Overall:** Tauri 2 desktop shell + SvelteKit SPA frontend + Rust subprocess lifecycle manager + locally-spawned `claude` CLI as the AI engine.

**Key Characteristics:**

- **Subprocess-wrapper architecture** — the Tauri app is a UX shell, not an AI client; the local `claude` CLI is the LLM bridge, spawned per chat session via `tauri-plugin-shell` with a narrowly validated argv (KP-04 ToS compliance via the user's own subscription).
- **Single-document SPA** — SvelteKit `adapter-static` produces a pure SPA bundle (no SSR runtime); `+layout.ts` disables SSR + enables prerender. Tauri serves the static `build/` directory as the webview origin.
- **Two-process responsibility split** — the WebView owns prompt buffering, stream-event parsing, sanitization, and rendering. The Rust backend owns process group lifecycle, capability gating, and dev-feedback-loop telemetry. The two communicate only through Tauri IPC (`invoke()`) and `tauri-plugin-shell` stdio streams.
- **Build-config branch (debug vs release)** — `lib.rs` selects different `invoke_handler` registrations under `#[cfg(debug_assertions)]`; the entire `dev` module + its 5 commands vanish from release builds. Defense-in-depth: `import.meta.env.DEV` guards the forwarder install, `#[cfg(debug_assertions)]` gates the Rust module, `[[bin]] required-features = ["dev-invoke"]` gates the dev CLI binary.
- **Pure-formatter + writer-task split** in `src-tauri/src/dev.rs` — log entry formatters are pure functions (testable without Tauri runtime); a dedicated tokio task per channel batches via mpsc with 100 ms debounce and 10 MB rotation.
- **Browser-safe / Node-only file naming convention** — `*.shared.ts` files must contain zero Node imports (verified by `audit-capabilities.sh`); `*.node.ts` files are bundler-poisonous to the webview.

## Layers

**Tauri host (Rust):**

- Purpose: window chrome, OS process-group control, IPC bridge, dev signal sink.
- Location: `src-tauri/src/`
- Contains: `main.rs` (entry point), `lib.rs` (builder + handlers + kill_pgid), `session.rs` (registry), `dev.rs` (debug-only commands + writers), `bin/dev_invoke.rs` (dev CLI binary).
- Depends on: `tauri` v2, `tauri-plugin-shell` v2.3.5, `nix` v0.31 (signal/process), `tokio` v1, `objc2` + `objc2-app-kit` (macOS CGWindowID resolution).
- Used by: WebView via the `invoke()` IPC bridge; dev CLI by the npm-script bridges in `scripts/`.

**SvelteKit SPA (webview):**

- Purpose: visual surface, prompt composition, stream-json parsing, markdown + KaTeX rendering.
- Location: `src/`
- Contains: `routes/+layout.svelte` (token import + DEV forwarder install), `routes/+layout.ts` (SSR off + prerender), `routes/+page.svelte` (three-pane shell), `lib/components/*.svelte` (15 components), `lib/*.ts` (5 logic modules), `lib/dev/*.ts` (2 DEV-only modules), `lib/styles/tokens.css` (KD-13 design tokens).
- Depends on: Svelte 5 runes, `@tauri-apps/api`, `@tauri-apps/plugin-shell`, `marked`, `dompurify`, `katex`.
- Used by: the Tauri host as a static bundle (`build/`); the `claude` subprocess is consumed via stdout pipe inside `ChatPanel.svelte`.

**Build-time tooling:**

- Purpose: SSOT-driven capability generation + audit gates.
- Location: `scripts/`
- Contains: `gen-capabilities.ts` (TypeScript-stripping Node script, prebuild hook), `audit-capabilities.sh` (Husky pre-commit), `gsd-dev-*.mjs` (3 dev-loop bridge scripts), `screenshot-*.mjs` / `take-screenshot.mjs` (playwright helpers), `__tests__/*.test.mjs` (vitest covers).
- Depends on: Node 22+ (`--experimental-strip-types`), playwright (devDep transitively).
- Used by: `npm run prebuild`, Husky `pre-commit`, GSD `verify.*` SDK handlers.

**Vendored references (NOT compiled in):**

- Purpose: type-only borrows from upstream OSS without taking on the dep.
- Location: `vendor/claude-code-parser/` (MIT, KD-12)
- Contains: protocol types (`src/types/protocol.ts`), event types, parser/translator/writer (read-only reference).
- Imported as: `import type { ClaudeEvent }` from `$vendor/claude-code-parser/src/types/protocol` — types only, no runtime code.

## Data Flow

### Primary Request Path — user prompt → assistant reply

1. User types into `<textarea>` in `ChatPanel.svelte`; `sendPrompt()` fires on Enter (`src/lib/components/ChatPanel.svelte:126`).
2. `buildClaudeArgs(promptText, scratchDir)` builds a positional argv against `SCRATCH_DIR_REGEX` (`src/lib/spawn-args.shared.ts:35`).
3. `Command.create("claude-bin", args)` (Tauri plugin-shell) gates through `src-tauri/capabilities/default.json` — every argv element must match an exact regex validator.
4. `cmd.spawn()` → child PID is then passed to `invoke("register_session_pid", { pid })` which inserts a `ChildHandle` into `SessionRegistry` (`src-tauri/src/lib.rs:55`).
5. The CLI's stdout is buffered line-by-line in `ChatPanel.svelte:172`; each NDJSON line is `JSON.parse`'d and routed through `dispatchEvent(evt, dispatch)` (`src/lib/stream-dispatch.ts:96`).
6. Dispatcher's 6 arms mutate `DispatchState.messages` / `toolUseGroup` / `totalInputTokens` per event `type`.
7. After each chunk, `scheduleHtmlRecompute()` requests an rAF and recomputes the per-message sanitized HTML cache (`sanitize.ts` → `marked.parse` → DOMPurify).
8. `AssistantMessage.svelte` reads its HTML from the cache and runs `renderKatexInDom(host)` inside a `$effect` (`src/lib/components/AssistantMessage.svelte:35`).
9. On `result` event, dispatcher flips `streaming=false`, collapses `toolUseGroup.open`, and accumulates `totalInputTokens`.
10. On `cmd.on("close")`, `teardown()` clears the session pid via `invoke("clear_session_pid")` and resets connection state.

### Subprocess Termination Path — Cmd+Q / window close / stop button

1. macOS Cmd+Q dispatches `NSApplicationTerminate` → Tauri 2 surfaces as `RunEvent::ExitRequested`.
2. Window red-button dispatches `WindowEvent::CloseRequested`.
3. Stop button in `ChatPanel.svelte` calls `invoke("stop_session")` (`src-tauri/src/lib.rs:69`).
4. All three paths converge on `SessionRegistry::kill_all()` (`src-tauri/src/session.rs:47`), which drains the HashMap and calls `kill_pgid(pid)` per entry.
5. `kill_pgid` resolves the process group via `getpgid` and sends `SIGTERM`, sleeps 2 s, then unconditionally sends `SIGKILL` (`src-tauri/src/lib.rs:41`).
6. `drain_all()` is idempotent — the second hook invocation is a no-op (Tauri issue #9198 mitigation).

### Dev Feedback Loop Path — Phase 01.1 instrumentation (debug builds only)

1. `src/routes/+layout.svelte` checks `import.meta.env.DEV`; if true, dynamically imports `console-forwarder.ts` and calls `installConsoleForwarder()` (`src/routes/+layout.svelte:26`).
2. Forwarder monkey-patches 8 signal classes (5 console levels + uncaught + unhandled rejection + resource error + CSP violation + fetch + XHR + PerformanceObserver) preserving original references via `.bind(console)`.
3. Each captured signal calls `invoke("dev_log_console_entry" | "dev_log_network_entry" | "dev_log_perf_entry", payload)` with `.catch(() => {})` (D-SF-04 — never crash the loop on log-write failure).
4. The Rust side (`src-tauri/src/dev.rs`) lazily spawns a tokio writer task per channel on first invoke; tasks debounce 100 ms or flush at 256-line soft cap, rotating to `.log.1` at 10 MB.
5. Lines land in `.dev-logs/console.log` / `network.log` / `perf.log` (all gitignored).
6. GSD `verify-work` workflow invokes `npm run gsd-dev-screenshot|snapshot|scan-logs`; the npm scripts shell to `src-tauri/target/debug/dev-invoke` (built with `cargo build --bin dev-invoke --features dev-invoke`).
7. `dev_capture_screenshot("webview")` resolves the CGWindowID via `NSWindow::windowNumber()` (objc2-app-kit) and shells out to `/usr/sbin/screencapture -l <id>` (`src-tauri/src/dev.rs:362`).
8. `dev_query_state` injects a script into the webview that calls `globalThis.__mnemeDevSnapshot__()` and pipes the result back via `dev_log_console_entry` tagged "snapshot" (`src-tauri/src/dev.rs:451`).

**State Management:**

- Frontend: Svelte 5 runes (`$state`, `$derived`, `$effect`); module-scope `connection-state.svelte.ts` for cross-component reactive singletons.
- localStorage: `mneme.layout.split` (Splitter ratios), `mneme.vault.path` (TitlebarMeta vault path).
- Rust: `SessionRegistry` (`HashMap<SessionId, ChildHandle>` behind `Mutex`); `DevWriter` (per-channel `tokio::sync::Mutex<Option<Sender<String>>>` plus `log_dir`).
- No external store, no global app state outside the two registries above.

## Key Abstractions

**ClaudeEvent (stream-json envelope):**

- Purpose: discriminated union of NDJSON event shapes coming out of `claude --output-format stream-json`.
- Examples: `src/lib/stream-dispatch.ts:21` (type-only re-export from vendor); `vendor/claude-code-parser/src/types/protocol.ts`.
- Pattern: type-only import (KD-12 / D-13 vendoring contract); the vendor's runtime translator / writer / parser are not used.

**DispatchState (in-memory chat state):**

- Purpose: single mutable object the dispatcher writes to and the `ChatPanel` reactively reads.
- Shape: `{ messages: Msg[], isStreaming, resultReceived, totalCostUsd?, totalInputTokens, toolUseGroup }`.
- File: `src/lib/stream-dispatch.ts:52` (type) and `src/lib/components/ChatPanel.svelte:59` (instance via `$state(freshState())`).

**ChildHandle / SessionRegistry:**

- Purpose: Rust-side bookkeeping for spawned subprocesses; lets `kill_all()` send SIGTERM to every process group on shutdown.
- File: `src-tauri/src/session.rs:16` (handle), `src-tauri/src/session.rs:22` (registry).
- Phase 1 uses a single fixed `SessionId = 1`; Phase 3 multi-session adds Phase 3-generated ids without altering the HashMap shape.

**Spawn argv contract:**

- Purpose: the exact positional argv the CLI is allowed to receive, mirrored on three sides for defense-in-depth.
- Files: `src/lib/spawn-args.shared.ts:35` (builder + regex), `scripts/gen-capabilities.ts` (validator emitter), `src-tauri/capabilities/default.json` (runtime gate).
- Audit gate: `scripts/audit-capabilities.sh` runs `gen-capabilities.ts --dry-run` and diffs against the committed JSON before every commit.

**DevWriter mpsc pipeline:**

- Purpose: lock-free single-producer-multiple-consumer log batching with channel-per-file isolation.
- File: `src-tauri/src/dev.rs:241` (struct), `src-tauri/src/dev.rs:166` (writer task spawn).
- Properties: 100 ms debounce, 256-line soft cap, 10 MB rotation to `.log.1`, all filesystem errors swallowed (D-SF-04 — the dev loop must never crash on log-write failure).

## Entry Points

**Tauri runtime (compiled binary):**

- Location: `src-tauri/src/main.rs` → `app_lib::run()` at `src-tauri/src/lib.rs:86`.
- Triggers: user double-clicks app bundle / `npm run tauri dev` / `cargo run`.
- Responsibilities: register plugins, create `SessionRegistry`, conditionally create `DevWriter` (debug only), register invoke handlers, install lifecycle hooks, run event loop.

**Dev CLI binary (debug-only):**

- Location: `src-tauri/src/bin/dev_invoke.rs`.
- Triggers: `npm run gsd-dev-screenshot` / `gsd-dev-snapshot` shells into `target/debug/dev-invoke` (built with `--features dev-invoke`).
- Responsibilities: parse argv, shell out to `screencapture` or drop a request file the running app polls.

**SPA bootstrap:**

- Location: `src/routes/+layout.ts` (config — SSR off, prerender true), `src/routes/+layout.svelte` (token import + DEV forwarder install), `src/routes/+page.svelte` (the only route — three-pane shell).
- Triggers: webview navigates to the static bundle's `index.html`.
- Responsibilities: install dev-feedback-loop forwarder under `import.meta.env.DEV`, render the `.stage` matte frame + `.window` + `Splitter` shell.

**Build-time entry points:**

- `npm run prebuild` → `scripts/gen-capabilities.ts` + `scripts/audit-capabilities.sh`.
- Husky pre-commit (`.husky/pre-commit`) → `audit-capabilities.sh` + `vitest run --changed`.
- `npm test` → Vitest discovers `tests/**/*.test.ts`, `src/**/*.test.ts`, `scripts/__tests__/**/*.test.mjs`.
- `cargo test` (in `src-tauri/`) → unit tests in `src/dev.rs`, integration tests in `src-tauri/tests/{dev_log_rotation,kill_pgid}.rs`.

## Architectural Constraints

- **Threading:** Single Tauri main thread + tokio multi-thread runtime for `DevWriter` writer tasks; subprocess stdio runs on `tauri-plugin-shell`'s internal threads. The WebView is single-threaded JavaScript with rAF-batched DOM writes; KaTeX walks are scheduled inside `requestAnimationFrame`.
- **Process model:** One Tauri host process + N `claude` CLI subprocesses (Phase 1 N=1; Phase 3 N=many). Each `claude` subprocess runs in its own process group so `killpg` cleans up the whole tree (CLI + any tool subprocesses it spawns).
- **CSP:** `'self' wasm-unsafe-eval` for `script-src` (nonce-mode in dev for SvelteKit bootstrap, SHA-256 hash at build time for the prerendered path). `'unsafe-inline'` MUST NOT be added to `script-src` (REQ-5). `style-src 'unsafe-inline'` is intentionally permissive (Svelte 5 scoped styles); narrowing to nonce-style is a v1.x candidate. `connect-src 'self' ws: http://localhost:*` is required for Vite HMR (dev-only).
- **License posture for the binary:** No AGPL-licensed dependency may be linked. Marker (GPL-3.0) and MinerU (AGPL-3.0) are isolated through subprocess invocation so the process boundary preserves linkage cleanliness. `claude-code-parser` (MIT) is vendored type-only (KD-12).
- **Capability surface (REQ-4):** Every `claude` argv element matches exact regex validators in `capabilities/default.json`. Wildcards (`"args": true` / literal `"*"`) are forbidden. `--bare` is forbidden (strips OAuth keychain reads). `--max-turns 30` is mandatory.
- **Browser-safety guard:** `src/lib/spawn-args.shared.ts` must contain zero Node imports; `*.node.ts` files must never be imported from a Svelte page or component (enforced by `audit-capabilities.sh`).
- **Build-flag gates:** Dev-only Rust commands are triple-gated — `#[cfg(debug_assertions)]` on the module, `[[bin]] required-features = ["dev-invoke"]` on the dev CLI binary, debug/release `invoke_handler` split in `lib.rs`. Verified empirically via `nm target/release/mneme` (zero `dev_*` symbols).

## Anti-Patterns

### Bundling Node builtins into the webview

**What happens:** Importing `homedir` from `node:os` inside a file consumed by `ChatPanel.svelte` — Codex Cycle-1 review HIGH-1 caught this in the original single-file `spawn-args.ts`.

**Why it's wrong:** Vite's webview bundle has no Node runtime; the build either errors out or produces a chunk that fails at first invocation in the WKWebView.

**Do this instead:** Split into `*.shared.ts` (browser-safe; only used by SvelteKit pages) and `*.node.ts` (Node-only; only used by `scripts/`). See the contract in `src/lib/spawn-args.shared.ts:1` and the enforcement in `scripts/audit-capabilities.sh` check 7.

### Re-rendering finalized markdown for every stream chunk

**What happens:** A naive implementation parses `marked` + DOMPurify + KaTeX on every `text_delta` event, blocking the main thread.

**Why it's wrong:** Anthropic's SSE batches deltas at sub-50 ms cadence; without coalescing, the WebView saturates and stream UI stutters.

**Do this instead:** Buffer chunks in `Msg.text` (`src/lib/stream-dispatch.ts:118`), coalesce sanitize+render inside `requestAnimationFrame` via `scheduleHtmlRecompute()` (`src/lib/components/ChatPanel.svelte:103`).

### Killing only the PID instead of the process group

**What happens:** A naive `process.kill(pid)` sends SIGTERM only to the parent CLI, leaving its tool subprocesses orphaned.

**Why it's wrong:** Zombie accumulation on Cmd+Q (T-1-01 in the Phase 1 threat model); Activity Monitor fills with `claude` + downstream child processes.

**Do this instead:** Always send to the process group: `nix::killpg(getpgid(pid), SIGTERM)` then 2 s grace then `SIGKILL`. See `src-tauri/src/lib.rs:41` and the integration test at `src-tauri/tests/kill_pgid.rs`.

### Renaming module without the `.svelte.ts` suffix when using $state at module scope

**What happens:** Module-level `$state` rune declared in a plain `.ts` file silently degrades to a non-reactive plain object.

**Why it's wrong:** Cross-component subscribers see stale values; the bug is silent — no error at compile time.

**Do this instead:** Use `*.svelte.ts` (or `*.svelte.js`) for any module that exports a `$state` rune for cross-component consumption. See `src/lib/connection-state.svelte.ts:14`.

### Skipping the second close hook

**What happens:** Registering only `WindowEvent::CloseRequested` and assuming Cmd+Q will route through it.

**Why it's wrong:** Tauri issue #9198 — some macOS versions silently fire `RunEvent::ExitRequested` instead. Without the union, the subprocess never gets the kill signal.

**Do this instead:** Hook BOTH events and call `kill_all()` from each; `drain_all()` makes the second invocation a safe no-op. See `src-tauri/src/lib.rs:127` + `:139`.

## Error Handling

**Strategy:** Display first; never crash. Subprocess and IPC errors surface in the chat as system bubbles with an `error` border-left tint; sanitize errors render an inline `[KaTeX error: …]` span; log-write errors in the dev pipeline are silently swallowed (D-SF-04).

**Patterns:**

- **System bubble for errors:** `ChatPanel.svelte` catches `Command.create` exceptions, spawn rejections, and `cmd.on("error")` events, pushing a `Msg` with `role: "system"` and an `escapeHtml`-cleaned text body (`src/lib/components/ChatPanel.svelte:159`).
- **Dispatcher escape pre-pass:** any system / error subtype goes through `escapeHtmlMin` before being stored in `state.messages` (`src/lib/stream-dispatch.ts:106`).
- **Sanitize defense-in-depth:** KaTeX called with `throwOnError: false`; even so, a try/catch wraps the call and the error message itself is `escapeHtml`'d before insertion (`src/lib/sanitize.ts:62`).
- **Dispatch idempotence:** `teardown()` is reentrant — `finalizeOnce` is set to null after running; `invoke("clear_session_pid").catch(() => {})` swallows duplicate clear attempts (`src/lib/components/ChatPanel.svelte:262`).
- **Rust side log-write errors:** `start_log_writer` swallows file open + write + rename errors so the writer task survives transient FS issues (`src-tauri/src/dev.rs:200`).

## Cross-Cutting Concerns

**Logging:**

- Production WebView: `console.log` only; no logger library (KaTeX errors go to chat surface, not console).
- DEV WebView: `console.*` is monkey-patched by the forwarder; the original is preserved via `.bind(console)` so devtools still receive entries.
- Rust: no `log` / `tracing` crate; `println!` / `eprintln!` from `dev_invoke.rs` only; dev_log_* commands write to disk via DevWriter.

**Validation:**

- WebView prompt-time: `SCRATCH_DIR_REGEX` check before `buildClaudeArgs` returns; `buildClaudeArgs` throws if regex mismatches (defense-in-depth).
- Build-time: `scripts/audit-capabilities.sh` enforces 8 invariants — SSOT drift, wildcard absence, --bare absence, --max-turns presence, vendored parser non-installation, browser-safety, legacy-file absence.
- IPC-time: `tauri-plugin-shell` checks every argv element against the regex array in `capabilities/default.json` before invoking the OS `execve`.

**Authentication:** None at app level. The `claude` CLI handles its own OAuth via the user's macOS keychain; `--bare` is forbidden because it strips keychain reads (KP-04 — token theft attack surface).

**Markdown + math safety:** All HTML inserts on the chat surface route through `sanitizeMarkdown()` (`src/lib/sanitize.ts:43`); user text is plain-text only (Svelte auto-escapes); KaTeX output is sanitized at the source. `{@html}` sites are minimal and annotated (`ChatPanel.svelte:465`, `AssistantMessage.svelte:53`).

---

*Architecture analysis: 2026-05-14*
