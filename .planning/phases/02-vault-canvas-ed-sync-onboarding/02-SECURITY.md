---
phase: 02
slug: vault-canvas-ed-sync-onboarding
status: closed
asvs_level: L1
threats_total: 15
threats_closed: 13
threats_accepted: 2
threats_open: 0
patterns_total: 5
patterns_closed: 5
secured_at: 2026-05-17
block_on_high_gate: passed
register_authored_at_plan_time: true
audit_mode: verify
created: 2026-05-17
---

# Phase 02 — Security

> Per-phase security contract: 12 STRIDE threats + 3 gap-closure sub-threats + 5 Tauri/macOS patterns from `02-RESEARCH.md` `## Threat Model` (L1139-1180) + `<threat_model>` blocks in PLAN.md files 02-01 / 02-04 / 02-05 / 02-09 / 02-13.
>
> Mode = verify-mitigations-exist (register authored at plan time). No retroactive-STRIDE pass.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Webview → Rust IPC | User-supplied paths + bytes cross `#[tauri::command]` surface | `Vec<String>` paths, course code, category, vault root |
| Filesystem → vault_writer | User-controlled paths enter the canonicalize-parent gate | `&Path` + `&[u8]` |
| import_controller → vault_writer | Privileged `_source/` writes via `ImportToken` factory | `WriteContext::Import(ImportToken)` |
| User-supplied dst → move_vault canon | Symlinks at dst could subvert empty-dst guard if raw vs canon paths mix | `PathBuf` |
| `~/.claude/.credentials.json` → claude_auth_check IPC | Existence check only — never bytes | `bool` + `env_broken: bool` |
| SQL string → rusqlite::Connection | All user values cross as `params![]` binds (NEVER `format!` interpolation) | parameterized values |
| Webview → DataTransfer (drag-drop) | OS-layer Tauri `onDragDropEvent.payload.paths` discrimination supersedes DOM DataTransfer.types | `string[]` of absolute OS paths |

---

## Threat Register

