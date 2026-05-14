# Testing Patterns

**Analysis Date:** 2026-05-14

## Test Framework

**Runner (TypeScript / JavaScript):**
- **Vitest 4.1.5** — `vitest` + `vitest/config`
- Config: `vitest.config.ts` (uses `defineConfig` from `vitest/config` with the SvelteKit Vite plugin)
- Environment: `jsdom` (provided by `jsdom@25.0.1` in devDependencies)
- `globals: true` — `describe` / `it` / `expect` are available without import, but the codebase still imports them explicitly for clarity

**Assertion library:**
- Built-in Vitest expect (`expect(...).toBe(...)`, `toEqual`, `toMatchObject`, `toHaveBeenCalledWith`, `toContain`, `toHaveLength`, `not.toThrow`, etc.)

**Mocking:**
- Vitest built-in (`vi.fn()`, `vi.mock()`, `vi.spyOn()`, `vi.resetModules()`, `vi.restoreAllMocks()`)

**Runner (Rust):**
- Cargo built-in test harness — `#[test]` and `#[tokio::test(flavor = "current_thread")]`
- tokio 1.x with `test-util`, `macros`, `rt`, `sync`, `time`, `fs` features for async tests (see `src-tauri/Cargo.toml` lines 43-44)
- `tempfile` 3.x for isolated tempdirs in integration tests
- `nix` 0.31 (signal + process features) used by `kill_pgid` and its test for signal-0 liveness probes

**Run commands:**
```bash
npm test                           # vitest run (one-shot)
npm run test:watch                 # vitest (watch mode)
npm run check                      # svelte-kit sync && svelte-check (type-check only)
cargo test --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml --test kill_pgid
cargo test --manifest-path src-tauri/Cargo.toml --test dev_log_rotation
```

The `npx vitest run --changed` form runs in the pre-commit hook (`.husky/pre-commit`) so only changed-file tests gate the commit.

## Test File Organization

**TypeScript / Vitest discovery patterns (`vitest.config.ts` lines 7-13):**
```ts
include: [
  'tests/**/*.test.ts',
  'src/**/*.test.ts',
  'scripts/__tests__/**/*.test.mjs'
]
```

Three legitimate locations:
1. **`tests/`** at repo root for library-level tests against `src/lib/*` modules and the capability JSON. Files: `tests/sanitize.test.ts`, `tests/stream-dispatch.test.ts`, `tests/spawn-args.test.ts`, `tests/capability-regex.test.ts`, `tests/tool-use-collapsible.test.ts`
2. **Co-located** under `src/lib/<domain>/` for domain-internal tests. Files: `src/lib/dev/console-forwarder.test.ts` next to `console-forwarder.ts`
3. **`scripts/__tests__/`** for Node-ESM npm-script bridge tests (`*.test.mjs`). Files: `scripts/__tests__/gsd-dev-scan-logs.test.mjs`, `gsd-dev-screenshot.test.mjs`, `gsd-dev-snapshot.test.mjs`, `verify-work-patches.test.mjs`, `visual-review-template.test.mjs`

**Rust test locations:**
- **Unit tests inline** with `#[cfg(test)] mod tests { ... }` at the bottom of the source file. Example: `src-tauri/src/dev.rs` lines 491-558 (6 pure-formatter tests)
- **Integration tests** under `src-tauri/tests/<name>.rs`. Each file becomes a separate test binary. Files: `src-tauri/tests/kill_pgid.rs` (3 tests), `src-tauri/tests/dev_log_rotation.rs` (3 tests, all `#![cfg(debug_assertions)]`-gated)
- Integration tests import the library crate as `app_lib::*` (Cargo `[lib] name = "app_lib"` in `src-tauri/Cargo.toml` line 9)

