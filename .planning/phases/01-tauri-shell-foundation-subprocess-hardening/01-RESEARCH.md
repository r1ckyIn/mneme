# Phase 1: Tauri Shell Foundation + Subprocess Hardening — Research

**Researched:** 2026-05-08
**Domain:** Tauri 2 + SvelteKit + adapter-static + Claude CLI subprocess + capability hardening + streaming render safety
**Confidence:** HIGH (4-piece contract is locked; this RESEARCH fills HOW-AT-CODE-LEVEL; 2 cross-spec corrections flagged for the planner — see §4)

---

## Research Summary

The 4-piece contract (SPEC + CONTEXT + AI-SPEC + UI-SPEC) leaves Phase 1 with very few unknowns at the WHAT-level — every architectural decision (D-01..D-22) is already locked. This research therefore focuses on **HOW-AT-CODE-LEVEL** verification: it pins exact crate/lib versions against the npm + crates.io registries, locks the precise regex/JSON shape Tauri 2's capability layer actually accepts (`Fixed(String) | Var{validator: String, raw: bool}` per the upstream `serde(untagged)` enum), corrects two contract drifts that would silently fail at runtime if not addressed (DOMPurify `FORBID_ATTR` does NOT accept regex, and the validator JSON shape that SPEC L53 documents needs flat-string Fixed entries interleaved with `{validator}` Var entries — not all-Var), and lays down the TDD harness shape so the planner can decide which Wave gets RED→GREEN→REFACTOR vs straight execute.

**Primary recommendation:** Plan-phase MUST patch SPEC REQ-4 (validator-array shape clarified to alternate Fixed strings + Var objects) and patch UI-SPEC L165 + AI-SPEC §3 pitfall #5 (replace `FORBID_ATTR: [/^on/i, ...]` with the `uponSanitizeAttribute` hook pattern OR move to `ALLOWED_ATTR` allow-list). All other findings confirm the locked contract is implementable as written.

---

## Domain Context

The Phase 1 domain is **shell + subprocess infrastructure**, not new AI surface. Three layers compose:

1. **Tauri 2 + SvelteKit shell** — Rust binary host loading a SvelteKit (adapter-static) SPA into a WebView; capability layer mediates IPC; `tauri-plugin-shell` is the only IPC surface in Phase 1.
2. **Claude CLI subprocess** — frontend spawns via `Command.create("claude-bin", argv)`; stdout streams NDJSON; backend Rust state machine owns lifecycle (PGID kill on Cmd+Q).
3. **Streaming render pipeline** — chunky monospace `<pre>` during `text_delta`, finalized `marked.parse → DOMPurify → KaTeX → DOMPurify` on `result`+`close`.

The validated foundation is **spike-002** (`/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.planning/spikes/002-tauri-claude-shell/app/`), which established the JSONL line buffer, 6-event dispatch (`system / stream_event / assistant / user / rate_limit_event / result`), tool-use round-trip, and DOMPurify+KaTeX call sites. Phase 1 fresh-writes from this seed adding 5 hardening upgrades:

- **PGID kill** (D-10) — spike has no Cmd+Q cleanup; production must add `nix::sys::signal::killpg(getpgid(pid), SIGTERM) → 2s → SIGKILL`.
- **Capability hardening** (D-14, D-15) — spike has `args: true`; production must replace with ~13 alternating `Fixed | Var{validator}` entries derived from a TS SSOT (`src/lib/spawn-args.ts`).
- **Spawn-arg cost discipline** — spike omits `--max-turns 30 / --add-dir <SCRATCH> / --exclude-dynamic-system-prompt-sections`; all three are non-negotiable in production.
- **DOMPurify + KaTeX hardening** (REQ-5) — spike uses `ADD_TAGS/ADD_ATTR` (allow-list extensions for KaTeX MathML/SVG) but does NOT explicitly forbid `script/iframe/object/embed/on*`; KaTeX called without `trust:false / strict:true / macros:{} / maxExpand:1000`; KaTeX errors leak raw `e.message`.
- **Three-pane + bottom-row layout** — spike is single-pane; production adds vanilla CSS Grid splitter + 30/40/30 columns + 120px bottom row.

Phase 1 is **Layer 1 Foundation** in the ROADMAP.md overlay: every Application phase (2-10) inherits this shell, so foundational abstractions (Rust state machine, sanitize.ts pipeline, spawn-args SSOT) MUST be shaped for cross-phase reuse — see §8 Cross-Phase Risk.

---

## Locked Decisions Inherited from CONTEXT.md

The planner MUST honor these; this research does not re-litigate any of them.

| ID | Decision | Impact on Planner |
|----|----------|-------------------|
| D-01 | Vanilla CSS Grid + Svelte 5 `$state` runes + pointer events (~80 LOC fresh write); reject `svelte-splitpanes` | No npm splitter dep; ~80 LOC splitter component task in Wave 1 |
| D-02 | First-launch column ratios 30/40/30, key `mneme.layout.split` | localStorage round-trip task |
| D-03 | Drop top `<header>` reservation; bottom row 120px hosts Phase 7+8 mind-map placeholder | Layout task ships 4-region grid (3 cols × 2 rows with bottom-row spanning all 3 cols) |
| D-04 | Middle pane placeholder text: `"Lecture video / file preview — wired in Phase 4 + 6"` | Static text only |
| D-05 | Initial window 1280×860; min 1024×600 | `tauri.conf.json` window block |
| D-06 | `decorations:true + titleBarStyle:"Overlay" + hiddenTitle:true` | Same window block; 36px content-top padding in right pane |
| D-07 | Drag handle uses `setPointerCapture`; min-width 200px via `minmax(200px, 1fr)` | Splitter component implementation detail |
| D-08 | OSS adoption: ≥1k★ + multi-maintainer + clean + active + permissive | No new deps fail this in Phase 1; future ui-phase 1 selection bound by it |
| D-09 | AGPL READ-ONLY (mneme retains MIT/Apache freedom) | opcode = screenshot study only |
| D-10 | Full Rust state machine; `tauri::State<Mutex<Option<u32>>>` for PID; double-hook union (`WindowEvent::CloseRequested` ∪ `RunEvent::ExitRequested`); `nix::killpg(getpgid(pid), SIGTERM) → 2s → SIGKILL` | Rust task in Wave 1 — load-bearing for REQ-3 |
| D-11 | `nix` crate (NOT `libc`) — `cargo add nix --features signal,process` (AI-SPEC §4 finalization) | Cargo dep added in Wave 0 |
| D-12 | Phase 1 = one-subprocess foundation; Phase 3 refactors to `HashMap<SessionId, ...>` | Trait/struct shape MUST be extension-friendly — see §8 |
| D-13 | `vendor/claude-code-parser/` = src + LICENSE + VENDOR.md (snapshot date + commit hash); drop tests/examples; add 2-3 mneme-side test cases | Vendoring task in Wave 0 |
| D-14 | `src/lib/spawn-args.ts` is SSOT; `scripts/gen-capabilities.ts` (prebuild) writes `src-tauri/capabilities/default.json`; audit script diffs them | 3-file pattern — SSOT + generator + audit, not 1 hand-edited JSON |
| D-15 | Tauri 2 capability is purely declarative — NO runtime Rust builder | Confirmed verbatim (see §4 Tauri Capability) |
| D-16 | Targeted read of OpenCovibe (Tauri 2 + Svelte 5 + Apache-2.0) + TOKENICODE `useStreamProcessor.ts` (`finalizeOnce`, `control_request`) | RQ-03 absorbed; pattern notes feed Wave 1 chat-panel task |
| D-17 | No NotebookLM-clone OSS qualifies | No Phase 1 dep added |
| D-18 | UI shows streaming dot only; TTFT/event-count/duration → dev console only | Telemetry helper logs to `console.log` not UI |
| D-19 | Stop button (UI element) — invokes Rust kill path; preserves already-streamed text | ~30 LOC button + IPC command |
| D-20 | `Enter` sends, `Shift+Enter` newline; aligned with Claude Desktop / Cursor / ChatGPT / Notion | Standard textarea handler |
| D-21 | rAF batched flushing DEFERRED to Phase 3 | No throttle code in Phase 1 |
| D-22 | Phase 1 颜色契约 from `01-UI-SPEC.md` ONLY; CONTEXT.md does not duplicate token values; SSOT 0' Live Anthropic Product UI > documentation; `--error` Semantic Lock (`#c15f3c` form-isolation) | UI-SPEC is authoritative; do not re-derive |

**Plus SPEC.md amendments to apply (per CONTEXT.md `<spec_lock>`):**

1. REQ-1 layout: top-bar `<header>` → bottom-row 120px reservation; window chrome fields; initial 1280×860; mid-pane placeholder text changed.
2. REQ-6 hotkeys (extension): `Shift+Enter` newline + Stop button (UI not hotkey).
3. REQ-6 hotkeys (unbound list addition): append `Cmd+W` to the explicit unbound set — single-window single-session makes Cmd+W functionally redundant with Cmd+Q; explicit unbinding avoids macOS-default close-window path that bypasses the PGID-kill hook.

---

## Library / API Surface

### 1. `@tauri-apps/plugin-shell` v2.3.5 (npm verified 2026-05-08)

**Version pin:** `^2.3.5`. Latest registry version is `2.3.5` (matches; updated 2026-02-03 per crates.io). [VERIFIED: npm registry 2026-05-08]

**Frontend API (`Command` builder):**

