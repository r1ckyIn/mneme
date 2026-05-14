# Phase 1: Tauri Shell Foundation + Subprocess Hardening — Pattern Map

**Mapped:** 2026-05-08
**Files analyzed:** ~30 new/modified files
**Analogs found:** 30 / 30 (every file has a designated analog source — spike-002 / vendor-upstream / external reference / greenfield-with-OSS-cite)

---

## Method note (Phase 1 specifics)

Phase 1 is a **Layer 1 Foundation** phase on a freshly-bootstrapped Tauri 2 + SvelteKit project (Phase 0 was branding/icon-only — repo is essentially empty of source). Traditional in-codebase analog search yields almost nothing. Compensating analog sources, in priority order:

1. **`.planning/spikes/002-tauri-claude-shell/app/`** — validated end-to-end demo (REFERENCE ONLY per SPEC L13-20; Phase 1 fresh-writes from this seed with 5 hardening upgrades). This is the closest analog for ~70% of Phase 1 files.
2. **`.claude/skills/spike-findings-mneme/`** — auto-loaded skill with the SKILL.md + `references/claude-subprocess.md` + `references/tauri-shell-ui.md` + `sources/002-tauri-claude-shell/` mirror. Treated as the **project-local pattern library** for execute-time consultation.
3. **`vendor/claude-code-parser/`** (TO BE LIFTED in Wave 0 from `udhaykumarbala/claude-code-parser` MIT, per KD-12 + D-13; not present today). Once lifted, it provides the typed `ClaudeEvent` discriminated union that `src/lib/stream-dispatch.ts` consumes (Path 2: types-only — Translator unused).
4. **External upstream references (READ-ONLY — D-09 license posture)**:
   - **OpenCovibe** (`AnyiWang/OpenCovibe`, Apache-2.0, Tauri 2 + Svelte 5) — direct stack match; D-16 targeted-read for session-actor + multi-pane patterns. **Code-level adoption allowed.**
   - **TOKENICODE** (`yiliqi78/TOKENICODE`, Apache-2.0, Tauri 2) — D-16 targeted-read of `useStreamProcessor.ts` for `finalizeOnce` (idempotent teardown) + `control_request` (bypass-mode hang prevention). **Pattern-level adoption allowed.**
   - **opcode** (`getAsterisk/opcode`, AGPL-3.0) — UX screenshot study only, NEVER copy code (D-09 lock).
5. **Greenfield (D-01 / D-14 / D-22)** — the splitter, SSOT generator, audit script, tokens.css are written from scratch with no codebase analog. PATTERNS.md cites the OSS reference that fed each design.

**Spike-002 reference paths (used throughout below):**
- Skill mirror: `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.claude/skills/spike-findings-mneme/sources/002-tauri-claude-shell/`
- Spike sandbox: `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.planning/spikes/002-tauri-claude-shell/app/`

Both contain the same `+page.svelte`, `lib.rs`, `default.json`, `Cargo.toml`, `tauri.conf.json`. Below citations use the `.planning/spikes/...` path because that's the live tree the executor will read at implement-time; the `.claude/skills/...` mirror is the auto-loaded version the orchestrator surfaces.

---

## File Classification