**Naming:**
- TS test files: `<source>.test.ts` (e.g. `sanitize.test.ts` for `sanitize.ts`)
- TS describe block: matches the feature / domain / requirement ID — e.g. `describe("sanitize XSS battery (REQ-5)", ...)`, `describe("dispatchEvent — 6-arm router", ...)`, `describe("A-14 ToolUseGroup state machine", ...)`
- Test names use plain natural-English statements — e.g. `it("returns exactly 13 elements", ...)`, `it("preserves original console output (closure-captured reference still fires)", ...)`, `it("collapses on result event; toolUses preserved", ...)`
- Rust test functions: `snake_case` describing behavior — e.g. `fn kill_pgid_eradicates_whole_process_group()`, `fn writer_rotates_at_10mb()`, `fn writer_debounces_within_100ms()`, `fn writer_swallows_io_errors_per_dsf04()`

**Structure (repo layout):**
```
tests/                                  # repo-level vitest suites
├── sanitize.test.ts
├── stream-dispatch.test.ts
├── spawn-args.test.ts
├── capability-regex.test.ts
├── tool-use-collapsible.test.ts
├── audit/                              # shell-script audit fixtures
│   ├── fixture-args-true.json
│   ├── fixture-bare.json
│   ├── fixture-clean.json
│   ├── fixture-wildcard.json
│   └── test-audit-script.sh
├── fixtures/                           # NDJSON / data fixtures
│   └── stream-events.ndjson
└── manual/                             # human-driven checklists (NOT run by vitest)
    ├── dogfood-checklist.md
    └── lifecycle/

src/lib/dev/
├── console-forwarder.ts
└── console-forwarder.test.ts           # co-located

scripts/__tests__/                      # *.test.mjs Node-ESM tests
├── gsd-dev-scan-logs.test.mjs
├── gsd-dev-screenshot.test.mjs
├── gsd-dev-snapshot.test.mjs
├── verify-work-patches.test.mjs
└── visual-review-template.test.mjs

src-tauri/tests/                        # cargo integration tests
├── kill_pgid.rs
└── dev_log_rotation.rs
```

## Test Structure

**Standard Vitest layout** (from `tests/sanitize.test.ts`):
```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { escapeHtml, renderKatex, sanitizeMarkdown } from "../src/lib/sanitize";

describe("sanitize XSS battery (REQ-5)", () => {
  let alertSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    alertSpy = vi.fn();
    (globalThis as any).alert = alertSpy;
  });
  afterEach(() => {
    delete (globalThis as any).alert;
  });

  it.each(xssFixtures)("renders %s inert (no alert; no script/on* attrs survive)", (payload) => {
    const html = sanitizeMarkdown(payload);
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(alertSpy).not.toHaveBeenCalled();
    expect(doc.querySelector("script")).toBeNull();
  });
});
```

**Patterns:**
- One top-level `describe` per requirement / decision / state-machine arm (e.g. `describe("A-14 ToolUseGroup state machine", ...)` then `describe("A-14 header derivation (render-layer helpers)", ...)`)
- `beforeEach` / `afterEach` for per-test setup-teardown (spy install, module reset, console restoration)
- Assertions use the AAA mental model but don't add literal `// Arrange` / `// Act` / `// Assert` comments — the structure is implicit
- Parameterized tests use `it.each(...)` with an array of `[input, label]` tuples — see `tests/sanitize.test.ts` lines 20-36

**Per-test fresh module re-import (for module-singleton patterns):**
- The forwarder test resets `vi.resetModules()` in `beforeEach` then dynamically imports `./console-forwarder` so the module-load `globalThis.__mnemeForwarderInstalled` flag is reset between tests. See `src/lib/dev/console-forwarder.test.ts` lines 34-48

**Rust unit-test layout** (from `src-tauri/src/dev.rs` lines 491-558):
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn console_log_line_format() {
        let line = format_console_entry("error", "boom", Some("uncaught"), None, None);
        assert!(line.starts_with("[FRONTEND_CONSOLE]"), "missing prefix: {line}");
        assert!(line.contains("UNCAUGHT"), "missing UNCAUGHT tag: {line}");
        assert!(line.contains("boom"), "missing message: {line}");
        assert!(line.ends_with('\n'), "missing trailing newline: {line:?}");
    }
}
```

**Patterns:**
- `#[cfg(test)] mod tests` at file bottom; `use super::*;` to bring all module symbols into scope
- Assertion messages always include the offending value with formatting macros — `assert!(cond, "diagnostic: {line:?}")`
- One pure-function test per behavioral assertion; no `setup` macros, no rstest

