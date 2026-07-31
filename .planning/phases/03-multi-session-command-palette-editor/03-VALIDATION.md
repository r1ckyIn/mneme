---
phase: 3
phase_slug: multi-session-command-palette-editor
created: 2026-05-30
status: draft
---

# Phase 3: Validation Strategy

> Maps each phase capability to its validation approach (the Nyquist sampling rate). Derived from RESEARCH.md "Validation Architecture". Each capability is validated at the lowest layer that proves the behavior; the three net-new UI surfaces are validated behaviorally through the project dev-feedback-loop (`gsd-dev-screenshot`/`gsd-dev-snapshot` vs `03-UI-SPEC.md`), NOT Playwright.

## Validation Layers

| Capability | Layer | Proof |
|------------|-------|-------|
| Session state machine — create / switch / rename / close transitions (REQ-12) | Unit (TS) | Pure `(state, event) -> state` over a table of every legal transition; illegal transitions are rejected, not silently absorbed (analog: `stream-dispatch.ts` pure dispatcher) |
| Resource ceiling — refuse the 3rd concurrent generation (D-10) | Unit + Integration (Rust) | With 2 live `ChildHandle`s registered, the spawn path returns `Err` before `register_session_pid`; `SessionRegistry` live count never exceeds 2 under concurrent registration |
| rusqlite `sessions` persistence survives restart (REQ-12 / D-04) | Integration (Rust) | Insert N session rows into the Phase-2 WAL DB, drop + reopen the connection, assert id/title/session_id/cwd/summary/last_active intact; `CREATE TABLE IF NOT EXISTS` + `user_version` migration is idempotent on fresh AND existing DBs; `ORDER BY last_active DESC` returns Recents order |
| Resume cwd-matching correctness (D-05/D-07) | Unit + Integration | The resume spawn re-passes the exact persisted `cwd`; a cwd mismatch is detectable (would silently fork a fresh session) — assert the built argv carries the stored cwd/`--add-dir` scope for the chosen thread |
| New spawn-arg capability/audit regression — `--resume <uuid>` / `--session-id <uuid>` / `-c` (D-05/D-07) | Build gate + Unit | `capability-regex.test.ts` proves `--resume`/`--session-id` match a wildcard-free UUID-v4 regex and `-c` matches literal `/^-c$/`; `gen-capabilities.ts` emits them in positional order; `audit-capabilities.sh` exits 0 with `--bare` absent and `--max-turns` present |
| Soft-lock advisory — hook blocks Claude, not the human (D-09) | Integration (hook) | The node PreToolUse hook, given stdin JSON whose `.tool_input.file_path` is in `~/.mneme/editor-locks.json`, `exit 2` (blocks); given an unlocked path, exit 0; the human editor remains fully usable while the lock is held |
| Lock lifecycle — focus + mtime<5s rule (D-09b) | Unit (TS) | mneme writes a lock entry on editor focus and clears it on blur; the mtime<5s rule resolves to locked/unlocked correctly at boundary times |
| Markdown round-trip fidelity incl. frontmatter (KD-09) | Unit (TS) | `frontmatter split → Tiptap body → serialize → rejoin` is byte-stable for a fixture corpus (YAML frontmatter, fenced code, KaTeX math, nested lists, wikilinks); frontmatter block is preserved verbatim (tiptap-markdown does NOT preserve it — the splitter must) |
| Command-palette fuzzy match + keyboard model (REQ-11) | Unit (TS) + Behavioral | `fuzzysort.go()` returns the expected ranked order over a command/file-path fixture for representative queries; ↑↓ wrap, Enter runs+dismisses, Esc restores focus (Bits UI focus trap is relied upon, not re-implemented) |
| JSONL transcript parse → history render (D-06) | Unit (TS) | A sample Claude Code `.jsonl` (incl. an `isCompactSummary`/`type:"summary"` record) parses with vendored `claude-code-parser` types and feeds `stream-dispatch` to reconstruct rendered history; the compaction summary record is the resume-summary source (D-05a) |
| Three UI surfaces match the contract (REQ-11/REQ-12/KD-09) | Behavioral (dev-loop) | `gsd-dev-screenshot` + `gsd-dev-snapshot` match `03-UI-SPEC.md`: sidebar collapsed 28px toggle / expanded 240px push-rail; palette centered modal + dim scrim + fuzzy highlight; editor Preview\|Edit segmented toggle + save dot + soft-lock pill |

## Reference Dataset

- **Markdown round-trip corpus** — `tests/fixtures/markdown-roundtrip/*.md`: files exercising YAML frontmatter, fenced code, KaTeX math blocks, nested lists, and `[[wikilinks]]`.
- **Session-state test vectors** — enumeration of all legal AND illegal `(state, event)` pairs for the session state machine.
- **Command-registry fixture** — representative palette commands + file paths with query/expected-rank pairs for fuzzysort.
- **Claude Code JSONL transcript fixture** — a sample `<session-id>.jsonl` including a compaction summary record, for the D-06 parse + D-05a summary-source test.

## Coverage Target

- Business logic (session state machine, ceiling, lock lifecycle, frontmatter round-trip, fuzzy match, capability regex, JSONL parse) — **≥ 80%** per the project testing rule.
- UI surfaces (sidebar, palette, editor) — validated **behaviorally** against `03-UI-SPEC.md` via the dev-feedback-loop, not by line-coverage percentage.

## Validation Gaps

- **REQ-19 voice input** — out of scope; only the `Cmd+Shift+V` keybinding reservation is validated (the slot is taken with a no-op + `preventDefault`), not any speech behavior.
- **Full-transcript instant-switch cache** — deferred (CONTEXT Deferred Ideas); only summary-default resume is validated, not a per-thread rendered-transcript cache.
- **`--fork-session` "branch this thread"** — deferred to v1.x; not validated.
- **Sustained concurrent-stream stress** — the ceiling (refuse the 3rd) and per-session stream demux are validated, but high-throughput streaming at the ceiling is not load-tested (single-user desktop posture).
- **Resume summary when no compaction record exists yet** — the fallback (first user message as title, lazy summary backfill on first compaction) is validated for correctness, but real-world compaction timing is not simulated end-to-end.