### Tauri / Rust backend layer

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src-tauri/Cargo.toml` | config | n/a | `.planning/spikes/002-tauri-claude-shell/app/src-tauri/Cargo.toml` | exact (extend) |
| `src-tauri/tauri.conf.json` | config | n/a | `.planning/spikes/002-tauri-claude-shell/app/src-tauri/tauri.conf.json` | role-match (rewrite per D-05/D-06) |
| `src-tauri/capabilities/default.json` (GENERATED) | config | n/a | `.planning/spikes/002-tauri-claude-shell/app/src-tauri/capabilities/default.json` | role-match (semantic inverse — replaces wildcards) |
| `src-tauri/src/lib.rs` | controller / lifecycle | event-driven | `.planning/spikes/002-tauri-claude-shell/app/src-tauri/src/lib.rs` (skeletal — needs full rewrite) | partial (2-line analog → ~150 LOC fresh) |
| `src-tauri/src/main.rs` | bootstrap | n/a | spike-002 main.rs (template-default) | exact |
| `src-tauri/src/session.rs` (NEW per RESEARCH §8 Risk-1) | state-store | event-driven | None — greenfield extension-friendly shape per RESEARCH.md cross-phase risk mitigation | greenfield (cite RESEARCH.md §8 lines 904-928) |
| `src-tauri/tests/kill_pgid.rs` | test (integration) | n/a | None — greenfield Rust integration test | greenfield (cite RESEARCH.md §TDD lines 755-787) |
| `rust-toolchain.toml` | config | n/a | None — greenfield (Phase 0 LEARNINGS macOS-CLI version-precision lesson) | greenfield (KD-03) |

### Frontend (SvelteKit) layer

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `package.json` | config | n/a | `.planning/spikes/002-tauri-claude-shell/app/package.json` (extend) + `npm create tauri-app` template | exact (extend) |
| `vitest.config.ts` | config (test) | n/a | None — greenfield (Vitest bundled with svelte-ts template) | greenfield |
| `tsconfig.json` | config | n/a | template-default + RESEARCH §4.8 path-alias patch | exact (extend) |
| `src/app.html` | static-template | n/a | template-default (`npm create tauri-app`) | partial (extend with CSP meta) |
| `src/routes/+layout.ts` | route-config | n/a | `.planning/spikes/002-tauri-claude-shell/app/src/routes/+layout.ts` | exact (lift verbatim) |
| `src/routes/+page.svelte` | component (UI host) | event-driven | `.planning/spikes/002-tauri-claude-shell/app/src/routes/+page.svelte` (495 LOC) | role-match (fresh-write with 5 hardening upgrades) |
| `src/lib/components/Splitter.svelte` (NEW) | component (interaction) | event-driven (pointer) | None — greenfield (D-01: vanilla, reject `svelte-splitpanes`) | greenfield (cite UI-SPEC §Geometry Contract) |
| `src/lib/spawn-args.ts` (NEW) | utility (SSOT) | request-response (pure) | None — greenfield (D-14 SSOT pattern) | greenfield (cite RESEARCH §4.2 + AI-SPEC §3) |
| `src/lib/stream-dispatch.ts` (NEW) | utility (event router) | event-driven | spike-002 `+page.svelte` `handleEvent()` lines 167-257 (extracted into pure function) | exact (extract + harden) |
| `src/lib/sanitize.ts` (NEW) | utility (security wrapper) | request-response (pure) | spike-002 `+page.svelte` `renderMarkdown()` + `renderMath()` lines 36-74 (extract + harden) | role-match (extract + 5 hardening upgrades) |
| `src/lib/styles/tokens.css` (NEW) | static-asset (CSS tokens) | n/a | None — greenfield (UI-SPEC §Token Module) | greenfield (cite UI-SPEC §lines 132-232) |

### Vendor (KD-12 + D-13)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `vendor/claude-code-parser/src/*.ts` | vendored types | n/a | `udhaykumarbala/claude-code-parser` upstream MIT (lifted) | exact (verbatim copy) |
| `vendor/claude-code-parser/LICENSE` | vendor attribution | n/a | upstream MIT LICENSE | exact (verbatim copy) |
| `vendor/claude-code-parser/VENDOR.md` (NEW) | metadata | n/a | None — greenfield (D-13 specifies content) | greenfield (cite CONTEXT.md D-13) |

### Scripts + tooling

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scripts/gen-capabilities.ts` (NEW) | utility (codegen) | request-response (pure) | None — greenfield (D-14 SSOT-→-JSON generator) | greenfield (cite RESEARCH §4.2 args shape + AI-SPEC §3) |
| `scripts/audit-capabilities.sh` (NEW) | utility (CI guard) | batch | None — greenfield (composes diff + grep checks) | greenfield (cite RESEARCH §Wave 2 step 4 lines 570-615) |
| `.husky/pre-commit` (NEW) | hook | n/a | None — greenfield (Husky-init template) | greenfield (cite AI-SPEC §5 setup block) |

### Tests (TDD-active per RESEARCH §TDD)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `tests/spawn-args.test.ts` (NEW) | test (unit) | n/a | None — greenfield (RED stub provided in RESEARCH §TDD lines 666-704) | greenfield (lift RED stub from RESEARCH) |
| `tests/sanitize.test.ts` (NEW) | test (unit + jsdom) | n/a | None — greenfield (RED stub provided in RESEARCH §TDD lines 707-752) | greenfield (lift RED stub from RESEARCH) |
| `tests/stream-dispatch.test.ts` (NEW) | test (unit) | n/a | None — greenfield (described in RESEARCH §TDD line 651) | greenfield (cite RESEARCH §TDD) |
| `tests/capability-regex.test.ts` (NEW) | test (unit on JSON) | n/a | None — greenfield (described in RESEARCH §TDD line 652) | greenfield (cite RESEARCH §TDD) |
| `tests/manual/lifecycle/run-quit-loop.sh` (NEW) | test (E2E manual) | batch | None — greenfield (described in RESEARCH §Wave 3 lines 626-628) | greenfield (cite SPEC L134 acceptance) |
| `tests/manual/dogfood-checklist.md` (NEW) | test (manual) | n/a | None — greenfield (mirrors SPEC L128-148 + AI-SPEC §5 5-prompt set) | greenfield (cite AI-SPEC §5 lines 762-775) |

### Runtime artifact

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `~/.mneme/scratch/` (auto-created) | runtime dir | n/a | None — greenfield (Rust setup hook per RESEARCH §Wave 0 step 12) | greenfield |

---

## Pattern Assignments

### `src-tauri/Cargo.toml` (config)

**Analog:** `.planning/spikes/002-tauri-claude-shell/app/src-tauri/Cargo.toml` (lines 1-26)

**Imports / dependency block to lift verbatim** (spike-002 lines 17-26 minus `tauri-plugin-opener` which Phase 1 doesn't need):
```toml
[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tauri-plugin-shell = "2.3.5"
```

**Adaptation — add (per D-11 + RESEARCH §4.3):**
```toml
nix = { version = "0.31", features = ["signal", "process"] }
```

**Drop:** `tauri-plugin-opener = "2"` — not needed in Phase 1 (no external links).

**Pitfall callouts:**
- `nix` features `signal` + `process` are BOTH required — `signal` for `killpg + Signal::SIGTERM/SIGKILL`, `process` for `getpgid`. Missing either feature breaks compilation.
- Verified version 0.31.2 against crates.io 2026-05-08 (RESEARCH §4.3 lines 170-194).

---

### `src-tauri/tauri.conf.json` (config)

**Analog:** `.planning/spikes/002-tauri-claude-shell/app/src-tauri/tauri.conf.json` (lines 1-36) — structure exact, ~6 fields rewritten per Phase 1 identity + window chrome locks.

**Pattern to copy** (spike-002 outer skeleton):
```jsonc
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Mneme",        // CHANGED from "app" — Phase 0 D-14
  "version": "0.1.0",
  "identifier": "dev.mneme.app", // CHANGED from "dev.mneme.spike" — Phase 0 D-10
  "build": { /* same as spike */ },
  "app": {
    "windows": [
      {
        "title": "Mneme",          // CHANGED from "app"
        "width": 1280,             // CHANGED from 800 — D-05
        "height": 860,             // CHANGED from 600 — D-05
        "minWidth": 1024,          // ADDED — SPEC L37
        "minHeight": 600,          // ADDED — SPEC L37
        "decorations": true,       // ADDED — D-06
        "titleBarStyle": "Overlay",// ADDED — D-06
        "hiddenTitle": true        // ADDED — D-06
      }
    ],
    "security": { "csp": null }    // KEEP from spike — meta tag in app.html governs (RESEARCH §4.10)
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

**Pitfall callouts:**
- **`titleBarStyle: "Overlay"` + `hiddenTitle: true` is the macOS-specific combo per D-06.** This makes content extend under the traffic-light buttons; UI-SPEC §"Native traffic-light avoidance zone" mandates a 36px content-top reservation in the right pane to compensate.
- **`security.csp: null` is correct in Phase 1** — RESEARCH §4.10 line 466: "let the meta tag govern; spike-002 already does this". The CSP enforcement happens via the `app.html` meta tag (REQ-5).
- **Icon paths must reference files that exist in `src-tauri/icons/` after Phase 0 icon copy**. Phase 0 D-10 committed `icon-assets/icon.icns` at the repo root; Wave 0 step 5 copies `.icns` + 7 PNG variants into `src-tauri/icons/`.

---

### `src-tauri/capabilities/default.json` (GENERATED config)

**Analog:** `.planning/spikes/002-tauri-claude-shell/app/src-tauri/capabilities/default.json` (lines 1-32) — **inverse of the analog**: spike has `"args": true` wildcards (Pitfall #2 CRITICAL); Phase 1 replaces with ~13 exact-regex validators.

**Spike pattern (BAD — what NOT to copy)** — spike-002 lines 11-29:
```jsonc
{
  "identifier": "shell:allow-spawn",
  "allow": [{ "name": "claude-bin", "cmd": "claude", "args": true }]  // ← WILDCARD
}
```

**Phase 1 pattern (GOOD — what `gen-capabilities.ts` emits)** — RESEARCH §4.2 lines 144-159 + Wave 2 step 3 lines 537-568:
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
      "allow": [{
        "name": "claude-bin",
        "cmd": "claude",
        "args": [
          {"validator": "^--print$"},
          {"validator": "^--permission-mode$"},
          {"validator": "^bypassPermissions$"},
          {"validator": "^--output-format$"},
          {"validator": "^stream-json$"},
          {"validator": "^--include-partial-messages$"},
          {"validator": "^--verbose$"},
          {"validator": "^--max-turns$"},
          {"validator": "^30$"},
          {"validator": "^--add-dir$"},
          {"validator": "^/Users/[^/]+/\\.mneme/scratch$"},
          {"validator": "^--exclude-dynamic-system-prompt-sections$"},
          {"validator": ".+"}
        ]
      }]
    },
    {
      "identifier": "shell:allow-execute",
      "allow": [{ /* same 13-entry args array */ }]
    }
  ]
}
```

**Adaptation notes:**
- **Drop `opener:default`** — Phase 1 does not need `tauri-plugin-opener` (spike included it; Phase 1 does not).
- **All-Var (Option A)** per RESEARCH §4.2 lines 162-167 — keep every entry as `{validator: "..."}` to match SPEC L53 verbatim. RESEARCH explicitly recommends this over the Fixed/Var hybrid (Option B) to minimize SPEC churn.
- **The 13th entry `{"validator": ".+"}`** is the free-prompt — anything non-empty matches, but the prior 12 positional flags are exact-regex.
- **DO NOT hand-edit this file.** It is generated by `scripts/gen-capabilities.ts` from `src/lib/spawn-args.ts` SSOT (D-14). Hand-editing breaks the audit-script SSOT-drift `diff` check.

**Pitfall callouts:**
- **`Tauri-plugin-shell` `ShellAllowedArg` is a `serde(untagged)` enum** with two shapes: `Fixed(String)` (flat string) or `Var{validator: String, raw: bool}` (object). RESEARCH §4.2 lines 119-132 verified this against `plugins-workspace/v2/plugins/shell/src/scope_entry.rs`. JSON parses both shapes correctly; we use Var for all 13 entries.
- **NEVER include `bare` in any validator regex** — `audit-capabilities.sh` greps for the literal string `bare` and fails CI on match (RESEARCH §Wave 2 step 4 line 593 + spike-findings F4/F6: `--bare` strips OAuth keychain reads).

---

### `src-tauri/src/lib.rs` (controller / lifecycle)

**Analog:** `.planning/spikes/002-tauri-claude-shell/app/src-tauri/src/lib.rs` (8 lines — skeletal). Phase 1 needs ~150 LOC fresh — analog provides the `tauri::Builder::default().plugin(tauri_plugin_shell::init()).run(...)` boilerplate only.

**Spike pattern (skeletal — what to extend)** — spike-002 lib.rs lines 1-8:
```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())   // DROP
        .plugin(tauri_plugin_shell::init())    // KEEP
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Phase 1 pattern (load-bearing for REQ-3)** — RESEARCH §4.4 lines 222-265 + AI-SPEC §3 lines 302-341 (canonical pattern):
```rust
use std::sync::Mutex;
use tauri::{Manager, RunEvent, State, WindowEvent};
use tauri_plugin_shell;
use nix::sys::signal::{killpg, Signal};
use nix::unistd::{getpgid, Pid};

// Phase 1 ships extension-friendly shape per RESEARCH §8 Risk 1 — see session.rs

pub fn kill_pgid(pid_u32: u32) {
    let pid = Pid::from_raw(pid_u32 as i32);
    if let Ok(pgid) = getpgid(Some(pid)) {
        let _ = killpg(pgid, Signal::SIGTERM);
        std::thread::sleep(std::time::Duration::from_secs(2));
        let _ = killpg(pgid, Signal::SIGKILL);  // unconditional; ESRCH on dead PG is harmless
    }
}

#[tauri::command]
fn register_session_pid(state: State<SessionRegistry>, pid: u32) { /* delegate to registry */ }

#[tauri::command]
fn clear_session_pid(state: State<SessionRegistry>) { /* clear on natural close */ }

#[tauri::command]
fn stop_session(state: State<SessionRegistry>) {
    state.kill_all();   // Stop button (D-19) — same kill path, no app exit
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(SessionRegistry::new())
        .invoke_handler(tauri::generate_handler![
            register_session_pid, clear_session_pid, stop_session
        ])
        .setup(|app| {
            // Auto-create ~/.mneme/scratch/ — RESEARCH §Wave 0 step 12
            let scratch = home::home_dir().unwrap().join(".mneme/scratch");
            std::fs::create_dir_all(&scratch).ok();
            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(event, WindowEvent::CloseRequested { .. }) {
                window.app_handle().state::<SessionRegistry>().kill_all();
            }
        })
        .build(tauri::generate_context!())
        .expect("error building app")
        .run(|app, event| {
            // macOS Cmd+Q dispatches RunEvent::ExitRequested, NOT WindowEvent::CloseRequested.
            // Both hooks needed — Tauri issue #9198 shows ExitRequested unreliable on some macOS.
            if matches!(event, RunEvent::ExitRequested { .. }) {
                app.state::<SessionRegistry>().kill_all();   // idempotent — take() returns None on 2nd call
            }
        });
}
```

**Adaptation notes:**
- **Drop `tauri_plugin_opener`** (spike had it; Phase 1 does not need it).
- **Setup hook auto-creates `~/.mneme/scratch/`** per RESEARCH §Wave 0 step 12. `std::fs::create_dir_all` is idempotent — silent no-op if path exists.
- **Hook union pattern (`WindowEvent::CloseRequested ∪ RunEvent::ExitRequested`)** is the load-bearing pattern for REQ-3. Both hooks call `kill_all()` which is idempotent via `Mutex::take()` (RESEARCH §4.4 lines 268).

**Pitfall callouts:**
- **`Pid::from_raw` takes `i32`; `CommandChild::pid()` returns `u32`.** The `as i32` cast is safe for any realistic POSIX PID — RESEARCH §4.3 line 213 explicitly notes "no `unsafe` block required".
- **`SIGKILL` is sent unconditionally after the 2s grace window** — if the process group is already dead, `killpg` returns `ESRCH` which is harmlessly ignored via `let _ =`. Do NOT add a "if still alive" check before the SIGKILL — that introduces a TOCTOU race.
- **`tauri-plugin-shell` `CommandChild::kill()` only kills the PID, not PGID** (RESEARCH §4.2 lines 106-115 verified via docs.rs). This is exactly why we hand the `u32` PID to Rust and use `nix::killpg` instead of relying on `child.kill()`.
- **The frontend OWNS the `Child` handle (calls `await cmd.spawn()`); Rust only owns the `u32` PID.** Per AI-SPEC §3 line 348: "Phase 1 D-10 frontend-spawns instead and uses Rust solely for `nix::sys::signal::killpg(getpgid(pid), SIGTERM)`."

---

### `src-tauri/src/session.rs` (NEW state-store, RESEARCH §8 Risk 1 mitigation)

**Analog:** None — **greenfield extension-friendly Rust struct** per RESEARCH.md cross-phase risk mitigation (lines 904-928).

**Pattern (verbatim from RESEARCH §8 Risk 1 lines 904-928):**
```rust
use std::collections::HashMap;
use std::sync::Mutex;

pub type SessionId = u32;     // Phase 1 always uses 1; Phase 3 generates monotonic IDs

pub struct SessionRegistry {
    inner: Mutex<HashMap<SessionId, ChildHandle>>,    // Phase 1: ≤1 entry; Phase 3: many
}

pub struct ChildHandle {
    pub pid: u32,
    // Phase 3 will add: resume_token: Option<String>, spawned_at: Instant, ...
}

impl SessionRegistry {
    pub fn new() -> Self { Self { inner: Mutex::new(HashMap::new()) } }

    pub fn register(&self, id: SessionId, handle: ChildHandle) {
        self.inner.lock().unwrap().insert(id, handle);
    }
    pub fn drain_one(&self, id: SessionId) -> Option<ChildHandle> {
        self.inner.lock().unwrap().remove(&id)
    }
    pub fn drain_all(&self) -> Vec<ChildHandle> {
        std::mem::take(&mut *self.inner.lock().unwrap())
            .into_values().collect()
    }
    pub fn kill_all(&self) {
        for h in self.drain_all() { crate::kill_pgid(h.pid); }
    }
}
```

