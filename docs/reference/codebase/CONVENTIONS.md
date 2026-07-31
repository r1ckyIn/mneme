# Coding Conventions

**Analysis Date:** 2026-05-14

## Naming Patterns

**Files (TypeScript / Svelte):**
- Library modules: `kebab-case.ts` — e.g. `src/lib/sanitize.ts`, `src/lib/stream-dispatch.ts`, `src/lib/spawn-args.shared.ts`
- Svelte components: `PascalCase.svelte` — e.g. `src/lib/components/ChatPanel.svelte`, `src/lib/components/AssistantMessage.svelte`, `src/lib/components/UserBubble.svelte`
- Reactive module-scope state: `<name>.svelte.ts` suffix mandatory — e.g. `src/lib/connection-state.svelte.ts` (Svelte 5 requires this so `$state` works across module boundaries)
- Environment-suffixed split modules: `<base>.<env>.ts` — e.g. `spawn-args.shared.ts` (browser-safe) + `spawn-args.node.ts` (Node-only). The `.shared` / `.node` suffix is enforced and tested — see `tests/spawn-args.test.ts` lines 95-129
- Test files co-located with source: `<source>.test.ts` next to `<source>.ts` (e.g. `src/lib/dev/console-forwarder.test.ts` alongside `console-forwarder.ts`)
- Test files under top-level `tests/`: same `*.test.ts` suffix — e.g. `tests/sanitize.test.ts`, `tests/stream-dispatch.test.ts`
- Node ESM scripts: `*.mjs` — e.g. `scripts/gsd-dev-screenshot.mjs`, `scripts/take-screenshot.mjs`
- Script tests: `*.test.mjs` under `scripts/__tests__/`

**Files (Rust):**
- `snake_case.rs` — e.g. `src-tauri/src/session.rs`, `src-tauri/src/dev.rs`, `src-tauri/tests/kill_pgid.rs`, `src-tauri/tests/dev_log_rotation.rs`
- Tauri commands and the session registry live at top-level `src-tauri/src/*.rs` (parallel files) — no `commands/` subdirectory. New domain modules are added as siblings of `session.rs` / `dev.rs` (this rule is asserted in `.planning/phases/01.1-dev-feedback-loop-infrastructure/01.1-PATTERNS.md`)

**Functions (TypeScript):**
- `camelCase` verbs — e.g. `sanitizeMarkdown`, `renderKatex`, `escapeHtml`, `dispatchEvent`, `freshState`, `buildClaudeArgs`, `installConsoleForwarder`, `setStatus`
- Internal helpers stay unexported with the same casing — e.g. `findOrCreateStreamingAssistant`, `escapeHtmlMin`, `classifyTool`, `pluralize`, `buildHeader` in `src/lib/stream-dispatch.ts`
- Boolean-returning helpers use `is` / `has` prefix style only when needed; the codebase mostly uses descriptive verbs (e.g. `pid_alive` in Rust, `runScan` in scripts)

**Functions (Rust):**
- `snake_case` — e.g. `kill_pgid`, `format_console_entry`, `format_network_entry`, `format_perf_entry`, `iso8601_now`, `is_leap`, `start_log_writer`, `resolve_cg_window_id`
- Tauri commands keep the `dev_` / domain prefix to match the JS-side `invoke()` string — e.g. `dev_log_console_entry`, `dev_capture_screenshot`, `register_session_pid`, `stop_session`

**Types and interfaces (TypeScript):**
- `PascalCase` for `type` aliases and `interface` shapes — e.g. `ClaudeEvent`, `Msg`, `ToolUseEntry`, `ToolUseGroup`, `DispatchState`, `ConnectionStatus`, `Props`
- String-literal unions over enums for closed sets — e.g. `type ConnectionStatus = "connected" | "connecting" | "disconnected"` in `src/lib/connection-state.svelte.ts`; `role: "user" | "assistant" | "tool" | "system"` in `src/lib/stream-dispatch.ts`
- Component `Props` interface always declared inline at the top of each `.svelte` file — see `src/lib/components/UserBubble.svelte` lines 13-17 and `src/lib/components/AssistantMessage.svelte` lines 23-27

**Types and structs (Rust):**
- `PascalCase` — e.g. `ChildHandle`, `SessionRegistry`, `LogChannel`, `DevWriter`
- Type aliases for primitive IDs — e.g. `pub type SessionId = u32` in `src-tauri/src/session.rs`