```typescript
// VERIFIED via @tauri-apps/plugin-shell v2 docs + spike-002
import { Command, type Child } from "@tauri-apps/plugin-shell";

const cmd = Command.create("<allow-list-name>", argsArray, options?);
//   ^ "<allow-list-name>" must match a `name` field in capabilities/default.json
//     shell:allow-spawn entry. Phase 1 uses "claude-bin".

cmd.stdout.on("data", (chunk: string) => { ... });   // BYTE chunks, not lines
cmd.stderr.on("data", (chunk: string) => { ... });
cmd.on("close", () => { ... });                      // fires after subprocess exits
cmd.on("error", (err) => { ... });                   // spawn failures

const child: Child = await cmd.spawn();              // returns { pid: number, write, kill }
//   ^ child.kill() sends a single signal to PID only — DOES NOT cover the process group
//     (`claude` calls setsid(); grandchildren survive). Must use Rust + nix::killpg.
```

**Listener-registration order rule:** ALL `cmd.stdout.on / cmd.stderr.on / cmd.on` listeners MUST be attached BEFORE `await cmd.spawn()` — early stdout chunks are lost otherwise (spike-findings tauri-shell-ui.md §4 + AI-SPEC §4b "Async-First Design"). [CITED: spike-findings-mneme/references/tauri-shell-ui.md §4]

### 2. `tauri-plugin-shell` Rust crate v2.3.5 + capability scope ENUM

**`CommandChild` exposed methods** (verified via docs.rs WebFetch 2026-05-08):

```rust
// VERIFIED via https://docs.rs/tauri-plugin-shell/latest/tauri_plugin_shell/process/struct.CommandChild.html
impl CommandChild {
    pub fn write(&mut self, buf: &[u8]) -> Result<(), Error>;
    pub fn kill(self) -> Result<(), Error>;       // CONSUMES self; PID-only signal
    pub fn pid(&self) -> u32;
}
```

**No process-group method exposed.** This is why Phase 1's kill path uses `nix::sys::signal::killpg(getpgid(pid), SIGTERM)` directly — there is no shorter Tauri API. [VERIFIED: docs.rs 2026-05-08]

**Capability `args` enum (the actual upstream definition):**

```rust
// VERIFIED via plugins-workspace/v2/plugins/shell/src/scope_entry.rs
#[derive(Debug, PartialEq, Eq, Clone, Hash, Deserialize)]
#[serde(untagged, deny_unknown_fields)]
#[non_exhaustive]
pub enum ShellAllowedArg {
    Fixed(String),
    Var {
        validator: String,
        #[serde(default)]
        raw: bool,
    },
}
```

**JSON-side mapping (the planner-facing contract):**

```jsonc
// VERIFIED via Tauri shell plugin docs example: "args": ["-c", {"validator": "\\S+"}]
// SPEC L53 currently shows ALL entries as {validator: "..."} — this works (everything Var)
// but is OVER-VALIDATED: literal flag tokens like "--print" are better expressed as Fixed
// strings, which Tauri matches exactly without regex compilation.

// PREFERRED Phase 1 shape (alternating Fixed strings for flag literals,
// Var objects for value positions that need a regex constraint):
"args": [
  "--print",                                                          // Fixed
  "--permission-mode",                                                // Fixed
  "bypassPermissions",                                                // Fixed
  "--output-format",                                                  // Fixed
  "stream-json",                                                      // Fixed
  "--include-partial-messages",                                       // Fixed
  "--verbose",                                                        // Fixed
  "--max-turns",                                                      // Fixed
  "30",                                                               // Fixed (literal)
  "--add-dir",                                                        // Fixed
  {"validator": "^/Users/[^/]+/\\.mneme/scratch$"},                   // Var (path)
  "--exclude-dynamic-system-prompt-sections",                         // Fixed
  {"validator": ".+"}                                                 // Var (free prompt)
]
```

This is **13 entries**, exactly matching SPEC L53's count. The semantic difference vs. all-Var (which SPEC L53 currently shows verbatim): Fixed entries reject any other string at the index without compiling a regex; Var entries compile + match. Both work; Fixed is faster + more obviously correct + reads like documentation. [VERIFIED: Tauri shell plugin scope_entry.rs source 2026-05-08]

> **CROSS-SPEC CORRECTION 1 (planner action item):** SPEC REQ-4 L53 lists every entry as `{validator: "..."}`. This will work, but a literal-flag entry like `"--print"` should ideally be Fixed (flat string `"--print"`) per the Tauri docs example (`"args": ["-c", {"validator": "\\S+"}]`). Plan-phase has 2 valid paths:
>   - **Option A (no SPEC patch needed):** Keep all-Var per SPEC L53; the `^--print$` regex compiles + matches identically. Slightly heavier but matches SPEC text verbatim.
>   - **Option B (apply SPEC L53 amendment in plan-phase patch):** Switch flag literals to Fixed strings; only path + free-prompt remain Var. Requires patching SPEC L53.
> Recommended: **Option A** — minimizes SPEC churn, behavior identical, audit script greps still hold.

**Capability scope is purely declarative.** No runtime Rust builder for `shell:scope`; the `build.rs` only emits the JSON schema via `schemars::schema_for!` from the `ShellScopeEntry` enum. Confirms D-15. [VERIFIED: plugins-workspace/v2/plugins/shell/build.rs 2026-05-08]

### 3. `nix` crate v0.31.2 (crates.io 2026-05-08)

**Cargo dependency:**

```toml
# VERIFIED via crates.io/api/v1/crates/nix on 2026-05-08
[dependencies]
nix = { version = "0.31", features = ["signal", "process"] }
```

**Required features:** `signal` (for `killpg` + `Signal::SIGTERM/SIGKILL`) AND `process` (for `getpgid`). [VERIFIED: docs.rs/nix 2026-05-08]

**Exact API signatures:**

```rust
// VERIFIED via docs.rs/nix/latest/nix/sys/signal/fn.killpg.html
pub fn killpg<T: Into<Option<Signal>>>(pgrp: Pid, signal: T) -> Result<()>;

// VERIFIED via docs.rs/nix/latest/nix/unistd/fn.getpgid.html
pub fn getpgid(pid: Option<Pid>) -> Result<Pid>;

// Pid construction
Pid::from_raw(pid_i32: i32) -> Pid;
```

**Phase 1 kill sequence (canonical pattern):**

```rust
use nix::sys::signal::{killpg, Signal};
use nix::unistd::{getpgid, Pid};
use std::time::Duration;
use std::thread;

fn kill_pgid(pid_u32: u32) {
    let pid = Pid::from_raw(pid_u32 as i32);
    if let Ok(pgid) = getpgid(Some(pid)) {
        let _ = killpg(pgid, Signal::SIGTERM);
        thread::sleep(Duration::from_secs(2));
        let _ = killpg(pgid, Signal::SIGKILL);     // sent unconditionally; if PG already dead it ESRCH-fails harmlessly
    }
}
```

**Note on `i32` cast:** `Pid::from_raw` takes `i32`; `CommandChild::pid()` returns `u32`. The `as i32` cast is safe for any realistic PID (POSIX PIDs are positive int32). No `unsafe` block required. [VERIFIED: nix 0.31.2 docs 2026-05-08]

### 4. `tauri` v2 lifecycle hooks (D-10 union)

**Why both hooks** — Tauri issue #9198 reports `RunEvent::ExitRequested` not firing reliably on macOS; without a `WindowEvent::CloseRequested` partner, red-button close (vs. Cmd+Q) on some macOS versions silently skips the kill path. [CITED: github.com/tauri-apps/tauri/issues/9198]

**Hook union pattern:**

```rust
use std::sync::Mutex;
use tauri::{Manager, RunEvent, State, WindowEvent};

struct SessionState(Mutex<Option<u32>>);

#[tauri::command]
fn register_session_pid(state: State<SessionState>, pid: u32) {
    *state.0.lock().unwrap() = Some(pid);
}

#[tauri::command]
fn clear_session_pid(state: State<SessionState>) {
    *state.0.lock().unwrap() = None;     // called on natural close (cmd.on("close") relay)
}

fn drain_and_kill(state: &State<SessionState>) {
    if let Some(pid) = state.0.lock().unwrap().take() {
        kill_pgid(pid);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(SessionState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![register_session_pid, clear_session_pid])
        .on_window_event(|window, event| {
            if matches!(event, WindowEvent::CloseRequested { .. }) {
                let app = window.app_handle();
                let state = app.state::<SessionState>();
                drain_and_kill(&state);
                // Do NOT api.prevent_close() — let the window close naturally
            }
        })
        .build(tauri::generate_context!())
        .expect("error building app")
        .run(|app, event| {
            if matches!(event, RunEvent::ExitRequested { .. }) {
                let state = app.state::<SessionState>();
                drain_and_kill(&state);                // idempotent — take() returns None on 2nd call
            }
        });
}
```

**Idempotency note:** `Mutex<Option<u32>>::take()` returns `None` after the first drain — both hooks calling `drain_and_kill` is safe. The fallback alone (`ExitRequested` first, then `CloseRequested` second on the same quit, or vice versa) leaves no orphan. [VERIFIED: spike-002 lib.rs + Tauri 2 docs]

### 5. KaTeX v0.16.45 (npm verified 2026-05-08)

**Version pin:** `^0.16.45` (well above the SPEC ≥0.16.21 floor). [VERIFIED: npm registry 2026-05-08]

**Hardened render call (REQ-5):**