### STRIDE Threats (12 from RESEARCH.md L1156-1169 + 3 gap-closure sub-threats from 02-13-PLAN.md)

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T1 | Tampering (HIGH) | `vault_writer::write_to_vault` (User ctx) — `..` path traversal | mitigate | Two-arm canonicalize: `path.parent().canonicalize()?.join(file_name)` + `Component::Normal == "_source"` check | **CLOSED** |
| T2 | Tampering (HIGH) | `vault_writer::write_to_vault` (User ctx) + symlink follow into `_source/` | mitigate | Arm A: `path.symlink_metadata().is_ok()` → `path.canonicalize()` resolves symlinks → guard rejects | **CLOSED** |
| T3 | Tampering (MEDIUM) | `with_temporary_writable_permission` chmod 644→write→444 TOCTOU | mitigate | RAII `RelockGuard` Drop on panic/Err/cancellation; WR-02 fix collapses to single relock site (Drop only) | **CLOSED** |
| T4 | Repudiation (LOW) | `.tmp` residue after partial `~/.mneme/*.json` write | accept | `load_from` handles `NotFound` gracefully; next save overwrites tmp. Documented accepted risk. | **CLOSED** (accept) |
| T5 | Tampering (LOW) | DataTransfer JS URL (untrusted drag) | mitigate | D-09 superseded by `payload.paths.length > 0` Tauri-event discrimination; text drags do NOT trigger `onDragDropEvent` at all | **CLOSED** |
| T6 | Tampering (MEDIUM) | IPC arg injection — filename with shell metachars (`; rm -rf /`) | mitigate | All FS ops use `Path` + `OsString` (no shell `Command::new()`); `audit-capabilities.sh` Gates 1-13 enforce capability validators + wildcard guards. Course-code prefilter via `vault_writer::validate_course_code` minimal validator (Phase 02.1 02.1-04 — see the Phase 02.1 audit section below); replaces the previous `^[A-Z]{4}\d{4}$` regex which rejected real USYD codes. | **CLOSED** |
| T7 | Tampering (MEDIUM) | SQL injection via course code in vault_index queries | mitigate | `rusqlite::params![]` macro on EVERY query (4 sites — insert/get/delete/count_all/list_courses/list_all_paths) + audit Gate 10 grep | **CLOSED** |
| T8 | Information Disclosure (LOW) | `~/.claude/.credentials.json` sentinel read leaks bytes | mitigate | `Path::exists()` only (stat syscall, no `fs::read`); NO bytes from `credentials.json` cross IPC | **CLOSED** |
| T9 | Repudiation (LOW) | Vault Move partial state if interrupted | accept (by design) | SPEC L84 + D-04: always-copy semantics; old vault untouched; user manually deletes new partial vault in Finder | **CLOSED** (accept) |
| T10 | Tampering (LOW) | User manually edits `~/.mneme/vault-index.db` | mitigate | `reconcile_with_progress` on launch rebuilds index from disk reality (D-14); filesystem is SSOT | **CLOSED** |
| T11 | Information Disclosure (LOW) | chmod 0o444 leaves stale FD with prior bytes | accept | macOS POSIX FD semantics; single-user single-app — no other process holds FDs to vault | **CLOSED** (accept) |
| T12 | Tampering (LOW) | Onboarding mid-typing path race | mitigate | D-03 explicit: `save_onboarding_state` fires ONLY on Next-click after validation. Mid-flight typing not persisted. | **CLOSED** |
| T-2-02b | Tampering (HIGH — BLOCKER CR-02) | `_inbox` silent overwrite via re-import | mitigate | Unconditional `dest.exists()` clash check; `dest-clash:` prefix surfaces friendly error (removed `routes_to_source` gate that previously skipped `_inbox`) | **CLOSED** |
| T-2-01b | Tampering (HIGH — BLOCKER CR-03) | `move_vault` raw-vs-canon path mix (symlink-at-dst attack) | mitigate | `&canon_src` + `&canon_dst` used throughout `safe_copy_vault` + `count_and_sum` + `index.reconcile` post-canonicalize | **CLOSED** |
| T-2-08b | Information Disclosure (MEDIUM — WR-01) | `env_broken` vs credentials-missing conflation | mitigate | `ClaudeAuthStatus.env_broken: bool`; returns `true` when `home::home_dir() == None`; Step 2 surfaces distinct copy per case | **CLOSED** |

### Known Tauri 2 + macOS Patterns (5 from RESEARCH.md L1173-1179)

| Pattern | Category | Mitigation | Status |
|---------|----------|------------|--------|
| Tauri 2 capability wildcard expansion (`args: true` / literal `*`) | Tampering | `audit-capabilities.sh` Gates 2 / 3 / 11 (pre-commit + prebuild); per-arg `validator` regexes in `capabilities/default.json` | **CLOSED** |
| Tauri WebKit XSS via untrusted HTML | Tampering | Phase 1 DOMPurify + KaTeX `trust:false strict:true throwOnError:false`. Phase 2 adds NO new `{@html}` sinks per 02-08/02-10/02-11 SUMMARY `## Threat Flags` (zero `innerHTML` / `eval` / dynamic `Function`) | **CLOSED** |
| macOS WKWebView credential exfiltration | Information Disclosure | No external HTTP in Phase 2; CSP `connect-src 'self' ws: http://localhost:*` (dev-only, Phase 1) | **CLOSED** |
| Rust unsafe pointer (objc2 ns_window) | Tampering | Phase 01.1 `dev.rs` documented `// SAFETY:` pattern; Phase 2 introduces zero new `unsafe` blocks | **CLOSED** |
| File descriptor leak | DoS | Idiomatic `{ let f = File::create()?; f.sync_all()?; }` blocks in `atomic_write` (both `vault_writer.rs` and `onboarding.rs` / `config.rs`) | **CLOSED** |

---

## Evidence Map (per-threat verification trail)

