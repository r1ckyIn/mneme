---
name: spike-findings-learn-os
description: Implementation blueprint from spike experiments. Requirements, proven patterns, and verified knowledge for building learn-os (personal desktop learning app wrapping Claude Code). Auto-loaded during implementation work.
---

<context>
## Project: learn-os

Personal desktop learning app for USYD CS coursework that wraps the local Claude Code CLI as a subprocess — three-pane UI (course files / Echo360 video / chat), local-first markdown vault, AI-native double-layer data model (human view: mindmap + whiteboard; AI view: knowledge graph), Echo360 lecture video integration via embedded webview, FSRS-based review of concept pages (no flashcards), and 50% open-source-integration philosophy.

Spike sessions wrapped: 2026-05-06
</context>

<requirements>
## Non-negotiable Requirements

These are the design decisions that emerged from spike experiments. Every feature area reference must honor these.

### Subprocess integration

- **MUST** spawn the real `claude` CLI subprocess (not impersonate or extract OAuth tokens) — Anthropic 2026.02 ToS compliance
- **MUST** use `--output-format stream-json --include-partial-messages` for live UI streaming
- **MUST** parse stdout as JSONL line-by-line and dispatch by event `type` field
- **MUST** treat the `result` event as the session terminator
- **MUST** use `--permission-mode bypassPermissions` for tool calls in non-interactive subprocess (or expose user-toggle)
- **MUST NOT** use `--bare` — strips keychain reads, breaks OAuth subscription auth
- **MUST** show a "💭 thinking..." indicator for `thinking` blocks; never try to render encrypted signature content

### UI / rendering

- **MUST** sanitize every HTML injection site with DOMPurify (KaTeX `renderToString` + `marked.parse` output) — explicit tag/attr allowlist for math/svg
- **MUST** use SvelteKit + `@sveltejs/adapter-static` for SPA mode (no SSR server in Tauri)
- **MUST** finalize markdown + KaTeX rendering only on `result` event, not during streaming
- **MUST** add client-side typewriter throttling for smooth streaming UX (Anthropic SSE batches deltas)
- **MUST** require Rust ≥ 1.88 (pin in `rust-toolchain.toml`)
- **MUST** support tool-use round-trip rendering (assistant → tool_use card → user/tool_result card → assistant)

### Data / search

- **MUST** default to agentic search (grep/glob via Claude Code's own tools) — no vector DB by default; vector reserved for "real-time low-latency relevance" hot-paths only
- **MUST** keep all data local (markdown vault), never auto-upload to cloud

### Tooling

- **MUST** add `.gitignore` excluding `target/`, `node_modules/`, `.svelte-kit/`, `dist/`, `build/` (Rust target alone hits 1.9GB)
</requirements>

<findings_index>
## Feature Areas

| Area | Reference | Key Finding |
|------|-----------|-------------|
| Claude Code subprocess integration | `references/claude-subprocess.md` | 6-event taxonomy, JSONL line buffering, `--bare` is incompatible with OAuth subscription |
| Tauri desktop shell + streaming chat UI | `references/tauri-shell-ui.md` | Tauri 2 + SvelteKit + adapter-static + plugin-shell + DOMPurify is the locked stack |

## Source Files

Original spike source files are preserved in `sources/` for complete reference:

- `sources/001-stream-json-recon/` — recon scripts (`capture.sh`, `analyze.mjs`) + README
- `sources/002-tauri-claude-shell/` — minimal runnable Tauri app + README

When implementing the real chat panel, start from `sources/002-tauri-claude-shell/app/src/routes/+page.svelte` — it's the validated seed.

## Cost reality (OAuth subscription mode)

- First call in session: ~$0.55–0.67 (107k cache_creation tokens loading user CLAUDE.md)
- Subsequent calls in same session: ~10% (cache_read)
- Tool-use multi-turn: ~$0.60+ per round
- Production should research: `--exclude-dynamic-system-prompt-sections`, `--add-dir <vault>`, custom `--system-prompt`
</findings_index>

<metadata>
## Processed Spikes

- 001-stream-json-recon
- 002-tauri-claude-shell
</metadata>