```typescript
// VERIFIED via katex.org/docs/options 2026-05-08
import katex from "katex";
import "katex/dist/katex.min.css";

const html = katex.renderToString(src, {
  trust: false,        // BLOCKS \href{javascript:...}; default since v0.16.0
  strict: true,        // rejects non-strict commands (e.g. \\Vec)
  macros: {},          // empty — denies user-supplied macros that bypass trust
  maxExpand: 1000,     // expansion-bomb guard (default 1000; explicit-set defends drift)
  throwOnError: false, // never throw mid-render — surface error inline + escapeHtml
});
```

**KaTeX option types (verified):**

| Option | Type | Default | Phase 1 setting |
|--------|------|---------|-----------------|
| `trust` | `boolean \| function` | `false` | **`false`** (locked) |
| `strict` | `boolean \| string \| function` | `"warn"` | **`true`** (locked) |
| `macros` | `object` | `{}` | **`{}`** (locked) |
| `maxExpand` | `number` | `1000` | **`1000`** (explicit) |
| `throwOnError` | `boolean` | `true` | **`false`** (so renderToString returns error markup instead of throwing) |

[CITED: katex.org/docs/options]

**Error-message escape:** When KaTeX renders an error (`throwOnError: false` returns inline error markup), the offending source text is quoted verbatim by KaTeX in the message. Phase 1 MUST pass any error-message text through `escapeHtml()` before display, otherwise an attacker can craft `$\unknown_command_with_<script>tags</script>$` to leak HTML through the error path. AI-SPEC §3 pitfall #6 + UI-SPEC chat surface §"KaTeX render error" both lock this. The `escapeHtml` impl is the standard 5-char replacement (`& < > " '`); any util library or 8-line inline function works.

### 6. DOMPurify v3.4.2 (npm verified 2026-05-08)

**Version pin:** `^3.4.2`. [VERIFIED: npm registry 2026-05-08]

> **CROSS-SPEC CORRECTION 2 (planner action item):** UI-SPEC L165 + AI-SPEC §3 pitfall #5 both write `FORBID_ATTR: [/^on/i, "srcdoc", "formaction"]`. **DOMPurify's `FORBID_ATTR` only accepts string arrays — regex entries are silently ignored.** Verified via cure53/DOMPurify README 2026-05-08.
>
> **Two valid replacement patterns:**
>
> **Option A — `uponSanitizeAttribute` hook (regex-based, matches the original intent):**
> ```typescript
> // VERIFIED via cure53/DOMPurify README "Hooks" section
> import DOMPurify from "dompurify";
>
> DOMPurify.addHook("uponSanitizeAttribute", (node, hookEvent) => {
>   if (/^on/i.test(hookEvent.attrName)) {
>     hookEvent.keepAttr = false;
>   }
> });
>
> export function sanitizeMarkdown(text: string): string {
>   return DOMPurify.sanitize(marked.parse(text) as string, {
>     FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "style"],
>     FORBID_ATTR: ["srcdoc", "formaction"],   // strings only
>   });
> }
> ```
>
> **Option B — `ALLOWED_ATTR` allow-list (simpler, denies everything not listed):**
> ```typescript
> export function sanitizeMarkdown(text: string): string {
>   return DOMPurify.sanitize(marked.parse(text) as string, {
>     FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "style"],
>     ALLOWED_ATTR: ["href", "title", "alt", "src", "class",
>                    "mathvariant", "mathsize", "displaystyle", "scriptlevel", "encoding",
>                    "viewBox", "preserveAspectRatio", "d"],   // KaTeX MathML/SVG attrs
>   });
> }
> ```
>
> **Recommended: Option A** — preserves the broad permissive default attr surface (so unanticipated safe attrs like `colspan` still work in tables) while explicitly stripping all event-handlers via the hook. Option B is stricter but requires curating every attr we use across markdown tables, code blocks, KaTeX MathML/SVG, and links — high maintenance burden over Phase 1+ lifetime.

**Default behavior to know:**
- `FORBID_TAGS` and `FORBID_ATTR` are **block-list extensions over DOMPurify defaults**, NOT replacements. The default ALLOWED list still applies; FORBID_TAGS just adds names to deny. [CITED: cure53/DOMPurify README]
- `<script>` tag is in the default ALLOWED_TAGS = false set anyway; explicit FORBID_TAGS is defense-in-depth + audit signal.

**Sanitize-AFTER-marked rule:** spike-findings tauri-shell-ui.md §4 + AI-SPEC §3 pitfall #5 — `marked.parse` emits HTML; sanitizing the markdown SOURCE breaks code fences. The pipeline is **always** `text → marked.parse → DOMPurify.sanitize → DOM injection`.

