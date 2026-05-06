# Spike Conventions

Patterns and stack choices established across spike sessions. New spikes follow these unless the question requires otherwise.

## Stack

- **Desktop shell**: Tauri 2 (Rust ≥ 1.88 required — pin in `rust-toolchain.toml`)
- **Frontend**: SvelteKit + Svelte 5 (runes: `$state`, `$derived`) + `@sveltejs/adapter-static` for SPA mode (no SSR)
- **TypeScript**: strict mode (default from `npm create tauri-app`), no path aliases yet
- **Subprocess**: `tauri-plugin-shell` 2.x — `Command.create()` for binaries on PATH, `Command.sidecar()` for bundled
- **Markdown**: `marked` (GFM + breaks) for rendering
- **Math**: `katex` v0.16+ via `renderToString()` + auto-import `katex/dist/katex.min.css`
- **Sanitization**: `dompurify` with KaTeX-friendly tag/attr allowlist (math, mrow, mi, mo, mn, msup, msub, mfrac, msqrt, plus svg/path/g; mathvariant, viewBox, encoding)
- **No vector DB by default** — agentic search via grep/glob (Anthropic's own pattern)

## Structure

```
.planning/spikes/NNN-name/
├── README.md           # frontmatter + investigation trail + findings + verdict
├── (any scripts)       # bash/node helpers for fact-finding spikes
├── captures/           # raw output samples (jsonl, screenshots)
└── app/                # full runnable spike app (gitignored: target/, node_modules/, dist/)
    ├── package.json
    ├── src/
    │   └── routes/
    │       ├── +page.svelte    # main UI
    │       └── +layout.ts      # SSR off, prerender on
    ├── src-tauri/
    │   ├── src/lib.rs          # Tauri builder + plugin registration
    │   ├── capabilities/default.json   # shell:allow-spawn allow-list per command
    │   ├── Cargo.toml
    │   └── tauri.conf.json
    ├── svelte.config.js        # adapter-static with index.html fallback
    └── vite.config.js
```

Numbering: `001`, `002`, `002a`, `002b` (letter suffix for comparison spikes sharing one number).

## Patterns

### claude CLI subprocess (locked across spikes 001, 002)

```ts
const cmd = Command.create("claude-bin", [
  "--print",
  "--permission-mode", "bypassPermissions",  // required for tools in piped mode
  "--output-format", "stream-json",
  "--include-partial-messages",
  "--verbose",
  promptText,
]);
// DO NOT use --bare — strips keychain reads, breaks OAuth subscription auth
```

Capability allow-list (in `src-tauri/capabilities/default.json`):
```json
{
  "identifier": "shell:allow-spawn",
  "allow": [{ "name": "claude-bin", "cmd": "claude", "args": true }]
}
```

### JSONL line buffering (locked)

stdout chunks do NOT correspond 1:1 to JSON event lines. Always buffer and split on `\n`:

```ts
let buffer = "";
cmd.stdout.on("data", (chunk) => {
  buffer += chunk;
  const parts = buffer.split("\n");
  buffer = parts.pop() ?? "";  // keep partial last line
  for (const raw of parts) {
    if (!raw.trim()) continue;
    const evt = JSON.parse(raw);
    handleEvent(evt);
  }
});
```

### Event dispatch (locked, full taxonomy in spike 001 README)

```ts
switch (evt.type) {
  case "system":         // mostly suppress; show "▶ session started" on subtype=init
  case "stream_event":   // primary UI: render evt.event.delta.text on content_block_delta
  case "assistant":      // handle tool_use blocks; thinking blocks → indicator only
  case "user":           // tool_result payload
  case "rate_limit_event":
  case "result":         // session terminator — finalize markdown + KaTeX render
}
```

### Streaming UX

- During streaming: append raw text to assistant bubble, monospace font, no markdown render (escapes break partial markdown anyway)
- On `result` event: re-render bubble as full markdown via `marked`, then walk DOM for `$...$` / `$$...$$` and KaTeX-render via `renderToString` (sanitized through DOMPurify)
- Anthropic SSE batches deltas — production needs typewriter throttle for smooth UX (post-spike concern)

### HTML safety (locked)

EVERY `{@html ...}` site and every direct DOM HTML assignment goes through `DOMPurify.sanitize()` with explicit allowlist. Construct DOM via `DOMParser` + `appendChild` rather than raw HTML property assignment, to satisfy security tooling.

## Tools & Libraries

| Library | Version | Use |
|---------|---------|-----|
| `@tauri-apps/api` | ^2 | Tauri JS bindings |
| `@tauri-apps/plugin-shell` | ^2 | Subprocess spawn + stdout streaming |
| `@sveltejs/adapter-static` | ^3 | SPA fallback for Tauri (no SSR server) |
| `@sveltejs/kit` | ^2.9 | Routing + build |
| `svelte` | ^5 | Runes + reactivity |
| `marked` | latest | Markdown → HTML |
| `katex` | ^0.16 | Math rendering |
| `dompurify` | latest | HTML sanitization |
| `tauri-plugin-shell` (Rust) | 2.3.5 | Backend shell plugin |
| `tauri` (Rust) | 2.x | Core |

**Avoid for now**: Tiptap (not yet needed for chat UI), Cytoscape.js (graph view = later phase), shadcn-svelte (cosmetic, defer until UI design phase).

## Cost notes

- First call in OAuth-subscription session: ~$0.55-0.67 (107k cache_creation from auto-loaded CLAUDE.md)
- Subsequent calls in same session: ~10% cost (cache_read)
- Tool-use multi-turn: ~$0.60+ per round
- Production strategies to lower: `--exclude-dynamic-system-prompt-sections`, `--add-dir <vault>` to scope, custom `--system-prompt`
