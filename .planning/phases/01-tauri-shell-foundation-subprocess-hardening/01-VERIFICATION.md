---
phase: 01-tauri-shell-foundation-subprocess-hardening
verified: 2026-05-14T07:42:26Z
re_verified: 2026-05-15T06:58:00Z
status: passed
score: 5/5
overrides_applied: 0
gap_closure:
  - cr_01: closed
    fix_commit: <pending>
    files: ["src/lib/components/ChatPanel.svelte"]
    test_baseline: "vitest 177/177 · svelte-check 0/0 (preserved post-fix)"
    uat_results: "01-UAT.md 3 dogfood items passed (user response 2026-05-15); Q1 CR-01 closed inline"
gaps_resolved:
  - truth: "Subprocess lifecycle is clean and connection-state dot does not stick at 'connecting' after a natural subprocess close"
    status: closed
    reason: "cmd.on('close') path in ChatPanel.svelte:250-272 calls teardown() but not setStatus(). If the subprocess closes naturally without ever emitting a text_delta event (e.g., auth handshake error prints to stderr only, rate-limit immediate close, spurious early-EOF), setStatus('connected') never fires (it is gated on firstTextDeltaSeen at L213) and setStatus('disconnected') is not called on the close path. The titlebar dot is stuck at 'connecting' for the rest of the app session. This is CR-01 from 01-REVIEW.md — a real regression in the GAP-1 fix introduced by plan 01-12."
    artifacts:
      - path: "src/lib/components/ChatPanel.svelte"
        resolution: "Added 5th enumerated setStatus('disconnected') site inside cmd.on('close') gated on !firstTextDeltaSeen (~3 logical lines + comment). teardown() comment block updated from 'FOUR enumerated sites' to 'FIVE enumerated sites' to keep the A-16 contract documentation accurate."

human_verification_results:
  - test: "Session continuity dogfood (3 prompts)"
    status: passed
    via: "01-UAT.md user response 2026-05-15"
  - test: "KaTeX rendering — no ASCII fallback (3 math prompts)"
    status: passed
    via: "01-UAT.md user response 2026-05-15"
  - test: "Heading hierarchy visual (3 hierarchical prompts)"
    status: passed
    via: "01-UAT.md user response 2026-05-15"

human_verification_original:
  - test: "Session continuity dogfood (3 prompts)"
    expected: "Prompt 2 and 3 retain memory of prior turns; titlebar dot stays 'connected' (green) between prompts; devtools shows [claude:init] with SAME session id on prompts 2 and 3 as on prompt 1's reply"
    why_human: "Requires live app launch, sending 3 real prompts to Claude, and visually observing titlebar state. Cannot be verified with grep or vitest."
  - test: "KaTeX rendering — no ASCII fallback (3 math prompts)"
    expected: "Replies to math prompts show rendered KaTeX equations only; no ASCII-fallback lines (e.g., no '2!f''(a)(x-a)2' after a $$...$$ block)"
    why_human: "CHAT_RENDERING_HINTS is wired and SSOT is verified, but whether Claude actually honors the hint requires observing live responses with KaTeX rendering active."
  - test: "Heading hierarchy visual (3 hierarchical prompts)"
    expected: "h1 visually larger than h2 visually larger than h3; --- renders as a visible horizontal rule"
    why_human: "CSS values are correct (21/17.5/15.5px verified) but visual distinguishability at screen resolution requires human inspection."
---

# Phase 1: Tauri Shell Foundation + Subprocess Hardening — Verification Report

**Phase Goal:** Three-pane resizable shell with single-session Claude chat works end-to-end, with all CRITICAL pitfalls (zombies, cost runaway, XSS, capability wildcards) closed before user starts dogfooding.