### HIGH-severity threats (Block-on-HIGH gate)

**T1 — Path traversal:**
- Mitigation: `src-tauri/src/vault_writer.rs:119-158` — `is_under_source` Arm B (parent canonicalize + file_name re-attach) + component-based `_source` match (NOT substring)
- Test: `src-tauri/tests/path_traversal_blocked.rs:11-37` — `rejects_dotdot_in_user_write_path` (asserts `WriteToSourceForbidden` + file NOT created)
- Run: `cargo test --test path_traversal_blocked` → 1/1 ok

**T2 — Symlink follow:**
- Mitigation: `src-tauri/src/vault_writer.rs:127-129` — Arm A (`path.symlink_metadata().is_ok()` → `path.canonicalize()` resolves symlink target)
- Test: `src-tauri/tests/symlink_canonicalize_blocked.rs:12-49` — `rejects_symlink_pointing_into_source` (asserts `WriteToSourceForbidden` + target bytes UNCHANGED + link still symlink)
- Run: `cargo test --test symlink_canonicalize_blocked` → 1/1 ok

**T-2-02b — `_inbox` silent overwrite (BLOCKER CR-02):**
- Mitigation: `src-tauri/src/import_controller.rs:275-298` — unconditional `dest.exists()` clash check; `format!("dest-clash:{}", ...)` prefix surfaces via classifier
- Frontend classifier: `src/lib/import-error.ts` matches `dest-clash:` BEFORE `PermissionDenied`
- Tests: `src-tauri/tests/inbox_basename_clash.rs:28-186` (2 cases — basic clash + course-set fallback corner case)
- Run: `cargo test --test inbox_basename_clash` → 2/2 ok

**T-2-01b — `move_vault` raw-vs-canon mix (BLOCKER CR-03):**
- Mitigation: `src-tauri/src/lib.rs:571-606` — `&canon_src` / `&canon_dst` used in `count_and_sum(pre)` + `safe_copy_vault` + `count_and_sum(verify)` + `index.reconcile`. Grep gate confirms ZERO live `&src` / `&dst` references after canonicalize.
- Test: `src-tauri/tests/move_vault_symlink_guard.rs:38-137` (2 cases — `canon_dst_resolves_symlink_to_target` + `canon_predicate_consistency_guard`)
- Run: `cargo test --test move_vault_symlink_guard` → 2/2 ok

### MEDIUM-severity threats

**T3 — chmod TOCTOU + Drop guard:**
- Mitigation: `src-tauri/src/vault_writer.rs:321-343` — `RelockGuard` struct + `Drop` impl. WR-02 fix: Drop is sole relock authority (no `disarm`; happy/Err/panic paths all relock via Drop).
- Tests: `src-tauri/tests/chmod_cancellation_safety.rs:11-43` + `chmod_three_step_cycle.rs:11-45` + `chmod_lock_enforced.rs:11-51`
- Run: `cargo test --test chmod_cancellation_safety --test chmod_three_step_cycle --test chmod_lock_enforced` → 3/3 ok

**T6 — IPC arg injection:**
- Mitigation: `src-tauri/capabilities/default.json` — every claude-bin arg has explicit `validator` regex (no `"args": true` wildcard). Vault IPC uses `Path` / `OsString` (no shell `Command::new()` on user input). Audit gate `scripts/audit-capabilities.sh:38-118` — 13 checks including SSOT drift, wildcard absence, `--bare` absence, `--system-prompt` absence, browser-safety, `import_handle()` whitelist (WR-06 anchored).
- Verification: `bash scripts/audit-capabilities.sh` → PASS (validated 2026-05-17)
- Pre-spawn validation: `src-tauri/src/import_controller.rs:167-197` — `validate_inputs(course, category)` rejects malformed course code + unknown category BEFORE registry insert / task spawn.
- Test: `src-tauri/tests/import_controller_validates_course_category.rs:24-77` (2 cases — invalid course + invalid category)
- Run: `cargo test --test import_controller_validates_course_category` → 2/2 ok