**Rust integration-test layout** (from `src-tauri/tests/dev_log_rotation.rs`):
```rust
#![cfg(debug_assertions)]

use std::fs;
use std::time::Duration;
use tempfile::TempDir;
use app_lib::dev::{start_log_writer, LogChannel};

#[tokio::test(flavor = "current_thread")]
async fn writer_rotates_at_10mb() {
    let tmp = TempDir::new().expect("tempdir");
    let log_path = tmp.path().join("console.log");
    // ...
}
```

**Patterns:**
- `#![cfg(debug_assertions)]` at file top when the tested module is dev-only
- `TempDir` from `tempfile` for filesystem isolation
- `#[tokio::test(flavor = "current_thread")]` for single-threaded async tests (deterministic ordering)
- Sentinel-file probes for liveness rather than real signal traps — see `pid_alive(pid)` in `src-tauri/tests/kill_pgid.rs` lines 54-58 using `nix::sys::signal::kill(pid, None)`

## Mocking

**Framework:** Vitest built-in (`vi.*`)

**`vi.mock(...)` BEFORE imports** (essential pattern for monkey-patched / globalThis modules):
```typescript
// scripts/__tests__/console-forwarder.test.ts lines 14-16
const invokeSpy = vi.fn().mockResolvedValue(undefined);
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeSpy }));

// Per-test fresh import so the forwarder's module-singleton flag is reset
beforeEach(async () => {
  invokeSpy.mockClear();
  invokeSpy.mockResolvedValue(undefined);
  delete (globalThis as Record<string, unknown>).__mnemeForwarderInstalled;
  vi.resetModules();
  mod = await import('./console-forwarder');
});
```

**`vi.spyOn(console, "log")` for in-test console capture:**
```typescript
// tests/stream-dispatch.test.ts lines 11-21
let logSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  logSpy.mockRestore();
  warnSpy.mockRestore();
});
```

**Global stub for `alert` / `fetch` / `XMLHttpRequest` in jsdom:**
```typescript
// tests/sanitize.test.ts lines 12-17
beforeEach(() => {
  alertSpy = vi.fn();
  (globalThis as any).alert = alertSpy;
});

// src/lib/dev/console-forwarder.test.ts lines 182-185
globalThis.fetch = vi
  .fn()
  .mockResolvedValue(new Response('ok', { status: 200 })) as typeof fetch;
mod.installConsoleForwarder();    // install AFTER the mock so the wrap captures the mocked fetch
```

**Subprocess mocking via `spawnSync` against an isolated tempdir** (Node script tests):
```javascript
// scripts/__tests__/gsd-dev-scan-logs.test.mjs lines 14-30
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const SCRIPT = resolve(process.cwd(), 'scripts', 'gsd-dev-scan-logs.mjs');

function runScan(args, cwd) {
  return spawnSync('node', [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

let dir;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mneme-scan-'));
  mkdirSync(join(dir, '.dev-logs'), { recursive: true });
});
```

**Real DOM via jsdom** (jsdom is the configured environment):
- `new DOMParser().parseFromString(html, "text/html")` is the preferred way to verify HTML structure — passive parse, no script execution, no load-handlers fire (so a payload like `<img onerror=alert(1)>` cannot self-execute during the test). See `tests/sanitize.test.ts` lines 30-36

**Synthetic event dispatch for window / document events:**
```typescript
// src/lib/dev/console-forwarder.test.ts lines 95-100
const ev = new ErrorEvent('error', { message: 'boom', filename: 'x.ts', lineno: 42 });
window.dispatchEvent(ev);

// CSP violation synthesis (no native constructor in jsdom)
const ev = new Event('securitypolicyviolation') as Event & {
  violatedDirective: string;
  blockedURI: string;
};
(ev as { violatedDirective: string }).violatedDirective = 'script-src';
```