**Verified:** 2026-05-14T07:42:26Z
**Status:** gaps_found
**Re-verification:** No — initial verification (covers plans 01-01 through 01-13 including plan 01-12 gap-closure + plan 01-13 docs amendment)

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Three-pane resizable shell renders; split positions persist across restarts | VERIFIED | `src/lib/components/Splitter.svelte` wired in `+page.svelte` with `FileArea`, `LectureVideo`, `ChatPanel`; `localStorage.getItem("mneme.layout.split")` persist/restore at L56 + L136-141; `src-tauri/tauri.conf.json` min window `1024x600` |
| 2 | Single Claude session streams correctly with multi-turn continuity via --resume; connection-state stays connected across per-prompt subprocess closes | VERIFIED (re-verified 2026-05-15 post CR-01 fix) | Session resume code: `dispatch.sessionId` captured from system/init at stream-dispatch.ts:157; threaded via `claude-bin-resume` command name at ChatPanel.svelte:175; dual Command names in capabilities/default.json confirmed. CR-01 (status stuck on connecting after close-without-text_delta) closed via inline fix in 01-UAT.md follow-up commit — added 5th enumerated `setStatus("disconnected")` site at `cmd.on("close")` gated on `!firstTextDeltaSeen`; teardown() comment block updated to document the FIVE-site contract. Dogfood items 2/3/4 (session continuity / KaTeX no-fallback / heading hierarchy) passed per 01-UAT.md user response. |
| 3 | Subprocess lifecycle is clean: kill_pgid SIGTERM → 2s → SIGKILL; zero orphans after 5 quit cycles | VERIFIED | `src-tauri/src/lib.rs` implements `kill_pgid` via `nix::killpg` at L52-65; `SessionRegistry` in `session.rs`; `cargo test` 3/3 kill_pgid tests pass: `kill_pgid_nonexistent_pid`, `kill_pgid_already_dead_pgid`, `kill_pgid_eradicates_whole_process_group` |
| 4 | Loop guard via `--max-turns 30` in every spawn; capability hardening: no `args:true`, no `"*"`, no `--bare`, no `--system-prompt`; KaTeX ≥ 0.16.21; DOMPurify allowlist explicit | VERIFIED | `MAX_TURNS = "30"` in spawn-args.shared.ts:54; `bash scripts/audit-capabilities.sh` → `[audit] PASS`; `grep -c '"args": true' capabilities/default.json` → 0; KaTeX `^0.16.45` in package.json; DOMPurify `FORBID_TAGS` + `uponSanitizeAttribute on* hook` in sanitize.ts:24-32; `test-audit-script.sh` → 7/7 PASS; regen-idempotent PASS |
| 5 | Plan 01-13 docs amendment landed: SPEC.md items 5+6, REQUIREMENTS.md REQ-02 multi-turn clause | VERIFIED | SPEC.md L12-13 contains items 5+6 referencing commit `4e46e81`; REQUIREMENTS.md L17 contains multi-turn continuity clause referencing `plan 01-12 commit 4e46e81`; AMENDMENT-2026-05-14.md referenced from 3 locations |

