<script lang="ts">
  import { tick } from "svelte";
  import { Command } from "@tauri-apps/plugin-shell";
  import { marked } from "marked";
  import katex from "katex";
  import DOMPurify from "dompurify";
  import "katex/dist/katex.min.css";

  type Role = "user" | "assistant" | "tool" | "system";
  type Msg = {
    id: string;
    role: Role;
    text: string;
    streaming: boolean;
    toolName?: string;
  };

  let prompt = $state("");
  let messages = $state<Msg[]>([]);
  let isStreaming = $state(false);
  let ttftMs = $state<number | null>(null);
  let totalCost = $state<number>(0);
  let totalDurationMs = $state<number>(0);
  let lastEventCount = $state(0);
  let scroller: HTMLDivElement;

  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  async function scrollToBottom() {
    await tick();
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }

  // Render markdown then sanitize. Trust KaTeX MathML/SVG elements.
  function renderMarkdown(text: string): string {
    const raw = marked.parse(text, { gfm: true, breaks: true }) as string;
    return DOMPurify.sanitize(raw, {
      ADD_TAGS: ["math", "annotation", "semantics", "mrow", "mi", "mo", "mn", "msup", "msub", "mfrac", "msqrt", "mspace", "mtext"],
      ADD_ATTR: ["mathvariant", "mathsize", "displaystyle", "scriptlevel", "encoding"],
    });
  }

  function renderMath(container: HTMLElement) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) nodes.push(n as Text);
    for (const node of nodes) {
      const txt = node.textContent ?? "";
      if (!/\$/.test(txt)) continue;
      const html = txt
        .replace(/\$\$([^$]+)\$\$/g, (_, m) =>
          katex.renderToString(m, { displayMode: true, throwOnError: false }),
        )
        .replace(/\$([^$\n]+)\$/g, (_, m) =>
          katex.renderToString(m, { displayMode: false, throwOnError: false }),
        );
      const tmp = document.createElement("span");
      // Sanitize KaTeX output before injecting
      const safeHTML = DOMPurify.sanitize(html, {
        ADD_TAGS: ["math", "annotation", "semantics", "mrow", "mi", "mo", "mn", "msup", "msub", "mfrac", "msqrt", "mspace", "mtext", "svg", "path", "g"],
        ADD_ATTR: ["mathvariant", "mathsize", "displaystyle", "scriptlevel", "encoding", "viewBox", "preserveAspectRatio", "d"],
      });
      const parser = new DOMParser();
      const parsed = parser.parseFromString(`<div>${safeHTML}</div>`, "text/html");
      const root = parsed.body.firstElementChild;
      if (root) {
        while (root.firstChild) tmp.appendChild(root.firstChild);
      }
      node.replaceWith(tmp);
    }
  }

  function ensureAssistantMsg(): Msg {
    const last = messages[messages.length - 1];
    if (last && last.role === "assistant" && last.streaming) return last;
    const m: Msg = { id: uid(), role: "assistant", text: "", streaming: true };
    messages = [...messages, m];
    return m;
  }

  async function sendPrompt() {
    if (!prompt.trim() || isStreaming) return;
    isStreaming = true;
    ttftMs = null;
    lastEventCount = 0;

    messages = [
      ...messages,
      { id: uid(), role: "user", text: prompt.trim(), streaming: false },
    ];
    const promptText = prompt.trim();
    prompt = "";
    await scrollToBottom();

    // NOTE: --bare strips keychain reads → can't use OAuth subscription. Drop it for now.
    // Cost trade-off: first call ~$0.67 (cache_creation 107k tokens of CLAUDE.md auto-load),
    // subsequent calls in same session use cache_read (much cheaper). Real product will need
    // a different strategy (custom system prompt + --bare + API key, OR --bare + apiKeyHelper).
    const cmd = Command.create("claude-bin", [
      "--print",
      "--permission-mode",
      "bypassPermissions",
      "--output-format",
      "stream-json",
      "--include-partial-messages",
      "--verbose",
      promptText,
    ]);

    let buffer = "";

    cmd.stdout.on("data", (line) => {
      buffer += line;
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
      for (const raw of parts) {
        if (!raw.trim()) continue;
        let evt: any;
        try {
          evt = JSON.parse(raw);
        } catch {
          continue;
        }
        handleEvent(evt);
        lastEventCount += 1;
      }
    });

    cmd.stderr.on("data", (data) => {
      console.warn("claude stderr:", data);
    });

    cmd.on("close", () => {
      isStreaming = false;
      messages = messages.map((m) => ({ ...m, streaming: false }));
      void scrollToBottom();
      requestAnimationFrame(() => {
        document
          .querySelectorAll(".bubble.assistant")
          .forEach((el) => renderMath(el as HTMLElement));
      });
    });

    cmd.on("error", (err) => {
      console.error("spawn error:", err);
      messages = [
        ...messages,
        { id: uid(), role: "system", text: `❌ spawn error: ${err}`, streaming: false },
      ];
      isStreaming = false;
    });

    try {
      await cmd.spawn();
    } catch (e) {
      messages = [
        ...messages,
        { id: uid(), role: "system", text: `❌ failed to spawn claude: ${e}`, streaming: false },
      ];
      isStreaming = false;
    }
  }

  function handleEvent(evt: any) {
    switch (evt.type) {
      case "system":
        if (evt.subtype === "init") {
          messages = [
            ...messages,
            {
              id: uid(),
              role: "system",
              text: `▶ session started · model=${evt.model} · cwd=${evt.cwd}`,
              streaming: false,
            },
          ];
        }
        break;

      case "stream_event": {
        if (typeof evt.ttft_ms === "number" && ttftMs === null) ttftMs = evt.ttft_ms;
        const inner = evt.event;
        if (!inner) return;
        if (
          inner.type === "content_block_delta" &&
          inner.delta?.type === "text_delta"
        ) {
          const m = ensureAssistantMsg();
          m.text += inner.delta.text;
          messages = [...messages];
          void scrollToBottom();
        }
        break;
      }

      case "user": {
        const content = evt.message?.content?.[0];
        if (content?.type === "tool_result") {
          messages = [
            ...messages,
            {
              role: "tool",
              id: uid(),
              text:
                typeof content.content === "string"
                  ? content.content
                  : JSON.stringify(content.content),
              streaming: false,
              toolName: "Tool result",
            },
          ];
          void scrollToBottom();
        }
        break;
      }

      case "assistant": {
        const blocks = evt.message?.content ?? [];
        for (const b of blocks) {
          if (b.type === "tool_use") {
            messages = [
              ...messages,
              {
                role: "tool",
                id: uid(),
                text: `\`${b.name}\`: ${JSON.stringify(b.input).slice(0, 200)}`,
                streaming: false,
                toolName: b.name,
              },
            ];
            void scrollToBottom();
          } else if (b.type === "thinking") {
            // Content is encrypted in signature for OAuth users; show indicator only.
            messages = [
              ...messages,
              {
                role: "system",
                id: uid(),
                text: "💭 thinking...",
                streaming: false,
              },
            ];
            void scrollToBottom();
          }
        }
        break;
      }

      case "result":
        totalCost = evt.total_cost_usd ?? 0;
        totalDurationMs = evt.duration_ms ?? 0;
        break;
    }
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendPrompt();
    }
  }