**T7 — SQL injection:**
- Mitigation: `src-tauri/src/vault_index.rs:142-225` — `params![]` macro on every `INSERT OR REPLACE` / `SELECT` / `DELETE`. ZERO `format!()` SQL strings (verified via `grep -nE 'format!\([^)]*\b(SELECT|INSERT|UPDATE|DELETE)\b'` in audit Gate 10).
- Test: `src-tauri/tests/vault_index_count.rs` (5 cases) + `src-tauri/tests/reconcile_lazy_delete.rs` (1 case)
- Run: `cargo test --test vault_index_count --test reconcile_lazy_delete` → 6/6 ok
- Audit gate: Gate 10 in `scripts/audit-capabilities.sh:184-187` blocks any future `format!()`+SQL keyword combination across `src-tauri/src/`

**T-2-08b — env_broken / WR-01:**
- Mitigation: `src-tauri/src/lib.rs:188-212` — `ClaudeAuthStatus.env_broken: bool` field; `claude_auth_check` returns `env_broken: true` when `home::home_dir() == None`; STILL uses `Path::exists()` only (no `fs::read`)
- Test: `tests/import-error-classifier.test.ts` (28 cases including dest-clash branch); frontend Step 2 distinct copy
- Run: `npx vitest run tests/import-error-classifier.test.ts` → green

### LOW-severity threats

**T4 — `.tmp` residue (accepted):**
- Mitigation: `src-tauri/src/onboarding.rs:91-100` + `src-tauri/src/config.rs` — `load_from` returns `default()` on `NotFound`; tmp overwritten on next save.
- Disposition: documented accept per RESEARCH L1161 — LOW probability, graceful recovery. See Accepted Risks Log below.

**T5 — DataTransfer JS URL:**
- Mitigation: `tests/datatransfer-types-discrimination.test.ts:32-60` — discrimination via Tauri `onDragDropEvent.payload.paths.length > 0` (OS-layer); text drags never reach the overlay at all per 02-SPIKE-dragdrop.md Errata.
- Component: `DropzoneOverlay.svelte` subscribes to Tauri events (not DOM `dragenter`); single-user app — no cross-origin attack surface anyway.
- Run: `npx vitest run tests/datatransfer-types-discrimination.test.ts` → green

**T8 — `~/.claude/` sentinel read:**
- Mitigation: `src-tauri/src/lib.rs:191-212` — `Path::exists()` (stat syscall) only; `version: None` always (SPEC L121 forbids spawning `claude --version` during onboarding)
- Test: `tests/onboarding-finish.test.ts` (Vitest IPC contract — no credential bytes asserted in mock response)

**T9 — Vault Move partial state (accepted by design):**
- Mitigation: `src-tauri/src/lib.rs:480-614` — always-copy `safe_copy_vault`; pre-walk + post-walk file count + byte verify; old vault preserved.
- Disposition: accepted by-design per SPEC L84 — partial new vault is user-deletable in Finder. See Accepted Risks Log below.
- Test: `src-tauri/tests/vault_move_safe_copy.rs` + `vault_move_interrupt.rs` + `move_vault_non_empty_dst.rs` → 4/4 ok

**T10 — SQLite tampering:**
- Mitigation: `src-tauri/src/lib.rs:246-264` — `reconcile_vault_index` walks disk on launch + emits per-file `reconcile:progress`. Filesystem is SSOT (D-14).
- Test: `src-tauri/tests/reconcile_emits_progress.rs` (3 cases)

**T11 — chmod 0o444 stale FD (accepted):**
- Disposition: macOS POSIX FD semantics; single-user single-app — no other process holds FDs to vault files. See Accepted Risks Log below.

**T12 — Onboarding mid-typing:**
- Mitigation: `src-tauri/src/onboarding.rs:77-85` + `src/lib/components/onboarding/Onboarding.svelte` — `save_onboarding_state` IPC only fires on Next-click after validation passes (D-03). Mid-flight typing not persisted.
- Test: `tests/onboarding-resume.test.ts` (WR-03 fix: `loaded` gate + `initialStep`-driven `next()` short-circuits when `saving || !loaded`)