**Constants:**
- TypeScript: `SCREAMING_SNAKE_CASE` for module-level immutables — e.g. `SCRATCH_DIR_REGEX`, `MAX_TURNS`, `FORBID_TAGS`, `FORBID_ATTR` in `src/lib/spawn-args.shared.ts` and `src/lib/sanitize.ts`
- Rust: `SCREAMING_SNAKE_CASE` — e.g. `ROTATION_THRESHOLD_BYTES`, `DEBOUNCE_MS`, `CHANNEL_BUFFER`, `BATCH_SOFT_CAP` in `src-tauri/src/dev.rs`; `PARENT_PID_FILE`, `CHILD1_PID_FILE`, `CHILD2_PID_FILE` in `src-tauri/tests/kill_pgid.rs`

**CSS design tokens:**
- `kebab-case` custom properties on `:root` — defined exclusively in `src/lib/styles/tokens.css`
- Naming scheme: `--<category>-<role>` (e.g. `--color-orange`, `--color-warm-dark`, `--space-4`, `--radius-md`, `--duration-fast`, `--ease-out`, `--font-serif`)
- Legacy aliases at the bottom of the same file map older `01-05` / `01-06` token names to the canonical KD-13 set — new components MUST use the canonical names from `Mneme.html` SSOT (see header comment in `tokens.css` lines 1-11)

## Code Style

**Formatting:**
- **Prettier / ESLint / stylelint are NOT configured** — there is no `.prettierrc`, `.eslintrc`, `eslint.config.*`, `biome.json`, or `.stylelintrc` anywhere in the repo
- Quote style: double quotes for TS code (`import DOMPurify from "dompurify"`), single quotes in test files (`vi.mock('@tauri-apps/api/core', ...)`) — pattern is inconsistent across files but consistent within each file
- Indent: 2 spaces in TS / Svelte / JSON; 4 spaces in Rust (rustfmt default)
- Trailing semicolons in TS — required style
- Rust: rely on `rustfmt` defaults (`cargo fmt` is not enforced by a hook but the code consistently follows it)

**Linting:**
- **Type-check is the only gate**: `npm run check` runs `svelte-kit sync && svelte-check --tsconfig ./tsconfig.json`
- TypeScript `strict: true` is enforced via `tsconfig.json` line 11; also `allowJs: true`, `checkJs: true`, `forceConsistentCasingInFileNames: true`, `moduleResolution: "bundler"`
- Pre-commit hook (`.husky/pre-commit`) runs `bash scripts/audit-capabilities.sh || exit 1` and then `npx vitest run --changed` — no formatter or linter step
- For Rust: `cargo clippy` and `cargo fmt` are project conventions but NOT wired into any hook

## Import Organization

**Order (TypeScript / Svelte):**
1. Svelte built-ins — `import { onMount, onDestroy } from "svelte";`
2. Tauri SDK imports — `@tauri-apps/api/core`, `@tauri-apps/plugin-shell`, `@tauri-apps/api/path`
3. Third-party libraries — `dompurify`, `marked`, `katex`, `vitest`
4. `$lib/*` aliased internal imports — e.g. `import { sanitizeMarkdown } from "$lib/sanitize"`
5. `$vendor/*` aliased vendored imports — e.g. `import type { ClaudeEvent } from "../../vendor/claude-code-parser/src/types/protocol"` (note: vendor uses relative path, not the alias, in `src/lib/stream-dispatch.ts` line 21)
6. Relative imports last — `./snapshot-selectors`

See `src/lib/components/ChatPanel.svelte` lines 37-55 for the canonical order.

**Path aliases (`tsconfig.json`):**
- `$lib/*` → `./src/lib/*`
- `$vendor/*` → `./vendor/*`

**Order (Rust):**
1. `std::*` — e.g. `use std::collections::HashMap; use std::sync::Mutex;`
2. Third-party crates — `nix::*`, `tauri::*`, `tokio::*`, `objc2_app_kit::*`
3. Local modules — `use session::*;`, `use crate::dev::*`

See `src-tauri/src/lib.rs` lines 10-23 and `src-tauri/src/dev.rs` lines 33-37.

## Error Handling

**TypeScript boundary errors → throw with prefixed message:**
- Module-scope validation throws with a `[<module-name>]` prefix and a self-describing diagnostic — see `src/lib/spawn-args.shared.ts` lines 36-41:
  ```typescript
  throw new Error(
    `[spawn-args] scratchDir "${scratchDir}" does not match SCRATCH_DIR_REGEX ` +
      `(${SCRATCH_DIR_REGEX}) — defense-in-depth refusal to widen spawn surface.`,
  );
  ```
