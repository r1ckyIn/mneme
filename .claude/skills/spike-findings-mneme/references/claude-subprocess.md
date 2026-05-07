# Claude Code Subprocess Integration

How to spawn the local `claude` CLI and consume its streaming JSON output. Validated end-to-end in spikes 001 + 002.

## Requirements

- **MUST** spawn the real `claude` CLI as subprocess (no token extraction, no impersonation) — Anthropic 2026.02 ToS compliance
- **MUST** use `--output-format stream-json --include-partial-messages` for live UI streaming
- **MUST** use `--permission-mode bypassPermissions` to allow tools in piped/non-interactive mode (or expose a user-controllable safety toggle)
- **MUST NOT** use `--bare` — it strips keychain reads and breaks OAuth subscription auth
- **MUST** parse stdout as JSONL (newline-delimited JSON), buffering across chunks
- **MUST** treat the `result` event as the session terminator
- **MUST** keep all data local

## How to Build It

### 1. CLI invocation (locked args)

```ts
const cmd = Command.create("claude-bin", [
  "--print",
  "--permission-mode", "bypassPermissions",
  "--output-format", "stream-json",
  "--include-partial-messages",
  "--verbose",
  promptText,
]);
```

### 2. Tauri capability allow-list

```json
// src-tauri/capabilities/default.json
{
  "permissions": [
    "core:default",
    "shell:default",
    {
      "identifier": "shell:allow-spawn",
      "allow": [
        { "name": "claude-bin", "cmd": "claude", "args": true }
      ]
    }
  ]
}
```

### 3. JSONL line buffering (stdout chunks ≠ event lines)

```ts
let buffer = "";
cmd.stdout.on("data", (chunk) => {
  buffer += chunk;
  const parts = buffer.split("\n");
  buffer = parts.pop() ?? "";  // keep partial last line
  for (const raw of parts) {
    if (!raw.trim()) continue;
    handleEvent(JSON.parse(raw));
  }
});
```

### 4. Event taxonomy (6 top-level types)

| `type` | Cardinality | Purpose | UI handling |
|--------|-------------|---------|-------------|
| `system` | 9–21 per session | Init / hooks / status | Suppress except `subtype=init` "session started" indicator |
| `stream_event` | many | Wraps Anthropic SSE per-token deltas | **Primary streaming consumer** — render `event.delta.text` on `event.type=content_block_delta` |
| `assistant` | 1+ per agent turn | Consolidated full assistant message | Iterate `message.content[]` for `tool_use` and `thinking` blocks |
| `user` | 1 per tool roundtrip | Tool result payload | Render as collapsed tool-output card |
| `rate_limit_event` | 1 | Rate-limit budget snapshot | Status bar |
| `result` | 1 (END) | Final result + cost + duration + stop_reason | Terminator — finalize session, show usage, render markdown/KaTeX |

### 5. Block types within `assistant.message.content[]`

| Block `type` | Fields | UI |
|--------------|--------|-----|
| `text` | `text` | Already streamed via `stream_event` — skip |
| `thinking` | `thinking` (often empty), `signature` (encrypted) | Show "💭 thinking..." indicator only — content is encrypted for OAuth users |
| `tool_use` | `name`, `id`, `input` | Render as expandable tool-use card with command + args |

### 6. Reliable sequence pattern

```
[system/hook_started ×N] → [system/hook_response ×N] → system/init → system/status
  → [stream_event(message_start) → stream_event(content_block_delta) ×many → stream_event(content_block_stop) → stream_event(message_delta) → stream_event(message_stop)]
  → assistant (consolidated full message)
  → [optional tool loop: user(tool_result) → more assistant + stream_events]
  → rate_limit_event
  → result  (END marker — UI renders cost/duration here)
```

### 7. Telemetry available

- `ttft_ms` — first `stream_event` of the session has time-to-first-token
- `result.total_cost_usd` — final cost in USD
- `result.duration_ms` — total session duration
- `result.usage` — full token breakdown (input/output/cache_creation/cache_read)
- `result.stop_reason` — `end_turn` / others

## What to Avoid

- **DO NOT use `--bare`** — early spike 001 thought it would save cost ($0.67/call from 107k cache_creation auto-loading user CLAUDE.md), but spike 002 found it strips keychain reads → OAuth subscription users lose auth → silent failure (subprocess returns instantly, no output). Only safe for users who have `ANTHROPIC_API_KEY` env var set.
- **DO NOT assume one stdout chunk = one event line** — must buffer and split on `\n`.
- **DO NOT try to render `thinking` block content** — for OAuth users it's empty + encrypted in `signature`.
- **DO NOT rely on default permission mode** for tool calls in piped subprocess — prompts can't be answered.
- **DO NOT amend or batch events optimistically** — `result` is the only reliable session terminator.

## Constraints

- **Cost (current OAuth-subscription mode without `--bare`)**:
  - First call in session: ~$0.55–0.67 (107k cache_creation tokens loading CLAUDE.md)
  - Subsequent calls in same session: ~10% (cache_read)
  - Tool-use multi-turn: ~$0.60+ per round (e.g. spike 002 echo test = $0.6054, 10.5s)
- **Streaming cadence**: Anthropic SSE batches `content_block_delta` events server-side. Expect 5–15 stream_events per 100-token response — chunky, not strictly per-token. Production needs client-side typewriter throttle (~30–50 tokens/sec) for smooth UX.
- **Cost mitigation strategies** (to research in production):
  - `--exclude-dynamic-system-prompt-sections` — improves cache reuse with default system prompt
  - `--add-dir <vault>` — scope filesystem access, smaller context
  - `--system-prompt` / `--append-system-prompt` — replace default system prompt with our app's bespoke one
  - Long-term option: require `ANTHROPIC_API_KEY` and use `--bare` (cleaner isolation but breaks OAuth subscription users)

## Origin

Synthesized from spikes: **001-stream-json-recon** (event taxonomy reconnaissance), **002-tauri-claude-shell** (end-to-end Tauri integration).

Source files available in: `sources/001-stream-json-recon/`, `sources/002-tauri-claude-shell/`
