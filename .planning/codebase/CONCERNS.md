# Codebase Concerns

**Analysis Date:** 2026-05-14

## Tech Debt

**Phase 01.2 — Synchronous IPC bridge (UDS):**
- Issue: `dev_query_state` Tauri command relies on `WebviewWindow::script_injection` plus log-pipe fallback. The injected JS depends on `window.__TAURI_INTERNALS__` — Tauri's **private internal bridge**, not the documented stable API. If a future Tauri patch renames or restructures this object, the snippet silently fails (`Ok(())` returns from the script-injection call but the JS throws a TypeError caught by the inner try/catch).
- Files: `src-tauri/src/dev.rs:451-485` (script literal), `src-tauri/src/bin/dev_invoke.rs:57-77` (CLI clear-error stub)
- Impact: Brittle dependency on undocumented Tauri internals; CLI bridge path returns explicit error instead of a working round-trip. Workflow callers expecting a synchronous snapshot via CLI must invoke from inside the running Tauri app instead.
- Fix approach: Phase 01.2 UDS IPC upgrade per `01.1-RESEARCH.md` spike B2 — Unix domain socket round-trip from CLI to running app. Eliminates `__TAURI_INTERNALS__` dependency entirely. Tracked in `.planning/notes/upstream-pr-gsd-build-followup.md` and `STATE.md` Phase 01.1 followup table.

**HG-02 stub protocol never connected (short-term mitigated, not fully fixed):**
- Issue: Original v1 design (per plan 01.1-07 `.dev-logs/README.md` and `gsd-dev-snapshot.mjs` comments) said "running Tauri app polls `.dev-logs/snapshot.request`" — but no poll loop exists anywhere in `src-tauri/src/`. A full-text search confirms zero references to `snapshot.request` outside the CLI write site.
- Files: `src-tauri/src/bin/dev_invoke.rs:57-77`, `src-tauri/src/dev.rs` (poll loop ABSENT)
- Impact: The two halves of the original protocol never connected. Short-term fix returns clear error (commit `a359ac7`) instead of silently writing an orphan file that nothing reads. Full fix deferred.
- Fix approach: Either (a) Phase 01.2 UDS IPC upgrade, or (b) implement a file-poll loop in `lib.rs` startup using a background tokio task watching `.dev-logs/snapshot.request`. Option (a) is preferred.

**IN-01 deferred — `tokio` Cargo `cfg(debug_assertions)` gate:**
- Issue: `tokio` with 8 features is declared under `[dependencies]` in `src-tauri/Cargo.toml:23` (compiled into release builds). All tokio usage is in `dev.rs` which is `#[cfg(debug_assertions)]`-gated. Tokio is reached for compilation in release but its code path is never reached at runtime.
- Files: `src-tauri/Cargo.toml:15-23`, `src-tauri/src/dev.rs` (sole tokio consumer, fully cfg-gated)
- Impact: Release-build dependency whose code is never executed. May add to compile time and binary size unnecessarily. LOW priority because Tauri likely pulls tokio transitively anyway.
- Fix approach: Move tokio to a conditional dependency via `dev-loop` Cargo feature or `[target.'cfg(debug_assertions)'.dependencies]` block. Deferred per REVIEW.md frontmatter due to risk of `debug_assertions`/feature interaction breaking release builds. Surface trigger: next phase that touches `src-tauri/Cargo.toml`.