**What to mock:**
- Tauri SDK calls (`@tauri-apps/api/core`) — every test does this
- `globalThis.fetch`, `globalThis.alert` — install before the unit under test wraps them
- `console.{log,warn,error}` — spy when the unit under test logs noise that would dirty the test output
- `PerformanceObserver.observe` — patch the prototype to simulate Safari 16 unsupported-type behavior (see `src/lib/dev/console-forwarder.test.ts` lines 239-258)

**What NOT to mock:**
- The DOM (jsdom provides it)
- Pure functions (`sanitizeMarkdown`, `escapeHtml`, `buildClaudeArgs`, `dispatchEvent`) — call them directly
- The state machine in `freshState() + dispatchEvent` — replay events and assert the final state shape

## Fixtures and Factories

**NDJSON / data fixtures live under `tests/fixtures/`:**
- `tests/fixtures/stream-events.ndjson` — an actual recorded stream from a Phase-1 `claude --print --output-format stream-json` run. Used in the full-replay test in `tests/stream-dispatch.test.ts` lines 177-192
- Loaded with `readFileSync(resolve(__dirname, "fixtures", "stream-events.ndjson"), "utf8")`

**Capability JSON fixture set lives under `tests/audit/`:**
- `tests/audit/fixture-clean.json`, `fixture-bare.json`, `fixture-wildcard.json`, `fixture-args-true.json` — used by `tests/audit/test-audit-script.sh` (a shell-script test of `scripts/audit-capabilities.sh`)

**Inline factory data:**
- Tests build event objects inline with `as any` casts to match the loose-typed vendor protocol — see `tests/stream-dispatch.test.ts` lines 35-37:
  ```typescript
  dispatchEvent(
    { type: "system", subtype: "init", session_id: "sess_abc", model: "claude-sonnet-4.5", cwd: "/tmp" } as any,
    state
  );
  ```
- `freshState()` is the canonical factory function for the dispatcher state — every dispatcher test calls it in the AAA "Arrange" step

**Sample constants for assertion seeding:**
- `const SAMPLE_SCRATCH = "/Users/qinyuan/.mneme/scratch";` declared once at the top of `tests/spawn-args.test.ts` line 7 and reused across every `it(...)` block

## Coverage

**Requirements:**
- **No coverage threshold is enforced** — there is no `vitest.config.ts` coverage block, no `c8` config, no Cargo `[profile.test]` settings, and no CI workflow that checks `--fail-under-lines`
- The user-level baseline rule recommends 80% line coverage, but the project does NOT enforce it via tooling

**View coverage:**
- Not run by default; coverage tooling (`vitest --coverage` or `cargo llvm-cov`) is not installed
- Phase 01.1 closed with **97 vitest tests + 13 cargo tests** — the count is tracked in commits (`dfe3015`, `3dbddc1`) and surfaced via `npm test` output rather than a coverage report

**What's tested vs what's not:**
- **High coverage:** sanitize (`sanitize.ts`), stream-dispatch (`stream-dispatch.ts`), spawn-args (`spawn-args.shared.ts` + `spawn-args.node.ts`), capability JSON, console-forwarder, npm-script bridges, Rust dev formatters, subprocess kill path, log rotation
- **Lower coverage:** Svelte components (`ChatPanel.svelte`, `AssistantMessage.svelte`, `UserBubble.svelte`, `MindMapBar.svelte`, etc.) have no `.test.ts` files — they are covered by manual dogfood checklists in `tests/manual/dogfood-checklist.md` and by the visual-screenshot loop against `Mneme.html` SSOT

## Test Types

**Unit tests:**
- Pure-function / pure-state-machine tests. Examples: `escapeHtml`, `sanitizeMarkdown`, `renderKatex`, `dispatchEvent`, `gerundHeader` / `pastTenseHeader`, `buildClaudeArgs`, `iso8601_now`, `format_console_entry`
- Located in `tests/*.test.ts` or co-located `*.test.ts` next to the source