**Score: 5/5 truths verified** (CR-01 closed inline 2026-05-15; truth #2 now fully verified post-fix)

---

### Deferred Items

None. All Phase 1 requirements are in-scope for this phase.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/components/Splitter.svelte` | Three-pane resizable shell with localStorage | VERIFIED | localStorage key `mneme.layout.split`; drag handles; col-resize cursor |
| `src/lib/components/ChatPanel.svelte` | Single-session Claude chat, GAP-1 session resume | PARTIALLY VERIFIED | Session resume wiring correct (L175 dual cmd name, L177 resumeSessionId); CR-01 connection-state bug on close path |
| `src/lib/stream-dispatch.ts` | 6-arm dispatcher + sessionId capture | VERIFIED | sessionId captured at L157; freshState() initializes to null; all 6 arms present |
| `src/lib/spawn-args.shared.ts` | buildClaudeArgs with opts, CHAT_RENDERING_HINTS, SESSION_ID_REGEX | VERIFIED | All exports present and substantive; no Node imports |
| `src/lib/components/AssistantMessage.svelte` | h1/h2/h3 hierarchy 21/17.5/15.5px; hr 1px border-soft | VERIFIED | CSS verified at L126, L138, L147, L159 |
| `src/lib/sanitize.ts` | DOMPurify FORBID_TAGS + on* hook + KaTeX trust:false | VERIFIED | FORBID_TAGS at L30; uponSanitizeAttribute hook at L24-28; KaTeX config correct |
| `src-tauri/capabilities/default.json` | Dual Command names (fresh/resume); no wildcards | VERIFIED | `claude-bin-fresh` (15 args) + `claude-bin-resume` (17 args); no `args:true`; no `"*"` |
| `scripts/audit-capabilities.sh` | 9 checks including 4b + 9 (--system-prompt rejection) | VERIFIED | 9 checks present; `[audit] PASS` confirmed live |
| `src-tauri/src/lib.rs` | kill_pgid SIGTERM → 2s → SIGKILL | VERIFIED | nix::killpg at L52-65; detached thread for SIGKILL (BL-01 fix) |
| `src-tauri/src/session.rs` | SessionRegistry | VERIFIED | HashMap<SessionId, ChildHandle> behind Mutex |
| `vendor/claude-code-parser/` | MIT, types-only consumption | VERIFIED | `vendor/claude-code-parser/src/types/protocol.ts` present; not in package.json |
| `rust-toolchain.toml` | Rust 1.88 pinned | VERIFIED | `channel = "1.88"` confirmed |
| `.planning/phases/01.../01-SPEC.md` | Items 5+6 in amendment list | VERIFIED | Lines 12-13 reference commit `4e46e81` |
| `.planning/REQUIREMENTS.md` | REQ-02 multi-turn continuity clause | VERIFIED | Line 17 contains clause with `plan 01-12 commit 4e46e81` |
| `.planning/phases/01.../01-13-SUMMARY.md` | Docs amendment SUMMARY with git pointers | VERIFIED | Exists; references `4e46e81`; cross-reference closure documented |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ChatPanel.svelte` | `claude-bin-fresh` / `claude-bin-resume` | `Command.create(cmdName, buildClaudeArgs(..., opts))` | WIRED | L175 selects cmdName based on `dispatch.sessionId`; L183 creates command |
| `ChatPanel.svelte` | `stream-dispatch.ts` | `dispatchEvent(evt, dispatch)` | WIRED | L219; dispatch state mutated per event |
| `stream-dispatch.ts` | `session_id` → `DispatchState.sessionId` | `state.sessionId = evt.session_id` in system/init arm | WIRED | L157 |
| `ChatPanel.svelte` | `spawn-args.shared.ts` | `buildClaudeArgs(userText, scratchDir, opts)` with `resumeSessionId: dispatch.sessionId` | WIRED | L183; opts threaded at L176-179 |
| `spawn-args.shared.ts` | `capabilities/default.json` | `gen-capabilities.ts` SSOT generator | WIRED | Regen idempotent confirmed; `escapeRegex(CHAT_RENDERING_HINTS)` anchored |
| `scripts/audit-capabilities.sh` | Husky pre-commit | `.husky/pre-commit` | WIRED | Pre-commit gate runs audit before every commit |
| `lib.rs` | `session.rs` | `tauri::State<SessionRegistry>` + `register_session_pid` / `stop_session` | WIRED | IPC commands registered; `kill_all()` drain on exit |
| `ChatPanel.svelte` | `setStatus("connected")` | `firstTextDeltaSeen` guard at L207-213 | PARTIAL | Connected-status transition works for normal streams; MISSING on close-without-text_delta path (CR-01) |
| `ChatPanel.svelte (onDestroy)` | `setStatus("disconnected")` | L448 | WIRED | App-close path correct |
| `ChatPanel.svelte (cmd.on("error"))` | `setStatus("disconnected")` | L241 | WIRED | Spawn-error path correct |
| `ChatPanel.svelte (spawn-or-register catch)` | `setStatus("disconnected")` | L283 | WIRED | IPC-failure path correct |
| `ChatPanel.svelte (cmd.on("close"))` | `setStatus("disconnected")` | `if (!firstTextDeltaSeen) setStatus("disconnected")` at L250 (post-CR-01 fix) | WIRED | 5th enumerated site — fires when subprocess closes before any text_delta arrived; teardown() preserves A-16 no-touch contract on normal closes |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `ChatPanel.svelte` | `dispatch.messages` | `dispatchEvent(evt, dispatch)` ← `cmd.stdout.on("data")` ← live `claude` subprocess stdout | Yes — real NDJSON from subprocess | FLOWING |
| `ChatPanel.svelte` | `dispatch.sessionId` | `stream-dispatch.ts` system/init arm ← first subprocess stdout event | Yes — server-side UUID from Claude | FLOWING |
| `ChatPanel.svelte` | `assistantHtmlCache` | `sanitizeMarkdown(m.text)` ← `dispatch.messages` | Yes — real markdown transformed | FLOWING |
| `Splitter.svelte` | split ratios | `localStorage.getItem("mneme.layout.split")` on mount | Yes — persisted from prior session | FLOWING |
| `AssistantMessage.svelte` | `html` prop | `assistantHtmlCache.get(msg.id)` from ChatPanel | Yes — see above | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| vitest 177/177 | `npx vitest run` | `177 passed (177)` | PASS |
| svelte-check 0 errors | `npm run check` | `0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS` | PASS |
| cargo test (all) | `cd src-tauri && cargo test` | `7 passed` (dev.rs unit) + `3 passed` (dev_log_rotation) + `3 passed` (kill_pgid) | PASS |
| audit-capabilities.sh | `bash scripts/audit-capabilities.sh` | `[audit] PASS` | PASS |
| audit fixture 7/7 | `bash tests/audit/test-audit-script.sh` | `7/7 PASS` | PASS |
| capability regen idempotent | `node --experimental-strip-types scripts/gen-capabilities.ts --dry-run | diff - capabilities/default.json` | exit 0 | PASS |
| no `args:true` wildcard | `grep -c '"args": true' capabilities/default.json` | 0 | PASS |
| no `"*"` wildcard | `grep -c '"\\*"' capabilities/default.json` | 0 | PASS |
| no `--bare` in validators | audit check 4 | PASS | PASS |
| no `--system-prompt` full-replacement | audit checks 4b + 9 | PASS | PASS |
| SPEC.md items 5+6 landed | `grep -nE '^[0-9]+\. \*\*REQ-[25]' 01-SPEC.md` | 2 matches (items 5 + 6) | PASS |
| REQUIREMENTS.md REQ-02 amended | `grep -c 'plan 01-12' REQUIREMENTS.md` | 1 | PASS |
| Rust 1.88 toolchain pinned | `cat rust-toolchain.toml` | `channel = "1.88"` | PASS |
| KaTeX ≥ 0.16.21 | `grep '"katex"' package.json` | `^0.16.45` | PASS |
| claude-code-parser absent from package.json | `grep 'claude-code-parser' package.json` | exit 1 (not found) | PASS |
| h1/h2/h3 font-size distinct | CSS in AssistantMessage.svelte | 21px / 17.5px / 15.5px | PASS |
| hr 1px soft-border | CSS in AssistantMessage.svelte | `border-top: 1px solid var(--border-soft)` | PASS |
| sessionId captured from system/init | `grep -n 'state.sessionId = evt.session_id' stream-dispatch.ts` | L157 | PASS |
| dual cmd names selected at runtime | `grep -n 'claude-bin-resume\|claude-bin-fresh' ChatPanel.svelte` | L175 selects by `dispatch.sessionId` | PASS |
| CR-01: close-without-text_delta status | Manual code inspection | `cmd.on("close")` → `teardown()` → no `setStatus` call | FAIL |

---

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|----------|
| REQ-01 (three-pane resizable UI) | 01-05, 01-06 | Left/middle/right panes; drag handles; localStorage persist | SATISFIED | Splitter.svelte + +page.svelte wiring verified |
| REQ-02 (Tauri spawns claude subprocess) | 01-02 through 01-06, 01-12 | Subprocess spawn, stream dispatch, multi-turn via --resume, connection-state lifecycle | PARTIALLY SATISFIED | Session resume WIRED; connection-state CR-01 gap on close-without-text_delta path |
| REQ-10 (agentic search default) | 01-02, 01-06 | `--add-dir <scratchDir>` only; SCRATCH_DIR_REGEX anchored | SATISFIED | `--add-dir scratchDir` in buildClaudeArgs L136; auto-create in lib.rs L136-139 |

**Phase 1 requirement cluster:** REQ-01 SATISFIED, REQ-02 PARTIALLY SATISFIED (CR-01), REQ-10 SATISFIED.

No orphaned requirements — only REQ-01, REQ-02, REQ-10 map to Phase 1 per REQUIREMENTS.md traceability table.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| ~~`ChatPanel.svelte`~~ | ~~250-272~~ | ~~`cmd.on("close")` no `setStatus`~~ | RESOLVED 2026-05-15 | 5th enumerated `setStatus("disconnected")` site added gated on `!firstTextDeltaSeen`. teardown() comment block updated to FIVE sites. Baseline preserved (vitest 177/177, svelte-check 0/0). |
| `ChatPanel.svelte` | 395-440 | `?stream=demo` dev probe injects synthetic events using `as any` casts | INFO | DEV-only; production-stripped by `import.meta.env.DEV` guard |

---

### Human Verification Required

#### 1. Session continuity dogfood

**Test:** Launch `npm run tauri dev`. Send prompt "我叫 Ricky". Wait for reply. Send prompt "我叫什么?". Observe reply.

**Expected:** Reply to the second prompt contains "Ricky"; devtools console shows `[claude:init]` with the **same** session id as the first prompt's init event; titlebar dot stays green (connected) between prompts.

**Why human:** Requires live Claude CLI subprocess interaction. Cannot be verified with vitest or grep.

#### 2. No ASCII fallback after KaTeX math

**Test:** Send "什么是泰勒展开式?" and "推导一下勾股定理" to the live chat.

**Expected:** Replies contain rendered KaTeX equations ONLY — no redundant ASCII fallback lines (e.g., no `x^2 + y^2` plain text after a `$$x^2 + y^2$$` block).

**Why human:** Whether Claude honors `CHAT_RENDERING_HINTS` via `--append-system-prompt` requires observing live response content. The SSOT wiring is verified; the behavioral outcome needs a live test.

#### 3. Heading hierarchy visual distinguishability

**Test:** Send "分三层标题介绍什么是动态规划 (用 # / ## / ### markdown)" and a follow-up that uses `---` section separator.

**Expected:** h1 is visually larger than h2 which is visually larger than h3 (≥2px scale step confirmed); `---` renders as a visible horizontal rule (1px soft-border line).

**Why human:** CSS values are verified (21/17.5/15.5px, `border-top: 1px solid var(--border-soft)`). Screen-level visual distinguishability and rendering fidelity require human inspection of the running app.

---

### Gaps Summary

**1 gap blocking full goal achievement:**

**CR-01 — Connection-state stuck at "connecting" after natural subprocess close without text_delta**

The `cmd.on("close")` handler at `ChatPanel.svelte:250` calls `teardown()` which deliberately does NOT touch connection-state (correct per A-16 contract for normal closes). However, the `setStatus("connected")` gate is `firstTextDeltaSeen` (L207-213). If the subprocess closes naturally without ever emitting a `text_delta` — realistic scenarios: auth handshake error emitted to stderr only, rate-limit immediate close, sporadic early-EOF — the status remains at "connecting" indefinitely. The user's titlebar dot shows grey/connecting even though the chat is functionally idle. This was identified in `01-REVIEW.md` as CR-01 BLOCKER.

**Fix required:** Add a 5th `setStatus` transition site in `cmd.on("close")` when `!firstTextDeltaSeen`, resetting to a defined state (either "disconnected" or, if a system/init event was received, "connected"). Exact policy for the partially-initialized session case is a minor design decision for the planner.

**Scope:** Single-function edit to `ChatPanel.svelte`. No capability JSON, no Rust, no test baseline changes expected. The 3 manual dogfood items (above) remain as human verification even after CR-01 is fixed — they are independent of this code path.

**Assessment of overall goal:** The phase goal ("CRITICAL pitfalls closed before dogfooding") is **substantially achieved** — zombies (T-1-01), capability wildcards (T-1-03/04/05), streaming XSS (T-1-02), and cost runaway (T-1-04 / --max-turns) are all CLOSED with verified test coverage. The CR-01 gap is a connection-state UX regression (status dot stuck), not a security or data-integrity issue. It does not reopen any of the 49 threats. However, it is a visible behavioral defect in the exact GAP-1 closure that plans 01-12 + 01-13 were designed to fix, and it should be resolved before the phase is marked PASSED.

---

_Verified: 2026-05-14T07:42:26Z_
_Verifier: Claude (gsd-verifier) — Sonnet 4.6_
