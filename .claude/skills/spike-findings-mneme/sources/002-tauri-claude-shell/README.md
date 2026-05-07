---
spike: 002
name: tauri-claude-shell
type: standard
validates: "Given Tauri 2 + SvelteKit + tauri-plugin-shell, when user types prompt and clicks send, then backend spawns claude --bare --output-format stream-json subprocess and frontend renders streaming events live with markdown / LaTeX / code rendering, plus tool-use round-trips."
verdict: VALIDATED ✓
related: [001]
tags: [tauri, sveltekit, ui, integration, foundation]
---

# Spike 002: Tauri × Claude Code Streaming Shell

## What This Validates

End-to-end "GUI wraps local Claude Code" path using the architecture we'll ship to production:

- Tauri 2 desktop shell (10MB binary) + SvelteKit (SPA mode, adapter-static) frontend
- `tauri-plugin-shell` to spawn `claude` subprocess long-lived, stream stdout
- Frontend parses jsonl line-by-line → dispatches by event `type` → renders chat bubbles
- Streaming text appears token-by-token (per-token `stream_event.content_block_delta`)
- On `result` event → finalize: full markdown render via `marked` + LaTeX render via KaTeX
- Tool-use round-trips visible (assistant → tool_use card → user/tool_result card → assistant)

## Research

**Stack picks (locked from prior `/gsd-explore` notes)**:
- Tauri 2 + SvelteKit + adapter-static (SPA mode) — tauri create-app `svelte-ts` template defaults to this
- `@tauri-apps/plugin-shell` for subprocess; `Command.create("claude-bin", args).spawn()` returns Child + EventEmitter
- Capability scope: `shell:allow-spawn` + `shell:allow-execute` with `{name: "claude-bin", cmd: "claude", args: true}` allow-list
- `marked` for markdown, `katex` for math, `dompurify` to sanitize HTML before injection
- Spike 001 finding applied: `--bare` flag mandatory (saves ~$0.67/call by skipping CLAUDE.md auto-load)

**Why not full SvelteKit features (routing, etc.)?** Spike scope is single-page chat. SvelteKit + adapter-static gives us SPA-mode for free; we use only `+page.svelte` + `+layout.ts`.

## How to Run

```bash
cd app/
npm install
npm run tauri dev    # First build downloads ~230 Rust crates, takes 5-15 minutes
```

The first cold build needs **Rust ≥ 1.88** (we hit a blocker on 1.85.1 — see Investigation Trail).

After first compile, incremental rebuilds are seconds.

A native window opens with a chat UI (dark theme).

## What to Expect

- Header shows status (`ready` / `streaming` / `idle`) + ttft + cost + duration
- Empty state shows 3 example prompts
- Type in textarea, Enter to send, Shift+Enter for newline
- During streaming: assistant bubble appears with raw monospace text, growing token-by-token
- After `result` event: bubble re-renders as full markdown with LaTeX (`$E=mc^2$` style)
- Tool calls appear as separate green-tinted cards with command + result
- Status shows event count growing during streaming

## Investigation Trail

1. **Scaffold via `npm create tauri-app@latest -- app -t svelte-ts -m npm -y --tauri-version 2 --identifier dev.mneme.spike`** — landed SvelteKit (not plain Svelte despite template name) with `adapter-static` SPA fallback. Good defaults.
2. **Added `@tauri-apps/plugin-shell` (npm) + `tauri-plugin-shell` 2.3.5 (Rust)**, registered in `src-tauri/src/lib.rs`.
3. **Configured capabilities** with allow-list for `claude` command (both spawn and execute permissions).
4. **Wrote chat UI in `src/routes/+page.svelte`** with Svelte 5 runes (`$state`):
   - JSONL line buffering (split on `\n`, parse, dispatch by `type`)
   - Stream event handler appends to active assistant bubble's text
   - On close: finalize markdown + KaTeX render (post-stream, not per-token)
   - Tool-use blocks render as separate cards
5. **Security hook flagged direct HTML injection in renderMath** → switched to `DOMPurify.sanitize()` with KaTeX-friendly tag/attr allowlist + `DOMParser` to construct DOM safely.
6. **First `npm run tauri dev` failed** with "rustc 1.85.1 is not supported" — many deps require 1.86+, some 1.88+. Ran `rustup update stable` → 1.95.0. Logged this as a project-level requirement.

## Results

**Verdict: VALIDATED ✓** — confirmed via 3 user-driven scenarios in the live Tauri window.

### Scenario 1 — Plain text streaming
- Prompt: "What is 2+2? Answer in one line."
- Outcome: subprocess spawned, system/init event rendered, assistant bubble showed "4", `result` event fired with ttft=3059ms, cost=$0.5477, duration=3157ms.

### Scenario 2 — Markdown + LaTeX
- Prompt: "Explain Pythagoras' theorem in 3 short sentences. Use a LaTeX formula for $a^2+b^2=c^2$."
- Outcome: 4-sentence response streamed in chunks; on `result` event, `$a^2+b^2=c^2$` re-rendered as proper KaTeX math (italic letters, raised superscripts). Cost: $0.5477 again (cache_creation each call).