### Defense-in-depth (close-requested handler order)

`src-tauri/src/lib.rs:823-868` — two-arm handler covers both `WindowEvent::CloseRequested` (red-button) AND `RunEvent::ExitRequested` (Cmd+Q):
1. `import_controller::cancel_all().await` — flips every `CancellationToken` so spawned tokio tasks observe cancel on next `yield_now`/`await`
2. `SessionRegistry::kill_all()` — Phase 1 SIGTERM 2s → SIGKILL drain
Both calls are idempotent so order between the two hooks does not matter.

---

## Unregistered Flags (from SUMMARY.md `## Threat Flags`)

All `## Threat Flags` sections in SUMMARY.md files (02-07, 02-08, 02-09, 02-10, 02-14) explicitly map to existing threat IDs in the register — NO unregistered new attack surface introduced.

| SUMMARY | Threat Flag | Maps To | Resolution |
|---------|-------------|---------|------------|
| 02-07 | T-2-06 / T-2-08 / capability surface / T-2-09 | T6 / T8 / pattern row / T9 | informational — mitigated as designed |
| 02-08 | None — explicit "no new endpoints, no `{@html}`, no `innerHTML`/`eval`" | n/a | informational |
| 02-09 | T-2-08 / T-2-06 / T-2-15 / T-2-12 / capability surface | T8 / T6 / pattern row (T-2-15 race eliminated at source by removing onDragDropEvent in Step 6) / T12 / pattern row | informational |
| 02-10 | None — explicit "closed-system UI surface, no new IPC" | n/a | informational |
| 02-14 | T-2-09b (DoS — reconcile emit storm) / T-2-10 (Browse-as-Move UX) / T-2-11 (hydration race) | informational — accept (≤100 file budget) / mitigated (Browse discards picker) / mitigated (single source of truth) | informational |

**No `unregistered_flag` entries recorded.** All new surfaces were pre-anchored in the plan-time threat register.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-02-01 | T4 (`.tmp` residue) | LOW probability; `load_from` returns `default()` on `NotFound` so resume gracefully restarts. Next save overwrites tmp atomically. Single-user app — no race against external process. | r1ckyIn (per 02-RESEARCH.md L1161 + 02-03-PLAN.md `<threat_model>` `accept`) | 2026-05-15 (plan-phase) |
| AR-02-02 | T9 (Vault Move partial state if interrupted) | SPEC L84 + D-04: always-copy semantics — old vault is BIT-EXACT unmodified. New vault may be incomplete but user is explicitly told to manually delete partial copy in Finder. Acceptable v1 friction per SPEC. | r1ckyIn (per 02-RESEARCH.md L1166 + SPEC L84) | 2026-05-15 (plan-phase) |
| AR-02-03 | T11 (chmod 0o444 stale FD) | macOS POSIX FD semantics: re-writing `_source/foo.pdf` does NOT mutate bytes referenced by a previously-opened FD. For single-user single-app machine, no other process holds vault FDs — exposure window structurally absent. | r1ckyIn (per 02-RESEARCH.md L1168) | 2026-05-15 (plan-phase) |

*Pseudo-accept rows (verified mitigated in code, marked `accept` in plan because the residual TOCTOU window is judged improbable rather than fixed):*