- `unknown` is the type for caught errors; narrow with `instanceof Error` before reading `.message`. See `src/lib/sanitize.ts` lines 61-65 and `src/lib/dev/console-forwarder.ts` lines 200-211

**Silent swallow for telemetry / dev-only paths:**
- The dev forwarder's `invoke(...).catch(() => {})` pattern is intentional — D-SF-04 invariant: "every invoke must .catch() so a Tauri-side log-write failure never crashes the forwarder." See `src/lib/dev/console-forwarder.ts` lines 75-84 and the test pinning it in `src/lib/dev/console-forwarder.test.ts` lines 262-272

**Dispatcher fall-through writes to console, never throws:**
- The 6-arm dispatcher in `src/lib/stream-dispatch.ts` lines 235-237 logs unknown event types via `console.warn` and returns. The contract is that streaming continues even on unrecognized events
- Unknown content blocks inside `assistant` events are similarly logged via `console.warn` (line 169) — never thrown

**System errors surface as in-band UI messages:**
- A `system` event with `subtype: "error"` becomes a chat message with role `"system"` after HTML-escaping. See `src/lib/stream-dispatch.ts` lines 102-111 and the escape helper at lines 74-81

**Rust errors return `Result<T, String>` to the Tauri boundary:**
- All `#[tauri::command]` functions return `Result<T, String>` so the JS side receives a string error. See `src-tauri/src/dev.rs` lines 298-314 and 361-410
- Internal Rust helpers absorb errors with `let _ = ...` when failure must not propagate (e.g. `let _ = killpg(pgid, Signal::SIGTERM)` in `src-tauri/src/lib.rs` line 44; `let _ = file.write_all(...)` in `src-tauri/src/dev.rs` line 230)
- `unwrap_or_default()` and `.ok().unwrap_or(...)` used at boundaries where a sensible default is part of the contract — see `iso8601_now()` in `src-tauri/src/dev.rs` lines 47-84

**Safety comments on every `unsafe` block:**
- See `src-tauri/src/dev.rs` lines 423-429 for the canonical `// SAFETY:` block explaining the `ns_window()` pointer lifetime invariant. The comment must precede the `unsafe` block and explain every invariant the caller relies on

## Logging

**Frontend (browser):**
- `console.log` / `console.warn` / `console.error` are the only mechanism (no logging library)
- Tagged prefix convention: `[<source>:<event>]` — e.g. `console.log(\`[claude:init] model=...\`)`, `console.warn(\`[claude:unknown-event] ...\`)`, `console.warn(\`[claude:unknown-block] ...\`)` in `src/lib/stream-dispatch.ts`
- In dev mode (`import.meta.env.DEV`) every console call is mirrored to `.dev-logs/console.log` via the forwarder in `src/lib/dev/console-forwarder.ts` — the forwarder captures `console.{log,info,debug,warn,error}.bind(console)` BEFORE patching so devtools chain is never broken (lines 129-141)
- Production builds tree-shake the forwarder entirely; the install function is also gated by `if (!import.meta.env.DEV) return;` (line 114) as defense-in-depth

**Backend (Rust):**
- No `log` / `tracing` / `env_logger` crate — the codebase relies on `println!` and `eprintln!` in tests, and on the structured file-format `.dev-logs/*.log` for runtime traces
- Log format for dev-loop entries is a strict pipe-delimited string with a `[FRONTEND_<KIND>]<TAG>|<iso>|<message>|<source>` prefix — see formatters at `src-tauri/src/dev.rs` lines 99-130. Pipe characters in user content are escaped to `<PIPE>` (line 108) so the parser can recover all fields

## Comments

**When to comment:**
- The codebase favors heavy explanatory comments. Every non-trivial module starts with a 10-50 line header explaining:
  1. The module's role in the system (with a phase / spec / decision-id reference)
  2. CRITICAL invariants that must not be violated
  3. Cross-references to research / spike findings / review carry-forwards
- Examples: `src/lib/sanitize.ts` lines 1-15, `src/lib/stream-dispatch.ts` lines 1-20, `src/lib/spawn-args.shared.ts` lines 1-31, `src/lib/dev/console-forwarder.ts` lines 1-32, `src-tauri/src/lib.rs` lines 1-9, `src-tauri/src/dev.rs` lines 1-31

**Decision IDs and traceability:**
- Inline comments reference decision IDs (`D-SF-01`, `KD-13`, `KP-04`, `REQ-5`, `T-1-47`, `A-09`, `R1`, `E6`, `WR-01`), spike findings, review cycles (`Cycle-1 MEDIUM`, `Cycle-2 HIGH-1`), and spec line numbers (`spike-findings §7`, `Mneme.html L633-648`). These are load-bearing — they let future readers grep back to the originating decision

