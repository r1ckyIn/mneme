# Spike Manifest

## Idea

Build a personal desktop learning app for USYD CS coursework that wraps the local
Claude Code CLI as a subprocess — three-pane UI (course files / video / chat),
local-first markdown vault, AI-native double-layer data model (human view: mindmap+whiteboard;
AI view: knowledge graph), Echo360 lecture video integration via embedded webview, FSRS-based
review of concept pages (no flashcards), and 50% open-source-integration philosophy.

## Requirements (locked as spikes progress)

- **MUST** spawn the real `claude` CLI subprocess (not impersonate or extract OAuth tokens) — Anthropic 2026.02 ToS compliance
- **MUST** use `--bare` flag in subprocess invocations — otherwise every call hits ~$0.67 from auto-loading user CLAUDE.md (107k cache-creation tokens) — *finding from spike 001*
- **MUST** use `--output-format stream-json --include-partial-messages` for live UI streaming
- **MUST** parse jsonl line-by-line and dispatch by `type` field
- **MUST** treat `result` event as the session terminator
- **MUST** support tool-use round-trip rendering (assistant → tool_use → user/tool_result → assistant)
- **MUST** default to agentic search (grep/glob via Claude Code's own tools) — no vector DB by default; vector reserved for "real-time low-latency relevance" hot-paths only
- **MUST** keep all data local (markdown vault), never auto-upload to cloud

## Spikes

| # | Name | Type | Validates | Verdict | Tags |
|---|------|------|-----------|---------|------|
| 001 | stream-json-recon | standard | All event types/fields/sequence of `claude -p --output-format stream-json` are observable and parseable | VALIDATED ✓ | claude-cli, stream-json, subprocess, foundation |
| 002 | tauri-claude-shell | standard | Tauri 2 + SvelteKit can spawn claude subprocess and stream events into a chat UI with markdown/LaTeX/code rendering | PENDING | tauri, sveltekit, ui, integration |