| Pseudo-Accept | Threat Ref | Status | Notes |
|---------------|------------|--------|-------|
| - | T-2-04 in 02-04-PLAN (stale `.db-wal`/`.db-shm`) | `accept (by-design)` | WAL torn-page recovery handled by reconcile-on-startup; rusqlite WAL machinery is the runtime guard |
| - | T-2-10 in 02-04-PLAN (user manually edits `vault-index.db`) | `accept` | Same disposition as T10 in master register; reconcile rebuilds. Filesystem is SSOT (D-14). |
| - | T-2-03 in 02-05-PLAN (cancel mid-rewrite leaves 0o644) | `accept` | D-07 contract — caller decides retry. The RelockGuard already minimizes this via Drop; the residual case is the OS-level chmod failure itself which is environment-dependent. |
| - | T-2-12 in 02-09-PLAN (mid-typing path race) | `accept` | Same disposition as T12 in master register; D-03 explicit. |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Accepted | Escalated | Run By |
|------------|---------------|--------|------|----------|-----------|--------|
| 2026-05-17 | 15 + 5 patterns | 13 + 5 | 0 | 2 (T9 + T11; T4 also accepted) | 0 | gsd-security-auditor (verify mode) |

### Audit Summary 2026-05-17

| Metric | Value |
|--------|-------|
| Threats found (STRIDE) | 12 (T1..T12) |
| Sub-threats (gap-closure 02-13) | 3 (T-2-02b / T-2-01b / T-2-08b) |
| Tauri/macOS patterns | 5 (capability wildcard / WebKit XSS / WKWebView exfil / unsafe pointer / FD leak) |
| **Total threats verified** | **15 + 5 patterns = 20 items** |
| Closed (mitigated, code evidence + green test) | 13 + 5 = 18 |
| Accepted (documented in Accepted Risks Log) | 3 master (T4 / T9 / T11) + 4 plan-level pseudo-accepts |
| Open | 0 |
| Escalated | 0 |
| Unregistered flags | 0 |
| Block-on-HIGH gate | **PASSED** (T1 + T2 + T-2-02b + T-2-01b all CLOSED in code with green tests) |
| Test suite signal | cargo 66/66 · vitest 277 pass / 1 pre-existing fail (out-of-scope GSD-upstream template path) / 1 skip · audit-capabilities.sh PASS · svelte-check 0/0/398 |
| Source files modified | 0 (implementation read-only per agent contract) |

### Findings

**No security blockers found.** All 4 HIGH-severity threats (T1 path traversal + T2 symlink + T-2-02b `_inbox` clash + T-2-01b move_vault canon) have:
- Mitigation in cited implementation file (verified via direct read of `vault_writer.rs::is_under_source`, `import_controller.rs::compute_dest`+clash check, `lib.rs::move_vault` canon_src/canon_dst substitution)
- Green test in `src-tauri/tests/` (4 dedicated test files + 4 supporting harness files all GREEN)
- Audit gate `audit-capabilities.sh` PASS (13 checks including wildcard absence + browser-safety + import_handle whitelist)

The 3 master accepted risks (T4 / T9 / T11) are all documented per RESEARCH.md disposition rows, and the 4 pseudo-accepts in PLAN.md `<threat_model>` blocks (T-2-04 / T-2-10 / T-2-03 / T-2-12) are either duplicate dispositions of master entries or covered by enforced runtime patterns.

**The pre-existing vitest failure** (`scripts/__tests__/visual-review-template.test.mjs > R7` — "template file exists at GSD upstream path") is NOT a security concern: it is a `~/.claude/get-shit-done/templates/visual-review.html` install gap in the developer environment, not a code defect. Logged in `deferred-items.md`.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer) — 13 mitigate + 2 master accept; 3 pseudo-accepts at plan-level
- [x] Accepted risks documented in Accepted Risks Log (AR-02-01 / AR-02-02 / AR-02-03 + 4 pseudo-accept rows)
- [x] `threats_open: 0` confirmed
- [x] `status: closed` set in frontmatter
- [x] Block-on-HIGH gate passed (T1 + T2 + T-2-02b + T-2-01b all CLOSED with code evidence + green tests)
- [x] No source / test / STATE / ROADMAP / REQUIREMENTS / VALIDATION file modifications

**Approval:** verified 2026-05-17 — Phase 02 security audit CLOSED.

---

## Audit 2026-05-17 (Phase 02.1)