</script>

<div class="app">
  <header>
    <h1>mneme spike · Tauri × Claude Code</h1>
    <div class="status">
      {#if isStreaming}
        <span class="dot streaming"></span> streaming · {lastEventCount} events
      {:else if messages.length}
        <span class="dot idle"></span> idle
      {:else}
        <span class="dot idle"></span> ready
      {/if}
      {#if ttftMs !== null}· ttft {ttftMs} ms{/if}
      {#if totalCost > 0}· last cost ${totalCost.toFixed(4)}{/if}
      {#if totalDurationMs > 0}· {totalDurationMs} ms{/if}
    </div>
  </header>

  <div class="messages" bind:this={scroller}>
    {#if messages.length === 0}
      <div class="empty">
        <p>Type a prompt below. Try:</p>
        <ul>
          <li><code>What is 2+2?</code></li>
          <li><code>Render the quadratic formula in LaTeX</code></li>
          <li><code>Run `echo hello` via Bash and tell me the output</code></li>
        </ul>
      </div>
    {/if}
    {#each messages as m (m.id)}
      <div class="bubble {m.role}" class:streaming={m.streaming}>
        <div class="role">{m.role}{m.toolName ? " · " + m.toolName : ""}</div>
        {#if m.role === "assistant" && !m.streaming}
          {@html renderMarkdown(m.text)}
        {:else if m.role === "tool"}
          <pre class="tool-output">{m.text}</pre>
        {:else}
          <div class="content">{m.text}</div>
        {/if}
      </div>
    {/each}
  </div>

  <form
    onsubmit={(e) => {
      e.preventDefault();
      sendPrompt();
    }}
  >
    <textarea
      bind:value={prompt}
      onkeydown={handleKey}
      placeholder="Type your prompt — Enter to send, Shift+Enter for newline"
      disabled={isStreaming}
      rows="2"
    ></textarea>
    <button type="submit" disabled={isStreaming || !prompt.trim()}>
      {isStreaming ? "..." : "Send"}
    </button>
  </form>
</div>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 100%;
    background: #0e0e10;
    color: #e6e6e8;
    font-family: -apple-system, system-ui, sans-serif;
    font-size: 14px;
  }
  .app {
    display: grid;
    grid-template-rows: auto 1fr auto;
    height: 100vh;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 10px 16px;
    border-bottom: 1px solid #2a2a30;
    background: #15151a;
  }
  header h1 {
    font-size: 14px;
    margin: 0;
    font-weight: 500;
    color: #c8c8d0;
  }
  .status {
    font-size: 12px;
    color: #8a8a92;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #4a4a52;
  }
  .dot.streaming {
    background: #4ade80;
    animation: pulse 1s infinite;
  }
  .dot.idle {
    background: #4a4a52;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .messages {
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .empty {
    color: #6a6a72;
    padding: 24px;
    text-align: center;
  }
  .empty code {
    background: #1c1c22;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 12px;
  }
  .bubble {
    padding: 10px 14px;
    border-radius: 8px;
    max-width: 80%;
    line-height: 1.55;
    word-wrap: break-word;
  }
  .bubble.user {
    align-self: flex-end;
    background: #2a3a55;
    color: #e6e6e8;
  }
  .bubble.assistant {
    align-self: flex-start;
    background: #1c1c22;
    border: 1px solid #2a2a30;
  }
  .bubble.assistant.streaming .content {
    white-space: pre-wrap;
    font-family: ui-monospace, SF Mono, monospace;
    font-size: 13px;
  }
  .bubble.system {
    align-self: center;
    background: transparent;
    color: #6a6a72;
    font-size: 12px;
    border: 1px dashed #2a2a30;
  }
  .bubble.tool {
    align-self: flex-start;
    background: #1c1f1c;
    border: 1px solid #2a3a2a;
    font-family: ui-monospace, SF Mono, monospace;
    font-size: 12px;
  }
  .tool-output {
    margin: 0;
    white-space: pre-wrap;
  }
  .role {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #6a6a72;
    margin-bottom: 4px;
  }
  .bubble :global(p) { margin: 0 0 8px; }
  .bubble :global(p:last-child) { margin-bottom: 0; }
  .bubble :global(pre) {
    background: #0a0a0e;
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 12px;
  }
  .bubble :global(code) {
    background: #0a0a0e;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 0.9em;
  }
  .bubble :global(pre code) { background: transparent; padding: 0; }
  form {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid #2a2a30;
    background: #15151a;
  }
  textarea {
    flex: 1;
    background: #0e0e10;
    color: #e6e6e8;
    border: 1px solid #2a2a30;
    border-radius: 6px;
    padding: 10px;
    font: inherit;
    resize: none;
  }
  button {
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 0 18px;
    font: inherit;
    cursor: pointer;
  }
  button:disabled {
    background: #2a2a30;
    color: #6a6a72;
    cursor: not-allowed;
  }
</style>