**F1 SDK regex demoted to nice-to-have (template-side mitigated):**
- Issue: `verify.validate-html` SDK handler's regex `/<section\b[^>]*\bdata-bucket=["']([^"']+)["']/gi` matches against raw file content including content inside `<!-- ... -->` HTML comments. Cycle-1 KD-13 template had `<section data-bucket="...">` in a top-of-file doc comment that the validator mis-parsed as a live DOM section.
- Files: `~/.npm-global/lib/node_modules/@gsd-build/sdk/src/query/verify-dev-loop.ts` (out-of-repo), `~/.claude/get-shit-done/bin/lib/verify-dev-loop.cjs` (out-of-repo)
- Impact: Bug remains for any future template that uses example-DOM-in-comment docs. Current Living visual contract template (cycle-2 rewrite) lists forbidden bucket values as prose, so the bug doesn't trigger today.
- Fix approach: Two-line surgical fix — strip HTML comments before regex match in BOTH TS source and CJS shim per E3 mirror. Documented in `.planning/notes/upstream-pr-gsd-build-followup.md` Group E (post-ship upstream PR scope, demoted from blocking to nice-to-have).

**vendored `claude-code-parser` is effectively unmaintained:**
- Issue: Per CLAUDE.md authoritative override section: "Last commit predates current Claude Code event schema; project effectively unmaintained." Vendored to `vendor/claude-code-parser/` per KD-12 decision.
- Files: `vendor/claude-code-parser/` (61fa32c upstream commit snapshot from 2026-05-09), `src/lib/stream-dispatch.ts:21` (sole import of `ClaudeEvent` type)
- Impact: mneme writes its OWN 6-arm dispatch in `stream-dispatch.ts` (types-only consumption per RESEARCH §4.8 Path 2); the upstream `Translator` class / `createMessage` helpers / `RelayEvent` union are NOT consumed. The risk is the wire-format protocol evolves and the vendored `protocol.ts` type definitions drift from Claude Code's actual stream-json output.
- Fix approach: Manual review only when Claude Code's stream-json event taxonomy materially changes. Defense: `stream-dispatch.ts:235` has a `default:` arm that logs `[claude:unknown-event]` for any unrecognized event type — visible signal if new event types appear. Eventual migration path: switch to official `claude-agent-sdk-typescript` if it adds a CLI subprocess wrapper.

**Spawn-args catch-all validator regex:**
- Issue: The Tauri capability `default.json` permission list ends with a catch-all `{"validator": ".+"}` row at `src-tauri/capabilities/default.json:48` and `:74` (both `shell:allow-spawn` and `shell:allow-execute`). This is required because the final positional arg is the user's prompt text (arbitrary content), but it widens the spawn surface to anything that matches `.+`.
- Files: `src-tauri/capabilities/default.json`, `scripts/gen-capabilities.ts`, `scripts/audit-capabilities.sh`
- Impact: A bug elsewhere that reorders arg positions could allow injected content through this final wildcard. The 14 prior validators are tight (exact-match anchors `^...$`) but the last one is `.+` by necessity.
- Mitigation in place: `audit-capabilities.sh` enforces no `"args": true` and no literal `"*"`, locks `--max-turns 30` and `--add-dir <SCRATCH_DIR_REGEX>`, blocks `--bare`. `spawn-args.shared.ts:36` runtime-validates that `scratchDir` matches `SCRATCH_DIR_REGEX` before building args. The catch-all is positional-last, so the validator chain stops only-once at the prompt slot.
- Fix approach: No clean fix while user-prompt is arg-positional. Phase 3 multi-session work should re-evaluate whether moving prompts to stdin via `tauri-plugin-shell` Stdin API would let the final validator be eliminated. Track for Phase 3 plan-phase.

## Known Bugs

**Phase 1 paused — window-drag blocker historical context:**
- Symptoms: Window "钉死在屏幕上" — drag failed from all edges during Phase 1 dogfood walkthrough (2026-05-09).
- Files: `src/routes/+page.svelte:34-35` (`data-tauri-drag-region`), `src-tauri/capabilities/default.json` (`core:window:allow-start-dragging` permission)
- Trigger: Cmd+drag on titlebar / matte bezel in Tauri 2 macOS shell.
- Resolution: H4 capability fix — `core:window:allow-start-dragging` was missing from permissions. Fixed in commit `fcd939a`. Now in the permission list (line 7).
- Lessons captured: `01-VALIDATION.md` for Phase 1; `STATE.md` "Last action" preserves the 4-hypothesis debug trail (H1 Tauri JS bridge / H2 HMR de-armed / H3 decorations:true+Overlay flaky / H4 capability missing).

**Husky v10 compat — deprecated hook shim:**
- Symptoms: Every commit prints husky deprecation warning (first observed commit `c96ada6`).
- Files: `.husky/pre-commit` (top 2 lines — shebang + `_/husky.sh` source)
- Cause: Husky v9 compatibility shim that v10 will fail-loud on.
- Workaround: Functional today; just produces noise per commit.
- Fix approach: Delete the two legacy lines; `grep -r '_/husky.sh' .husky/` to confirm no other files affected; commit empty to verify the hook still triggers without warning. Tracked in pending todos (`.planning/todos/pending/2026-05-11-husky-v10-compat-remove-deprecated-hook-shim.md`).

**STATE.md / HANDOFF.json drift (upstream GSD workflow gap):**
- Symptoms: STATE.md `frontmatter.last_updated` drifted ~57 hours behind reality; `Current Position` block contradicted `progress` block in same file; Phase 0 status frozen as `[pending]` despite SUMMARYs being on disk.
- Files: `.planning/STATE.md`, `.planning/HANDOFF.json`
- Cause: `/gsd-pause-work` spec at `~/.claude/get-shit-done/workflows/pause-work.md` writes only HANDOFF.json + `.continue-here.md` — STATE.md is never synced. No downstream command bumps `frontmatter.last_updated` on STATE.md edits.
- Workaround: Manual STATE.md patches; treat HANDOFF.json as the source of truth for pause/resume state. Forensic trail: `.planning/forensics/report-20260512-102126.md`.
- Fix approach: Upstream GSD bug to file — `pause-work` workflow should add a `state_sync` step before commit; any STATE.md mutation path should bump `frontmatter.last_updated`. Tracked in forensic report Recommended Actions §2.

## Security Considerations

**Tauri webview CSP set to null:**
- Risk: `src-tauri/tauri.conf.json:26` has `"csp": null` and `src/app.html` has no `<meta http-equiv="Content-Security-Policy">` tag. The Phase 1 acceptance tests in `01-VALIDATION.md:71` listed "CSP meta tag in `app.html`" as a manual check that was never completed before Phase 1 was paused.
- Files: `src-tauri/tauri.conf.json:24-27`, `src/app.html` (no CSP block), `.planning/STATE.md` Phase Map line mentions "deferred 01-11 (CSP `connect-src ipc:` gap closure)"
- Current mitigation: REQ-5 sanitization pipeline closes streaming-markdown XSS (T-1-02): DOMPurify hook strips `on*` event handlers, KaTeX hardened (`trust:false strict:true macros:{} maxExpand:1000`), `escapeHtml` on all subprocess-error system bubbles. The full sanitize pipeline is at `src/lib/sanitize.ts`. Capability validators prevent argv-injection in subprocess spawn.
- Recommendations: Phase 01-11 gap-closure (per STATE.md plan) should add a strict CSP. Recommended: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ipc: http://ipc.localhost https://api.anthropic.com; font-src 'self' data:; object-src 'none'; frame-src 'self' echo360-domain-tbd`. Without CSP, a future bug elsewhere in the sanitize chain has no defense-in-depth fallback. Route via `/gsd-execute-phase 1 --gaps-only`.

**`__TAURI_INTERNALS__` access from injected scripts (dev-only):**
- Risk: `src-tauri/src/dev.rs:471` injects JS that calls `window.__TAURI_INTERNALS__.invoke(...)`. While the entire `dev.rs` is `#[cfg(debug_assertions)]`-gated (D-TR-05 nm verification confirms zero symbols in release binary), the pattern of allowing arbitrary script-injection bypasses the regular Tauri command authorization model.
- Files: `src-tauri/src/dev.rs:451-485` (script_injection call)
- Current mitigation: File-level `#[cfg(debug_assertions)]` + `invoke_handler` cfg-split in `lib.rs:91-116` ensure release builds neither expose the command nor compile the script string. Triple-gated per `01.1-VERIFICATION.md` deviation 1.
- Recommendations: Acceptable for dev-only tooling. Document the boundary in `01.1-PATTERNS.md` so future contributors don't propagate the script-injection pattern into release code paths.

**Echo360 webview cookie persistence (KD-04 — gated by Phase 5 spike):**
- Risk: Per KD-04, Echo360 lecture video integration uses Tauri webview + persistent USYD SSO cookie. The macOS WKWebView ITP (Intelligent Tracking Prevention) may block third-party cookies — issue `tauri-apps/wry#848`.
- Files: Not yet implemented. Phase 5 spike `echo360-webview-auth` must pass before Phase 6 KD-04 lock is final.
- Current mitigation: None — the WebKit cookie handling for an embedded Echo360 webview hasn't been validated. PROJECT.md KD-11 makes Phase 5 spike a BLOCKING gate.
- Recommendations: Phase 5 `/gsd-spike echo360-webview-auth` must validate (a) USYD SSO cookie survives across app restarts, (b) third-party cookies for the Echo360 video CDN aren't ITP-blocked, (c) iframe isolation prevents Echo360's JS from probing the parent webview's globals. If the spike fails, REQ-04/REQ-05 design changes required (external browser + deep links OR persistent per-domain webview instance).

**Subprocess privilege — `bypassPermissions`:**
- Risk: `src/lib/spawn-args.shared.ts:44` passes `--permission-mode bypassPermissions` to the claude subprocess. This grants the spawned claude CLI full file/tool access within the user's account scope.
- Files: `src/lib/spawn-args.shared.ts:42-52`, `src-tauri/capabilities/default.json` (regex validators enforce the literal `bypassPermissions` string)
- Current mitigation: `--add-dir` restricted to `^/Users/[^/]+/\\.mneme/scratch$` via `SCRATCH_DIR_REGEX` (regex anchored both ends). `--max-turns 30` caps runaway agent loops at the structural ceiling (Round 5 A-04 — the only ceiling under OAuth subscription mode; no $-cap exists). Capability validators reject malformed flags before spawn.
- Recommendations: Acceptable per KP-04 ("compliant subprocess wrapping; no token extraction") + REQ-2 design. Personal-use desktop app with no public distribution — single user has full account access anyway. Re-evaluate if mneme ever ships as a multi-user product (it won't per project scope).

**`--bare` flag is explicitly forbidden:**
- Risk: If `--bare` ever appears in spawn args, OAuth keychain reads are stripped, leading to silent auth failure (spike F4/F6 + AI-SPEC §1 critical failure mode #2).
- Files: `scripts/audit-capabilities.sh:49-52` (check #4 — regex `"validator":\s*"[^"]*bare[^"]*"` blocks any validator with `bare` substring)
- Current mitigation: Audit script enforces; runs prebuild + Husky pre-commit.
- Recommendations: None — current defense is correct.

## Performance Bottlenecks

**Intel Mac Ollama embedding inference (deferred — no live consumer yet):**
- Problem: Per STACK.md §10 caveat: "Ollama on Apple Silicon uses GPU automatically (fast). Ollama on Intel Mac runs on CPU (significantly slower)." User device is MacBook Pro 2019 Intel.
- Files: Vector path is deferred per STACK.md "Stack Patterns by Variant" — `rusqlite + sqlite-vec + nomic-embed-text + Ollama HTTP`. Not yet implemented in source.
- Cause: Intel Mac CPU inference for `nomic-embed-text` (137M params, 8192-token context) takes seconds per embed vs sub-second on Apple Silicon GPU.
- Improvement path: STACK.md "Stack Patterns by Variant" recommends: "Defer until Apple Silicon migration (post-2027 hardware refresh)." If embed-on-demand is needed sooner, fall back to Anthropic embeddings API (KP-01 violation — needs explicit user opt-in) or precompute embeddings offline in batches.

**Streaming markdown re-render every text_delta:**
- Problem: `src/lib/components/ChatPanel.svelte:97-123` recomputes `sanitizeMarkdown(buffer)` for the streaming assistant message on every `text_delta` event, then runs `renderKatexInDom` over the result. With dense streams, marked + DOMPurify + KaTeX could saturate the main thread.
- Files: `src/lib/components/ChatPanel.svelte:102-123` (rAF coalescing)
- Cause: REQ-2 wants real-time streaming legibility; can't defer all sanitize/render work to result event without UX cost.
- Mitigation in place: rAF batching via `pendingRecompute` flag coalesces multiple chunks within one frame to one recompute. The cache only re-walks streaming-flagged assistant messages.
- Improvement path: If profile-driven evidence shows main-thread saturation in long answers, move sanitize to a Web Worker. Defer until measurement justifies. Not blocking.

**`.dev-logs/` rotation hardcoded at 10MB, single backup:**
- Problem: `src-tauri/src/dev.rs:136` `ROTATION_THRESHOLD_BYTES = 10 * 1024 * 1024`. When `console.log` / `network.log` / `perf.log` cross 10MB, the writer renames to `<name>.log.1`, overwriting any existing `.log.1`. Two rotations = first rotation's data is gone.
- Files: `src-tauri/src/dev.rs:136-218` (rotation + flush logic)
- Cause: D-SF-03 design choice — single backup is intentional for ephemeral debug telemetry.
- Improvement path: Acceptable per D-SF-03 ("dev loop MUST NOT crash on log-write failure; .dev-logs is ephemeral debug telemetry, not project record"). If verify-cycle scanning ever needs deeper history, bump to `N` rotated files or hourly buckets. Not blocking.

## Fragile Areas

**Tauri 2 macOS Inspector Protocol incompatibility (Phase 1 anti-pattern):**
- Files: `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/.continue-here.md` (anti-pattern table line 1)
- Why fragile: macOS WKWebView exposes WebKit Inspector Protocol, NOT Chrome DevTools Protocol. Attempting to attach Playwright MCP or chrome-devtools to Tauri 2 webview via remote-debug-port walks into a dead end — no flag or port config bridges them.
- Safe modification: Use `@testing-library/svelte` for components + Playwright on the Vite dev server (port 5173) for E2E layer. Accept that real Tauri webview cases (window drag, Cmd+Q, native chrome) stay manual until `tauri-driver` macOS matures.
- Test coverage: Vitest 138/138 + cargo 13/13 cover all unit + integration layers; manual dogfood + lifecycle harness cover Tauri-specific runtime cases. No flaky tests today.

**`session.rs` `Mutex::lock().unwrap()`:**
- Files: `src-tauri/src/session.rs:34, 38, 42` (3 sites in `register` / `drain_one` / `drain_all`)
- Why fragile: `.lock().unwrap()` panics on poisoned mutex (one thread holding the lock panicked mid-critical-section). Phase 1 single-session usage makes poisoning unlikely, but Phase 3 multi-session inserts will increase contention.
- Safe modification: Phase 3 multi-session plan-phase should replace `.unwrap()` with `.lock().expect("session registry mutex poisoned")` (clearer panic message) OR `tokio::sync::Mutex` (async-safe). Don't pre-refactor in Phase 1 — the comment at `session.rs:18-19` is explicit: "DO NOT add fields in Phase 1 — Phase 3 plan-phase decides the schema."
- Test coverage: `src-tauri/tests/kill_pgid.rs` (3 tests) covers happy-path register/drain/kill cycles. No poisoned-mutex test (rare in single-threaded callers; mutex poisoning typically indicates a real upstream bug not a recoverable state).

**`ChatPanel.svelte` is large + multi-concern (703 LOC):**
- Files: `src/lib/components/ChatPanel.svelte:1-703` (largest source file in repo)
- Why fragile: Holds streaming dispatch glue, KaTeX walker, scroll behavior, scratchDir resolution, demo `?stream=demo` hook, Cmd+Q stop, hotkey unbinding (`UNBOUND_CODES`), tool-use group rendering — many concerns in one file.
- Safe modification: Each region is delimited by `// ---------- region ----------` comments. Touch one region at a time; don't rip-and-replace.
- Refactor opportunity: Phase 3 multi-session work will need to extract session-lifecycle logic to a separate composable (`useChatSession.svelte.ts` or similar). For now, the SSOT comment block (lines 1-36) is the navigation index.
- Test coverage: `src/lib/stream-dispatch.ts` (separate file) has dedicated tests in `tests/stream-dispatch.test.ts` covering the pure logic. ChatPanel itself is component-level; covered by manual dogfood + future E2E.

**`+page.svelte` and Splitter — Tauri drag-region semantics:**
- Files: `src/routes/+page.svelte:34-80`, `src/lib/components/Splitter.svelte`
- Why fragile: Tauri 2 `data-tauri-drag-region` opt-in/opt-out chain is inverted from Electron's `-webkit-app-region: drag`. Parent `.stage` opts in (true), inner `.window` opts out (false), `.titlebar` opts in (true), titlebar children opt out via explicit `data-tauri-drag-region="false"` on interactive elements. Forgetting any rung breaks dragging from that surface.
- Safe modification: Document the opt-in/opt-out chain in `01-PATTERNS.md` (already does — Phase 1 H4 fix added the rationale). Every new interactive titlebar child needs `data-tauri-drag-region="false"`.
- Test coverage: Manual dogfood-checklist row covers window drag. No automated test (Tauri webview cases stay manual until tauri-driver matures).

## Scaling Limits

**Single-session by design (Phase 1 only):**
- Files: `src-tauri/src/lib.rs:58` (`SessionId = 1` hardcoded), `src-tauri/src/session.rs:18-19` (Phase 3 ChildHandle schema comment)
- Current capacity: 1 concurrent claude subprocess.
- Limit: Phase 1 acceptance is "single-session: launch always blank" (REQ-6).
- Scaling path: Phase 3 multi-session work — SessionRegistry HashMap already extension-friendly per RESEARCH §8 Risk 1. Add `resume_token: Option<String>`, `spawned_at: Instant` fields to `ChildHandle`. Frontend SessionId generation. Tab/list UI surface. Phase 3 plan-phase owns the schema decision.

**`SessionRegistry` mutex contention:**
- Files: `src-tauri/src/session.rs:13` (`std::sync::Mutex` wrapping `HashMap`)
- Current capacity: 0-1 entry; no contention.
- Limit: At Phase 3, 5-10 concurrent sessions with frequent register/drain on each spawn-kill cycle. `std::sync::Mutex` blocks the entire HashMap on any operation.
- Scaling path: Phase 3 plan-phase should evaluate `tokio::sync::Mutex` (cooperative; async-safe) or `dashmap` (shard-locked) depending on observed contention patterns. Don't pre-optimize.

**Knowledge graph 1k-node ceiling for Cytoscape live updates (Phase 8+):**
- Files: Not yet implemented. STACK.md §3 notes: "our knowledge graph will be ~1K nodes for a single semester."
- Current capacity: n/a — KD-08 locks Cytoscape.js for mind-map viz with `dagre` + `cose-bilkent` layouts.
- Limit: Cytoscape's native animation API on `.add()` + sub-region re-layout starts to lag past ~5k nodes. Single semester per course is well under that.
- Scaling path: Multi-semester / cross-course graph view (post-v1.x) needs viewport culling or LOD (level-of-detail). Sigma.js is the 100k+ fallback per STACK.md. Defer until real usage shows the limit.

## Dependencies at Risk

**`claude-code-parser` (vendored, MIT, frozen reference):**
- Risk: Upstream is effectively unmaintained — last commit `61fa32c` predates current Claude Code event schema. See `vendor/claude-code-parser/VENDOR.md`.
- Impact: Type definitions in `src/types/protocol.ts` could drift from Claude Code's actual stream-json output if Anthropic adds new top-level `type` fields.
- Migration plan: Manual review trigger — when `stream-dispatch.ts:235` `default:` arm starts logging `[claude:unknown-event]` for new event types. Long-term: switch to the official `claude-agent-sdk-typescript` if it adds a CLI subprocess wrapper (currently it's API-key-based, not a CLI wrapper).

**Tauri 2 — `__TAURI_INTERNALS__` private bridge (dev-only):**
- Risk: Tauri's private internal bridge object is not part of the stable API. A patch release could rename or restructure it without notice.
- Impact: `src-tauri/src/dev.rs:471` injected JS would throw TypeError; `gsd-dev-snapshot.mjs` would time out without specific cause indication. WR-04 fix added a hint message to the error path so failures are observable.
- Migration plan: Phase 01.2 UDS IPC upgrade eliminates the dependency entirely. Track Tauri version in `package.json` + `Cargo.toml`; review release notes for `__TAURI_INTERNALS__` changes on minor-version bumps.

**`agentmemory` (Phase 5.5+ candidate, not yet locked):**
- Risk: PROJECT.md KD-10 status: "library choice DEFERRED until Phase 5.5." Candidates being evaluated: Cognee / Zep+Graphiti / Mem0 / agentmemory. Per CLAUDE.md authoritative override: "Memory / Knowledge Graph library — NOT LOCKED. STACK.md says agentmemory PRIMARY HIGH — that is a stale recommendation; treat as one candidate among four."
- Impact: Phase 7 (Knowledge Graph + Three-Tier Memory) blocked until Phase 5.5 RQ-01 BLOCKING gate produces decision report.
- Migration plan: Phase 5.5 RQ-01 — 4-project comparison + 1-week dogfood + decision report. See PROJECT.md KD-10 status and `.planning/research/questions.md` RQ-01.

**Excalidraw v0.18.1 + React-in-Svelte interop:**
- Risk: Excalidraw is React-only (peer dependency); mneme is Svelte 5. Locked per KD-08 over tldraw (KD-08 rejected tldraw v4.x for proprietary license / watermark / KP-02 violation).
- Impact: Phase 8+ whiteboard work needs to wrap `<Excalidraw>` React component inside a Svelte host via `svelte-react` glue or `createRoot()` in `onMount`.
- Migration plan: Validate the React-in-Svelte interop pattern when Phase 8 whiteboard work begins. STACK.md §4 notes: "Svelte 5 host integration uses `svelte-react` or `createRoot` in `onMount`. Validate when whiteboard phase begins (Phase 8+)."

## Missing Critical Features

**OpenSpec lifecycle dry-run not yet exercised:**
- Problem: OpenSpec workflow installed alongside GSD (per `STATE.md` "OpenSpec stage-2 + stage-3 complete (2026-05-14)"). The `/opsx:propose → /gsd-plan-phase → /gsd-execute-phase → tasks.md sync → /opsx:archive` lifecycle has not yet been fully exercised on a real change. Phase 01.1 was the first change with the partial flow.
- Blocks: Confidence that `/opsx:archive` correctly requires tasks all-checked + spec-delta merge behavior. Tracked as todo (`.planning/todos/pending/2026-05-11-post-phase-01-agentshield-runtime-decision.md` Surface trigger).
- Surface trigger: Phase 01.1 ship + first full lifecycle run.

**AgentShield runtime monitor not enabled:**
- Problem: `ecc-agentshield@1.5.0` CLI installed during 2026-05-11 workflow upgrade, but PreToolUse hook was deliberately NOT installed pending phase-01 dogfood evidence of secret-leak / wildcard-permission / malicious-skill incidents.
- Blocks: Defense-in-depth against agent misbehavior (Claude introducing hardcoded secrets, wildcard capability grants, etc.).
- Current mitigation: GSD's own PreToolUse hooks (`gsd-prompt-guard.js` / `gsd-read-guard.js` / `gsd-workflow-guard.js` / `gsd-validate-commit.sh`) cover most overlap.
- Decision path: Three options tracked in `.planning/todos/pending/2026-05-11-post-phase-01-agentshield-runtime-decision.md` — (1) full runtime, (2) CLI-only + periodic `agentshield scan`, (3) hybrid via `ECC_HOOK_PROFILE=minimal`. Default recommendation: option 2 unless phase-01 incidents.
- Baseline scan already at `~/.claude/ecc/agentshield-baseline.json`.

**Echo360 video integration (KD-04 — Phase 5/6 work):**
- Problem: `src/lib/components/LectureVideo.svelte` is placeholder only ("EchoVideo wired in Phase 4" per the placeholder text — actually Phase 5/6 per current ROADMAP). No real video element, no WKWebView embed, no SSO flow.
- Blocks: REQ-04, REQ-05 (lecture video with bilingual captions).
- Surface trigger: Phase 5 `/gsd-spike echo360-webview-auth` PASS + Phase 6 plan-phase entry.

**CSP gap closure (Phase 01-11 deferred):**
- Problem: `src-tauri/tauri.conf.json` sets `csp: null`; `src/app.html` has no `<meta http-equiv="Content-Security-Policy">`. Phase 1 acceptance check listed but not completed before pause.
- Blocks: Defense-in-depth against XSS, frame-injection, mixed-content. REQ-5 sanitization is the only layer today.
- Fix path: `/gsd-execute-phase 1 --gaps-only` (per STATE.md Phase Map line "deferred 01-11 (CSP `connect-src ipc:` gap closure)"). Route via planner agent first to avoid skip-planner-on-debug-fix anti-pattern (Phase 1 anti-pattern table row 1).

**Vault, file ingestion, multi-session, KG, mind-map, FSRS reviews:**
- Problem: All deferred to Phase 2+ per ROADMAP. Today's working surface is the three-pane Tauri shell + single-session Claude subprocess streaming chat.
- Blocks: Real learning workflow.
- Surface triggers: Per `STATE.md` Phase Map. v1 ship target = Phases 0-4 complete; dogfood before starting Phase 5+.

## Test Coverage Gaps

**MANUAL-ONLY scenarios from Phase 01.1 VALIDATION (9 gaps):**
- What's not tested automatically:
  - **MO-01** R1 production-strip (D-SF-05) — requires full Vite build + grep dist
  - **MO-02** R2 release binary symbol-clean (D-TR-05) — requires cargo release build + nm
  - **MO-03** R2 CLI invocation mode (dev-invoke live) — requires running Tauri app + real WebKit webview
  - **MO-04** R2 screenshot fallback path — requires macOS `screencapture -l` + real NSWindow CGWindowID
  - **MO-05** R4 execute-phase silence — Claude LLM behavioral constraint
  - **MO-06** R5 workflow behavioral routing — requires live `/gsd-verify-work` invocation
  - **MO-07** R7 visual fidelity — per memory `feedback_html_zh_primary_open_not_screenshot.md`, open-in-browser canonical
  - **MO-08** R8 second-run produces new HTML — workflow behavior, not code path
  - **MO-09** R9 Claude self-rejects forbidden question — Claude LLM behavioral constraint
- Files: `.planning/phases/01.1-dev-feedback-loop-infrastructure/01.1-VALIDATION.md:266-277` (full justification table)
- Risk: Behavior could regress without test signal. Mitigated by dogfood evidence + structural tests (`verify-work-patches.test.mjs` 19 tests covers R5 structure; `visual-review-template.test.mjs` 14 tests covers R7 structure).
- Priority: LOW. Justified manual-only per VALIDATION sign-off.

**ChatPanel.svelte and other Svelte components lack component tests:**
- What's not tested: Svelte component rendering, props, slot behavior, keyboard handling integration.
- Files: All of `src/lib/components/*.svelte` (no `.test.svelte.ts` peer files).
- Risk: Visual + interaction regressions caught only by manual dogfood. Phase 01.1 audit and Phase 1 dogfood checklist are the gates.
- Priority: MEDIUM. Phase 1 paused on dogfood (47-row visual checklist remainder); test-foundation work was being considered (`/gsd-explore test-automation` Socratic exploration triggered the pause).
- Fix approach: Tracked as Phase 1 followup ("01-13 proposed milestone-level `test-foundation` plan" per `STATE.md` "Phase 1 actual progress"). When Phase 1 resumes, decide path-a (grind manual rows to ship NOW) vs path-b/c (invest 1-2 days in test-foundation first). The Phase 01.1 dev feedback loop addresses this directly — `verify.capture-screenshot` + `verify.query-dom-state` + `verify.scan-signals` handle the mechanical dogfood that triggered the original pause.

**Echo360 webview integration completely untested:**
- What's not tested: WKWebView ITP behavior for third-party Echo360 cookies; USYD SSO cookie persistence across restarts; iframe-isolation between Echo360 and parent webview.
- Files: Not yet implemented.
- Risk: Phase 5 spike could INVALIDATE KD-04, forcing Phase 6 replan to "external browser + deep links" or "persistent per-domain webview instance" alternatives.
- Priority: HIGH — blocking Phase 6 entry per KD-11.
- Fix approach: Phase 5 `/gsd-spike echo360-webview-auth` — 2-day timebox.

**No HTTPS / network-isolation test:**
- What's not tested: Subprocess attempting to reach unintended endpoints; webview accidentally loading non-mneme content.
- Files: n/a — relies on Tauri capability surface + spawn-args validation as the only network gates today.
- Risk: A future bug elsewhere (e.g., Phase 6 Echo360 webview misconfiguration) could allow data exfiltration paths.
- Priority: MEDIUM. Mitigated for v1 by the absence of CSP'd webview content beyond the static SvelteKit build; Phase 6 introduces the first real cross-origin surface.
- Fix approach: CSP gap-closure (Phase 01-11) + Phase 6 webview isolation tests. Manual today.

---

*Concerns audit: 2026-05-14*