> Delta audit captured during Phase 02.1 (UI fixes from dogfood + audit). Records
> the T-2-06 (alias for T6 in the master STRIDE register above) mitigation
> transition from the rejected regex prefilter to the new minimal validator.
> No new threats; no disposition changes for T1..T12 or their sub-threats.

### T-2-06 — course-code injection mitigation transition

**Before (Phase 02 ship):** mitigation = `VALID_COURSE_CODE` + `VALID_COURSE_RE`
`Lazy<Regex>` in `vault_writer.rs` + `import_controller.rs`, pattern
`^[A-Z]{4}\d{4}$`.

**Issue (UI-REVIEW.md L150 + dogfood #7):** the regex rejected real USYD codes
(BIOL2010S2 / COMP3027L) and any non-USYD format (cs-101 / 日本語1). User could
not add courses → hard-blocking usability defect that surfaced at both
onboarding Step 5 and Settings → Vault → Add Course.

**After (Phase 02.1 02.1-04):** mitigation = `vault_writer::validate_course_code`
free function — minimal path-safe validator:

- reject empty / whitespace-only
- reject > 32 chars
- reject `/`, `\`, `\0` (path separators + null)
- reject `.` or `..` (parent / self refs)
- reject all-non-alphanumeric
- accept everything else (alphanumeric / dash / unicode)

Both call sites (`vault_writer::create_course` + `import_controller::validate_inputs`)
delegate to the same function — no duplicate validation logic remains. The IPC
return string preserves the `invalid course code: '...'` prefix so the
`import-error.ts` classifier (W5 02.1-05) can still surface the raw tail.

**Defense layering preserved:** T-2-01 (path traversal) + T-2-02 (symlink) remain
closed by `vault_writer::is_under_source` two-arm canonicalize gate (lines 119-148).
`path_traversal_blocked.rs` + `symlink_canonicalize_blocked.rs` continue to pass
without modification. The regex was overdefense at the wrong layer — a
string-level filter for what the path-component canonicalize already blocks at
the path layer. Net residual risk: unchanged at LOW.

**Residual risk:** LOW (unchanged from Phase 02 audit). Unicode lookalike chars
(Latin `o` vs Cyrillic `о`) could in principle create filename collisions in a
multi-user scenario; mneme is single-user (KP-01 / CLAUDE.md) so this is an
accepted residual.

**Verification:**

- `cargo test --test course_code_validation` — Wave 0 RED → GREEN (4 test fns / ~30 cases)
- `cargo test --test path_traversal_blocked` — unchanged GREEN (1/1)
- `cargo test --test symlink_canonicalize_blocked` — unchanged GREEN (1/1)
- `cargo test --test course_scaffold` — GREEN after test-data update (2/2; old `"abc"` reject-case pinned the dogfood-killer regex; replaced with real path-poison sentinel `"../etc"`)
- `cargo test --test import_controller_validates_course_category` — GREEN after test-data update (1/1; old `"not-a-course"` reject-case is now ACCEPTED by the new validator — alphanumeric + hyphen; replaced with `"../etc"`)
- `cargo test --lib import_controller::` — 6/6 inline unit tests pass (mirror of integration test)
- `bash scripts/audit-capabilities.sh` — PASS (13 checks unchanged)
- `cargo clippy --lib --bin mneme -- -D warnings` — clean

### Audit Trail addendum

| Audit Date | Threats Total | Closed | Open | Accepted | Escalated | Run By |
|------------|---------------|--------|------|----------|-----------|--------|
| 2026-05-17 (Phase 02.1) | 15 + 5 patterns (unchanged) | 13 + 5 (unchanged) | 0 (unchanged) | 2 master + 4 pseudo (unchanged) | 0 | Phase 02.1 plan 02.1-04 executor (verify mode — T-2-06 mitigation swap) |

**No new threats. No new accepts. No new opens.** T-2-06 mitigation _strength_ is
reduced on paper (less restrictive string filter) but compensated by the existing
layered canonicalize gate which is the actual security wall. Block-on-HIGH gate
stays PASSED.