**TODO / FIXME markers:**
- Rare. The codebase prefers "Phase N will do X" forward-references over `TODO:` markers — e.g. `// Phase 3 will add: resume_token: Option<String>, spawned_at: Instant, ...` in `src-tauri/src/session.rs` line 19
- Avoid leaving generic `TODO:` without a phase / decision reference

**JSDoc / TSDoc:**
- Used sparingly, mainly for exported pure-function formatters in Rust (see `///` doc-comments in `src-tauri/src/dev.rs` lines 43-46, 90-98, 118-130)
- TypeScript modules tend to use plain `//` block comments rather than `/** */` JSDoc

**Code-comment language rule:**
- All code comments MUST be in plain English (no Chinese, no bilingual). The user-level rule in `CLAUDE.md` is explicit: code comments are English-only; technical discussion in chat / planning markdown is allowed in Chinese; code-file comments are not

## Function Design

**Size:**
- Functions stay under ~50 lines. Larger handlers (e.g. `dispatchEvent` at 145 lines, the `installConsoleForwarder` body at ~250 lines) are exceptions where the function is itself a switch / multi-arm dispatch that cannot be naturally split

**Parameters:**
- Object destructuring for component `Props` — `let { html, streaming = false }: Props = $props();` in `src/lib/components/AssistantMessage.svelte` line 27
- Positional arguments for small utility functions with 1-3 params — `buildClaudeArgs(promptText, scratchDir)`, `sanitizeMarkdown(text)`, `renderKatex(src, displayMode = false)`
- Default values via TS default-parameter syntax — `renderKatex(src: string, displayMode = false)`

**Return values:**
- Pure formatters return their primary type directly (no envelope) — `escapeHtml(s: string): string`, `sanitizeMarkdown(text: string): string`
- Mutating functions return `void` and document the in-place mutation in the header comment — `dispatchEvent(evt, state): void` mutates `state.messages` / `state.toolUseGroup`
- Rust commands return `Result<T, String>` at the Tauri boundary; internal helpers use `Result<T, E>` with typed errors where feasible

## Module Design

**Exports:**
- Named exports only — no `export default` in the codebase except where a framework requires it (Svelte components default-export the component; routes default-export the page)
- Module-scope `$state` exports are reactive singletons (Svelte 5 rune) — see `src/lib/connection-state.svelte.ts` line 27. The `.svelte.ts` suffix is mandatory for this pattern

**Barrel files:**
- Not used. The codebase imports directly from the module that owns the symbol — e.g. `import { dispatchEvent, freshState } from "$lib/stream-dispatch"` rather than from an `index.ts` aggregator
- Vendor types are imported by the consumer using a relative path or the `$vendor/*` alias on a per-symbol basis (no re-export from `src/lib/`)

**Module-level side effects (gated):**
- `DOMPurify.addHook(...)` runs once at module load in `src/lib/sanitize.ts` lines 24-28 — intentional, documented as idempotent
- The dev forwarder's monkey-patching is gated by `import.meta.env.DEV` AND a `globalThis.__mnemeForwarderInstalled` singleton flag (see `src/lib/dev/console-forwarder.ts` lines 119-124) so HMR-reloaded modules don't double-install

**Browser-safe / Node-only split:**
- A library module that needs to run in BOTH the WebView and a Node tool (e.g. capability codegen) is split into `<base>.shared.ts` (zero Node imports) and `<base>.node.ts` (Node imports). The split is asserted by `tests/spawn-args.test.ts` lines 99-111 which greps the shared file's source for forbidden Node imports
- This is a non-negotiable invariant — see header comment in `src/lib/spawn-args.shared.ts` lines 5-13

## Svelte 5 Conventions

**Runes:**
- `$state(...)` for reactive variables — `let prompt = $state("")`, `let dispatch = $state<DispatchState>(freshState())` in `src/lib/components/ChatPanel.svelte`
- `$props()` for component inputs — `let { html, streaming = false }: Props = $props();`
- `$effect(...)` for after-mount / after-update side effects — see `src/lib/components/AssistantMessage.svelte` lines 35-45 for the rAF-batched re-render pattern
- `bind:this={...}` for DOM refs — `bind:this={host}` then `host: HTMLDivElement | undefined = $state();`

**Module-scope reactive state requires `.svelte.ts` filename:**
- A plain `.ts` file with `$state(...)` at module scope silently degrades to a non-reactive plain object. The fix is to rename the file to `<name>.svelte.ts`. This is documented inline in `src/lib/connection-state.svelte.ts` lines 13-21