**Adaptation notes:**
- **Phase 1 always uses `SessionId = 1`** (single-session). The HashMap holds 0 or 1 entry.
- **Phase 3 (multi-session) flips this to many entries with monotonic IDs.** No rip-out — just start inserting more.
- **Tradeoff**: ~30 LOC heavier than `Mutex<Option<u32>>` in Phase 1, worth it to make Phase 3 a 1-task swap (RESEARCH §8 Risk 1 line 932).

**Pitfall callouts:**
- **Idempotency contract**: `kill_all()` is safe to call from both `WindowEvent::CloseRequested` and `RunEvent::ExitRequested` hooks because `drain_all()` empties the HashMap on first call.
- **DO NOT promote SessionId to `String` or `Uuid` in Phase 1** — Phase 3 plan-phase decides the ID scheme; premature commitment breaks the "no rip-out" property.

---

### `src-tauri/src/main.rs` (bootstrap)

**Analog:** Default Tauri 2 svelte-ts template (`npm create tauri-app`). Spike-002 doesn't modify it; Phase 1 keeps the template default.

**Pattern (template-default, no edits needed):**
```rust
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    app_lib::run();
}
```

**Adaptation:** none — keep template default.

**Pitfall callouts:** none — this file is genuinely 5 lines.

---

### `src-tauri/tests/kill_pgid.rs` (test, integration)

**Analog:** None — **greenfield Rust integration test**. RESEARCH §TDD lines 755-787 provides the verbatim RED stub.

**Pattern (lift verbatim from RESEARCH §TDD lines 755-787):**
```rust
// src-tauri/tests/kill_pgid.rs — RED before src-tauri/src/lib.rs::kill_pgid
// Run via `cargo test --test kill_pgid`; requires nix dep already configured.
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

    let grandchild_pid: u32 = std::fs::read_to_string("/tmp/mneme_test_grandchild.pid")
        .unwrap().trim().parse().unwrap();

    app_lib::kill_pgid(parent_pid);

    thread::sleep(Duration::from_millis(2_500));   // wait past 2s SIGTERM grace

    // Assert grandchild is dead — kill -0 returns ESRCH for non-existent PID
    let still_alive = unsafe { libc::kill(grandchild_pid as i32, 0) } == 0;
    assert!(!still_alive, "grandchild PID {} still alive after kill_pgid", grandchild_pid);

    let _ = std::fs::remove_file("/tmp/mneme_test_grandchild.pid");
}
```

**Adaptation notes:**
- **`kill_pgid` MUST be `pub`** in `src-tauri/src/lib.rs` so the integration test can call `app_lib::kill_pgid(parent_pid)`.
- **The test uses `libc::kill(pid, 0)` directly** to probe liveness via `ESRCH`. This requires either pulling in `libc` as a dev-dependency or using `nix::sys::signal::kill(pid, None)` instead.

**Pitfall callouts:**
- **Test depends on `bash` + `setsid` being on PATH** — both are macOS-bundled, but document this as a manual-runnable integration test, not a CI gate.
- **`/tmp/mneme_test_grandchild.pid`** is the temp-file mailbox between bash and Rust — the cleanup line at the end is best-effort; tolerate prior-test residue.

---

### `rust-toolchain.toml` (config)

**Analog:** None — greenfield (Phase 0 LEARNINGS macOS-CLI version-precision lesson).

**Pattern:**
```toml
[toolchain]
channel = "1.88.0"   # OR "1.88" — plan-phase decides per Phase 0 precedent
```

**Adaptation notes:**
- **`1.88.0`** pins to exact patch; **`1.88`** allows any 1.88.x. Phase 0 LEARNINGS macOS-CLI version-precision lesson (CONTEXT.md L196) recommends testing against the user's actual macOS Ventura 13.4 environment before pinning.
- **CONTEXT.md "Claude's Discretion" leaves this to plan-phase.** Both values work; `1.88` is more permissive.

**Pitfall callouts:**
- **KD-03 mandates Rust ≥ 1.88.** Older Rust versions will fail to build Tauri 2 + nix 0.31.2.

---

### `package.json` (config)

**Analog:** `.planning/spikes/002-tauri-claude-shell/app/package.json` (extend) + `npm create tauri-app -- -t svelte-ts` template.

**Phase 1 dependency block** (lifted from RESEARCH §4.9 + §Wave 0 step 2):
```json
{
  "dependencies": {
    "@tauri-apps/api": "^2.11.0",
    "@tauri-apps/plugin-shell": "^2.3.5",
    "marked": "^18.0.3",
    "katex": "^0.16.45",
    "dompurify": "^3.4.2"
  },
  "devDependencies": {
    "@sveltejs/kit": "^2.59.1",
    "@sveltejs/adapter-static": "^3.0.10",
    "svelte": "^5.55.5",
    "vitest": "^4.1.5",
    "husky": "^9.0.0",
    "@testing-library/jest-dom": "optional"
  },
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "tauri": "tauri",
    "prebuild": "node scripts/gen-capabilities.ts && bash scripts/audit-capabilities.sh",
    "test": "vitest run",
    "test:lifecycle": "bash tests/manual/lifecycle/run-quit-loop.sh",
    "prepare": "husky init"
  }
}
```

**Pitfall callouts:**
- **`claude-code-parser` MUST NOT appear in `dependencies` or `devDependencies`** — KD-12 + D-13 vendor it. The audit script greps for `'"claude-code-parser"'` in package.json and fails on match (RESEARCH §Wave 2 step 4 lines 608-612).
- **All versions verified against npm registry 2026-05-08** (RESEARCH §Sources lines 1004-1006). Pin floor: `katex` ≥ 0.16.21 per SPEC L113 (PITFALLS floor); 0.16.45 well-clears it.
- **Husky setup**: `npx husky init` creates `.husky/pre-commit` template; we then write our 2-line audit + vitest body (AI-SPEC §5 lines 731-735).

---

### `vitest.config.ts` (config, test)

**Analog:** None — greenfield. Vitest is bundled with svelte-ts template; only the env config is custom.

