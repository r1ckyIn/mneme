# Spike Wrap-Up Summary

**Date:** 2026-05-06
**Spikes processed:** 2
**Feature areas:** Claude Code subprocess integration, Tauri desktop shell + streaming chat UI
**Skill output:** `./.claude/skills/spike-findings-learn-os/`

## Processed Spikes

| # | Name | Type | Verdict | Feature Area |
|---|------|------|---------|--------------|
| 001 | stream-json-recon | standard | VALIDATED ✓ | Claude Code subprocess integration |
| 002 | tauri-claude-shell | standard | VALIDATED ✓ | Tauri desktop shell + streaming chat UI |

## Key Findings

1. **Architecture green light** — Tauri 2 + SvelteKit + tauri-plugin-shell + claude subprocess + stream-json works end-to-end. No architectural blockers.
2. **Event taxonomy locked** — 6 top-level event types (`system`, `stream_event`, `assistant`, `user`, `rate_limit_event`, `result`); `result` is reliable session terminator.
3. **`--bare` flag is incompatible with OAuth subscription** — spike 001's "must use --bare to save cost" assumption was invalidated by spike 002. `--bare` strips keychain reads.
4. **Tool calls require `--permission-mode bypassPermissions`** in non-interactive subprocess.
5. **Cost reality**: ~$0.55–0.67 first call (cache_creation), ~10% cache_read after. Production needs cost mitigation strategies (`--add-dir`, custom system prompt, `--exclude-dynamic-system-prompt-sections`).
6. **Anthropic SSE batches deltas** — chunky streaming (5–15 events per 100 tokens). Production needs client-side typewriter throttle.
7. **Thinking content is encrypted** for OAuth users — UI can only show 💭 indicator, not content.
8. **Rust ≥ 1.88 required** — Tauri 2 deps demand modern rustc.
9. **DOMPurify mandatory** for all HTML injection sites (KaTeX + marked output).
10. **JSONL buffering essential** — stdout chunks ≠ event lines; always buffer and split on `\n`.

## What's Next

The `spike-findings-learn-os` skill is now auto-loaded in future build conversations. The next conversation can:

1. Run `/gsd-new-project` (resume) to bake these decisions into PROJECT.md / REQUIREMENTS.md / ROADMAP.md
2. Or run `/gsd-spike` (frontier mode) to surface what else is worth spiking before committing to the plan (P0-2 Echo360 webview SSO is the next-highest risk)