### Scenario 3 — Agentic tool round-trip
- Prompt: "Use the Bash tool to run `echo spike-test`, then say `done` in one word."
- Outcome: 💭 thinking indicator → green Bash tool_use card with `{"command":"echo spike-test","description":"Echo test string"}` → green tool_result card showing `spike-test` → assistant "done". ttft=5780ms, cost=$0.6054, duration=10505ms.

All three scenarios produced the expected UI output end-to-end through the Tauri subprocess + JSONL parser + reactive Svelte chat → Tauri 2 + SvelteKit + tauri-plugin-shell stack is production-viable.

## Findings (running list, locked even if verdict PARTIAL)

### F1 — Rust ≥ 1.88 is required
Tauri 2.x deps (`darling 0.23`, `time 0.3.47`, `serde_with 3.19`, `icu_*`) require modern rustc.
**Project requirement**: Add `rustup update stable` to onboarding doc; pin minimum in `rust-toolchain.toml` later.

### F2 — `svelte-ts` template now ships SvelteKit + adapter-static
Despite the template name suggesting "plain Svelte", create-tauri-app `svelte-ts` (v4.6.2) gives us SvelteKit with SSR disabled via `adapter-static` SPA fallback. This is what we want.

### F3 — DOMPurify needed for KaTeX / marked output
The HTML injection sites (used by KaTeX's renderToString and marked's parse) were flagged by the security hook. **Project requirement**: every `{@html ...}` site and every direct DOM HTML assignment must go through `DOMPurify.sanitize()` with appropriate allowlist (math, mrow, mi, mo, mn, msup, msub, mfrac, msqrt, etc. for KaTeX).

### F4 — `--bare` flag carried forward from spike 001
All claude subprocess invocations use `--bare`. Confirmed allow-list in capabilities passes args through correctly.

### F6 — `--bare` incompatible with OAuth subscription
Spike 001 said "use --bare to skip CLAUDE.md auto-load and save $0.67/call". TURNS OUT: `--bare` also disables keychain reads → can't use OAuth subscription token, requires `ANTHROPIC_API_KEY` env var. For OAuth users (Claude Pro/Max), **must drop --bare**. Cost mitigation strategy for production:
- First call cost ~$0.67 (107k cache_creation tokens auto-loading user CLAUDE.md)
- Subsequent calls in same session reuse cache (cache_read tokens, ~10% cost)
- Long-term: use `--add-dir <vault>` to scope filesystem access, `--exclude-dynamic-system-prompt-sections` to improve cache reuse, `--system-prompt` / `--append-system-prompt` to override our context
- For pure isolation: require user to set `ANTHROPIC_API_KEY` and use --bare (cleaner but breaks OAuth subscription users)

### F7 — Tool use requires `--permission-mode bypassPermissions`
By default `--print` mode uses `permission_mode=default` which prompts for tool approval. Piped/non-interactive can't respond to prompts → tools silently denied. Pass `--permission-mode bypassPermissions` for tool-use to work in subprocess wrapping. Production app should expose this as user-controllable safety setting (since it grants the model arbitrary Bash/Edit/Write).

### F8 — Streaming arrives in chunks, not strict per-token
Anthropic's SSE protocol batches `content_block_delta` events server-side. A 100-token response may emit 5-15 `stream_event` events, each containing tens of tokens. Visual effect: chunky updates, not smooth typewriter. **Mitigation for production**: client-side typewriter buffer that paces text reveal at human-readable cadence (~30-50 tokens/sec), decoupling network jitter from UI smoothness.

### F9 — Thinking blocks are encrypted for OAuth users
`assistant.message.content[]` may contain `thinking` blocks but `thinking` field is empty string and content is encrypted in `signature` field. Anthropic does not expose CoT content to OAuth subscription users — only API users with extended thinking enabled can decrypt their own thinking. **For UI**: show a small "💭 thinking..." indicator only; never try to render thinking content.

### F5 — JSONL line buffering pattern (locked)
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
This pattern (essential — never assume one stdout chunk = one event line) is now a project-level convention.

## Files

| File | Purpose |
|------|---------|
| `app/src/routes/+page.svelte` | Chat UI + stream handling |
| `app/src/routes/+layout.ts` | SSR off, prerender on (SPA mode) |
| `app/src-tauri/src/lib.rs` | Tauri builder with shell plugin |
| `app/src-tauri/capabilities/default.json` | shell:allow-spawn/execute for `claude` |
| `app/src-tauri/Cargo.toml` | tauri-plugin-shell dep |
| `app/package.json` | npm deps: @tauri-apps/plugin-shell, marked, katex, dompurify |

## Impact on Real Build

If VALIDATED:
- Lock Tauri 2 + SvelteKit + adapter-static + tauri-plugin-shell as the production stack
- Lock the JSONL line-buffer pattern (F5) as the canonical event consumer
- Lock DOMPurify allowlist for KaTeX + marked output (F3)
- Add `rust-toolchain.toml` to project root with stable channel ≥ 1.88 (F1)
- This entire `+page.svelte` becomes the seed for the real chat panel (right column of the three-pane learning UI)
