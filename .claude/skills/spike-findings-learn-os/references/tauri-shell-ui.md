# Tauri Desktop Shell with Streaming Chat UI

How to build the desktop wrapper around the local Claude Code subprocess with live markdown / LaTeX / tool-use rendering. Validated end-to-end in spike 002.

## Requirements

- **MUST** sanitize all HTML rendering sites with DOMPurify (KaTeX `renderToString` output + `marked` parse output)
- **MUST** require Rust ≥ 1.88 (pin in `rust-toolchain.toml`)
- **MUST** use SvelteKit + `@sveltejs/adapter-static` for SPA mode (no SSR — Tauri has no Node server)
- **MUST** show "💭 thinking..." indicator for `thinking` blocks but never render their content
- **MUST** finalize markdown + LaTeX rendering only on `result` event, not during streaming (escapes break partial markdown)
- **MUST** support tool-use round-trip rendering (assistant → tool_use card → user/tool_result card → assistant)

## How to Build It

### 1. Scaffold

```bash
npm create tauri-app@latest -- <name> -t svelte-ts -m npm -y --tauri-version 2 --identifier <id>
cd <name>
npm install @tauri-apps/plugin-shell marked katex dompurify
cargo add tauri-plugin-shell --manifest-path src-tauri/Cargo.toml
```

The `svelte-ts` template (create-tauri-app v4.6+) ships SvelteKit + `adapter-static` SPA fallback by default — that's what we want.

### 2. Register the shell plugin (`src-tauri/src/lib.rs`)

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 3. SPA mode (`src/routes/+layout.ts`)

```ts
export const ssr = false;
export const prerender = true;
```

### 4. Chat UI core (`src/routes/+page.svelte`) — key patterns

**State (Svelte 5 runes)**:
```ts
let prompt = $state("");
let messages = $state<Msg[]>([]);
let isStreaming = $state(false);
let ttftMs = $state<number | null>(null);
```

**Spawn + stream**:
```ts
const cmd = Command.create("claude-bin", [/* see claude-subprocess.md §1 */]);
let buffer = "";
cmd.stdout.on("data", (chunk) => {
  buffer += chunk;
  const parts = buffer.split("\n");
  buffer = parts.pop() ?? "";
  for (const raw of parts) {
    if (!raw.trim()) continue;
    handleEvent(JSON.parse(raw));
  }
});
cmd.on("close", () => {
  isStreaming = false;
  // Re-render markdown + KaTeX on assistant bubbles
  requestAnimationFrame(() => {
    document.querySelectorAll(".bubble.assistant").forEach((el) => renderMath(el));
  });
});
await cmd.spawn();
```

**Per-token append (streaming)**:
```ts
case "stream_event": {
  if (typeof evt.ttft_ms === "number" && ttftMs === null) ttftMs = evt.ttft_ms;
  const inner = evt.event;
  if (inner?.type === "content_block_delta" && inner.delta?.type === "text_delta") {
    const m = ensureAssistantMsg();
    m.text += inner.delta.text;
    messages = [...messages]; // trigger reactivity
  }
  break;
}
```

**Markdown finalize (post-stream)**:
```ts
function renderMarkdown(text: string): string {
  const raw = marked.parse(text, { gfm: true, breaks: true }) as string;
  return DOMPurify.sanitize(raw, {
    ADD_TAGS: ["math", "annotation", "semantics", "mrow", "mi", "mo", "mn", "msup", "msub", "mfrac", "msqrt", "mspace", "mtext"],
    ADD_ATTR: ["mathvariant", "mathsize", "displaystyle", "scriptlevel", "encoding"],
  });
}
```

