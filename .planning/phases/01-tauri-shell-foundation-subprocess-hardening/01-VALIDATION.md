---
phase: 1
slug: tauri-shell-foundation-subprocess-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-08
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Synthesized from `01-RESEARCH.md` §7 Validation Architecture (Nyquist Dimension 8). Per-task `<automated>` commands + status flags will be filled in by `/gsd-plan-phase` and `/gsd-execute-phase` as plans + tasks are emitted; this strategy doc supplies the contract.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (frontend)** | Vitest 4.1.5 + jsdom env (bundled with the SvelteKit `svelte-ts` template) |
| **Framework (backend)** | Built-in `cargo test` + `nix` 0.31.2 crate (signal/process features) for syscall assertions |
| **Frontend config file** | `vitest.config.ts` (Wave 0 — does not exist today) |
| **Backend config file** | `src-tauri/Cargo.toml` (Wave 0 — created by `npm create tauri-app`) |
| **Quick run command** | `bash scripts/audit-capabilities.sh && npx vitest run --changed` (pre-commit, < 5s warm cache) |
| **Full frontend command** | `npx vitest run` |
| **Full backend command** | `cargo test --manifest-path src-tauri/Cargo.toml` |
| **Audit script** | `bash scripts/audit-capabilities.sh` (prebuild + pre-commit) |
| **Lifecycle harness** | `bash tests/manual/lifecycle/run-quit-loop.sh` (manual; pre-Phase-2-entry gate) |
| **Manual dogfood checklist** | `tests/manual/dogfood-checklist.md` (developer-checkbox; pre-Phase-2-entry gate) |
| **Estimated runtime (full)** | ~30 seconds (vitest) + ~10 seconds (cargo test) + ~3 seconds (audit) |

---

## Sampling Rate

- **After every task commit:** Husky pre-commit runs `bash scripts/audit-capabilities.sh && npx vitest run --changed`. Capability drift + changed-file unit tests caught immediately.
- **After every plan wave:** Run full suite — `npx vitest run` + `cargo test --manifest-path src-tauri/Cargo.toml` + `bash scripts/audit-capabilities.sh`.
- **Before `/gsd-verify-work`:** Full suite must be green + lifecycle harness 5/5 cycles + dogfood checklist all 19 SPEC checks ticked.
- **Max feedback latency:** ~5 seconds (pre-commit fast path); ~45 seconds (full suite).

---

## Per-Task Verification Map

> Populated by `/gsd-plan-phase` per task. Schema:

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-NN-NN | 01-NN | N | REQ-XX | T-1-XX / — | {expected behavior} | unit / integration / E2E / manual | `{command}` | ✅ / ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Initial REQ → Test Type mapping** (from RESEARCH.md §7; planner translates each row into 1+ `<automated>` task):