**KaTeX site is separate:** KaTeX emits HTML strings → DOMPurify.sanitize THIS HTML with the MathML/SVG ADD_TAGS+ADD_ATTR allow-list extensions (see UI-SPEC §"Chat Surface Contract / Assistant turn — On `result` event" + spike-002 `+page.svelte` L60-L72 for the validated pattern; preserve the ADD_TAGS list verbatim — it's the minimum MathML+SVG element set KaTeX produces).

### 7. `marked` v18.0.3 (npm verified 2026-05-08)

**Version pin:** `^18.0.3`. [VERIFIED: npm registry 2026-05-08]

**Phase 1 call shape (from spike-002):**

```typescript
import { marked } from "marked";
const html = marked.parse(text, { gfm: true, breaks: true }) as string;
//   ^ gfm:true = GitHub-flavor markdown (tables, strikethrough, etc.)
//     breaks:true = single newline → <br> (chat-friendly behavior)
//     `as string` cast required since v6+; marked.parse can return Promise<string>
//     under async highlighters — Phase 1 doesn't use one, so sync return is correct.
```

### 8. `vendor/claude-code-parser/` (KD-12 + D-13)

**Upstream:** `udhaykumarbala/claude-code-parser`, MIT, ~9KB, 7 commits (last commit predates 2026 schema updates per CLAUDE.md L8 override "effectively unmaintained"). [VERIFIED: github.com/udhaykumarbala/claude-code-parser README 2026-05-08]

**Exported API:**

```typescript
// VERIFIED via udhaykumarbala/claude-code-parser README 2026-05-08
import { parseLine, Translator, createMessage, extractContent } from "claude-code-parser";

parseLine(line: string): ClaudeEvent | null;
//   ^ pure NDJSON-line → typed event; null if blank/garbage

class Translator {
  translate(event: ClaudeEvent): RelayEvent[];
  //   ^ stateful; deduplicates partial messages into RelayEvent[]
}

createMessage.user(text): string;
createMessage.toolResult(...): string;
//   ^ Phase 1 only consumes stdout — does NOT use createMessage.* (--print mode is one-shot,
//     not session-stdin). createMessage helpers are for `--input-format stream-json` flow,
//     which Phase 3+ may explore for resume capability.

extractContent(raw): string;
//   ^ normalizes polymorphic tool_result content (string | Array<{type:"text"|"image"...}>)
```

**RelayEvent types upstream emits:** `text_delta`, `thinking_delta`, `tool_use`, `tool_result`, `session_meta`, `turn_complete`, `error`. The upstream library's translation maps Claude Code's 6-event taxonomy (`system / stream_event / assistant / user / rate_limit_event / result`) → these 7 RelayEvent types. **Phase 1 has TWO valid paths:**

- **Path 1 — adopt Translator** (use upstream RelayEvent abstraction): cleaner consumer code, hides 6-event details; cost is mneme depends on upstream's internal mapping which may drift if Anthropic adds events.
- **Path 2 — types-only consumption** (use only `parseLine` + the `ClaudeEvent` discriminated union): mneme writes its own 6-arm switch (matches spike-002 + AI-SPEC §3 dispatchEvent verbatim); upstream supplies type definitions only. CONTEXT.md D-13's directive to "drop tests/, examples/" plus the spike pattern strongly imply Path 2.

**Recommended: Path 2** (types-only). Reasons:
1. AI-SPEC §3 already commits to the 6-event dispatch (`switch (evt.type)`) — adopting Translator would re-do that work.
2. spike-002 validated the 6-arm pattern; Translator's RelayEvent abstraction is unnecessary middleware.
3. KD-12 pins the parser as "frozen reference"; minimizing the API surface we depend on (= types only) reduces upstream-drift exposure.

**Vendoring task** (Wave 0):

```bash
# Per D-13 — copy src + LICENSE + add VENDOR.md; drop tests/examples
git clone --depth 1 https://github.com/udhaykumarbala/claude-code-parser /tmp/ccp
mkdir -p vendor/claude-code-parser/src
cp -r /tmp/ccp/src/* vendor/claude-code-parser/src/
cp /tmp/ccp/LICENSE vendor/claude-code-parser/
# VENDOR.md (write fresh):
#   Snapshot date: 2026-05-08
#   Upstream commit: $(git -C /tmp/ccp rev-parse HEAD)
#   Status: frozen reference per KD-12; upstream effectively unmaintained
#   Adoption: types-only (parseLine + ClaudeEvent union). Translator + createMessage NOT consumed in Phase 1.
```

**TS path alias** (Wave 0 `tsconfig.json` patch):

```jsonc
{
  "compilerOptions": {
    "paths": {
      "$lib/*": ["./src/lib/*"],
      "$vendor/*": ["./vendor/*"]
    }
  }
}
```

Then frontend imports `import type { ClaudeEvent, ... } from "$vendor/claude-code-parser/src/types"`. **Critical:** vendor MUST NOT appear in `package.json` `dependencies` — KD-12 + D-13 are explicit. The audit script SHOULD add `grep -c '"claude-code-parser"' package.json` returning 0 as a guard.

### 9. SvelteKit + adapter-static (npm verified 2026-05-08)

**Pinned versions** (matching spike-002 working baseline):
- `@sveltejs/kit` `^2.59.1` (registry latest 2.59.1) [VERIFIED 2026-05-08]
- `@sveltejs/adapter-static` `^3.0.10` (registry latest 3.0.10) [VERIFIED 2026-05-08]
- `svelte` `^5.55.5` (registry latest 5.55.5) [VERIFIED 2026-05-08]
- `vitest` `^4.1.5` (registry latest 4.1.5; Phase 1 testing harness) [VERIFIED 2026-05-08]
- `@tauri-apps/api` `^2.11.0` (registry latest 2.11.0) [VERIFIED 2026-05-08]

**SPA mode (locked, lifted from spike-002 verbatim):**

```typescript
// src/routes/+layout.ts
export const ssr = false;
export const prerender = true;
```

### 10. CSP meta tag (REQ-5)

**Locked CSP string** (SPEC L140 verbatim):

```html
<!-- src/app.html, inside <head> -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'">
```

- `'self'` — Tauri serves from `tauri://` scheme; matches.
- `'wasm-unsafe-eval'` — Required by KaTeX's WebAssembly font-rendering path on some platforms. [CITED: katex bug history + Tauri 2 CSP guidance]
- `'unsafe-inline'` for styles — SvelteKit emits inline `<style>` blocks during HMR + production. CSS-only, never script.
- `tauri.conf.json` `app.security.csp` SHOULD be `null` (let the meta tag govern; spike-002 already does this) OR mirror the meta string (defense in depth).

---

## Implementation Approach

Sequenced into 4 waves; the planner can pack tasks within each wave but the wave order is constrained by dependencies.

### Wave 0 — Project bootstrap (sequential, all tasks share working tree)

1. **Bootstrap fresh Tauri 2 project at repo root** — `npm create tauri-app@latest -- mneme -t svelte-ts -m npm -y --tauri-version 2 --identifier dev.mneme.app` then move into the bootstrap output OR create inline at the repo root. Verify `productName: "Mneme"` + `identifier: "dev.mneme.app"` set correctly in `tauri.conf.json`. [Phase 0 D-10/D-14 lock]
2. **Install deps:**
   - `npm install @tauri-apps/plugin-shell marked katex dompurify` (frontend libs per KD-02)
   - `cargo add tauri-plugin-shell --manifest-path src-tauri/Cargo.toml`
   - `cargo add nix --features signal,process --manifest-path src-tauri/Cargo.toml` (D-11)
3. **Pin Rust toolchain** — write `rust-toolchain.toml` with `[toolchain] channel = "1.88.0"` (or just `1.88` per Phase 0 LEARNINGS macOS-CLI version-precision lesson; plan-phase decides granularity).
4. **Window + identity config** — `tauri.conf.json` window block per D-05/D-06: `width: 1280, height: 860, minWidth: 1024, minHeight: 600, decorations: true, titleBarStyle: "Overlay", hiddenTitle: true, title: "Mneme"`.
5. **Icon copy** — copy `icon-assets/icon.icns` + 7 PNG variants into `src-tauri/icons/` (paths declared in `tauri.conf.json` `bundle.icon` array).
6. **SPA mode** — `src/routes/+layout.ts` with `ssr = false, prerender = true` (lift from spike).
7. **`.gitignore`** — ensure `target/`, `node_modules/`, `.svelte-kit/`, `dist/`, `build/`, `vendor/claude-code-parser/node_modules` (none expected but defensive) are excluded. [REQ-1 spike-findings]
8. **CSP meta tag** in `src/app.html` (locked string from §4.10).
9. **Vendor `claude-code-parser`** (D-13 procedure + VENDOR.md template above).
10. **TS path aliases** — `tsconfig.json` `paths` for `$lib/*` + `$vendor/*`.
11. **Test framework setup** — Vitest is bundled with the SvelteKit template; configure `vitest.config.ts` with `environment: "jsdom"` for sanitize-pipeline tests. Install `@testing-library/jest-dom` if assertion ergonomics need it (optional).
12. **Create `~/.mneme/scratch/` first-launch hook** — Rust setup hook running `std::fs::create_dir_all(&dirs::home_dir().unwrap().join(".mneme/scratch"))` (or via `home::home_dir()` from the `home` crate; either works on macOS). Idempotent — `create_dir_all` no-ops if exists.

### Wave 1 — Layout + Splitter + Right-pane chat panel (can parallelize within wave)

1. **CSS Grid splitter component** (D-01) — vanilla 4-region grid (3 cols × 2 rows; bottom row spans cols 1-3); pointer events with `setPointerCapture`; localStorage `mneme.layout.split` persistence. ~80 LOC fresh write.
2. **Token CSS** (`src/lib/styles/tokens.css`) — copy verbatim from UI-SPEC §"Token Module" (light + dark `[data-theme="dark"]` + reduced-motion fallback + GEOMETRY tokens).
3. **Three placeholder panes** + bottom row — static `display: flex; align-items: center; justify-content: center;` + italic 20px serif placeholder copy per UI-SPEC §"Empty-pane placeholder visual treatment".
4. **Right-pane chat panel** — fresh-write from spike-002 `+page.svelte` lift + 5 hardening upgrades:
   - `buildClaudeArgs()` from SSOT (Wave 2 dependency — this task can be split into a "chat scaffold without spawn" first piece + "chat with spawn" second piece; or wait for Wave 2 to land and merge in one task).
   - Stop button (D-19) — visible only during `isStreaming`; click → `invoke("stop_session")` Tauri command (Wave 2 wires).
   - Streaming dot (D-18) — pulse animation per UI-SPEC §"Streaming dot indicator".
   - `Enter` / `Shift+Enter` handling per D-20.
   - Tool-use card chrome per UI-SPEC §"Tool-use card (collapsed)".
   - System bubble (init/error) styling per UI-SPEC §"System bubble".
5. **`src/lib/sanitize.ts`** — exports `sanitizeMarkdown(text)` and `renderKatex(src)`; uses Option A `uponSanitizeAttribute` hook (per §4.6 correction). Locks the KaTeX option set verbatim from §4.5.
6. **`src/lib/stream-dispatch.ts`** — 6-arm `dispatchEvent(evt, messages)` pure function per AI-SPEC §3 dispatchEvent verbatim; consumes types from `$vendor/claude-code-parser/src/types`.

### Wave 2 — SSOT + capability generation + audit + Rust state machine

1. **`src/lib/spawn-args.ts`** — TS SSOT exporting `buildClaudeArgs(promptText): string[]` returning the 13-element array. **Locked content per AI-SPEC §3:**

   ```typescript
   import { homedir } from "os";

   export const SCRATCH_DIR = `${homedir()}/.mneme/scratch`;
   export const SCRATCH_DIR_REGEX = `^/Users/[^/]+/\\.mneme/scratch$`;
   export const MAX_TURNS = "30";

   export function buildClaudeArgs(promptText: string): string[] {
     return [
       "--print",
       "--permission-mode", "bypassPermissions",
       "--output-format", "stream-json",
       "--include-partial-messages",
       "--verbose",
       "--max-turns", MAX_TURNS,
       "--add-dir", SCRATCH_DIR,
       "--exclude-dynamic-system-prompt-sections",
       promptText,
     ];
   }
   ```

2. **`scripts/gen-capabilities.ts`** — Node script (no extra deps; pure stdlib + `node --experimental-strip-types` or `tsx` already pulled by SvelteKit). Reads `spawn-args.ts` constants → emits `src-tauri/capabilities/default.json` with the 13-entry args array. Wire as `prebuild` hook in `package.json` (`"prebuild": "node scripts/gen-capabilities.ts && bash scripts/audit-capabilities.sh"`).

3. **`src-tauri/capabilities/default.json`** structure (generated):

   ```jsonc
   {
     "$schema": "../gen/schemas/desktop-schema.json",
     "identifier": "default",
     "description": "Capability for the main window",
     "windows": ["main"],
     "permissions": [
       "core:default",
       "shell:default",
       {
         "identifier": "shell:allow-spawn",
         "allow": [
           {
             "name": "claude-bin",
             "cmd": "claude",
             "args": [/* 13 entries — see §4.2 */]
           }
         ]
       },
       {
         "identifier": "shell:allow-execute",
         "allow": [
           {
             "name": "claude-bin",
             "cmd": "claude",
             "args": [/* same 13 entries */]
           }
         ]
       }
     ]
   }
   ```

4. **`scripts/audit-capabilities.sh`** — composed audit per D-14:

   ```bash
   #!/usr/bin/env bash
   set -euo pipefail

   # Drift check — TS SSOT vs committed JSON
   if ! diff <(node scripts/gen-capabilities.ts --dry-run) src-tauri/capabilities/default.json >/dev/null; then
     echo "[audit] FAIL: SSOT drift between spawn-args.ts and default.json"
     exit 1
   fi

   # Wildcard checks
   if [[ "$(grep -c '"args": true' src-tauri/capabilities/default.json)" != "0" ]]; then
     echo "[audit] FAIL: 'args: true' found in default.json"
     exit 1
   fi
   if [[ "$(grep -c '"\*"' src-tauri/capabilities/default.json)" != "0" ]]; then
     echo "[audit] FAIL: literal wildcard '*' found in default.json"
     exit 1
   fi

   # Bare flag absence (PITFALLS Pitfall #2)
   if grep -E '"validator":\s*"[^"]*bare[^"]*"' src-tauri/capabilities/default.json; then
     echo "[audit] FAIL: '--bare' validator detected (incompatible with OAuth subscription auth)"
     exit 1
   fi

   # MAX_TURNS sanity (REQ-2)
   if ! grep -q '"--max-turns"' src/lib/spawn-args.ts; then
     echo "[audit] FAIL: --max-turns not in spawn-args.ts SSOT"
     exit 1
   fi
   if ! grep -q '"30"' src/lib/spawn-args.ts; then
     echo "[audit] FAIL: --max-turns value not pinned to 30"
     exit 1
   fi

   # claude-code-parser must NOT be an npm dep
   if grep -q '"claude-code-parser"' package.json; then
     echo "[audit] FAIL: claude-code-parser found in package.json — must be vendored only (KD-12 + D-13)"
     exit 1
   fi

   echo "[audit] PASS"
   ```

5. **Rust state machine** (`src-tauri/src/lib.rs`) — per §4.4 hook union pattern + `register_session_pid` / `clear_session_pid` Tauri commands + `kill_pgid` helper. Add `tauri_plugin_shell::init()` to the builder (lifted from spike-002).

6. **Wire frontend Stop button + close handler** — `cmd.on("close")` calls `invoke("clear_session_pid")` (so a natural close doesn't leak the PID slot); Stop button click calls `invoke("stop_session")` which is a new Tauri command that runs `drain_and_kill(state)` directly.

### Wave 3 — Tests, dogfood checklist, and commit gates

1. **Vitest XSS battery** (`tests/sanitize.test.ts`) — 6 fixtures per AI-SPEC §5 reference dataset. Spies on `window.alert`, asserts no invocation + DOMPurify-stripped HTML matches snapshot. Includes the Option-A `uponSanitizeAttribute` hook test for `onerror` / `onclick`.
2. **Vitest spawn-args unit tests** — `buildClaudeArgs("x")` returns the exact 13-element array; flag-value pairs are positionally correct; `--max-turns` immediately followed by `"30"`; `--add-dir` immediately followed by `${HOME}/.mneme/scratch`.
3. **Vitest capability-regex tests** — load `src-tauri/capabilities/default.json`, assert each Var entry has a regex that compiles and matches its expected value (`new RegExp(entry.validator).test(expected_value)`).
4. **Bash lifecycle harness** (`tests/manual/lifecycle/run-quit-loop.sh`) — 5-cycle bash loop spawning the production app via `npm run tauri dev` in a child shell, sending SIGTERM after 3s, then `ps aux | grep -E '[c]laude|[m]cp|[r]g'` count must be 0. Manual-only (CI lacks macOS WKWebView privileges); developer runs once before Phase 2 entry. ~30 LOC.
5. **Manual dogfood checklist** (`tests/manual/dogfood-checklist.md`) — markdown of the 19 SPEC acceptance checks + 5 dogfood prompts per AI-SPEC §5. Developer-checkbox rows; reviewed once before Phase 2 entry.
6. **Husky pre-commit hook** — `bash scripts/audit-capabilities.sh && npx vitest run --changed`.

### Landmines from spike-findings (must be respected)

1. **`--bare` is forbidden** [spike F4/F6, claude-subprocess.md "What to Avoid"] — strips OAuth keychain reads → silent auth failure. Audit script greps for `bare`.
2. **stdout chunks ≠ event lines** [claude-subprocess.md §3] — line buffer pattern verbatim from spike-002 +page.svelte L113-L130.
3. **`result` is the ONLY reliable terminator** [claude-subprocess.md §6] — never finalize markdown on `assistant` events or `close` heuristics; check `result` arrived before finalizing in `cmd.on("close")`.
4. **DOMPurify AFTER marked, not before** [tauri-shell-ui.md §4 + AI-SPEC §3 pitfall #5].
5. **Listeners BEFORE spawn** [tauri-shell-ui.md §4 + AI-SPEC §4b].
6. **Live `cmd.stdout` callback is sync** [AI-SPEC §4b] — never `await` inside; re-entrancy will corrupt the line buffer.
7. **Tool-use text-block is already streamed** [claude-subprocess.md §5] — `assistant` event handler MUST skip `block.type === "text"` else double-render.
8. **`thinking` is encrypted for OAuth users** [claude-subprocess.md §5] — render indicator only, never attempt to decode `signature`.

---

## TDD Strategy

**TDD mode is ACTIVE.** Per `references/tdd.md` heuristics, TDD applies where the unit has well-defined inputs/outputs and the test driver is ergonomic. Glue/UI code with broad observable surface is NOT TDD-eligible (RED→GREEN cycle wastes time on shape-discovery). Phase 1 splits as follows:

| Surface | TDD-eligible? | Test driver | RED state | GREEN gate |
|---------|---------------|-------------|-----------|------------|
| **`buildClaudeArgs(prompt)` SSOT** (`src/lib/spawn-args.ts`) | **YES** | Vitest unit | Empty function returning `[]` → fails snapshot match | Returns 13-element array; positional flag-value pairs verified; `--max-turns` index +1 == `"30"`; `--add-dir` index +1 == `${HOME}/.mneme/scratch` |
| **`sanitizeMarkdown(text)` + `renderKatex(src)`** (`src/lib/sanitize.ts`) | **YES** | Vitest + jsdom + spied `window.alert` | Empty function returning `text` → fails 6-XSS battery (alert spy fires) | All 6 payloads render inert (no `alert` invocation); rendered DOM has no `onerror` attribute; `\href{javascript:...}` produces literal text per KaTeX `trust:false`; KaTeX errors HTML-escaped |
| **6-arm `dispatchEvent(evt, messages)`** (`src/lib/stream-dispatch.ts`) | **YES** | Vitest unit + 3-4 fixture NDJSON files | Empty switch → fixture-driven assertions fail (assistant text not appended; tool_use card not pushed) | All 6 event types route correctly; `assistant.message.content` `text` blocks are SKIPPED (no double-render); `thinking` blocks emit "💭 thinking..." only; `result` event records `total_cost_usd` to console + sets terminal flag |
| **Capability regex validators** (generated `default.json`) | **YES** | Vitest unit on parsed JSON | Empty `args` array → assertions fail | Each Var entry's validator compiles; matches expected value; rejects unexpected (`new RegExp(scratch_validator).test("/etc/hosts")` returns false) |
| **`audit-capabilities.sh`** | **YES** | Bash test fixture (corrupted JSON snippet stub) | Audit script doesn't exist → `bash audit-capabilities.sh` exits non-zero (file not found) | Script exits 0 on clean JSON; exits non-zero on inserted `args:true` / `*` / `--bare` / SSOT drift |
| **`kill_pgid(pid)` Rust helper** (`src-tauri/src/lib.rs`) | **YES with effort** | Rust integration test spawns a `setsid` child (e.g. `bash -c "setsid sleep 60 & wait"`) → calls `kill_pgid(child.pid())` → waits 3s → asserts `kill -0 <grandchild_pid>` returns ESRCH | Empty `kill_pgid` body → grandchild still alive after 3s | After SIGTERM+2s+SIGKILL sequence, no descendant of the spawned PID is alive |
| **5-cycle bash lifecycle harness** | **YES** (deterministic) | `tests/manual/lifecycle/run-quit-loop.sh` | Harness doesn't exist → manual orphan check fails | After 5 quit cycles, `ps aux \| grep -E '[c]laude\|[m]cp\|[r]g' \| grep -v grep \| wc -l` == 0 |
| **CSS Grid splitter component** | **NO** (UI/glue) | n/a — exec straight | n/a | Manual visual: drag handle moves col widths; persists across reload; min-width 200px enforced |
| **Three placeholder panes + bottom row chrome** | **NO** (static UI) | n/a | n/a | Manual visual against UI-SPEC |
| **Tauri lifecycle hook union (Rust)** | **NO** (cross-process; can't unit-test the Tauri runtime hooks themselves; the underlying `kill_pgid` IS tested above) | n/a — exec; coverage via the bash lifecycle harness | n/a | 5-cycle harness passes |
| **Stop button wiring** | **NO** (UI glue) | n/a — exec; coverage via the lifecycle harness with mid-stream Stop trigger | n/a | Manual visual: Stop click during stream kills subprocess; already-streamed text preserved |
| **localStorage layout persistence** | **NO** (UI glue) | n/a — exec; coverage via dogfood checklist | n/a | Manual visual: drag → reload → divider position within 1px |

**TDD-eligible total: 7 surfaces. Non-TDD (straight execute): 5 surfaces.**

**Sample RED test stubs the planner can hand directly to executor:**

```typescript
// tests/spawn-args.test.ts — RED before src/lib/spawn-args.ts implementation
import { describe, expect, it } from "vitest";
import { buildClaudeArgs, MAX_TURNS, SCRATCH_DIR_REGEX } from "../src/lib/spawn-args";

describe("buildClaudeArgs SSOT", () => {
  it("returns 13 elements for a non-empty prompt", () => {
    expect(buildClaudeArgs("hello").length).toBe(13);
  });

  it("places --max-turns immediately before its value '30'", () => {
    const args = buildClaudeArgs("hello");
    const idx = args.indexOf("--max-turns");
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(args[idx + 1]).toBe("30");
    expect(MAX_TURNS).toBe("30");
  });

  it("places --add-dir immediately before a path matching SCRATCH_DIR_REGEX", () => {
    const args = buildClaudeArgs("hello");
    const idx = args.indexOf("--add-dir");
    expect(idx).toBeGreaterThanOrEqual(0);
    const pathArg = args[idx + 1];
    expect(new RegExp(SCRATCH_DIR_REGEX).test(pathArg)).toBe(true);
  });

  it("includes --exclude-dynamic-system-prompt-sections", () => {
    expect(buildClaudeArgs("hello")).toContain("--exclude-dynamic-system-prompt-sections");
  });

  it("FORBIDS --bare", () => {
    expect(buildClaudeArgs("hello")).not.toContain("--bare");
  });

  it("places the prompt as the LAST positional argument", () => {
    const args = buildClaudeArgs("WHAT_IS_2_PLUS_2");
    expect(args[args.length - 1]).toBe("WHAT_IS_2_PLUS_2");
  });
});
```

```typescript
// tests/sanitize.test.ts — RED before src/lib/sanitize.ts implementation
// NOTE: do NOT inject sanitize() output via raw DOM HTML setters in test fixtures —
// use DOMParser + text comparison so the test framework itself never executes attacker payloads.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { sanitizeMarkdown, renderKatex } from "../src/lib/sanitize";

describe("sanitize XSS battery", () => {
  let alertSpy: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    alertSpy = vi.fn();
    (globalThis as any).alert = alertSpy;
  });

  const xssFixtures = [
    "<img src=x onerror=alert(1)>",
    "<script>alert(2)</script>",
    "<iframe src=javascript:alert(3)></iframe>",
    "<a onclick=alert(4)>x</a>",
    `<a href="data:text/html,<script>alert(5)</script>">x</a>`,
  ];

  it.each(xssFixtures)("renders %s inert (no alert fires)", (payload) => {
    const html = sanitizeMarkdown(payload);
    // Parse the sanitized output via DOMParser (no script execution side-effects)
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(alertSpy).not.toHaveBeenCalled();
    // No <script> tags survive; no on* attributes survive
    expect(doc.querySelector("script")).toBeNull();
    expect(doc.querySelector("[onerror]")).toBeNull();
    expect(doc.querySelector("[onclick]")).toBeNull();
  });

  it("strips on* event-handler attrs entirely", () => {
    const html = sanitizeMarkdown("<img src=x onerror=alert(1)>");
    expect(html.toLowerCase()).not.toContain("onerror");
  });

  it("blocks KaTeX \\href{javascript:...} via trust:false", () => {
    const html = renderKatex("\\href{javascript:alert(6)}{x}");
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(alertSpy).not.toHaveBeenCalled();
    // KaTeX trust:false should render the source as inert text — no live javascript: anchor
    expect(doc.querySelector("a[href^='javascript:']")).toBeNull();
  });
});
```

```rust
// src-tauri/tests/kill_pgid.rs — RED before src-tauri/src/lib.rs::kill_pgid
// (Run via `cargo test --test kill_pgid`; requires nix dep already configured.)
use std::process::Command;
use std::time::Duration;
use std::thread;

#[test]
fn kill_pgid_eradicates_setsid_child_tree() {
    // Spawn a parent that calls setsid + spawns a long-lived grandchild.
    let parent = Command::new("bash")
        .args(&["-c", "setsid sleep 30 & echo $! > /tmp/mneme_test_grandchild.pid; wait"])
        .spawn()
        .expect("failed to spawn test subprocess");
    let parent_pid = parent.id();
    thread::sleep(Duration::from_millis(500));     // let grandchild settle

    // Read the grandchild PID
    let grandchild_pid: u32 = std::fs::read_to_string("/tmp/mneme_test_grandchild.pid")
        .unwrap().trim().parse().unwrap();

    // The function under test
    app_lib::kill_pgid(parent_pid);

    thread::sleep(Duration::from_millis(2_500));   // wait past the 2s SIGTERM grace window

    // Assert grandchild is dead — kill -0 returns ESRCH for a non-existent PID
    let still_alive = unsafe { libc::kill(grandchild_pid as i32, 0) } == 0;
    assert!(!still_alive, "grandchild PID {} still alive after kill_pgid", grandchild_pid);

    let _ = std::fs::remove_file("/tmp/mneme_test_grandchild.pid");
}
```

The planner's job: pack TDD-eligible tasks as RED→GREEN→REFACTOR (3 sub-tasks each with explicit gates) and pack non-TDD tasks as straight execute (1 task with verification = manual visual or harness pass).

---

## Validation Architecture

> Required for Nyquist Dimension 8 — VALIDATION.md generation in plan-phase step 5.5. The 4-piece contract's eval strategy (AI-SPEC §5) supplies the fixtures; this section maps them to a layered test pyramid for plan-checker consumption.

### Test Framework

| Property | Value |
|----------|-------|
| Framework (frontend) | Vitest 4.1.5 (jsdom env) — bundled with the SvelteKit svelte-ts template |
| Framework (Rust) | Built-in `cargo test` + `nix` (dep) for syscall assertions |
| Config files | `vitest.config.ts` (jsdom env, no extra setup); `Cargo.toml` (no test runner config beyond features) |
| Quick run command | `npx vitest run --changed` (Husky pre-commit) |
| Full suite command (frontend) | `npx vitest run` |
| Full suite command (backend) | `cargo test --manifest-path src-tauri/Cargo.toml` |
| Audit script | `bash scripts/audit-capabilities.sh` (prebuild + pre-commit) |
| Lifecycle harness | `bash tests/manual/lifecycle/run-quit-loop.sh` (manual; pre-Phase-2-entry gate) |
| Manual dogfood checklist | `tests/manual/dogfood-checklist.md` (developer-checkbox; pre-Phase-2-entry gate) |

### Test Pyramid

**Layer 1 — Unit (deterministic, fast, runs every commit):**

| Surface | Coverage | Tool | File |
|---------|----------|------|------|
| `buildClaudeArgs` SSOT | REQ-2 spawn-arg discipline; `--max-turns 30`, `--add-dir <SCRATCH>`, `--exclude-dynamic-system-prompt-sections` presence; `--bare` absence | Vitest | `tests/spawn-args.test.ts` |
| `sanitizeMarkdown` XSS battery | REQ-5 streaming XSS hardening — 6 fixture payloads | Vitest + jsdom | `tests/sanitize.test.ts` |
| `renderKatex` `\href` block | REQ-5 KaTeX `trust:false` enforcement | Vitest + jsdom | `tests/sanitize.test.ts` |
| 6-arm `dispatchEvent` | REQ-2 event taxonomy correctness; tool-use round-trip; `assistant.text` skip | Vitest | `tests/stream-dispatch.test.ts` |
| Generated capability regex compile + match | REQ-4 capability hardening — every Var validator compiles + matches expected | Vitest | `tests/capability-regex.test.ts` |

**Layer 2 — Integration (deterministic, slower, runs on full suite):**

| Surface | Coverage | Tool | File |
|---------|----------|------|------|
| `kill_pgid` against a real `setsid` child tree | REQ-3 PGID kill correctness | `cargo test` + nix | `src-tauri/tests/kill_pgid.rs` |
| `audit-capabilities.sh` against corrupted-JSON fixtures | REQ-4 audit-script correctness (catches `args:true`, `*`, `--bare`, SSOT drift) | Bash + fixture stubs | `tests/audit/*` |

**Layer 3 — End-to-End (manual; gate before Phase 2 entry):**

| Surface | Coverage | Tool | File |
|---------|----------|------|------|
| 5-cycle spawn → Cmd+Q → orphan-count check | REQ-3 full lifecycle eradication | Bash harness | `tests/manual/lifecycle/run-quit-loop.sh` |
| 5 dogfood prompts (math, code, tool-use, no-tool, long-stream) | REQ-2 streaming legibility, tool-use clarity, math/code rendering | Manual visual + dev-console | `tests/manual/dogfood-checklist.md` |
| Layout persistence round-trip | REQ-1 localStorage persistence | Manual visual | dogfood-checklist row |
| Window-min enforcement (1024×600) | REQ-1 acceptance | Manual visual | dogfood-checklist row |
| Hotkey unbinding (`Cmd+L/K/N/R/,/P/O/Shift+P/W`) | REQ-6 acceptance | Manual visual + dev-console | dogfood-checklist row |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| REQ-1 | Three-pane resizable shell with persistent split positions | manual + visual | n/a (dogfood checklist) | ❌ Wave 0/3 (`tests/manual/dogfood-checklist.md`) |
| REQ-1 | Window minimum 1024×600 enforced | manual visual | n/a | ❌ Wave 0/3 (dogfood-checklist) |
| REQ-1 | Bottom row 120px placeholder + chrome | manual visual | n/a | ❌ Wave 0/3 (dogfood-checklist) |
| REQ-2 | Spawn args contain `--max-turns 30 / --add-dir <SCRATCH> / --exclude-dynamic-system-prompt-sections / NO --bare` | unit | `npx vitest run tests/spawn-args.test.ts` | ❌ Wave 0/3 (`tests/spawn-args.test.ts`) |
| REQ-2 | 6-event JSONL parsing + tool-use round-trip + assistant.text skip | unit | `npx vitest run tests/stream-dispatch.test.ts` | ❌ Wave 0/3 (`tests/stream-dispatch.test.ts`) |
| REQ-2 | Streaming legibility + finalization on `result` (TTFT < 4s; markdown structurally matches stream) | manual dogfood | n/a | ❌ Wave 0/3 (dogfood-checklist) |
| REQ-2 | First-prompt `cache_creation_input_tokens` < 20,000 | manual dogfood | dev-console assertion on result event | ❌ Wave 0/3 (dogfood-checklist) |
| REQ-3 | Cmd+Q kill within 2s; 5-cycle orphan count == 0 | E2E manual | `bash tests/manual/lifecycle/run-quit-loop.sh` | ❌ Wave 0/3 (`tests/manual/lifecycle/run-quit-loop.sh`) |
| REQ-3 | `kill_pgid` against real `setsid` child tree | integration | `cargo test --test kill_pgid` | ❌ Wave 0/3 (`src-tauri/tests/kill_pgid.rs`) |
| REQ-4 | Zero `args:true` / zero `*` / SSOT drift = 0 / no `--bare` validator | unit | `bash scripts/audit-capabilities.sh` | ❌ Wave 0/2 (`scripts/audit-capabilities.sh`) |
| REQ-4 | Capability regex validators all compile + match expected | unit | `npx vitest run tests/capability-regex.test.ts` | ❌ Wave 0/3 (`tests/capability-regex.test.ts`) |
| REQ-5 | 6 XSS fixtures all render inert | unit | `npx vitest run tests/sanitize.test.ts` | ❌ Wave 0/3 (`tests/sanitize.test.ts`) |
| REQ-5 | KaTeX version ≥ 0.16.21 in package-lock.json | manual | `npm ls katex` | n/a (use `npm ls`) |
| REQ-5 | DOMPurify config has FORBID_TAGS + (Option-A) `uponSanitizeAttribute` hook | manual + structural | `rg 'DOMPurify\.sanitize\(' src/` review | n/a |
| REQ-5 | CSP meta tag in `app.html` | manual + grep | `grep 'Content-Security-Policy' src/app.html` | n/a |
| REQ-6 | Single-session: launch always blank | manual visual | n/a (dogfood-checklist) | ❌ Wave 0/3 |
| REQ-6 | Hotkey unbinding (Cmd+L/K/,/P/O/Shift+P/N/R/W) | manual visual + console | n/a (dogfood-checklist) | ❌ Wave 0/3 |
| REQ-6 | Stop button (D-19) preserves already-streamed text | manual visual | n/a (dogfood-checklist) | ❌ Wave 0/3 |
| REQ-6 | Shift+Enter newline (D-20) | manual visual | n/a (dogfood-checklist) | ❌ Wave 0/3 |

### Sampling Rate

- **Per task commit:** Husky pre-commit runs `bash scripts/audit-capabilities.sh && npx vitest run --changed`. Fast (<5s on warm cache). Runs every commit.
- **Per wave merge:** `npx vitest run` (full frontend) + `cargo test --manifest-path src-tauri/Cargo.toml` (full backend) + `bash scripts/audit-capabilities.sh`.
- **Phase gate (before Phase 2 entry):** Full suite green + `bash tests/manual/lifecycle/run-quit-loop.sh` passes (5/5 cycles, orphan count == 0) + `tests/manual/dogfood-checklist.md` all 19 SPEC checks ticked + `/gsd-verify-work 1` clean.

### Wave 0 Gaps

These do NOT exist in the repo today (Phase 1 brings them all up):

- [ ] `package.json` (entire frontend test infrastructure — bundled with `npm create tauri-app`)
- [ ] `vitest.config.ts` — jsdom env, no special setup
- [ ] `tests/spawn-args.test.ts` — covers REQ-2
- [ ] `tests/sanitize.test.ts` — covers REQ-5
- [ ] `tests/stream-dispatch.test.ts` — covers REQ-2
- [ ] `tests/capability-regex.test.ts` — covers REQ-4
- [ ] `src-tauri/tests/kill_pgid.rs` — covers REQ-3 unit-level
- [ ] `tests/audit/` — fixture stubs for audit-script integration test
- [ ] `tests/manual/lifecycle/run-quit-loop.sh` — covers REQ-3 E2E
- [ ] `tests/manual/dogfood-checklist.md` — covers REQ-1, REQ-2 streaming, REQ-5 KaTeX/DOMPurify versions, REQ-6 hotkey unbinding
- [ ] `scripts/gen-capabilities.ts` — covers REQ-4 SSOT
- [ ] `scripts/audit-capabilities.sh` — covers REQ-4 audit gate
- [ ] Husky setup (`.husky/pre-commit` + `npm install --save-dev husky`)

**Existing test infrastructure** that DOES survive into Phase 1: nothing (Phase 0 was identity-only; the spike-002 app is reference, not lifted; Wave 0 builds from `npm create tauri-app` template baseline).

---

## Cross-Phase Risk

Phase 1 is Layer 1 Foundation — six downstream phases inherit its abstractions. The planner MUST shape Phase 1 deliverables so Phase 3+ does NOT need to rip out + redo Phase 1's work.

### Risk 1: Rust state machine — single → multi-session refactor (Phase 3)

**Phase 1 ships:** `struct SessionState(Mutex<Option<u32>>)` (single PID).

**Phase 3 needs:** `Mutex<HashMap<SessionId, u32>>` (or per-session struct holding additional fields like `--resume` token).

**Mitigation — shape Phase 1 abstractions for extension, not in-place mutation:**

```rust
// src-tauri/src/session.rs (Phase 1 fresh-write — extension-friendly shape)

pub type SessionId = u32;     // Phase 1 always uses 1; Phase 3 generates monotonic IDs

pub struct SessionRegistry {
    inner: Mutex<HashMap<SessionId, ChildHandle>>,    // Phase 1 has at most 1 entry; Phase 3 has many
}

pub struct ChildHandle {
    pub pid: u32,
    // Phase 3 will add: resume_token: Option<String>, spawned_at: Instant, ...
}

impl SessionRegistry {
    pub fn new() -> Self { Self { inner: Mutex::new(HashMap::new()) } }

    pub fn register(&self, id: SessionId, handle: ChildHandle) { ... }
    pub fn drain_one(&self, id: SessionId) -> Option<ChildHandle> { ... }
    pub fn drain_all(&self) -> Vec<ChildHandle> { ... }    // <- used by Cmd+Q hooks
    pub fn kill_all(&self) {
        for h in self.drain_all() { kill_pgid(h.pid); }
    }
}
```

The hooks call `state.kill_all()` instead of a per-PID drain. Phase 1 always has 0 or 1 entry; Phase 3 just starts inserting more. **No rip-out.**

**Cost vs alternative:** ~30 LOC heavier than `Mutex<Option<u32>>` in Phase 1. Worth it to make Phase 3 a 1-task swap instead of a 3-task gut.

### Risk 2: `sanitize.ts` pipeline — Phase 9 (anchored mode) adds Citations API tags

**Phase 1 ships:** `sanitizeMarkdown(text)` with FORBID_TAGS + `uponSanitizeAttribute` hook.

**Phase 9 needs:** Render Citations API output, which embeds `<cite>` tags + custom `data-citation-id` attrs around quoted source text.

**Mitigation:** The DOMPurify call in Phase 1 already permits unknown safe tags by default (FORBID_TAGS is a block-list extension, not allow-list replacement). Phase 9 can add `<cite>` to the existing pipeline without restructure — just add `data-citation-id` to `ALLOWED_ATTR` IF Phase 9 chooses Option B path; if Phase 1 stays on Option A `uponSanitizeAttribute` hook, Phase 9 adds an `if (hookEvent.attrName === "data-citation-id") hookEvent.keepAttr = true;` branch to the existing hook. **No rip-out.**

### Risk 3: `--add-dir <SCRATCH>` — Phase 2 swap to user-configured vault path

**Phase 1 ships:** Hard-coded `${homedir()}/.mneme/scratch` in `spawn-args.ts` SSOT; capability validator regex pinned to `^/Users/[^/]+/\\.mneme/scratch$`.

**Phase 2 needs:** User-configurable vault root (via REQ-14 settings UI).

**Mitigation:** Phase 2 changes BOTH `spawn-args.ts` (SCRATCH_DIR becomes user config read) AND the capability validator regex (broaden to `^/Users/[^/]+/[^*]+$` or tighter — Phase 2's job to pick). The `gen-capabilities.ts` SSOT pattern means Phase 2 changes one file (TS const) and the regenerated JSON flows through. **No rip-out**, but Phase 2 must remember to re-tighten the capability regex (NOT broaden to `.+` which would re-open the agentic-search-anywhere hole). **Recommend documenting this as a deferred Phase 2 todo NOW** — `.planning/todos/pending/2026-05-08-phase2-capability-regex-rebroaden.md` or equivalent.

### Risk 4: `audit-capabilities.sh` — additive concerns only

**Phase 1 ships:** 6 audit checks (args:true, `*`, --bare, MAX_TURNS, claude-code-parser-not-in-deps, SSOT drift).

**Phase 2-10 will add:** Vault-path validator drift check (Phase 2), MCP-binary scope check (Phase 7), Echo360 webview cookie isolation (Phase 6).

**Mitigation:** Bash script is additive-friendly; new check = new `if grep ... ; then ... fi` block + early return on first failure. **No rip-out.**

### Risk 5: 6-event dispatch — Anthropic CLI may add new event types

**Phase 1 ships:** 6-arm `switch (evt.type)` per AI-SPEC §3.

**Future risk:** Anthropic may add a 7th event type (e.g., `parallel_tool_use`, `streaming_thinking`, etc.) in a CLI update. The current `default` arm logs "[claude:unknown-event]" but takes no action.

**Mitigation:** AI-SPEC §4b "Validation rules" already locks the unknown-event-warn behavior. Phase 1 ships this; Phase 7 (KG memory) is the natural surface where new event types matter (e.g., if memory facts become a typed event). **No rip-out**, but Phase 7 plan-phase MUST re-survey upstream `claude` CLI events and patch the dispatch.

---

## Open Questions for Planner

These are still ambient — name them so the planner can resolve via tasks rather than additional research.

1. **Translator vs types-only consumption of `vendor/claude-code-parser/`** — research recommends Path 2 (types-only); planner confirms in Wave 1 task notes OR uses Path 1 if there's an executor preference for the upstream Translator abstraction.

2. **DOMPurify FORBID_ATTR fix path** — research recommends Option A (`uponSanitizeAttribute` hook). Planner picks A or B; either resolves the regex-not-supported drift in UI-SPEC L165 + AI-SPEC §3 pitfall #5. Plan-phase SHOULD also patch UI-SPEC + AI-SPEC text inline so future re-readers don't re-introduce the regex form.

3. **Capability args entry style — all-Var vs Fixed+Var hybrid** — research recommends keeping all-Var (Option A in §4.2) to minimize SPEC churn. Planner picks; either works; impacts only the audit script's expected-shape comparator (negligible).

4. **`rust-toolchain.toml` pin granularity** — `1.88` vs `1.88.0` (Phase 0 LEARNINGS macOS-CLI version-precision lesson). Plan-phase decides per Phase 0 precedent; both values work, `1.88` is more permissive (any 1.88.x).

5. **Phase 2 capability-regex re-tighten reminder** — research recommends a deferred todo file (`.planning/todos/pending/2026-05-08-phase2-capability-regex-rebroaden.md`). Planner decides whether to create it now or surface during Phase 2 discuss-phase.

6. **`scripts/gen-capabilities.ts` execution — `tsx` vs `node --experimental-strip-types`** — Wave 2 implementation detail; both work on Node ≥22 / Node ≥18 respectively. Planner decides per executor preference + Husky overhead.

7. **Stop button → Rust kill IPC contract** — research suggests a new `stop_session` Tauri command separate from `clear_session_pid`; planner decides shape (one command with mode flag vs two distinct commands).

8. **Husky vs lefthook vs raw `.git/hooks` for pre-commit gate** — research uses Husky per AI-SPEC §5 setup block; planner can swap to lefthook or raw hooks if there's a project preference. Functionally equivalent.

---

## Sources

### Primary (HIGH confidence — verified via Context7 / docs.rs / npm registry / first-party docs)

- [`@tauri-apps/plugin-shell` v2 docs (Shell plugin)](https://v2.tauri.app/plugin/shell/) — `Command.create`, validator regex JSON example, scope structure
- [`tauri_plugin_shell::process::CommandChild` docs.rs](https://docs.rs/tauri-plugin-shell/latest/tauri_plugin_shell/process/struct.CommandChild.html) — full method list verified 2026-05-08; confirms `kill()` is single-PID
- [`tauri-plugin-shell` v2 source — `scope_entry.rs`](https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/shell/src/scope_entry.rs) — `ShellAllowedArg` enum (`Fixed(String) | Var{validator, raw}`) verified 2026-05-08
- [`tauri-plugin-shell` v2 source — `build.rs`](https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/shell/build.rs) — confirms purely declarative (D-15)
- [Tauri Capabilities v2 docs](https://v2.tauri.app/security/capabilities/) — declarative-only confirmation
- [Tauri issue #9198 — `ExitRequested` not fired on macOS](https://github.com/tauri-apps/tauri/issues/9198) — justifies hook union
- [Tauri discussion #3273 — Kill process on exit](https://github.com/tauri-apps/tauri/discussions/3273) — base pattern for D-10
- [`nix` crate v0.31.2 — `killpg`](https://docs.rs/nix/latest/nix/sys/signal/fn.killpg.html) — exact signature verified 2026-05-08
- [`nix` crate v0.31.2 — `getpgid`](https://docs.rs/nix/latest/nix/unistd/fn.getpgid.html) — exact signature verified 2026-05-08
- [crates.io API — `nix` 0.31.2 published 2026-02-28](https://crates.io/crates/nix)
- [crates.io API — `tauri-plugin-shell` 2.3.5 published 2026-02-03](https://crates.io/crates/tauri-plugin-shell)
- [npm registry — `katex` 0.16.45, `dompurify` 3.4.2, `marked` 18.0.3, `@tauri-apps/plugin-shell` 2.3.5, `@tauri-apps/api` 2.11.0, `svelte` 5.55.5, `@sveltejs/kit` 2.59.1, `@sveltejs/adapter-static` 3.0.10, `vitest` 4.1.5](https://www.npmjs.com) — all verified 2026-05-08
- [KaTeX options docs](https://katex.org/docs/options) — `trust / strict / macros / maxExpand / throwOnError` defaults verified
- [DOMPurify README](https://github.com/cure53/DOMPurify) — `FORBID_TAGS / FORBID_ATTR` accept string arrays only; `uponSanitizeAttribute` hook for regex-style attr filtering
- [`udhaykumarbala/claude-code-parser`](https://github.com/udhaykumarbala/claude-code-parser) — MIT typed parser; vendored per KD-12; API: `parseLine`, `Translator`, `createMessage`, `extractContent`

### Locked contract (HIGH confidence — authoritative project docs)

- `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-SPEC.md` — 6 locked requirements + 19 acceptance checks
- `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-CONTEXT.md` — D-01..D-22 implementation decisions
- `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-AI-SPEC.md` — AI design contract; framework lock; eval strategy
- `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-UI-SPEC.md` — visual contract; tokens.css; chat surface chrome
- `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.planning/PROJECT.md` — KP-01..09 + KD-01..13
- `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.planning/REQUIREMENTS.md` — REQ-01 + REQ-02 + REQ-10 verbatim
- `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.planning/ROADMAP.md` — Phase 1 entry + Layer 1 Foundation overlay
- `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.planning/STATE.md` — current locked decisions snapshot
- `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.planning/dependencies.md` — KP-08 OSS dependency registry
- `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/CLAUDE.md` — L3 project instructions including Phase 5+5.5 entry gates and STACK.md staleness override (KD-12 vendoring)

### Validated foundation (HIGH confidence — spike outcomes)

- `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.claude/skills/spike-findings-mneme/SKILL.md` — auto-loaded skill; non-negotiable requirements + cost reality + visual aesthetic note
- `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.claude/skills/spike-findings-mneme/references/claude-subprocess.md` — 6-event taxonomy + JSONL line buffer + `--bare` incompatibility + cost mitigation strategies
- `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.claude/skills/spike-findings-mneme/references/tauri-shell-ui.md` — Tauri 2 + SvelteKit + plugin-shell + DOMPurify + KaTeX scaffold
- `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.planning/spikes/002-tauri-claude-shell/app/src/routes/+page.svelte` — validated end-to-end demo (REFERENCE ONLY per SPEC L13-20)
- `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.planning/spikes/002-tauri-claude-shell/app/src-tauri/capabilities/default.json` — current `args: true` baseline (the wildcard hardening replaces)
- `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.planning/spikes/002-tauri-claude-shell/app/src-tauri/Cargo.toml` — current `tauri-plugin-shell = "2.3.5"` baseline; `nix` will be added
- `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.planning/spikes/002-tauri-claude-shell/app/package.json` — current dep versions confirmed against npm registry latest

### Secondary (MEDIUM confidence — community pattern reference per RQ-03 absorption)

- [`AnyiWang/OpenCovibe` (Tauri 2 + Svelte 5 + Apache-2.0)](https://github.com/AnyiWang/OpenCovibe) — D-16 targeted-read candidate; same-stack match
- [`yiliqi78/TOKENICODE` (Tauri 2 + React + Apache-2.0)](https://github.com/yiliqi78/TOKENICODE) — D-16 `useStreamProcessor.ts` `finalizeOnce` + `control_request` patterns
- [`getAsterisk/opcode` (AGPL — UX screenshot study only)](https://github.com/getAsterisk/opcode) — D-09 + D-16 read-only

---

## Metadata

**Confidence breakdown:**

- Standard stack (Tauri 2 + SvelteKit + adapter-static + tauri-plugin-shell + nix + KaTeX + DOMPurify + marked): **HIGH** — every version verified against npm/crates.io 2026-05-08; spike-002 already runs end-to-end on these versions.
- Architecture patterns (CSS Grid splitter, Rust state machine + double-hook union, SSOT + gen + audit triple, sanitize pipeline): **HIGH** — all locked by 4-piece contract; this research only verifies API shapes and corrects 2 cross-spec drifts.
- Pitfalls (zombies / capability wildcards / streaming XSS): **HIGH** — locked by spike findings + AI-SPEC critical-failure-mode catalog; all 5 modes have verified mitigations.
- Cross-phase risk shape (extension-friendly Rust struct, additive sanitize hook, additive audit script): **MEDIUM** — recommendations not yet adopted as Phase 2/3/9 concrete tasks; planner-action-item.

**Research date:** 2026-05-08
**Valid until:** 2026-06-07 (30 days for Tauri 2 + SvelteKit stable; the only risk vector is npm/crates.io minor bumps which are easy to re-pin)

---

*Phase: 01-tauri-shell-foundation-subprocess-hardening*
*Research compiled: 2026-05-08*
*Next step: `/gsd-plan-phase 1 --tdd` reads this RESEARCH.md alongside SPEC + CONTEXT + AI-SPEC + UI-SPEC; produces VALIDATION.md (per Nyquist Dimension 8) + PLAN.md(s); applies SPEC patches per CONTEXT.md `<spec_lock>` (REQ-1 layout, REQ-6 hotkeys including Cmd+W unbound) AND the 2 cross-spec corrections in §4 of this research (DOMPurify regex → uponSanitizeAttribute hook OR ALLOWED_ATTR allow-list; capability args shape decision).*

## RESEARCH COMPLETE