**KaTeX render (DOM walk for `$...$` and `$$...$$`)**:
```ts
function renderMath(container: HTMLElement) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) nodes.push(n as Text);
  for (const node of nodes) {
    const txt = node.textContent ?? "";
    if (!/\$/.test(txt)) continue;
    const html = txt
      .replace(/\$\$([^$]+)\$\$/g, (_, m) => katex.renderToString(m, { displayMode: true, throwOnError: false }))
      .replace(/\$([^$\n]+)\$/g, (_, m) => katex.renderToString(m, { displayMode: false, throwOnError: false }));
    const safe = DOMPurify.sanitize(html, {
      ADD_TAGS: ["math", "annotation", "semantics", "mrow", "mi", "mo", "mn", "msup", "msub", "mfrac", "msqrt", "mspace", "mtext", "svg", "path", "g"],
      ADD_ATTR: ["mathvariant", "mathsize", "displaystyle", "scriptlevel", "encoding", "viewBox", "preserveAspectRatio", "d"],
    });
    const tmp = document.createElement("span");
    const parsed = new DOMParser().parseFromString(`<div>${safe}</div>`, "text/html");
    const root = parsed.body.firstElementChild;
    if (root) {
      while (root.firstChild) tmp.appendChild(root.firstChild);
    }
    node.replaceWith(tmp);
  }
}
```

### 5. Message types

```ts
type Role = "user" | "assistant" | "tool" | "system";
type Msg = {
  id: string;
  role: Role;
  text: string;
  streaming: boolean;
  toolName?: string;  // for tool messages
};
```

### 6. UI structure (3-row grid)

```
┌─────────────────────────────────┐
│ header: title + status          │  auto
├─────────────────────────────────┤
│ messages: scrollable list       │  flex
│   user / assistant / tool /     │
│   system bubbles                │
├─────────────────────────────────┤
│ input: textarea + send button   │  auto
└─────────────────────────────────┘
```

Status bar shows: streaming dot, event count, ttft_ms, last cost, duration.

## What to Avoid

- **DO NOT use plain `Svelte` (without Kit)** — you'll lose adapter-static fallback and have to wire SPA mode manually.
- **DO NOT render markdown during streaming** — partial markdown with unclosed code fences/tables breaks. Stream raw monospace text, finalize on `result`.
- **DO NOT skip DOMPurify on KaTeX or marked output** — security hooks will flag it, and even for self-use the model output should be treated as untrusted (prompt injection vector).
- **DO NOT assume Tauri webview behaves identically to system Chrome** — different rendering quirks, especially for SVG/MathML.
- **DO NOT commit `target/` or `node_modules/`** — they hit 1.9GB+ on cold build. Use a `.gitignore` at the repo root.

## Constraints

- **Rust ≥ 1.88** required (Tauri 2 deps: `darling 0.23`, `time 0.3.47`, `serde_with 3.19`, `icu_*` 2.x). On macOS run `rustup update stable` if you hit "rustc 1.85.1 is not supported".
- **First Rust build** downloads ~230 crates (~18 MB), takes 5–15 minutes. Subsequent builds are seconds.
- **Cold app launch (first run)**: ~1m 22s for tauri-plugin-shell + tauri + app crates to compile.
- **Streaming smoothness**: chunky by default (Anthropic SSE batches deltas). Production needs typewriter throttle.
- **Native window**: macOS only tested. Windows/Linux should work but unverified.

## Quick checklist for new spike or production phase

- [ ] `rustup update stable` → ≥ 1.88
- [ ] `npm create tauri-app@latest -- <name> -t svelte-ts -m npm -y --tauri-version 2`
- [ ] `npm install @tauri-apps/plugin-shell marked katex dompurify`
- [ ] `cargo add tauri-plugin-shell --manifest-path src-tauri/Cargo.toml`
- [ ] Register `tauri_plugin_shell::init()` in `src-tauri/src/lib.rs`
- [ ] Add `shell:allow-spawn` capability with `claude-bin` allow-list
- [ ] `+layout.ts`: `ssr = false; prerender = true`
- [ ] Add `.gitignore`: `target/`, `node_modules/`, `.svelte-kit/`, `dist/`, `build/`
- [ ] Use claude args from `claude-subprocess.md §1`
- [ ] JSONL buffer + dispatch (see §4 above)
- [ ] DOMPurify all HTML injection sites (markdown + KaTeX)

## Origin

Synthesized from spike: **002-tauri-claude-shell** (end-to-end Tauri 2 + SvelteKit + claude streaming UI).

Source files available in: `sources/002-tauri-claude-shell/` (README + key source: `+page.svelte`, `+layout.ts`, `lib.rs`, `default.json`, `Cargo.toml`, `package.json`).
