# claude-code-parser — Vendored Reference

**Snapshot date:** 2026-05-09
**Upstream commit:** 61fa32c5b7004fde32c47c0e95abb657316b224e
**Upstream URL:** https://github.com/udhaykumarbala/claude-code-parser
**License:** MIT (see ./LICENSE — preserved verbatim from upstream)

## Status

**Frozen reference per KD-12.** Upstream is effectively unmaintained — last commit
predates Claude Code's current event schema (per `/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/CLAUDE.md`
authoritative override section). We do NOT track upstream releases on a cadence;
manual review only when Claude Code's stream-json event taxonomy materially
changes (e.g., a new top-level `type` field appears in `--output-format stream-json`).

## Adoption mode

**Path 2 — types-only consumption** (per RESEARCH.md §4.8 lines 396-405).

mneme imports the raw NDJSON envelope `ClaudeEvent` from
`./src/types/protocol.ts` (NOT `./src/types/events.ts` — the latter exports
the post-translate `RelayEvent` union, which is the Translator's normalized
output, while we need the raw wire format for our 6-arm dispatch). mneme
writes its OWN 6-arm dispatch (matching spike-002 + AI-SPEC §3 verbatim);
the upstream `Translator` class, `createMessage` helpers, and `RelayEvent`
shape are NOT consumed in Phase 1.

**Resolved consumption path (plan 01-03 GREEN, 2026-05-09):**
`src/lib/stream-dispatch.ts` consumes `ClaudeEvent` from `./src/types/protocol`
and re-exports it as `$lib/stream-dispatch#ClaudeEvent` so plan 01-06's
ChatPanel does not need to know the vendor path.

## Local modifications

None to file contents. Layout note: upstream's `src/` does NOT contain a
single `types.ts` file; instead types are split into `src/types/events.ts`
(top-level `ClaudeEvent` union — what mneme will import in plan 01-02 / 01-06)
and `src/types/protocol.ts`. The full upstream layout copied verbatim is:

```
src/
  index.ts          (re-exports)
  parser.ts         (line-buffered NDJSON parser — mneme writes its own)
  translator.ts     (high-level message folder — NOT consumed in Phase 1)
  writer.ts         (companion serializer — NOT consumed in Phase 1)
  types/
    events.ts       (ClaudeEvent discriminated union — types-only target)
    protocol.ts     (low-level protocol records)
```

The plan 01-01 file list mentioned `parseLine.ts` + `types.ts` as the canonical
source filenames, but the upstream layout was reorganized between RESEARCH.md's
verification (2026-05-08) and this snapshot. We import from `src/types/events.ts`
in downstream plans rather than reshape the vendored tree (vendoring rule:
verbatim copy, no local edits).

Any future modification MUST be recorded here with date + rationale + diff summary.

## Why vendored

KD-12 (`PROJECT.md`): "claude-code-parser (MIT) vendored in `vendor/`,
NOT npm dependency." The project is effectively unmaintained, so adding it
as an npm dep would create a long-term drift / abandoned-dep tax. Vendoring
copies the source under MIT attribution and insulates mneme from upstream
churn while keeping KP-02 OSS adoption discipline (KP-08 registry tracks
this entry as `frozen` cadence).

D-09 (CONTEXT.md) further bounds this directory's contents: only MIT/
Apache-2.0/MPL-2.0/BSD-style permissive code may be vendored. AGPL code
(e.g., opcode, siteboon/claudecodeui) is READ-ONLY REFERENCE and MUST NOT
appear here. `claude-code-parser` is MIT — verify-line check enforces this.