**Scoped vs global styles:**
- `<style>` in a Svelte component is scoped by default
- `:global(...)` is used to style child content rendered via `{@html ...}` — see `src/lib/components/AssistantMessage.svelte` lines 66-135 where every selector inside the assistant message body is wrapped in `:global(...)` because the HTML comes from sanitized markdown, not Svelte templates

**SSOT references in component headers:**
- Components carry a "Visual SSOT" pointer in their header comment, naming the line range in `/Users/qinyuan/Downloads/mneme/project/Mneme.html` that defines the visual contract — e.g. `Visual: Mneme.html L633-648 .msg-user .bubble`. Drift between component CSS and the prototype HTML must be reconciled by re-running the prototype-vs-impl screenshot loop

## Security Conventions

**HTML rendering is sanitize-at-source only:**
- `{@html ...}` is used in `src/lib/components/AssistantMessage.svelte` line 53, but the bytes are already DOMPurify-sanitized at the source by `sanitizeMarkdown()` in `src/lib/sanitize.ts`. This invariant is documented at the call site AND in the sanitize module header
- KaTeX output goes through DOMPurify with the same `FORBID_TAGS` / `FORBID_ATTR` set; error messages are passed through `escapeHtml()` before display because KaTeX errors quote the offending source verbatim — see `src/lib/sanitize.ts` lines 51-69

**CSP is `script-src 'self' 'wasm-unsafe-eval'` — no inline-script unsafe directive for scripts:**
- See `svelte.config.js` lines 14-31. `mode: 'auto'` emits a per-request nonce in dev (so Svelte's bootstrap script loads) and a SHA-256 hash at prerender time. The unsafe-inline directive is intentionally NEVER added to `script-src` — that would defeat REQ-5
- `style-src 'unsafe-inline'` is retained only because Svelte 5 emits scoped inline styles; tightening it (nonce-style) is tracked as a v1.x candidate

**Capability shell-allowlist is generated and audited:**
- `src-tauri/capabilities/default.json` is generated by `scripts/gen-capabilities.ts` from the same SSOT (`buildClaudeArgs`) that produces the runtime spawn args
- `scripts/audit-capabilities.sh` runs as a pre-commit gate. It diffs the dry-run output against the committed JSON and greps the shared module for forbidden Node imports
- The capability file is structurally verified by `tests/capability-regex.test.ts` — every validator regex must compile, every regex must match the value `buildClaudeArgs` emits at the same index, and no validator may contain the string `bare` (defense vs `--bare` bypass)

**Secrets management:**
- `.env*` files are gitignored. The current Phase-1 codebase has no runtime secrets — `--max-turns 30` and the scratch-dir regex are the only enforced limits, and they are public-by-design
- Future env reads must validate presence at startup and fail fast — see the user-level rule layer

## Patterns by Concern

**Subprocess spawn args:**
- Built by a single SSOT function (`buildClaudeArgs`) consumed by both the runtime (`ChatPanel.svelte`) AND the capability codegen (`scripts/gen-capabilities.ts`). Drift is impossible by construction
- The SSOT validates the `scratchDir` parameter against `SCRATCH_DIR_REGEX` before returning, refusing to widen the spawn surface

**State machine state shapes:**
- The 6-arm Claude event dispatcher uses a plain TS type (`DispatchState`) with a `freshState()` factory. State is owned by the caller (typically wrapped in `$state(...)` in a Svelte component). The dispatcher is a pure function over `(event, state) -> void` that mutates `state` in place
- Module-level state is forbidden in the dispatcher — see the "no-state-leak" tests in `tests/tool-use-collapsible.test.ts` lines 139-193

**Long-running Rust tasks (mpsc + debounce):**
- Each log channel (`Console` / `Network` / `Perf`) gets a dedicated writer task spawned via `tokio::spawn`, fed by a `tokio::sync::mpsc::channel::<String>(1024)`. The task uses `tokio::select!` between `rx.recv()` and a `sleep(DEBOUNCE_MS)` branch to batch writes — see `src-tauri/src/dev.rs` lines 162-194
- All file-IO errors are swallowed silently (`let _ = ...`) per the D-SF-04 invariant: the dev loop must never crash on log-write failure

**Reactive after-update DOM walks (Svelte):**
- The KaTeX walker is invoked from an `$effect(...)` that depends on the `html` prop and is rAF-batched to coalesce multiple text-delta arrivals within one frame — see `src/lib/components/AssistantMessage.svelte` lines 35-45

---

*Convention analysis: 2026-05-14*