| Req ID | Behavior | Test Type | Automated Command | File Exists |
|--------|----------|-----------|-------------------|-------------|
| REQ-1 | Three-pane resizable shell with persistent split positions | manual + visual | n/a (dogfood-checklist row) | ❌ Wave 0 |
| REQ-1 | Window minimum 1024×600 enforced | manual visual | n/a (dogfood-checklist row) | ❌ Wave 0 |
| REQ-1 | Bottom row 120px placeholder + chrome (overlay title bar) | manual visual | n/a (dogfood-checklist row) | ❌ Wave 0 |
| REQ-2 | Spawn args contain `--max-turns 30 / --add-dir <SCRATCH> / --exclude-dynamic-system-prompt-sections / NO --bare` | unit | `npx vitest run tests/spawn-args.test.ts` | ❌ Wave 0 |
| REQ-2 | 6-arm event JSONL parsing + tool-use round-trip + assistant.text skip | unit | `npx vitest run tests/stream-dispatch.test.ts` | ❌ Wave 0 |
| REQ-2 | Streaming legibility + finalization on `result` (TTFT < 4s; markdown matches stream structurally) | manual dogfood | n/a (dogfood-checklist row) | ❌ Wave 0 |
| REQ-2 | First-prompt `cache_creation_input_tokens` < 20,000 | manual dogfood | dev-console assertion on `result` event | ❌ Wave 0 |
| REQ-3 | Cmd+Q kill within 2s; 5-cycle orphan count == 0 | E2E manual | `bash tests/manual/lifecycle/run-quit-loop.sh` | ❌ Wave 0 |
| REQ-3 | `kill_pgid` against real `setsid` child tree | integration | `cargo test --test kill_pgid` | ❌ Wave 0 |
| REQ-4 | Zero `args:true` / zero `*` / SSOT drift == 0 / no `--bare` validator | unit | `bash scripts/audit-capabilities.sh` | ❌ Wave 0 |
| REQ-4 | Capability regex validators all compile + match expected | unit | `npx vitest run tests/capability-regex.test.ts` | ❌ Wave 0 |
| REQ-5 | 6 XSS fixtures all render inert | unit | `npx vitest run tests/sanitize.test.ts` | ❌ Wave 0 |
| REQ-5 | KaTeX version ≥ 0.16.21 in package-lock.json | manual | `npm ls katex` | n/a (use `npm ls`) |
| REQ-5 | DOMPurify config has FORBID_TAGS + Option-A `uponSanitizeAttribute` hook (RESEARCH.md §4 cross-spec correction #1) | manual + structural | `rg 'DOMPurify\.sanitize\(' src/` review | n/a |
| REQ-5 | CSP meta tag in `app.html` | manual + grep | `grep 'Content-Security-Policy' src/app.html` | n/a |
| REQ-6 | Single-session: launch always blank | manual visual | n/a (dogfood-checklist row) | ❌ Wave 0 |
| REQ-6 | Hotkey unbinding (Cmd+L/K/,/P/O/Shift+P/N/R/W) | manual visual + console | n/a (dogfood-checklist row) | ❌ Wave 0 |
| REQ-6 | Stop button (D-19) preserves already-streamed text | manual visual | n/a (dogfood-checklist row) | ❌ Wave 0 |
| REQ-6 | Shift+Enter newline (D-20) | manual visual | n/a (dogfood-checklist row) | ❌ Wave 0 |

**Layer mapping** (from RESEARCH.md §7 test pyramid):
- **Layer 1 — Unit (Vitest):** `tests/spawn-args.test.ts` · `tests/sanitize.test.ts` · `tests/stream-dispatch.test.ts` · `tests/capability-regex.test.ts`
- **Layer 2 — Integration:** `src-tauri/tests/kill_pgid.rs` (cargo) · `tests/audit/*` (Bash + fixture stubs)
- **Layer 3 — Manual / E2E (gate before Phase 2 entry):** `tests/manual/lifecycle/run-quit-loop.sh` · `tests/manual/dogfood-checklist.md`

---

## Wave 0 Requirements

These artifacts do NOT exist in the repo today; Phase 1 brings them all up. Plan-checker enforces that every `❌ Wave 0` row above resolves to a Wave 0 task before downstream waves can begin.

- [ ] `package.json` (entire frontend test infrastructure — bundled with `npm create tauri-app`)
- [ ] `vitest.config.ts` (jsdom env, no extra setup)
- [ ] `tests/spawn-args.test.ts` — covers REQ-2 spawn-arg discipline
- [ ] `tests/sanitize.test.ts` — covers REQ-5 XSS battery + KaTeX `\href` block
- [ ] `tests/stream-dispatch.test.ts` — covers REQ-2 6-arm event taxonomy
- [ ] `tests/capability-regex.test.ts` — covers REQ-4 every Var validator compiles + matches
- [ ] `src-tauri/tests/kill_pgid.rs` — covers REQ-3 PGID kill against real `setsid` child tree
- [ ] `tests/audit/*` — fixture stubs for audit-script integration test
- [ ] `tests/manual/lifecycle/run-quit-loop.sh` — covers REQ-3 5-cycle orphan-count gate
- [ ] `tests/manual/dogfood-checklist.md` — covers REQ-1 layout, REQ-2 streaming, REQ-5 KaTeX/DOMPurify, REQ-6 hotkey unbinding
- [ ] `scripts/gen-capabilities.ts` — covers REQ-4 SSOT (single source of truth for capability YAML emission)
- [ ] `scripts/audit-capabilities.sh` — covers REQ-4 audit gate (`args:true` / `*` / `--bare` / SSOT drift)
- [ ] Husky setup (`.husky/pre-commit` + `npm install --save-dev husky`)

**Existing test infrastructure** that survives into Phase 1: **none**. Phase 0 was identity-only; the spike-002 app is reference (not lifted); Wave 0 builds from a fresh `npm create tauri-app` baseline.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Three-pane resizable shell + bottom 120px row + window-chrome overlay | REQ-1 | Visual layout — no DOM-snapshot equivalence test would catch designer-intent regressions | `npm run tauri dev`; resize panes; restart; verify split persists; verify bottom row + chrome match D-03/D-06 |
| Window-min enforcement (1024×600) | REQ-1 | OS-level constraint surfaced via Tauri config, not application code | `npm run tauri dev`; attempt to drag window below 1024 wide / 600 tall — Tauri blocks |
| 5-cycle quit loop (orphan count == 0) | REQ-3 | Process-tree state requires real OS subprocess (cannot be mocked at unit layer) | `bash tests/manual/lifecycle/run-quit-loop.sh` (script automates; result is manually inspected for log) |
| 5 dogfood prompts (math / code / tool-use / no-tool / long-stream) | REQ-2 | TTFT measurement + visual KaTeX/code rendering + tool-use clarity all require human-in-the-loop perception | `tests/manual/dogfood-checklist.md` — run each prompt, tick row when subjective + objective criteria met |
| KaTeX version pin ≥ 0.16.21 | REQ-5 | Snapshot of installed npm version, not runtime behavior | `npm ls katex` ≥ 0.16.21 |
| DOMPurify hook configuration matches Option-A | REQ-5 | Code structure (presence of `uponSanitizeAttribute` hook) — would require non-trivial AST inspection at unit layer | `rg 'DOMPurify.sanitize\(' src/` + `rg 'uponSanitizeAttribute' src/` returns ≥ 1 match each |
| CSP meta tag in `app.html` | REQ-5 | Static HTML grep | `grep 'Content-Security-Policy' src/app.html` returns the locked CSP string |
| Hotkey unbinding (`Cmd+L/K/,/P/O/Shift+P/N/R/W`) | REQ-6 | Browser shortcuts must NOT fire in Tauri webview — perceptible only via running the app | `npm run tauri dev`; press each shortcut; verify no app-level effect (no menu open, no nav, no terminal-clear) |
| Stop button preserves already-streamed text (D-19) | REQ-6 | Visible behavior during active stream — depends on user timing | dogfood-checklist row: launch streaming response → click Stop mid-stream → verify partial text remains |
| Shift+Enter newline (D-20) | REQ-6 | Input keystroke behavior | dogfood-checklist row: focus input → press Shift+Enter → verify newline inserted (not submit) |

---

## Validation Sign-Off

- [ ] Every task has `<automated>` verify or Wave 0 dependency declared
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all `❌ Wave 0` rows in the Phase Requirements → Test Map
- [ ] No watch-mode flags (`--watch`, `vitest watch`) in any committed command
- [ ] Feedback latency for pre-commit < 5s (warm cache); for full suite < 60s
- [ ] `nyquist_compliant: true` set in frontmatter once `/gsd-plan-phase 1 --tdd` lands plans + plan-checker passes Dimension 8

**Approval:** pending (becomes `approved YYYY-MM-DD` when plan-checker emits VERIFICATION PASSED)