**Contract tests:**
- Cross-artifact tests that pin the SSOT relationship between two files. Examples: `tests/capability-regex.test.ts` asserts `default.json` validators match `buildClaudeArgs` output index-for-index; `tests/spawn-args.test.ts` lines 95-129 greps the shared module's source text for forbidden Node imports
- These prevent "drift" between artifacts that must stay in lockstep

**Integration tests:**
- Rust tests under `src-tauri/tests/<name>.rs` that exercise process-group syscalls (`kill_pgid`) and tokio writer tasks (`dev_log_rotation`) end-to-end
- Node script tests under `scripts/__tests__/*.test.mjs` that `spawnSync` the script as a subprocess against an isolated tempdir and assert exit-code + stdout/stderr JSON shape

**Replay tests (against recorded fixtures):**
- `tests/stream-dispatch.test.ts` lines 177-192 reads a recorded NDJSON stream and replays it through `dispatchEvent`, asserting the final state matches the contract (`resultReceived`, `totalCostUsd`, `totalInputTokens`, `toolUseGroup.open`, message-role coverage)

**Defense-in-depth / "no-leak" tests:**
- `tests/tool-use-collapsible.test.ts` lines 139-193 asserts two distinct `freshState()` instances do not share state — pinning the no-module-level-state contract documented in the dispatcher header

**E2E tests:**
- **Not used.** There is no Playwright, Cypress, WebdriverIO, or other browser-automation framework. The user-level rule recommends Playwright for critical user flows, but the current mneme Phase-1 surface is too tightly bound to the macOS WKWebView + subprocess lifecycle to benefit from a generic browser harness
- Visual verification is handled by `scripts/take-screenshot.mjs` + `scripts/screenshot-01-06.mjs` + the dev-feedback-loop `gsd-dev-screenshot` / `gsd-dev-snapshot` / `gsd-dev-scan-logs` triplet documented in `openspec/specs/dev-feedback-loop/`
- Manual flows are tracked as written checklists under `tests/manual/dogfood-checklist.md` and `tests/manual/lifecycle/`

## Common Patterns

**Async testing:**
```typescript
// scripts/__tests__/gsd-dev-screenshot.test.mjs (vitest async it)
it('forwards fetch GET 200 to dev_log_network_entry', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 })) as typeof fetch;
  mod.installConsoleForwarder();
  await fetch('/api/health');
  expect(invokeSpy).toHaveBeenCalledWith(
    'dev_log_network_entry',
    expect.objectContaining({ method: 'GET', url: '/api/health', status: 200 })
  );
});

// Rust async
#[tokio::test(flavor = "current_thread")]
async fn writer_debounces_within_100ms() {
    let tx = start_log_writer(LogChannel::Console, log_path.clone());
    for i in 0..5 {
        let _ = tx.send(format!("msg{i}\n")).await;
    }
    tokio::time::sleep(Duration::from_millis(300)).await;
    let contents = fs::read_to_string(&log_path).expect("read");
    assert_eq!(contents.lines().count(), 5);
}
```

**Error / throw testing:**
```typescript
// tests/spawn-args.test.ts lines 88-92
it("REJECTS scratchDir that does not match SCRATCH_DIR_REGEX (defense-in-depth)", () => {
  expect(() => buildClaudeArgs("hello", "/etc/hosts")).toThrow(/scratchDir/i);
  expect(() => buildClaudeArgs("hello", "/Users/qinyuan/.ssh")).toThrow(/scratchDir/i);
  expect(() => buildClaudeArgs("hello", "")).toThrow(/scratchDir/i);
});

// src/lib/dev/console-forwarder.test.ts lines 262-272 (no-throw contract)
it('does NOT throw when invoke rejects', () => {
  invokeSpy.mockReset();
  invokeSpy.mockRejectedValue(new Error('tauri-side write failed'));
  mod.installConsoleForwarder();
  expect(() => console.error('test')).not.toThrow();
});
```

