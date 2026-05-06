---
spike: 001
name: stream-json-recon
type: standard
validates: "Given `claude -p --output-format stream-json --include-partial-messages`, when running varied prompts (text / markdown+code / tool use), then we can fully observe and document all event types, fields, sequencing, and edge cases needed to drive a Tauri chat UI."
verdict: VALIDATED ✓
related: [002]
tags: [claude-cli, stream-json, subprocess, foundation]
---

# Spike 001: Stream-JSON Recon

## What This Validates

Given `claude --print --output-format stream-json --include-partial-messages`,
when running varied prompts (plain text / markdown+code / Bash tool use),
then all event types, fields, sequence, and edge cases are observable and parseable
— enough to drive a Tauri chat UI in Spike 002.

## Research

**Why this spike:** We need to wrap Claude Code as a subprocess with a GUI. Before writing
any UI code, we need exact knowledge of what events the CLI emits in stream mode.

**Approach:** No competing approaches — `stream-json` is the only structured streaming format
the CLI offers. Verified by `claude -p --help` (output-format options: text/json/stream-json).

**Key flag — `--include-partial-messages`:** Required for per-token streaming UX (without it,
no `stream_event` records are emitted, only the consolidated `assistant` message at the end).

## How to Run

```bash
# 1. Capture raw events for 3 representative prompts
bash capture.sh

# 2. Analyze captures into structured summary
node analyze.mjs

# Captures saved to: captures/{01-simple-text,02-markdown-code,03-tool-use}.jsonl
```

## Investigation Trail

1. **Confirmed CLI flags** via `claude -p --help` — `--output-format stream-json`,
   `--include-partial-messages`, `--include-hook-events`, `--input-format stream-json` all exist.
2. **Wrote capture.sh** to dump raw stream-json output for 3 scenarios → 3 jsonl files (30 / 30 / 54 lines).
3. **Wrote analyze.mjs** to bucket events by `type`, list fields per type, extract sequence patterns.
4. **Drilled into samples**: probed `stream_event.event.delta`, `assistant.message.content[]` block types, `user` tool_result payload, and `result` terminator structure.
5. **Cost surprise** discovered: each capture cost ~$0.67 because user's `~/.claude/CLAUDE.md` (107k cache-creation tokens) auto-loads. Filed `--bare` flag as required for our subprocess pattern (see Findings #5).

## Results

**Verdict: VALIDATED ✓** — stream-json is well-structured, fully parseable, sufficient to drive a real-time chat UI.

### Finding 1 — Event Type Taxonomy (6 top-level types)

| `type` | Count (per session) | Purpose | UI handling |
|--------|---------------------|---------|-------------|
| `system` | 9–21 | Init, hook lifecycle, status, MCP/plugin/skill/tool inventory | Mostly suppress; show "Ready" indicator after `subtype=init` |
| `stream_event` | 7–27+ | Wraps Anthropic SSE chunks (per-token streaming) | **Primary UI consumer** — render incremental text |
| `assistant` | 1+ per agent turn | Consolidated full assistant message after streaming | Use as canonical post-stream record |
| `user` | 1 per tool roundtrip | Tool result payload (stdout/stderr/error) | Render as collapsed tool-use card |
| `rate_limit_event` | 1 | Rate-limit budget snapshot | Show in status bar |
| `result` | 1 (END marker) | Final result text + cost + duration + stop_reason | **Terminator** — close session, show usage |

### Finding 2 — `assistant.message.content[]` Block Types

The `assistant` event's `message.content` is an array of typed blocks:

| Block `type` | Fields | When |
|--------------|--------|------|
| `text` | `text` | Plain model text |
| `thinking` | `thinking` (often empty), `signature` (encrypted CoT) | When extended thinking enabled |
| `tool_use` | `name`, `id`, `input` (object) | Model invokes a tool |

A single agentic turn can produce multiple `assistant` events:
```
assistant#1 (thinking) → assistant#2 (tool_use:Bash) → user(tool_result) → assistant#3 (text:"done")
```

### Finding 3 — `stream_event.event` Sub-Schema

Wraps Anthropic SSE protocol:

```
message_start          → message metadata + initial usage
content_block_start    → block type + index
content_block_delta    → delta.type=text_delta, text="<token>"   ← render this
content_block_stop     →
message_delta          → final usage update
message_stop           → end of one assistant message
```

`ttft_ms` is attached to the first `stream_event` of a session (time-to-first-token telemetry).

### Finding 4 — Reliable Sequence Pattern

```
[system/hook_started ×N] → [system/hook_response ×N] → system/init → system/status
  → [stream_event(message_start) → stream_event(content_block_start)
     → stream_event(content_block_delta) ×many → stream_event(content_block_stop)
     → stream_event(message_delta) → stream_event(message_stop)]
  → assistant (consolidated)
  → [tool loop: user(tool_result) → more assistant + stream_events]?
  → rate_limit_event
  → result (END)
```

### Finding 5 — `--bare` Flag is MANDATORY for our App

Without `--bare`, every subprocess invocation auto-loads user's `~/.claude/CLAUDE.md` and
auto-memory paths → **107,774 cache-creation tokens per call → ~$0.67 each**.

`--bare` strips: hooks, LSP, plugin sync, attribution, auto-memory, background prefetches,
keychain reads, CLAUDE.md auto-discovery. We then explicitly pass our app's context via
`--system-prompt`/`--append-system-prompt`, `--add-dir`, `--mcp-config`, `--settings`, `--agents`.

This is the exact pattern Anthropic recommends for "products embedding Claude Code"
and aligns with the agentic search architecture (we control which dirs the model can grep).

### Finding 6 — Parsing Strategy for Tauri/JS

```js
// JSONL parser — split on \n, JSON.parse each line
for await (const line of stream) {
  if (!line.trim()) continue;
  const evt = JSON.parse(line);
  switch (evt.type) {
    case 'system': handleSystem(evt); break;        // mostly suppress
    case 'stream_event': handleStreamEvent(evt); break;  // UI tokens
    case 'assistant': handleAssistant(evt); break;       // canonical
    case 'user': handleToolResult(evt); break;
    case 'rate_limit_event': handleRateLimit(evt); break;
    case 'result': handleEnd(evt); return;          // session done
  }
}
```

`stream_event` further dispatches on `evt.event.type` (`message_start` / `content_block_*` / `message_delta` / `message_stop`).

### Finding 7 — No Parse Errors

Across 3 captures (114 total event lines), zero JSON parse errors. Format is stable
and reliable — no need for partial-line buffering quirks beyond standard newline splitting
(though as a defensive measure, consume `\n`-terminated complete lines from the subprocess
stdout buffer; don't assume one read = one event).

## Impact on Spike 002

- ✓ Event vocabulary is locked.
- ✓ Use `--bare` + explicit context flags in 002.
- ✓ UI rendering pipeline: `stream_event.content_block_delta.text` → live append to message bubble; on `result` → finalize and freeze.
- ✓ Tool-use blocks render as collapsible "Tool: Bash" cards with `input` (command) and matching `tool_result.content` (output).
- ✓ Markdown / LaTeX / code rendering can wait until streaming is done — render incremental text raw, run KaTeX/Shiki on `message_stop`.