**Pattern (RESEARCH §Wave 0 step 11 lines 489):**
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",   // required for sanitize-pipeline tests (DOMParser, document)
    globals: true,
  },
});
```

**Pitfall callouts:**
- **`environment: "jsdom"`** is mandatory for `tests/sanitize.test.ts` — DOMPurify + DOMParser need a DOM.
- **`globals: true`** lets you use `describe / it / expect` without imports (consistent with the RED stub style from RESEARCH §TDD).

---

### `tsconfig.json` (config)

**Analog:** template-default (`npm create tauri-app`) extended with path aliases per RESEARCH §4.8 lines 422-432.

**Adaptation — add `paths`:**
```jsonc
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "paths": {
      "$lib/*": ["./src/lib/*"],
      "$vendor/*": ["./vendor/*"]
    }
  }
}
```

**Pitfall callouts:**
- **`$vendor/*` alias is critical** — frontend imports the vendored parser via `import type { ClaudeEvent } from "$vendor/claude-code-parser/src/types"` (RESEARCH §4.8 line 433). Missing this alias will break TS compilation.

---

### `src/app.html` (static template)

**Analog:** template-default (`npm create tauri-app`). Phase 1 adds a single CSP meta tag.

**Adaptation — add CSP meta inside `<head>` (RESEARCH §4.10 lines 458-461 + SPEC L140 verbatim):**
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'">
```

**Pitfall callouts:**
- **`'wasm-unsafe-eval'` is required by KaTeX's WebAssembly font-rendering path** — RESEARCH §4.10 line 463.
- **`'unsafe-inline'` for styles only** (NOT scripts) — SvelteKit emits inline `<style>` blocks during HMR + production CSS-only.
- **CSP meta tag MUST match SPEC L140 verbatim** — acceptance test greps for the exact string.

---

### `src/routes/+layout.ts` (route-config)

**Analog:** `.planning/spikes/002-tauri-claude-shell/app/src/routes/+layout.ts` — lift verbatim per RESEARCH §4.9 lines 446-451.

**Pattern (verbatim):**
```typescript
export const ssr = false;
export const prerender = true;
```

**Adaptation:** none.

**Pitfall callouts:** SPA mode is non-negotiable — Tauri serves static files via `tauri://`; `ssr=true` would require a Node server which violates KD-01.

---

### `src/routes/+page.svelte` (component, UI host)

**Analog:** `.planning/spikes/002-tauri-claude-shell/app/src/routes/+page.svelte` (495 LOC). Phase 1 fresh-writes from this seed with **5 hardening upgrades** (RESEARCH §Wave 1 step 4 lines 497-503).

**Patterns to LIFT verbatim from spike-002:**

**1. Imports + state declarations** (spike `+page.svelte` lines 1-25):
```typescript
import { tick } from "svelte";
import { Command } from "@tauri-apps/plugin-shell";
import { invoke } from "@tauri-apps/api/core";   // ADDED — for Rust kill IPC
import { marked } from "marked";
import katex from "katex";
import DOMPurify from "dompurify";
import "katex/dist/katex.min.css";
// ADDED:
import { buildClaudeArgs } from "$lib/spawn-args";
import { dispatchEvent } from "$lib/stream-dispatch";
import { sanitizeMarkdown, renderKatex, escapeHtml } from "$lib/sanitize";

type Role = "user" | "assistant" | "tool" | "system";
type Msg = { id: string; role: Role; text: string; streaming: boolean; toolName?: string; };

let prompt = $state("");
let messages = $state<Msg[]>([]);
let isStreaming = $state(false);
let scroller: HTMLDivElement;
```

**2. JSONL line buffer pattern** (spike `+page.svelte` lines 113-130 — VERBATIM, this is the spike-validated buffer):
```typescript
let buffer = "";
cmd.stdout.on("data", (line) => {
  buffer += line;
  const parts = buffer.split("\n");
  buffer = parts.pop() ?? "";   // retain unfinished tail
  for (const raw of parts) {
    if (!raw.trim()) continue;
    try { dispatchEvent(JSON.parse(raw), messages); }   // EXTRACTED into stream-dispatch.ts
    catch { /* malformed — drop, never throw */ }
  }
});
```

**3. Send-prompt orchestration** (spike `+page.svelte` lines 84-165 — restructure + harden):
```typescript
async function sendPrompt() {
  if (!prompt.trim() || isStreaming) return;
  isStreaming = true;
  messages = [...messages, { id: uid(), role: "user", text: prompt.trim(), streaming: false }];
  const promptText = prompt.trim();
  prompt = "";

  // CHANGED — use SSOT instead of inline arg list (D-14 lock)
  const cmd = Command.create("claude-bin", buildClaudeArgs(promptText));

  // ALL listeners registered BEFORE spawn — AI-SPEC §4b "Async-First Design" RULE
  let buffer = "";
  cmd.stdout.on("data", /* line buffer pattern from #2 above */);
  cmd.stderr.on("data", (data) => console.warn("claude stderr:", data));
  cmd.on("close", finalizeRender);
  cmd.on("error", handleSpawnError);

  const child = await cmd.spawn();
  await invoke("register_session_pid", { pid: child.pid });   // ADDED — D-10 hand-off to Rust
}
```

**4. Finalize-on-close pattern** (spike `+page.svelte` lines 136-145 — keep but harden the renderMath call). The spike code performs `requestAnimationFrame → querySelectorAll('.bubble.assistant') → renderMath(el)`. Phase 1 changes:
- spike sets `el.innerHTML` directly via marked — Phase 1 uses the hardened `sanitizeMarkdown(el.textContent)` from `$lib/sanitize` and assigns the sanitized HTML through `el.innerHTML` (the wrapper guarantees DOMPurify + FORBID_TAGS/FORBID_ATTR ran first).
- spike's `renderMath` walks the DOM and replaces `$...$` text nodes with KaTeX HTML — Phase 1's `renderKatexInDom` (in `$lib/sanitize`) does the same walk but routes every `$...$` through the hardened `renderKatex(src)` (trust:false / strict:true / macros:{} / maxExpand:1000) and DOMPurify-sanitizes the KaTeX output before splicing back into the DOM.
- spike does NOT clear Rust state on natural close — Phase 1 adds `await invoke("clear_session_pid")` to release the Rust `SessionRegistry` slot.
- on-close timing: keep spike's `requestAnimationFrame` wrapper — gives Svelte 5 reactivity one tick to flush before the DOM walk; otherwise stale text nodes get sanitized.

**5. Enter / Shift+Enter handler** (spike `+page.svelte` lines 259-264 — VERBATIM, satisfies D-20):
```typescript
function handleKey(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendPrompt();
  }
  // Shift+Enter falls through to default textarea behavior (newline)
}
```

**5 hardening upgrades layered ON TOP of the lifted patterns:**

1. **Replace inline arg list** (spike L102-110) with `buildClaudeArgs(promptText)` SSOT call (D-14).
2. **Replace inline `renderMarkdown` + `renderMath`** with `sanitizeMarkdown` + `renderKatex` from `$lib/sanitize` (REQ-5 hardening).
3. **Add Stop button** (D-19) — visible only during `isStreaming`; click → `await invoke("stop_session")`.
4. **Add streaming dot** (D-18) — pulse animation per UI-SPEC §"Streaming dot indicator".
5. **Three-pane CSS Grid wrapper** — wrap the existing chat panel in the right column of the splitter; lift left/middle/bottom-row placeholder copy from UI-SPEC §"Three placeholder copy (locked)".

**Drop entirely from spike pattern:**
- **Status indicator with TTFT/event-count/duration** (spike `<div class="status">` lines 270-281) — D-18 telemetry policy: dev-console only, NOT UI chrome.
- **Empty state with example prompts** (spike lines 285-294) — UI-SPEC §"Empty state (no messages yet)" mandates blank scroller.
- **Spike's all-CSS dark-mode block** (spike lines 328-493) — Phase 1 uses `tokens.css` light theme; UI-SPEC §"Token Module" is the SSOT.

**Pitfall callouts:**
- **Listener-registration order** (spike-findings tauri-shell-ui.md §4 + AI-SPEC §4b): ALL `cmd.stdout.on / stderr.on / on("close" | "error")` MUST be registered BEFORE `await cmd.spawn()` — early stdout chunks are lost otherwise.
- **`cmd.stdout.on("data")` callback MUST be synchronous** (AI-SPEC §4b lines 596-630) — re-entrancy bug: chunk N+1 arrives during `await` of chunk N's render.
- **The `assistant` event handler MUST skip `block.type === "text"`** (spike-findings claude-subprocess.md §5 + AI-SPEC §4 line 481) — text is already streamed via `stream_event`; double-rendering it duplicates the assistant turn.
- **`thinking` block content is encrypted in `signature` for OAuth users** (spike-findings claude-subprocess.md §5) — render `💭 thinking…` indicator only, never attempt to decode the signature.
- **`cmd.on("close")` may fire WITHOUT a prior `result` event** (network drop / SIGKILL) — surface a system bubble "stream ended unexpectedly", do NOT finalize markdown (RESEARCH spike landmines #3 line 634 + AI-SPEC §4b line 591).
- **Never assign sanitize output through `innerHTML` without going through `sanitizeMarkdown` / `renderKatex`** — the `$lib/sanitize` wrapper is the only legal site that produces HTML for DOM injection. `rg 'DOMPurify\.sanitize\(' src/` and `rg '\.innerHTML\s*=' src/` are the policed surfaces (AI-SPEC §5 evaluation Dimension "DOMPurify allowlist explicit").

---

### `src/lib/components/Splitter.svelte` (NEW component)

**Analog:** None — **greenfield** (D-01: vanilla CSS Grid + Svelte 5 `$state` + pointer events; rejected `svelte-splitpanes` v8.0.14 per CONTEXT.md D-01 reasoning).

**Inspiration sources** (all READ-ONLY external):
- **OpenCovibe** (`AnyiWang/OpenCovibe`, Apache-2.0, Tauri 2 + Svelte 5) — D-16 targeted-read for multi-pane layout components. Code-level adoption allowed per D-09. Read 3-4 source files at implement-time.
- **UI-SPEC §"Geometry Contract — three-pane + bottom row"** lines 326-395 — locked geometry tokens (`--btn-send: 44px`, `--bottom-row-h: 120px`, `--pane-min-w: 200px`).

**Greenfield pattern signature (UI-SPEC §"Pane proportions + dividers" lines 365-376):**
```svelte
<script lang="ts">
  let leftRatio = $state(loadFromLocalStorage('mneme.layout.split', 0.30));
  let middleRatio = $state(loadFromLocalStorage('mneme.layout.split-middle', 0.40));
  let dragging = $state<'left' | 'right' | null>(null);

  function startDrag(which: 'left' | 'right', e: PointerEvent) {
    dragging = which;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);   // D-07: prevents cursor escape
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    const x = e.clientX / window.innerWidth;
    if (dragging === 'left') leftRatio = clamp(x, 0.20, 0.50);
    else if (dragging === 'right') middleRatio = clamp(x - leftRatio, 0.20, 0.50);
  }

  function endDrag(e: PointerEvent) {
    if (!dragging) return;
    saveToLocalStorage('mneme.layout.split', leftRatio);
    saveToLocalStorage('mneme.layout.split-middle', middleRatio);
    dragging = null;
  }
</script>

<div class="grid"
     style:grid-template-columns="{leftRatio * 100}fr 4px {middleRatio * 100}fr 4px {(1 - leftRatio - middleRatio) * 100}fr"
     style:grid-template-rows="1fr var(--bottom-row-h)"
     onpointermove={onPointerMove}
     onpointerup={endDrag}>
  <div class="pane left">{...}</div>
  <div class="handle" onpointerdown={(e) => startDrag('left', e)}></div>
  <div class="pane middle">{...}</div>
  <div class="handle" onpointerdown={(e) => startDrag('right', e)}></div>
  <div class="pane right">{...}</div>
  <div class="bottom-row" style:grid-column="1 / -1">{...}</div>
</div>

<style>
  .grid { display: grid; height: 100vh; }
  .handle {
    cursor: col-resize;
    background: var(--border);
    transition: background var(--d-base) var(--ease);
  }
  .handle:hover { background: var(--border-strong); }
</style>
```

**Pitfall callouts:**
- **`setPointerCapture` is mandatory (D-07)** — without it, dragging fast pulls the cursor outside the handle and the pointermove handler stops firing.
- **CSS Grid `minmax(200px, 1fr)`** is the locked min-pane-width pattern (UI-SPEC line 371). Phase 1 enforces this via the column ratio clamp `clamp(x, 0.20, 0.50)` — translating 200px floor at 1024px window to a 0.195 ratio (rounded to 0.20 for cleanness).
- **localStorage key `mneme.layout.split`** is locked by SPEC + D-02. Two values to persist (left ratio + middle ratio) → UI-SPEC clarifies as a JSON object stored at one key OR as two keys; plan-phase decides.

---

### `src/lib/spawn-args.ts` (NEW utility, SSOT)

**Analog:** None — **greenfield** (D-14 SSOT pattern; verbatim spec in RESEARCH §Wave 2 step 1 lines 511-531 + AI-SPEC §3 lines 232-249).

**Pattern (lift verbatim from RESEARCH §Wave 2 step 1):**
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
    "--max-turns", MAX_TURNS,                          // critical failure #4 guard
    "--add-dir", SCRATCH_DIR,                          // critical failure #5 guard (REQ-10)
    "--exclude-dynamic-system-prompt-sections",        // <20k cache_creation; spike-findings §7
    promptText,                                        // free-form last positional
  ];
}
```

**Adaptation notes:**
- **This is the AUTHORITATIVE source.** `scripts/gen-capabilities.ts` reads this constant and emits `src-tauri/capabilities/default.json`. Hand-editing JSON breaks the audit-script SSOT-drift `diff` check (RESEARCH §4.2 line 161 + Wave 2 step 4 line 577).
- **Path 2 — types-only consumption of `vendor/claude-code-parser`** (RESEARCH §4.8 line 401). This file does not import the parser; it produces strings only.

