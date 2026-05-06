# Spike Manifest

## Idea

Build a personal desktop learning app for USYD CS coursework that wraps the local
Claude Code CLI as a subprocess — three-pane UI (course files / video / chat),
local-first markdown vault, AI-native double-layer data model (human view: mindmap+whiteboard;
AI view: knowledge graph), Echo360 lecture video integration via embedded webview, FSRS-based
review of concept pages (no flashcards), and 50% open-source-integration philosophy.

## Requirements (locked as spikes progress)

- **MUST** spawn the real `claude` CLI subprocess (not impersonate or extract OAuth tokens) — Anthropic 2026.02 ToS compliance
- **MUST** use `--output-format stream-json --include-partial-messages` for live UI streaming
- **MUST** parse jsonl line-by-line and dispatch by `type` field
- **MUST** treat `result` event as the session terminator
- **MUST** support tool-use round-trip rendering (assistant → tool_use → user/tool_result → assistant)
- **MUST** sanitize all HTML injection sites with DOMPurify (KaTeX renderToString + marked output) — *spike 002 F3*
- **MUST** use `--permission-mode bypassPermissions` for tool calls in non-interactive subprocess (or expose user-toggle) — *spike 002 F7*
- **MUST NOT** use `--bare` for OAuth subscription users — strips keychain reads, breaks auth — *spike 002 F6 invalidates spike 001 finding*
- **MUST** show a "💭 thinking..." indicator for `thinking` blocks, never try to render encrypted signature content — *spike 002 F9*
- **MUST** require Rust ≥ 1.88 (pin in `rust-toolchain.toml`) — *spike 002 F1*
- **MUST** add client-side typewriter throttling for smooth streaming UX in production (Anthropic SSE batches deltas) — *spike 002 F8*
- **MUST** default to agentic search (grep/glob via Claude Code's own tools) — no vector DB by default; vector reserved for "real-time low-latency relevance" hot-paths only
- **MUST** keep all data local (markdown vault), never auto-upload to cloud

## Cost notes (per call, current OAuth subscription mode without --bare)

- First call in session: ~$0.55-0.67 (107k cache_creation tokens loading user CLAUDE.md)
- Subsequent calls in same session: ~10% of first (cache_read)
- Tool-use multi-turn: ~$0.60+ per round (e.g. spike 002 echo test = $0.6054, 10.5s)
- Production should explore: `--exclude-dynamic-system-prompt-sections` + `--add-dir` scope + custom `--system-prompt` to lower cache_creation

## Spikes

| # | Name | Type | Validates | Verdict | Tags |
|---|------|------|-----------|---------|------|
| 001 | stream-json-recon | standard | All event types/fields/sequence of `claude -p --output-format stream-json` are observable and parseable | VALIDATED ✓ | claude-cli, stream-json, subprocess, foundation |
| 002 | tauri-claude-shell | standard | Tauri 2 + SvelteKit can spawn claude subprocess and stream events into a chat UI with markdown/LaTeX/code rendering | VALIDATED ✓ | tauri, sveltekit, ui, integration |
