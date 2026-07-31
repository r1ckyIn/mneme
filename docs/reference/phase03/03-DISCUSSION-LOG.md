# Phase 3: Multi-Session + Command Palette + Editor - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-30
**Phase:** 3-Multi-Session + Command Palette + Editor
**Areas discussed:** Command palette technology, Sidebar+editor layout, Session resume/persistence, Soft-lock + resource ceiling
**Mode:** advisor (USER-PROFILE.md present) · calibration tier `minimal_decisive` (vendor_philosophy: opinionated) · `--analyze` overlay · 4 parallel research agents (model: inherit) before table-first decisions.

---

## Command palette technology (REQ-11)

| Option | Description | Selected |
|--------|-------------|----------|
| Bits UI `Command` + fuzzysort | Headless MIT primitive (Svelte 5 native, official cmdk-sv successor) — full KD-13 control, built-in a11y keyboard nav, custom-filter hook for fuzzysort; CSP-safe. | ✓ |
| Roll-your-own overlay + uFuzzy | Zero component dep, absolute control, but re-implement keyboard focus/aria (classic bug source for the ≥80%-no-mouse goal). | |

**User's choice:** Bits UI Command + fuzzysort (Recommended).
**Notes:** Research confirmed the ROADMAP's cmdk/kbar suggestion is stale (both React) and cmdk-sv is archived/dead on Svelte 5 — Bits UI `Command` is the official successor.

---

## Sidebar + editor layout (net-new surfaces)

| Option | Description | Selected |
|--------|-------------|----------|
| Session rail in right ChatPanel + editor in middle pane (type-routed, preview↔edit) | Keeps files-left/sessions-right as two distinct lists; Splitter untouched; document center. | ✓ (with override) |
| Far-left VS-Code-style icon rail / 4th column | More scalable but rewrites Splitter ratios + WR-05 invariant, reads as "IDE clone". | |

**User's choice:** Recommended option, **overridden for the sidebar**: "默认和 Claude desktop 一样收起" + attached Claude desktop sidebar screenshot.
**Notes:** Editor placement (middle pane, type-routed, preview↔edit toggle) is LOCKED. Session sidebar = collapsible, **default collapsed**, Claude-desktop-style (☰ toggle → New chat + Recents list + footer). Exact dock (left-edge overlay vs right in-pane) deferred to `/gsd-ui-phase 3` with the screenshot as the visual anchor; Claude's read = left-edge collapsible overlay that does not add a 4th Splitter column.

---

## Session resume / persistence (REQ-12)

| Option | Description | Selected |
|--------|-------------|----------|
| Metadata-only in rusqlite + lazy restart + read Claude Code's own JSONL | No transcript duplication; reuse Phase 2 WAL DB; lazy respawn fits 2-concurrent ceiling. | ✓ (with refinement) |
| Metadata + cached rendered transcript | Instant switch for huge threads, but two stores + cache invalidation. | (→ v1.x) |

**User's choice:** Recommended option, **refined**: "可以选择会话恢复，视觉上是用户选择某一个会话，实则是后台使用 /resume 或者 claude -c 恢复某一个会话，默认从 summary 恢复".
**Notes:** Persist metadata **+ a per-session summary**; resume defaults to **summary-based** context (not full-transcript replay). Visual = pick from Recents; backend `claude --resume <id>` (specific) / `claude -c` (most recent). Verified facts adopted: JSONL path `~/.claude/projects/<encoded-cwd>/<id>.jsonl` (non-alnum→`-`), transcripts up to 7.4MB (localStorage rejected), `--session-id` assigns UUID up front, cwd must match or resume forks. Summary source (Claude Code compaction vs mneme-generated) = plan-phase research item.

---

## Soft-lock + resource ceiling

| Option | Description | Selected |
|--------|-------------|----------|
| PreToolUse hook + lock file; ceiling at Rust SessionRegistry count | Hooks fire & block under bypassPermissions (exit 2 pre-empts permission eval); no argv change → KP-04 clean. | ✓ |
| chmod 444 the locked file (reuse _source/ pattern) | OS-level/harder, but coarse/racy for a transient 5s lock; crash strands files at 444. | (→ optional 2nd layer) |

**User's choice:** PreToolUse hook + lock file; ceiling in Rust registry (Recommended).
**Notes:** Hook written in node (macOS may lack jq). mneme writes editor-focus + mtime<5s state into `~/.mneme/editor-locks.json`; hook = dumb lookup. chmod 444 kept only as optional OS-level fallback under the hook.

## Claude's Discretion

- Slash-menu command set for Tiptap editor (bounded by markdown round-trip).
- Universal palette (Cmd+Shift+P) action set.
- localStorage key names for sidebar collapse + per-thread prefs (`mneme.*`).

## Deferred Ideas

- Full-transcript instant-switch cache → v1.x (add only if read-from-JSONL latency unacceptable in dogfooding).
- `--fork-session` "branch this thread" → v1.x.
- Voice input (REQ-19) `Cmd+Shift+V` — reserve binding in the Phase-3 keyboard-nav contract.
- 2 weakly-matched todos (auto-collapse panes, built-in PDF editor) reviewed, both other-phase.