**Parameterized fixtures via `it.each`:**
```typescript
// tests/sanitize.test.ts lines 20-36
const xssFixtures: Array<[string, string]> = [
  ["<img src=x onerror=alert(1)>", "img-onerror"],
  ["<script>alert(2)</script>", "script-tag"],
  // ...
];
it.each(xssFixtures)("renders %s inert", (payload) => { ... });

// src/lib/dev/console-forwarder.test.ts lines 61-74
it.each(['log', 'info', 'debug', 'warn', 'error'] as const)(
  'forwards console.%s → dev_log_console_entry with matching level',
  (level) => { ... }
);
```

**Fixture replay (NDJSON):**
```typescript
// tests/stream-dispatch.test.ts lines 177-192
it("full NDJSON fixture replay: end state matches contract", () => {
  const fixturePath = resolve(__dirname, "fixtures", "stream-events.ndjson");
  const lines = readFileSync(fixturePath, "utf8").split("\n").filter(Boolean);
  const state = freshState();
  for (const raw of lines) {
    try { dispatchEvent(JSON.parse(raw), state); } catch { /* malformed line — drop, mirrors production buffer behavior */ }
  }
  expect(state.resultReceived).toBe(true);
  expect(state.totalCostUsd).toBe(0.0123);
  expect(state.toolUseGroup.open).toBe(false);
});
```

**Capability / cross-artifact contract:**
```typescript
// tests/capability-regex.test.ts lines 69-75
it("every validator matches the value buildClaudeArgs emits at the same index", () => {
  const sampleArgs = buildClaudeArgs("FREE_FORM_PROMPT_HERE", SCRATCH_DIR);
  for (let i = 0; i < validators.length; i++) {
    const re = new RegExp(validators[i].validator);
    expect(re.test(sampleArgs[i])).toBe(true);
  }
});
```

**Process-group cleanup (Rust integration):**
- `src-tauri/tests/kill_pgid.rs` uses a Python wrapper that calls `os.setsid()` to become a process-group leader, then forks two `sleep 30` children. The test calls `kill_pgid(python_pid)`, waits past the 2s SIGTERM grace + small buffer, then asserts ALL three PIDs are gone via `kill -0` (signal 0) liveness probes. See lines 67-194 for the full pattern

**Permission-error simulation (Unix-only):**
```rust
// src-tauri/tests/dev_log_rotation.rs lines 96-102
#[cfg(unix)]
{
    use std::os::unix::fs::PermissionsExt;
    let mut perms = fs::metadata(&log_path).expect("stat").permissions();
    perms.set_mode(0o400);
    fs::set_permissions(&log_path, perms).expect("chmod");
}
// Subsequent writes must NOT panic — D-SF-04 swallow contract
```

## Pre-Commit and CI

**Pre-commit hook** (`.husky/pre-commit`):
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Phase 1 pre-commit gate (REQ-4 audit + scoped vitest).
# Capability drift / wildcard / --bare / SSOT misalignment will fail FAST here.
# Full suite runs on `npm test` or in CI; pre-commit stays under ~5s warm cache.

bash scripts/audit-capabilities.sh || exit 1
npx vitest run --changed || exit 1

exit 0
```

**Order of operations:**
1. `bash scripts/audit-capabilities.sh` — capability JSON drift check (regenerate + diff against committed file; grep for forbidden Node imports in the shared module)
2. `npx vitest run --changed` — run only vitest tests covering changed files (warm-cache fast)
3. The hook does NOT run `cargo test`, `cargo fmt`, `cargo clippy`, or `npm run check`. These are run on demand or in CI

**CI:**
- No `.github/workflows/` directory found at repo root — the project is solo-dev and pre-commit-hook driven. The full test suite is invoked manually via `npm test` and `cargo test --manifest-path src-tauri/Cargo.toml`

---

*Testing analysis: 2026-05-14*