**Pitfall callouts (NON-NEGOTIABLE INTERFACE CONSTRAINTS — KP-04 compliance):**
- **`--max-turns` MUST be present, value MUST be `"30"`** — REQ-2 acceptance + critical failure #4 guard (AI-SPEC §1 line 21).
- **`--add-dir` MUST be present, value MUST be `${homedir()}/.mneme/scratch`** — REQ-10 acceptance + critical failure #5 guard.
- **`--exclude-dynamic-system-prompt-sections` MUST be present** — drops first-call cache_creation_input_tokens from ~107k to <20k (spike-findings §7 + REQ-2 acceptance "<20,000").
- **`--bare` MUST be ABSENT** — strips OAuth keychain reads → silent auth failure (spike F4/F6 + AI-SPEC §1 critical failure mode #2 + AI-SPEC §3 pitfall #1). Audit script greps for the literal string `bare` in this file.
- **NO `--system-prompt` / `--append-system-prompt` flags** — Phase 1 does not customize the system prompt (AI-SPEC §4b line 640). Phase 9 introduces this; audit script will fail-closed at that future point unless governance doc lands.

---

### `src/lib/stream-dispatch.ts` (NEW utility, event router)

**Analog:** spike-002 `+page.svelte` `handleEvent()` lines 167-257 (extract into pure function + add unknown-event default arm).

**Spike pattern to lift (handleEvent body, lines 168-256)** — keep the 5 case arms, add `default` for unknowns:
```typescript
import type { ClaudeEvent } from "$vendor/claude-code-parser/src/types";

export function dispatchEvent(evt: ClaudeEvent, messages: Msg[]): void {
  switch (evt.type) {
    case "system":
      // CHANGED from spike — D-18 dev-console only, not UI chrome
      if (evt.subtype === "init") {
        console.log(`[claude:init] model=${evt.model} cwd=${evt.cwd}`);
      }
      break;

    case "stream_event": {
      // VERBATIM from spike-002 lines 183-197 — primary streaming consumer
      const inner = evt.event;
      if (inner?.type === "content_block_delta" && inner.delta?.type === "text_delta") {
        const m = ensureAssistantMsg(messages);
        m.text += inner.delta.text;
      }
      if (typeof evt.ttft_ms === "number") {
        console.log(`[claude:ttft] ${evt.ttft_ms} ms`);   // D-18 dev-console only
      }
      break;
    }

    case "assistant": {
      // VERBATIM from spike-002 lines 220-250 — iterate content blocks for tool_use + thinking
      // CRITICAL: skip block.type === "text" — already streamed via stream_event
      for (const block of evt.message?.content ?? []) {
        if (block.type === "tool_use") {
          messages.push({
            role: "tool",
            id: uid(),
            text: `${block.name}: ${JSON.stringify(block.input).slice(0, 200)}`,
            streaming: false,
            toolName: block.name,
          });
        } else if (block.type === "thinking") {
          messages.push({
            role: "system",
            id: uid(),
            text: "💭 thinking...",   // signature is encrypted — render indicator only
            streaming: false,
          });
        }
        // block.type === "text" → SKIP (already streamed)
      }
      break;
    }

    case "user": {
      // VERBATIM from spike-002 lines 199-218 — tool_result round-trip
      const content = evt.message?.content?.[0];
      if (content?.type === "tool_result") {
        messages.push({
          role: "tool",
          id: uid(),
          text: typeof content.content === "string"
            ? content.content
            : JSON.stringify(content.content),
          streaming: false,
          toolName: "Tool result",
        });
      }
      break;
    }

    case "rate_limit_event":
      // ADDED — not in spike (which only had 5 arms); AI-SPEC §3 lines 500-502
      console.log(`[claude:rate-limit]`, evt);
      break;

    case "result":
      // CHANGED from spike — D-18 dev-console only (no UI cost meter)
      console.log(`[claude:result] cost=$${evt.total_cost_usd} dur=${evt.duration_ms}ms ` +
                  `cache_creation=${evt.usage?.cache_creation_input_tokens}`);
      break;

    default:
      // ADDED — RESEARCH §8 Risk 5 + AI-SPEC §4b line 590
      console.warn("[claude:unknown-event]", evt);
  }
}

function ensureAssistantMsg(messages: Msg[]): Msg {
  // VERBATIM from spike-002 lines 76-82
  const last = messages[messages.length - 1];
  if (last && last.role === "assistant" && last.streaming) return last;
  const m: Msg = { id: uid(), role: "assistant", text: "", streaming: true };
  messages.push(m);
  return m;
}
```

**Adaptation notes:**
- **6 arms in Phase 1 (vs spike's 5)**: spike omits `rate_limit_event`. Phase 1 adds it per AI-SPEC §3.
- **Pure function**: takes `(evt, messages)`, mutates `messages` in place, returns `void`. Caller does `messages = [...messages]` to trigger Svelte 5 reactivity.
- **Unknown event default arm** is mandated by RESEARCH §8 Risk 5 — log warn, never silently drop.

**Pitfall callouts:**
- **`assistant` text-block double-rendering** — the spike's bug-prevention is keeping the `for` loop on `evt.message.content` filtering only `tool_use` + `thinking`; this is the exact line that prevents the assistant turn appearing twice in the UI. Spike-findings claude-subprocess.md §5 explicitly calls this out.
- **`thinking.signature` is encrypted for OAuth users** — render `💭 thinking…` indicator only; do not attempt to display `block.thinking` field even if non-empty.
- **`stream_event.ttft_ms` lives on the FIRST stream_event of the session** (spike-findings §7) — cumulative variants don't exist; capture once.
- **Vendor parser Translator is INTENTIONALLY UNUSED** (Path 2 per RESEARCH §4.8 lines 397-405) — mneme imports types only from the vendored parser; the `switch (evt.type)` is mneme's own dispatch.

---

### `src/lib/sanitize.ts` (NEW utility, security wrapper)

**Analog:** spike-002 `+page.svelte` `renderMarkdown()` lines 36-43 + `renderMath()` lines 45-74 — extract into module + 5 hardening upgrades per REQ-5.

**Spike pattern (BAD — what to upgrade FROM)** — spike-002 +page.svelte lines 36-43:
```typescript
function renderMarkdown(text: string): string {
  const raw = marked.parse(text, { gfm: true, breaks: true }) as string;
  return DOMPurify.sanitize(raw, {
    ADD_TAGS: ["math", "annotation", "semantics", "mrow", "mi", "mo", "mn", "msup", "msub", "mfrac", "msqrt", "mspace", "mtext"],
    ADD_ATTR: ["mathvariant", "mathsize", "displaystyle", "scriptlevel", "encoding"],
    // MISSING: FORBID_TAGS, FORBID_ATTR — Pitfall #4 CRITICAL
  });
}
```

**Phase 1 hardened pattern (REQ-5 acceptance)** — RESEARCH §4.6 lines 316-329 (Option A `uponSanitizeAttribute` hook):
```typescript
import { marked } from "marked";
import katex from "katex";
import DOMPurify from "dompurify";

// HARDENING #1 — register hook ONCE at module load (Option A per RESEARCH §4.6 Cross-Spec
// Correction 2). DOMPurify FORBID_ATTR does NOT support regex — string-only.
DOMPurify.addHook("uponSanitizeAttribute", (node, hookEvent) => {
  if (/^on/i.test(hookEvent.attrName)) {
    hookEvent.keepAttr = false;
  }
});

// MathML/SVG ADD_TAGS preserved verbatim from spike for KaTeX compat (RESEARCH §4.5 line 351).
const KATEX_ADD_TAGS = ["math", "annotation", "semantics", "mrow", "mi", "mo", "mn", "msup",
                        "msub", "mfrac", "msqrt", "mspace", "mtext", "svg", "path", "g"];
const KATEX_ADD_ATTR = ["mathvariant", "mathsize", "displaystyle", "scriptlevel", "encoding",
                        "viewBox", "preserveAspectRatio", "d"];
const FORBID_TAGS = ["script", "iframe", "object", "embed", "form", "input", "style"];
const FORBID_ATTR = ["srcdoc", "formaction"];

export function sanitizeMarkdown(text: string): string {
  // HARDENING #2 — DOMPurify ALWAYS runs AFTER marked.parse (spike-findings tauri-shell-ui.md §4)
  const raw = marked.parse(text, { gfm: true, breaks: true }) as string;
  return DOMPurify.sanitize(raw, {
    ADD_TAGS: KATEX_ADD_TAGS,
    ADD_ATTR: KATEX_ADD_ATTR,
    FORBID_TAGS,    // ADDED REQ-5
    FORBID_ATTR,    // ADDED REQ-5 (regex on* removed via uponSanitizeAttribute hook above)
  });
}

export function renderKatex(src: string): string {
  // HARDENING #3 — KaTeX safe config (RESEARCH §4.5 lines 281-289)
  const html = katex.renderToString(src, {
    trust: false,        // BLOCKS \href{javascript:...}; default since v0.16.0
    strict: true,        // rejects non-strict commands
    macros: {},          // empty — denies user-supplied macros that bypass trust
    maxExpand: 1000,     // expansion-bomb guard
    throwOnError: false, // surface error inline + escapeHtml
  });
  // Sanitize KaTeX output before injection (RESEARCH §4.5 line 351)
  return DOMPurify.sanitize(html, {
    ADD_TAGS: KATEX_ADD_TAGS,
    ADD_ATTR: KATEX_ADD_ATTR,
    FORBID_TAGS,
    FORBID_ATTR,
  });
}

// HARDENING #5 — KaTeX errors quote source verbatim; escape before display (REQ-5 acceptance)
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderKatexInDom(container: HTMLElement): void {
  // VERBATIM from spike-002 lines 45-74 — DOM walker pattern
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) nodes.push(n as Text);
  for (const node of nodes) {
    const txt = node.textContent ?? "";
    if (!/\$/.test(txt)) continue;
    const html = txt
      .replace(/\$\$([^$]+)\$\$/g, (_, m) => renderKatex(m))   // CHANGED — use hardened renderKatex
      .replace(/\$([^$\n]+)\$/g, (_, m) => renderKatex(m));
    const tmp = document.createElement("span");
    const parser = new DOMParser();
    const parsed = parser.parseFromString(`<div>${html}</div>`, "text/html");
    const root = parsed.body.firstElementChild;
    if (root) while (root.firstChild) tmp.appendChild(root.firstChild);
    node.replaceWith(tmp);
  }
}
```

**5 hardening upgrades vs spike-002:**

1. **`uponSanitizeAttribute` hook** (Option A from RESEARCH §4.6) — strips `on*` event handlers via regex match in the hook (DOMPurify's `FORBID_ATTR` itself does NOT accept regex; UI-SPEC L165 + AI-SPEC §3 pitfall #5 originally specified `FORBID_ATTR: [/^on/i]` which would silently no-op).
2. **Explicit `FORBID_TAGS`** — adds `script / iframe / object / embed / form / input / style` to the deny list.
3. **KaTeX safe config** — `trust:false strict:true macros:{} maxExpand:1000 throwOnError:false`.
4. **Sanitize KaTeX output** — every `renderKatex` return is DOMPurify-sanitized (spike sanitized in `renderMath` only inline; we sanitize at the point of HTML production).
5. **`escapeHtml` for KaTeX errors** — KaTeX error messages quote the offending source verbatim; not escaping was Pitfall #6 CRITICAL.

**Pitfall callouts:**
- **DOMPurify must run AFTER `marked.parse`, NEVER before** (spike-findings tauri-shell-ui.md §4 + AI-SPEC §3 pitfall #5). Sanitizing markdown source breaks code fences + tables.
- **`FORBID_ATTR` does NOT accept regex** — RESEARCH.md §4.6 lines 308-330 is the authoritative correction. The `uponSanitizeAttribute` hook is the regex-equivalent path.
- **`trust:false` is the KaTeX v0.16.21+ default** — BUT explicit-set is required to defend against config drift (RESEARCH §4.5 line 287 + AI-SPEC §3 pitfall #6).
- **Hook registration is module-load-once** — multiple `addHook` calls would stack, processing the same attribute multiple times.
- **`throwOnError: false` returns inline error markup, NOT throws** — caller MUST pass any error-message text through `escapeHtml()` before display (RESEARCH §4.5 line 302 + AI-SPEC §3 pitfall #6).

---

### `src/lib/styles/tokens.css` (NEW static asset, CSS tokens)

**Analog:** None — **greenfield** (UI-SPEC §"Token Module" lines 132-232 is the verbatim spec).

**Pattern (lift verbatim from UI-SPEC):** UI-SPEC §"Token Module" provides the complete `:root { ... }` block including:
- Surface 60/30/10 split (`--bg / --bg-soft / --bg-deep / --paper`)
- Ink (`--ink / --ink-soft / --ink-mute / --muted`)
- Accent 5-token (`--orange / --orange-deep / --orange-soft / --orange-tint / --orange-ring`)
- Semantic destructive (`--error #c15f3c` — form-isolated per D-22)
- Message bubbles (`--bubble-user #EEEBE2` — SSOT 0' override per D-22)
- Borders (`--border 8% / --border-strong 14%`)
- Shadows (multi-layer soft per KD-13)
- Radius ladder (`--r-xs 4 / --r-sm 6 / --r-md 8 / --r-lg 12 / --r-pill 9999`)
- Spacing (8-point: `--s-xs 4 / --s-sm 8 / --s-md 16 / --s-lg 24 / --s-xl 32 / --s-2xl 48 / --s-3xl 64`)
- Typography (`--font-body` serif stack, `--font-mono` ui-monospace, `--fs-meta 14 / --fs-body 16 / --fs-h 20 / --fs-display 28`)
- Motion (`--ease cubic-bezier(0.165, 0.85, 0.45, 1)`, `--d-fast 120 / --d-base 200 / --d-slow 300 / --d-cap 400`)
- Geometry (`--btn-send 44 / --bottom-row-h 120 / --pane-min-w 200`)
- Dark mode override (`[data-theme="dark"] { ... }`)
- Reduced-motion fallback (`@media (prefers-reduced-motion: reduce) { ... }`)

**Adaptation:** Lift the entire UI-SPEC §"Token Module" block verbatim into `src/lib/styles/tokens.css`; import once from `+layout.svelte` or `app.html`.

**Pitfall callouts (D-22 Visual Contract Pointer):**
- **`#c15f3c` is `--error` ONLY** — form-isolation rule per D-22: orange (`--orange`) is fill-only (button bg, dot indicator); `--error` is stroke/text-only (left rule, error text). Phase 2+ `gsd-ui-checker` greps for `#c15f3c` outside `--error` consumers and flags drift.
- **`--bubble-user #EEEBE2`** — this is the SSOT 0' Live Anthropic Product UI override (was `#DDD9CE` per documented baseline; live Claude Desktop screenshot 2026-05-08 shows `#EEEBE2` lighter warm gray). UI-SPEC §SSOT 0' table records the override.
- **DO NOT introduce alternative palettes** — KP-09 + KD-13 lock the Anthropic/Claude family. New tokens go through `/gsd-ui-phase N` flow.

---

### `vendor/claude-code-parser/src/*.ts` (vendored types)

**Analog:** `udhaykumarbala/claude-code-parser` upstream MIT (lifted verbatim per KD-12 + D-13).

**Vendoring procedure (lift verbatim from RESEARCH §Wave 0 step 9 lines 408-419):**
```bash
git clone --depth 1 https://github.com/udhaykumarbala/claude-code-parser /tmp/ccp
mkdir -p vendor/claude-code-parser/src
cp -r /tmp/ccp/src/* vendor/claude-code-parser/src/
cp /tmp/ccp/LICENSE vendor/claude-code-parser/
# Drop tests/, examples/, CI files per D-13 directive
```

**Adaptation notes:**
- **Path 2 — types-only consumption** (RESEARCH §4.8 lines 397-405 recommended). Mneme imports `ClaudeEvent` discriminated union from `$vendor/claude-code-parser/src/types`; `Translator` + `createMessage` are NOT used.
- **VENDOR.md (NEW)** must contain: snapshot date `2026-05-08`, upstream commit hash, status statement "frozen reference per KD-12; upstream effectively unmaintained", adoption note "types-only (parseLine + ClaudeEvent union); Translator + createMessage NOT consumed in Phase 1".

**Pitfall callouts:**
- **MUST NOT appear in `package.json`** — KD-12 + D-13 explicit. Audit script greps and fails CI on match.
- **Upstream is effectively unmaintained** (CLAUDE.md L8 override). Treat as frozen reference; no auto-bump; manual review only when Claude Code event schema changes.
- **MIT LICENSE attribution preserved** — the `LICENSE` file is mandatory; downstream projects depending on mneme inherit MIT obligations on this subtree.

---

### `vendor/claude-code-parser/VENDOR.md` (NEW metadata)

**Analog:** None — **greenfield** (D-13 specifies content explicitly).

**Pattern (lift verbatim from CONTEXT.md D-13):**
```markdown
# claude-code-parser — vendored snapshot

**Upstream:** https://github.com/udhaykumarbala/claude-code-parser
**License:** MIT (preserved alongside in `./LICENSE`)
**Snapshot date:** 2026-05-08
**Upstream commit:** <sha hash>
**Status:** frozen reference per KD-12; upstream effectively unmaintained
**Adoption mode:** types-only (`parseLine` + `ClaudeEvent` discriminated union).
**NOT consumed in Phase 1:** `Translator`, `createMessage` helpers.

This is a static snapshot. Do NOT auto-bump from upstream. Re-vendor manually only when
Claude Code event schema changes are observed in dogfood (e.g., new event `type` value
appears in `console.warn("[claude:unknown-event]")`).
```

**Adaptation:** Replace `<sha hash>` with the output of `git -C /tmp/ccp rev-parse HEAD` at vendoring time.

---

### `scripts/gen-capabilities.ts` (NEW utility, codegen)

**Analog:** None — **greenfield** (D-14 SSOT-→-JSON generator).

**Pattern signature (RESEARCH §Wave 2 step 2 line 533 + §4.2 lines 144-159):**
```typescript
// scripts/gen-capabilities.ts — runs as `prebuild` hook in package.json
// Reads src/lib/spawn-args.ts SSOT → emits src-tauri/capabilities/default.json
import { writeFileSync } from "fs";
import { buildClaudeArgs, MAX_TURNS, SCRATCH_DIR_REGEX } from "../src/lib/spawn-args";

const argValidators = [
  { validator: "^--print$" },
  { validator: "^--permission-mode$" },
  { validator: "^bypassPermissions$" },
  { validator: "^--output-format$" },
  { validator: "^stream-json$" },
  { validator: "^--include-partial-messages$" },
  { validator: "^--verbose$" },
  { validator: "^--max-turns$" },
  { validator: `^${MAX_TURNS}$` },
  { validator: "^--add-dir$" },
  { validator: SCRATCH_DIR_REGEX },
  { validator: "^--exclude-dynamic-system-prompt-sections$" },
  { validator: ".+" },                                  // free prompt
];

const capability = {
  $schema: "../gen/schemas/desktop-schema.json",
  identifier: "default",
  description: "Capability for the main window",
  windows: ["main"],
  permissions: [
    "core:default",
    "shell:default",
    {
      identifier: "shell:allow-spawn",
      allow: [{ name: "claude-bin", cmd: "claude", args: argValidators }],
    },
    {
      identifier: "shell:allow-execute",
      allow: [{ name: "claude-bin", cmd: "claude", args: argValidators }],
    },
  ],
};

const output = JSON.stringify(capability, null, 2);
const isDryRun = process.argv.includes("--dry-run");
if (isDryRun) {
  process.stdout.write(output);
} else {
  writeFileSync("src-tauri/capabilities/default.json", output + "\n");
}
```

**Adaptation notes:**
- **Execute via `tsx` or `node --experimental-strip-types`** (RESEARCH Open Question #6). Plan-phase decides per executor preference + Husky overhead. `tsx` (~1MB) is the more portable choice.
- **`--dry-run` mode** prints to stdout for `audit-capabilities.sh` to `diff` against the committed JSON.
- **Self-test on every prebuild** — `package.json` `prebuild` runs gen → audit, so any drift fails the build.

**Pitfall callouts:**
- **Output MUST byte-match the committed JSON** — `audit-capabilities.sh` does `diff <(node scripts/gen-capabilities.ts --dry-run) src-tauri/capabilities/default.json` and exits non-zero on any mismatch. JSON formatting (indent, trailing newline) MUST be identical.
- **Trailing newline** — `output + "\n"` matches `git`'s default newline-at-EOF expectation.

---

### `scripts/audit-capabilities.sh` (NEW utility, CI guard)

**Analog:** None — **greenfield** (composes diff + grep checks per D-14).

**Pattern (lift verbatim from RESEARCH §Wave 2 step 4 lines 572-615):**
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

**Pitfall callouts:**
- **Phase 0 LEARNINGS BSD sed `-i ''`** (CONTEXT.md Existing Code Insights L195) — if any Phase 1 sed commands are added, must use BSD-style empty backup-extension as separate arg. This script uses grep only; no sed.
- **`pipefail` + `rg --count-matches` silent abort** — Phase 0 LEARNINGS noted that piping `rg --count-matches` under `set -o pipefail` silently aborts on no-match; this script uses `grep -c` (POSIX) which never fails on no-match (returns 0 lines). Safer.
- **All exit codes are 1 or 0** — Husky pre-commit hook expects 0 = pass, non-zero = block.

---

### `.husky/pre-commit` (NEW hook)

**Analog:** None — **greenfield** (Husky-init template + AI-SPEC §5 setup block lines 731-735).

**Pattern (verbatim from AI-SPEC §5):**
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

bash scripts/audit-capabilities.sh
npx vitest run --changed
```

**Adaptation notes:**
- **`npx vitest run --changed`** runs only the tests for files modified in the staging area. <5s on warm cache (AI-SPEC §5 line 866 sampling rate).
- **Husky setup** — `package.json` `prepare: "husky init"` + `npm install --save-dev husky` per RESEARCH §Wave 0 step 11 + AI-SPEC §5 line 732.

**Pitfall callouts:**
- **macOS shell** — `#!/usr/bin/env sh` is the most portable shebang; works under bash/zsh.
- **Husky vs lefthook vs raw `.git/hooks`** is RESEARCH Open Question #8; planner can swap; Husky is the locked default.

---

### `tests/spawn-args.test.ts` (NEW test, unit)

**Analog:** None — **greenfield** (RED stub provided verbatim in RESEARCH §TDD lines 666-704).

**Pattern (lift verbatim from RESEARCH §TDD lines 666-704):**
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

---

### `tests/sanitize.test.ts` (NEW test, unit + jsdom)

**Analog:** None — **greenfield** (RED stub provided verbatim in RESEARCH §TDD lines 707-752 + 6 fixture set in AI-SPEC §5 line 762).

**Pattern (lift verbatim from RESEARCH §TDD lines 707-752):**
```typescript
// tests/sanitize.test.ts — RED before src/lib/sanitize.ts implementation
// SAFETY NOTE: do NOT inject sanitize() output via raw DOM HTML setters in test fixtures —
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
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(alertSpy).not.toHaveBeenCalled();
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
    expect(doc.querySelector("a[href^='javascript:']")).toBeNull();
  });
});
```

**Pitfall callouts:**
- **DO NOT inject the sanitize output via raw DOM HTML setters** — RESEARCH §TDD line 710-711: use `DOMParser.parseFromString()` so the test framework itself never executes attacker payloads. (This is a test-framework safety pattern, not a runtime concern.)

---

### `tests/stream-dispatch.test.ts` (NEW test, unit)

**Analog:** None — **greenfield** (described in RESEARCH §TDD line 651 + AI-SPEC §5 dispatch correctness).

**Pattern signature** (greenfield, derived from spike-002 `handleEvent` test surface + AI-SPEC §3 dispatch lines 451-510):
```typescript
import { describe, expect, it, vi } from "vitest";
import { dispatchEvent } from "../src/lib/stream-dispatch";

describe("dispatchEvent — 6-arm stream taxonomy", () => {
  it("appends text_delta to assistant message", () => {
    const messages: any[] = [];
    dispatchEvent({
      type: "stream_event",
      event: { type: "content_block_delta", delta: { type: "text_delta", text: "Hello" } }
    }, messages);
    expect(messages[0]?.role).toBe("assistant");
    expect(messages[0]?.text).toBe("Hello");
  });

  it("SKIPS assistant.text blocks (already streamed via stream_event)", () => {
    const messages: any[] = [];
    dispatchEvent({
      type: "assistant",
      message: { content: [{ type: "text", text: "this should NOT appear" }] }
    }, messages);
    expect(messages.find(m => m.text?.includes("should NOT appear"))).toBeUndefined();
  });

  it("renders thinking blocks as indicator only, never raw signature", () => {
    const messages: any[] = [];
    dispatchEvent({
      type: "assistant",
      message: { content: [{ type: "thinking", signature: "encrypted-data" }] }
    }, messages);
    expect(messages.find(m => m.text?.includes("encrypted-data"))).toBeUndefined();
    expect(messages.find(m => m.text === "💭 thinking...")).toBeDefined();
  });

  it("pushes tool_use as tool card with name + truncated input ≤200 chars", () => {
    const messages: any[] = [];
    dispatchEvent({
      type: "assistant",
      message: { content: [{ type: "tool_use", name: "Bash", input: { cmd: "ls" } }] }
    }, messages);
    const card = messages.find(m => m.role === "tool");
    expect(card?.text).toContain("Bash");
  });

  it("warns on unknown event type without throwing", () => {
    const messages: any[] = [];
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => dispatchEvent({ type: "future_event" } as any, messages)).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith("[claude:unknown-event]", expect.anything());
  });
});
```

**Pitfall callouts:**
- **The `assistant.text` skip test is the load-bearing one** — without it, every assistant turn would double-render in the UI. This is the spike-validated invariant.
- **`thinking.signature` privacy test** — never expose the raw encrypted signature in the UI even if non-empty.

---

### `tests/capability-regex.test.ts` (NEW test, unit on JSON)

**Analog:** None — **greenfield** (described in RESEARCH §TDD line 652).

**Pattern signature (greenfield):**
```typescript
import { describe, expect, it } from "vitest";
import capability from "../src-tauri/capabilities/default.json";

describe("capability regex validators (REQ-4)", () => {
  it("contains 13 args entries on shell:allow-spawn", () => {
    const spawn = capability.permissions.find(p => p?.identifier === "shell:allow-spawn");
    expect(spawn.allow[0].args.length).toBe(13);
  });

  it("every Var validator compiles as a valid regex", () => {
    const spawn = capability.permissions.find(p => p?.identifier === "shell:allow-spawn");
    for (const arg of spawn.allow[0].args) {
      expect(() => new RegExp(arg.validator)).not.toThrow();
    }
  });

  it("--max-turns validator immediately followed by ^30$", () => {
    const spawn = capability.permissions.find(p => p?.identifier === "shell:allow-spawn");
    const args = spawn.allow[0].args;
    const idx = args.findIndex(a => a.validator === "^--max-turns$");
    expect(args[idx + 1].validator).toBe("^30$");
  });

  it("--add-dir validator pins to ^/Users/[^/]+/\\.mneme/scratch$", () => {
    const spawn = capability.permissions.find(p => p?.identifier === "shell:allow-spawn");
    const args = spawn.allow[0].args;
    const idx = args.findIndex(a => a.validator === "^--add-dir$");
    expect(args[idx + 1].validator).toBe("^/Users/[^/]+/\\.mneme/scratch$");
    expect(new RegExp(args[idx + 1].validator).test("/Users/qinyuan/.mneme/scratch")).toBe(true);
    expect(new RegExp(args[idx + 1].validator).test("/etc/hosts")).toBe(false);
  });

  it("rejects --bare anywhere in any validator", () => {
    const spawn = capability.permissions.find(p => p?.identifier === "shell:allow-spawn");
    for (const arg of spawn.allow[0].args) {
      expect(arg.validator).not.toMatch(/bare/);
    }
  });
});
```

---

### `tests/manual/lifecycle/run-quit-loop.sh` (NEW manual test, E2E)

**Analog:** None — **greenfield** (described in RESEARCH §Wave 3 lines 626-628 + SPEC L134-135 acceptance).

**Pattern signature (~30 LOC):**
```bash
#!/usr/bin/env bash
# tests/manual/lifecycle/run-quit-loop.sh
# Manual harness — run before Phase 2 entry. Spawns app via `npm run tauri dev` 5×,
# kills with SIGTERM after 3s each cycle, asserts ps aux shows no orphans.
set -euo pipefail

CYCLES=${CYCLES:-5}
ORPHAN_FILTER='[c]laude --print|[m]cp|[r]g'

for i in $(seq 1 "$CYCLES"); do
  echo "=== cycle $i / $CYCLES ==="
  npm run tauri dev &
  APP_PID=$!
  sleep 3
  kill -TERM "$APP_PID" 2>/dev/null || true
  sleep 3   # past 2s SIGTERM grace + 1s buffer

  count=$(ps aux | grep -E "$ORPHAN_FILTER" | grep -v grep | wc -l | tr -d ' ')
  if [[ "$count" != "0" ]]; then
    echo "[FAIL] cycle $i: $count orphan(s) detected"
    ps aux | grep -E "$ORPHAN_FILTER" | grep -v grep
    exit 1
  fi
  echo "[OK] cycle $i: 0 orphans"
done

echo "=== ALL $CYCLES CYCLES PASSED ==="
```

**Pitfall callouts:**
- **macOS-only** — `ps aux` flags are BSD-style.
- **Runs `npm run tauri dev`** — must be invoked from repo root with full Tauri toolchain installed. CI lacks WKWebView privileges (AI-SPEC §5 line 716).
- **`ORPHAN_FILTER`** — uses bracket character classes `[c]laude` to avoid matching `grep` itself in the output (POSIX trick).

---

### `tests/manual/dogfood-checklist.md` (NEW manual test)

**Analog:** None — **greenfield** (mirrors SPEC L128-148 acceptance + AI-SPEC §5 5-prompt dogfood set lines 762-775).

**Pattern signature (markdown checklist):**
```markdown
# Phase 1 Dogfood Checklist — pre-Phase-2 entry gate

Run by the developer once before `/gsd-verify-work 1`. All boxes must check.

## SPEC.md Acceptance (19 checks — lift from SPEC L128-148)
- [ ] `npm run tauri dev` from repo root launches window titled "Mneme" with three resizable columns + bottom row + window minimum 1024×600
- [ ] Drag any column divider, Cmd+Q, relaunch → split positions restored within 1 px
- [ ] `tauri.conf.json` declares `productName: "Mneme"` AND `identifier: "dev.mneme.app"`
- ... (continue with the remaining 16 SPEC acceptance checks)

## 5 Dogfood Prompts (AI-SPEC §5 lines 762-775)
- [ ] **Prompt 1 — Streaming legibility**: `解释一下 Rust 的 ownership` — observe TTFT < 4s, smooth chunky monospace stream, finalized markdown matches structure
- [ ] **Prompt 2 — Tool-use round-trip**: `list files in ~/.mneme/scratch and read first one` — observe tool-use cards (Bash → Read → response cards)
- [ ] **Prompt 3 — Code rendering**: `write a fibonacci in Python with explanation` — observe code-fence finalization on `result`
- [ ] **Prompt 4 — Math rendering**: `$\sum_{i=1}^{n} i^2$ 推导一下` — observe KaTeX inline + display math correctly rendered
- [ ] **Prompt 5 — Long-stream**: `这是 long-stream 测试: 请详细描述一下编译器的工作流程，至少 8 段` — observe no jank or perceptible re-render lag (D-21 deferred-to-Phase-3 risk; surface but don't block)

## Hotkey Unbinding (REQ-6 acceptance)
- [ ] `Cmd+L` produces no UI response and no error log entry
- [ ] `Cmd+K` ditto
- [ ] `Cmd+,` ditto
- [ ] `Cmd+P` ditto
- [ ] `Cmd+O` ditto
- [ ] `Cmd+Shift+P` ditto
- [ ] `Cmd+N` ditto
- [ ] `Cmd+R` ditto
- [ ] `Cmd+W` ditto (CONTEXT.md spec amendment 3 — added 2026-05-08)

## Telemetry / Stream UX (D-18, D-19, D-20)
- [ ] Streaming dot pulses during stream, fades out on `result`
- [ ] Stop button replaces Send during stream; click → kills subprocess; already-streamed text preserved
- [ ] Shift+Enter inserts newline; Enter sends prompt
- [ ] No cost meter / TTFT / event count visible in UI chrome

## XSS Smoke (REQ-5 dev-mode)
- [ ] Send `<img src=x onerror=alert(1)>` as a prompt — assistant echo renders inert (no alert)
- [ ] Send `$\href{javascript:alert(2)}{x}$` as a prompt — KaTeX renders inert text, no live anchor
```

---

## Shared Patterns

### Authentication (none in Phase 1)

**Source:** N/A
**Apply to:** N/A
Phase 1 has no auth surface. The `claude` CLI handles its own OAuth keychain reads. Phase 2 introduces first-run wizard for OAuth status detection (REQ-16).

### Error Handling (system-bubble pattern)

**Source:** spike-002 `+page.svelte` lines 147-153 (spawn error) + UI-SPEC §"System bubble" lines 442-456.
**Apply to:** `+page.svelte` chat panel; any future surface that displays subprocess errors.

```typescript
// spike-002 lines 147-153 — pattern to lift + harden with escapeHtml
function handleSpawnError(err: unknown) {
  messages.push({
    id: uid(),
    role: "system",
    text: `❌ spawn error: ${escapeHtml(String(err))}`,   // ADDED escapeHtml
    streaming: false,
  });
  isStreaming = false;
}
```

**UI-SPEC §"System bubble" error variant** (lines 444-456):
```css
.bubble.system.error {
  background: transparent;
  color: var(--error);
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  border-left: 3px solid var(--error);
  padding: var(--s-sm) var(--s-md);
  margin: var(--s-sm) 0;
}
```

### Sanitize-after-Markdown (Pipeline guard)

**Source:** `src/lib/sanitize.ts` (NEW, see file detail above) + spike-findings tauri-shell-ui.md §4 + AI-SPEC §3 pitfall #5.
**Apply to:** Every site that renders model-emitted text as HTML (currently only `+page.svelte` finalize pass; future Phase 9 citations renderer).

The pipeline `text → marked.parse → DOMPurify.sanitize → DOM injection` is non-negotiable. Reverse-order (sanitize source first) silently breaks code fences and tables. Encapsulated in `sanitizeMarkdown(text)` to prevent ad-hoc misuse.

### Listener-before-spawn (Async-First rule)

**Source:** AI-SPEC §4b lines 596-630 + spike-findings tauri-shell-ui.md §4.
**Apply to:** Every site that spawns a Tauri shell `Command` (currently only `+page.svelte`; Phase 4 Marker subprocess + Phase 7 embedding subprocess will reuse).

```typescript
// CORRECT pattern (verbatim from AI-SPEC §4b lines 605-619):
const cmd = Command.create("claude-bin", buildClaudeArgs(prompt));
let buffer = "";
cmd.stdout.on("data", (chunk) => { /* sync handler */ });
cmd.on("close", finalizeRender);                      // sync callback
cmd.on("error", handleSpawnError);
const child = await cmd.spawn();                      // await fork+exec only
await invoke("register_session_pid", { pid: child.pid });
```

**WRONG patterns (callouts):**
- Listener registered after spawn → initial chunks lost.
- `async` keyword on the data callback → re-entrancy: chunk N+1 arrives during await of chunk N's render.

### PGID kill (Subprocess lifecycle)

**Source:** `src-tauri/src/lib.rs::kill_pgid` (NEW, see file detail above) + RESEARCH §4.3 + RESEARCH §4.4 hook union.
**Apply to:** Every long-lived subprocess that calls `setsid()` (Phase 4 Marker, Phase 7 embedding subprocess will reuse via D-12).

The kill sequence — `nix::killpg(getpgid(pid), SIGTERM)` → 2s wait → `SIGKILL` — combined with the `WindowEvent::CloseRequested ∪ RunEvent::ExitRequested` hook union is the locked pattern. Phase 3 multi-session generalizes via `SessionRegistry::kill_all()`.

### SSOT-→-codegen (Capability + spawn-args discipline)

**Source:** `src/lib/spawn-args.ts` + `scripts/gen-capabilities.ts` + `scripts/audit-capabilities.sh` (D-14 triple).
**Apply to:** Any future surface where TS-side definition feeds into a runtime-enforced JSON/TOML config. Phase 2 vault-path config + Phase 6 Echo360 webview-cookie scope + Phase 7 MCP server scope are candidates.

The pattern: **edit-once / generate-many / audit-on-every-commit**. Codified as a 3-file triple with a hard `diff` gate in pre-commit.

---

## No Analog Found

All Phase 1 files have an analog (spike-002 / vendor / external reference / greenfield-with-cite). However, the following files are GREENFIELD with no in-codebase analog — planner should use the cited RESEARCH/UI-SPEC/AI-SPEC sections as the primary pattern source rather than searching for closer codebase matches:

| File | Role | Reason | Primary pattern source |
|------|------|--------|------------------------|
| `src/lib/components/Splitter.svelte` | component (interaction) | D-01 vanilla CSS Grid + Svelte 5 — no splitter exists; rejected `svelte-splitpanes` per D-08 | UI-SPEC §"Geometry Contract" + OpenCovibe (D-16 Apache-2.0 read) |
| `src/lib/spawn-args.ts` | utility (SSOT) | First SSOT in the project; D-14 introduces the pattern | RESEARCH §Wave 2 step 1 + AI-SPEC §3 |
| `src/lib/sanitize.ts` | utility (security) | First sanitize module; spike-002 inline functions extracted + 5 hardening upgrades | RESEARCH §4.5 + §4.6 + AI-SPEC §3 pitfalls #5/#6 |
| `src/lib/styles/tokens.css` | static-asset | First UI tokens file; KP-09 + KD-13 + D-22 lock the values | UI-SPEC §"Token Module" lines 132-232 |
| `src-tauri/src/session.rs` | state-store | First Rust state-store; extension-friendly shape for Phase 3 | RESEARCH §8 Risk 1 lines 904-928 |
| `scripts/gen-capabilities.ts` | utility (codegen) | First codegen script in the project | RESEARCH §Wave 2 step 2 + §4.2 |
| `scripts/audit-capabilities.sh` | utility (CI guard) | First audit gate | RESEARCH §Wave 2 step 4 |
| `vendor/claude-code-parser/VENDOR.md` | metadata | First vendoring; KD-12 + D-13 introduce the pattern | CONTEXT.md D-13 |

---

## KP-08 Dependency Tracking Cross-Check

Phase 1 introduces these new dependencies — every one MUST appear in `.planning/dependencies.md` per KP-08. The audit during commit_docs phase is the gate. Cross-check:

| Library | Type | Already in dependencies.md? | Group |
|---------|------|----------------------------|-------|
| `nix` (cargo) | cargo-dep | **NO — Phase 1 must add** | Group 4 (Rust / backend) |
| `vitest` (npm dev) | npm-dep | NO — but bundled with svelte-ts template; planner decides if registration needed | Group 1 (frontend) candidate |
| `husky` (npm dev) | npm-dep | NO — Phase 1 must add | Group 1 candidate |
| `vendor/claude-code-parser/` | vendored | YES — Group 6 row 1 | Group 6 |
| `awesome-design-md` (reference) | reference-only | NO — UI-SPEC §"KD-13 Group 10 update recommendation" specifies addition | Group 10 |
| All others (`@tauri-apps/*`, `marked`, `katex`, `dompurify`, `tauri-plugin-shell`, etc.) | npm-dep / cargo-dep | YES — already registered | Groups 1, 4 |

**Plan-phase action item:** add `nix`, `husky`, `awesome-design-md` rows to `.planning/dependencies.md` in the same atomic commit as the implementation files (KP-08 maintenance rule: "any new dependency added in code MUST land in this file in the same PR").

---

## Cross-Phase Reusability Notes (per RESEARCH §8)

These Phase 1 patterns are explicitly shaped for reuse by later phases. Plan-phase should NOT in-place mutate them; later phases extend (no rip-out):

| Pattern | Phase 1 shape | Reused by | Extension mechanism |
|---------|---------------|-----------|---------------------|
| `SessionRegistry` (Rust) | `Mutex<HashMap<u32, ChildHandle>>` with at most 1 entry | Phase 3 multi-session | Insert more entries; existing API works unchanged |
| `sanitizeMarkdown` Hook | `uponSanitizeAttribute` strips `on*` attrs | Phase 9 citations | Add `if (attrName === "data-citation-id") keepAttr = true;` branch |
| `--add-dir` capability regex | Pinned to `^/Users/[^/]+/\\.mneme/scratch$` | Phase 2 vault | Broaden regex AND update SSOT (gen-capabilities flows it through); document as Phase-2 deferred todo NOW |
| `audit-capabilities.sh` | 6 audit checks | Phase 2-10 | Append `if grep ... ; then ... fi` blocks |
| 6-arm `dispatchEvent` | Anthropic CLI events | Phase 7+ | Survey upstream events; patch dispatch + add new arm |
| Tauri capability codegen | `gen-capabilities.ts` | Phase 6 Echo360 webview cookie scope, Phase 7 MCP scope | Extend the SSOT pattern; same triple |

---

## Metadata

**Analog search scope:**
- `.planning/spikes/002-tauri-claude-shell/app/` (full tree, especially `src/routes/+page.svelte`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`)
- `.claude/skills/spike-findings-mneme/` (SKILL.md + references/)
- `.planning/dependencies.md` (KP-08 registry)
- 4 phase contract files: `01-SPEC.md`, `01-CONTEXT.md`, `01-RESEARCH.md`, `01-AI-SPEC.md`, `01-UI-SPEC.md`
- External upstream URLs (NOT grep'd locally): OpenCovibe, TOKENICODE, opcode (UX only)

**Files scanned:** ~15 files (4 phase contracts + spike-002 source files + dependencies.md + SKILL.md)
**Pattern extraction date:** 2026-05-08
**Validity:** through 2026-06-07 (30-day window per RESEARCH §Metadata)

---

*Phase: 01-tauri-shell-foundation-subprocess-hardening*
*Pattern map compiled: 2026-05-08*
*Next step: `gsd-planner` consumes this PATTERNS.md alongside SPEC + CONTEXT + RESEARCH + AI-SPEC + UI-SPEC; produces VALIDATION.md (per Nyquist Dimension 8) + PLAN.md(s) packing TDD-eligible tasks (7 surfaces RED→GREEN→REFACTOR) + non-TDD tasks (5 surfaces straight execute).*

## PATTERN MAPPING COMPLETE
