<!--
  ChatPanel.svelte — Phase 1 single-session Claude chat (REQ-2 + parts of REQ-6).
  Mounts inside Splitter's right snippet (plan 01-05).

  Round 5 amendments absorbed:
    A-04 cost meter removal (no src/lib/cost.ts, no daily-usage write file, no $-cap state)
    A-08 Cmd+. added to UNBOUND_CODES (10 combos total)
    A-09 UsageMeter mount above input (replaces deleted cost surface)
    A-13 ChatFooter 1:1 Claude Code layout
    A-14 Tool-use rendering uses <details> with state-driven open attr
    A-10 setStatus updates TitlebarMeta connection-state dot at lifecycle transitions

  Lifts spike-002 +page.svelte patterns with hardening upgrades:
    1. Inline arg list -> buildClaudeArgs(userText, scratchDir) browser-safe SSOT (plan 01-02; .shared module — Cycle-2 HIGH-1 split)
    2. Inline renderMarkdown/renderMath -> sanitizeMarkdown/renderKatexInDom (plan 01-03)
    3. No teardown -> register_session_pid + clear_session_pid + stop_session IPC (plan 01-04)
    4. Status TTFT/event-count chrome -> dev console only (D-18)
    5. Empty-state hero -> blank scroller (UI-SPEC §"Empty state")
    6. Cost-meter scaffolding -> DELETED entirely (A-04)
    7. Footer = textarea + Send/Stop only -> expanded to full A-13 layout
    8. Node-resolved scratch dir -> homeDir() from @tauri-apps/api/path resolved
       at mount; passed as second arg to buildClaudeArgs (Cycle-2 HIGH-1 fix;
       replaces the original Node-builtin `os.homedir` import that broke
       Vite/SvelteKit bundling)

  TOKENICODE patterns absorbed (D-16):
    - finalizeOnce — idempotent teardown
    - control_request interception — bypass-mode hang prevention

  Cycle-1 MEDIUM closure (REVIEWS.md): spawn + invoke wrapped in try/catch with
  proper error UI surface (system bubble error variant); stop_session invoke also
  wrapped. The single legal `{@html}` site (system bubble error variant) consumes
  text already escapeHtml-cleaned at dispatch time.
-->
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Command } from "@tauri-apps/plugin-shell";
  import { invoke } from "@tauri-apps/api/core";
  import { homeDir } from "@tauri-apps/api/path";   // Cycle-2 HIGH-1 — browser-safe; Tauri 2 IPC bridge
  import { buildClaudeArgs, SCRATCH_DIR_REGEX } from "$lib/spawn-args.shared";  // Cycle-2 HIGH-1 — browser-safe SSOT (NEVER import from $lib/spawn-args.node)
  import {
    dispatchEvent,
    freshState,
    gerundHeader,
    pastTenseHeader,
    type DispatchState,
    type Msg,
  } from "$lib/stream-dispatch";
  import {
    sanitizeMarkdown,
    renderKatexInDom,
    escapeHtml,
  } from "$lib/sanitize";
  import { setStatus } from "$lib/connection-state.svelte";
  import UsageMeter from "$lib/components/UsageMeter.svelte";
  import ChatFooter from "$lib/components/ChatFooter.svelte";

  // ---------- state ----------
  let prompt = $state("");
  let dispatch = $state<DispatchState>(freshState());
  let pulseDotVisible = $state(false);
  let scroller: HTMLDivElement | undefined = $state();
  let inputBox: HTMLTextAreaElement | undefined = $state();
  let finalizeOnce: (() => void) | null = null;

  // A-06 visual toggle (no spawn-args effect Phase 1)
  let vaultContextActive = $state(false);
  function toggleVaultContext() {
    vaultContextActive = !vaultContextActive;
  }

  // A-09 — first-prompt anchor for the rolling session timer
  let sessionStartedAt = $state<Date | null>(null);

  // Cycle-2 HIGH-1 — scratchDir resolved on mount via @tauri-apps/api/path's
  // homeDir() (Tauri 2 IPC bridge — browser-safe; Vite-bundlable). The original
  // Node-builtin `os.homedir` import path failed Vite/SvelteKit bundling for
  // the WebView. The SSOT `buildClaudeArgs(prompt, scratchDir)` enforces a
  // SCRATCH_DIR_REGEX check on the value, so this resolution is the only
  // Phase-1 site where the path is computed for the spawn surface.
  let scratchDir = $state<string | null>(null);
  let scratchDirError = $state<string | null>(null);

  function autoGrow() {
    if (!inputBox) return;
    inputBox.style.height = "auto";
    inputBox.style.height = `${Math.min(inputBox.scrollHeight, 200)}px`;
  }

  // ---------- send-prompt orchestration ----------
  async function sendPrompt() {
    if (!prompt.trim() || dispatch.isStreaming) return;

    // Cycle-2 HIGH-1 — refuse to spawn until scratchDir resolves cleanly.
    // Surfacing the error in a system bubble (with escapeHtml on the regex
    // value to avoid HTML injection from a malformed path) lets the user
    // notice the early-mount race without console-only debugging.
    if (!scratchDir) {
      dispatch.messages = [
        ...dispatch.messages,
        {
          id: uid(),
          role: "system",
          text: escapeHtml(scratchDirError ?? "Scratch directory not yet resolved — please retry in a moment."),
          streaming: false,
        },
      ];
      return;
    }

    const userText = prompt.trim();
    if (!sessionStartedAt) sessionStartedAt = new Date();   // A-09 anchor

    dispatch.messages = [
      ...dispatch.messages,
      { id: uid(), role: "user", text: userText, streaming: false },
    ];
    prompt = "";
    if (inputBox) inputBox.style.height = "auto";
    dispatch.isStreaming = true;
    dispatch.resultReceived = false;
    pulseDotVisible = true;
    setStatus("connecting");   // A-10 — TitlebarMeta dot flips to gray

    // Cycle-1 MEDIUM closure: wrap spawn + invoke in try/catch so any
    // synchronous failure (capability rejection, IPC unavailable, builder
    // throwing on regex mismatch) surfaces as a system-bubble error rather
    // than leaving the UI in a permanently-streaming state.
    let cmd: Command<string>;
    try {
      // SSOT — capability layer (plan 01-02) enforces ~13 validators.
      // buildClaudeArgs(prompt, scratchDir) — Cycle-2 HIGH-1 split contract.
      cmd = Command.create("claude-bin", buildClaudeArgs(userText, scratchDir));
    } catch (e) {
      console.error("[claude:build-args]", e);
      dispatch.messages = [
        ...dispatch.messages,
        { id: uid(), role: "system", text: escapeHtml(`Failed to build spawn args: ${String(e)}`), streaming: false },
      ];
      teardown();
      return;
    }

    let buffer = "";
    let firstTextDeltaSeen = false;

    cmd.stdout.on("data", (chunk: string) => {
      buffer += chunk;
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
      for (const raw of parts) {
        if (!raw.trim()) continue;
        try {
          const evt = JSON.parse(raw);
          if (
            !firstTextDeltaSeen &&
            evt?.type === "stream_event" &&
            evt?.event?.delta?.type === "text_delta"
          ) {
            firstTextDeltaSeen = true;
            pulseDotVisible = false;
            setStatus("connected");   // A-10 — dot flips to green
          }
          if (evt?.type === "control_request") {
            console.log("[claude:control_request] skipped (Phase 1 baseline)", evt);
            continue;
          }
          dispatchEvent(evt, dispatch);
          dispatch.messages = dispatch.messages;   // force Svelte 5 reactivity
          scrollToBottomMaybe();
        } catch {
          // Malformed line — drop silently per spike landmine #2
        }
      }
    });

    cmd.stderr.on("data", (data: string) => {
      console.warn("[claude:stderr]", data);
    });

    cmd.on("error", (err) => {
      console.error("[claude:spawn-error]", err);
      dispatch.messages = [
        ...dispatch.messages,
        { id: uid(), role: "system", text: escapeHtml(String(err)), streaming: false },
      ];
      teardown();
    });

    cmd.on("close", () => {
      teardown();
      if (!dispatch.resultReceived) {
        dispatch.messages = [
          ...dispatch.messages,
          {
            id: uid(),
            role: "system",
            text: "stream ended unexpectedly (no result event)",
            streaming: false,
          },
        ];
        return;
      }
      // Finalize-render walker — replace finalized assistant bubble text with
      // sanitized markdown HTML, then walk for KaTeX math. The HTML injected
      // here is DOMPurify-cleaned at the source via sanitizeMarkdown.
      requestAnimationFrame(() => {
        const els = document.querySelectorAll<HTMLElement>(
          '[data-msg-role="assistant"][data-msg-streaming="false"]:not([data-msg-finalized="true"])'
        );
        for (const el of Array.from(els)) {
          const raw = el.textContent ?? "";
          const sanitized = sanitizeMarkdown(raw);
          const range = document.createRange();
          range.selectNodeContents(el);
          range.deleteContents();
          const frag = range.createContextualFragment(sanitized);
          el.appendChild(frag);
          renderKatexInDom(el);
          el.dataset.msgFinalized = "true";
        }
      });
    });

    // Spawn — hand PID to Rust state machine (plan 01-04). Wrapped in try/catch
    // (Cycle-1 MEDIUM closure) so capability/IPC failures surface as a system
    // bubble rather than a silent permanently-streaming UI.
    try {
      const child = await cmd.spawn();
      await invoke("register_session_pid", { pid: child.pid });
    } catch (e) {
      console.error("[claude:spawn-or-register]", e);
      dispatch.messages = [
        ...dispatch.messages,
        { id: uid(), role: "system", text: escapeHtml(`Failed to spawn claude or register PID: ${String(e)}`), streaming: false },
      ];
      teardown();
      return;
    }

    finalizeOnce = () => {
      finalizeOnce = null;
      dispatch.isStreaming = false;
      pulseDotVisible = false;
    };
  }

  function teardown() {
    if (finalizeOnce) finalizeOnce();
    // Best-effort IPC cleanup; plan 01-04's kill_pgid is safe against missing PIDs.
    invoke("clear_session_pid").catch(() => {});
    setStatus("disconnected");   // A-10 — dot back to gray on close
    // Belt-and-suspenders: if an early failure path skipped the finalizeOnce
    // assignment, force the streaming flag down so the input dock returns to
    // the send state.
    dispatch.isStreaming = false;
    pulseDotVisible = false;
  }

  async function onStop() {
    if (!dispatch.isStreaming) return;
    try {
      await invoke("stop_session");
    } catch (e) {
      console.warn("[stop_session] invoke failed", e);
    }
    // cmd.on("close") fires from the SIGKILL → teardown runs there.
  }

  // ---------- keyboard ----------
  function handleKey(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      sendPrompt();
    }
    // Shift+Enter falls through to default textarea newline (D-20).
  }

  // Hotkey unbinding — REQ-6 + Round 5 A-08.
  // 10 combos: Cmd+L / Cmd+K / Cmd+W / Cmd+, / Cmd+P / Cmd+O / Cmd+Shift+P /
  // Cmd+N / Cmd+R / Cmd+. (Period — A-08 addition).
  // Cmd+Q is NOT in this list — it goes to plan 01-04's RunEvent::ExitRequested
  // hook (the only OS-level kill path).
  // Cmd+W is preventDefault-ed at JS layer per CONTEXT.md L36-40 amendment 3
  // (closes the subprocess-leak path that would otherwise fire on macOS
  // default close-window).
  // Cmd+. (Period) is the Round 5 A-08 addition — sacrifices macOS convention
  // "Cancel current op" to keep Phase 1 keyboard surface narrow + explicit.
  // Stop is triggered ONLY via Send/Stop button click (D-19).
  const UNBOUND_CODES = new Set([
    "KeyL", "KeyK", "KeyW", "Comma", "KeyP", "KeyO", "KeyN", "KeyR", "Period",
  ]);
  function onWindowKeydown(e: KeyboardEvent) {
    if (!(e.metaKey || e.ctrlKey)) return;
    if (UNBOUND_CODES.has(e.code)) {
      e.preventDefault();
      // Silent — NO UI response, NO error log per REQ-6 acceptance.
    }
  }

  // ---------- scroll ----------
  function scrollToBottomMaybe() {
    if (!scroller) return;
    const dist = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    if (dist < 100) {
      requestAnimationFrame(() => {
        if (scroller) scroller.scrollTop = scroller.scrollHeight;
      });
    }
  }

  // ---------- lifecycle ----------
  // Cycle-2 HIGH-1 — resolve scratchDir at mount via Tauri's IPC-bridged path API.
  // Validation against SCRATCH_DIR_REGEX is defense-in-depth; the SSOT itself
  // also rejects non-conformant values when buildClaudeArgs is called.
  async function resolveScratchDir() {
    try {
      const home = await homeDir();   // e.g. "/Users/qinyuan/" or "/Users/qinyuan"
      const normalized = home.endsWith("/") ? home.slice(0, -1) : home;
      const candidate = `${normalized}/.mneme/scratch`;
      if (!new RegExp(SCRATCH_DIR_REGEX).test(candidate)) {
        scratchDirError =
          `[ChatPanel] resolved scratchDir "${candidate}" does not match ` +
          `SCRATCH_DIR_REGEX (${SCRATCH_DIR_REGEX}). Are you on macOS with a ` +
          `standard /Users/<name> home? Phase 1 spawn surface refuses to widen.`;
        console.error(scratchDirError);
        return;
      }
      scratchDir = candidate;
    } catch (e) {
      scratchDirError =
        `[ChatPanel] homeDir() (Tauri 2 IPC bridge) failed: ${String(e)}. ` +
        `Cannot spawn claude until scratchDir is resolved.`;
      console.error(scratchDirError);
    }
  }

  onMount(() => {
    window.addEventListener("keydown", onWindowKeydown);
    if (inputBox) inputBox.focus();
    void resolveScratchDir();   // fire-and-forget; sendPrompt early-returns until resolved
  });
  onDestroy(() => {
    window.removeEventListener("keydown", onWindowKeydown);
    teardown();
  });

  // ---------- helpers ----------
  let _uidCounter = 0;
  function uid(): string {
    return `m_${Date.now()}_${_uidCounter++}`;
  }

  function isErrorMsg(m: Msg): boolean {
    return (
      m.text.startsWith("Failed to") ||
      m.text.startsWith("stream ended") ||
      m.text.includes("not yet resolved") ||
      m.text.includes("&lt;")
    );
  }
</script>

<div class="chat-panel">
  <div class="message-scroller" bind:this={scroller}>
    {#each dispatch.messages as msg (msg.id)}
      {#if msg.role === "system"}
        <!-- Single legal {@html} site — text was escapeHtml-cleaned at dispatch
             OR sendPrompt time before reaching here (T-1-27 mitigation). -->
        <div class="bubble system" class:error={isErrorMsg(msg)}>
          {@html msg.text}
        </div>
      {:else if msg.role === "user"}
        <div class="bubble user">{msg.text}</div>
      {:else if msg.role === "assistant" && msg.streaming}
        <pre
          class="assistant streaming"
          data-msg-role="assistant"
          data-msg-streaming="true"
        >{msg.text}</pre>
        {#if msg.thinking}
          <span class="thinking-indicator">💭 thinking…</span>
        {/if}
      {:else if msg.role === "assistant"}
        <div
          class="assistant finalized"
          data-msg-role="assistant"
          data-msg-streaming="false"
        >{msg.text}</div>
      {/if}
    {/each}

    <!-- A-14: tool-use group rendered as <details>. Open during streaming;
         collapsed on result event. Header text from gerundHeader() / pastTenseHeader(). -->
    {#if dispatch.toolUseGroup.toolUses.length > 0}
      <details class="tool-use-group" open={dispatch.toolUseGroup.open}>
        <summary>
          {dispatch.toolUseGroup.open
            ? gerundHeader(dispatch.toolUseGroup)
            : pastTenseHeader(dispatch.toolUseGroup)}
        </summary>
        {#each dispatch.toolUseGroup.toolUses as t (t.id)}
          <div class="tool-use" class:complete={t.completed}>
            <span class="tool-name">{t.name}</span>
            <code class="tool-input">{t.inputPreview}</code>
            {#if t.completed}<span class="tool-status">✓</span>{/if}
          </div>
        {/each}
      </details>
    {/if}
  </div>

  <div class="composer">
    <!-- A-09: usage meter above input -->
    <UsageMeter dispatchState={dispatch} sessionStartedAt={sessionStartedAt} />

    <div class="input-shell" class:streaming={dispatch.isStreaming}>
      <textarea
        bind:this={inputBox}
        bind:value={prompt}
        oninput={autoGrow}
        onkeydown={handleKey}
        placeholder="Ask anything…"
        rows="1"
        spellcheck="false"
      ></textarea>

      <!-- A-13: chat footer with 5 left buttons + model pill + Send/Stop slot -->
      <ChatFooter
        vaultContextActive={vaultContextActive}
        onToggleVaultContext={toggleVaultContext}
      >
        {#snippet sendStopSlot()}
          {#if dispatch.isStreaming}
            <button
              type="button"
              class="send-btn stop"
              onclick={onStop}
              aria-label="Stop streaming"
              title="Stop"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                <rect x="5" y="5" width="14" height="14" rx="1.5" />
              </svg>
            </button>
            {#if pulseDotVisible}
              <span class="streaming-dot" aria-label="Connecting to Claude…"></span>
            {/if}
          {:else}
            <button
              type="button"
              class="send-btn send"
              onclick={sendPrompt}
              disabled={!prompt.trim()}
              aria-label="Send message"
              title="Send"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
                   stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
                   stroke-linejoin="round" aria-hidden="true">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            </button>
          {/if}
        {/snippet}
      </ChatFooter>
    </div>

    <div class="disclaimer">
      Claude can make mistakes; verify against the source.
    </div>
  </div>
</div>

<style>
  .chat-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg);
    color: var(--ink);
  }

  .message-scroller {
    flex: 1;
    overflow-y: auto;
    padding: var(--s-lg);
    display: flex;
    flex-direction: column;
    gap: var(--s-sm);
  }

  /* === Bubbles === */
  .bubble.system {
    background: transparent;
    color: var(--ink-mute);
    font-family: var(--font-mono);
    font-size: var(--fs-meta);
    border-left: 3px solid var(--border-strong);
    padding: var(--s-sm) var(--s-md);
    margin: var(--s-sm) 0;
  }
  .bubble.system.error {
    border-left-color: var(--error);
    color: var(--error);
  }

  .bubble.user {
    background: var(--bubble-user);
    color: var(--ink);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    line-height: var(--lh-body);
    padding: var(--s-sm) var(--s-md);
    border-radius: var(--r-lg);
    border-bottom-right-radius: var(--r-xs);
    align-self: flex-end;
    max-width: 75%;
    margin: var(--s-sm) 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .assistant.streaming {
    font-family: var(--font-mono);
    font-size: var(--fs-meta);
    color: var(--ink-soft);
    white-space: pre-wrap;
    padding: 0;
    margin: var(--s-sm) 0;
    max-width: 75%;
    align-self: flex-start;
    background: transparent;
    border: none;
  }

  .assistant.finalized {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    line-height: var(--lh-body);
    color: var(--ink);
    margin: var(--s-sm) 0;
    max-width: 75%;
    align-self: flex-start;
    background: transparent;
    border: none;
    word-break: break-word;
  }

  .thinking-indicator {
    font-style: italic;
    color: var(--ink-mute);
    font-family: var(--font-body);
    font-size: var(--fs-meta);
    align-self: flex-start;
  }

  /* === A-14 tool-use group <details> === */
  .tool-use-group {
    background: var(--bg-soft);
    border-left: 3px solid var(--orange);    /* allow-list site #6 */
    border-radius: 0 var(--r-sm) var(--r-sm) 0;
    margin: var(--s-sm) 0;
    align-self: flex-start;
    max-width: 75%;
    font-family: var(--font-mono);
    font-size: var(--fs-meta);
    color: var(--ink-soft);
    padding: var(--s-sm);
  }
  .tool-use-group summary {
    cursor: pointer;
    user-select: none;
    color: var(--ink);
    font-weight: var(--fw-semibold);
  }
  .tool-use {
    padding: var(--s-xs) 0;
    display: flex;
    align-items: baseline;
    gap: var(--s-sm);
  }
  .tool-use .tool-name {
    font-weight: var(--fw-semibold);
    color: var(--ink);
  }
  .tool-use .tool-input {
    color: var(--ink-mute);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }
  .tool-use .tool-status { color: var(--orange-deep); }
  .tool-use.complete .tool-name { color: var(--ink-soft); }

  /* === Composer === */
  .composer {
    flex: 0 0 auto;
    padding: 4px 22px 16px;
    background: var(--bg);
    position: sticky;
    bottom: 0;
  }

  .input-shell {
    position: relative;
    background: var(--paper);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: var(--s-sm) var(--s-sm);
    box-shadow: var(--shadow-sm);
    transition:
      border-color var(--d-base) var(--ease),
      box-shadow var(--d-base) var(--ease);
  }
  .input-shell:focus-within {
    border-color: var(--orange);
    box-shadow: var(--shadow-sm), 0 0 0 3px var(--orange-ring);
  }

  textarea {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    resize: none;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    line-height: var(--lh-body);
    color: var(--ink);
    min-height: 20px;
    max-height: 200px;
    padding: 4px 4px;
  }
  textarea::placeholder {
    color: var(--ink-mute);
    font-style: italic;
  }

  /* === Send / Stop button === */
  .send-btn {
    width: 28px;
    height: 28px;
    border-radius: var(--r-pill);
    background: var(--orange);
    border: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: white;
    transition:
      transform var(--d-fast) var(--ease),
      background var(--d-fast) var(--ease),
      opacity var(--d-base);
  }
  .send-btn:active {
    transform: scale(0.96);
  }
  .send-btn:disabled {
    background: var(--orange-soft);
    cursor: not-allowed;
    opacity: 0.7;
  }

  /* === Streaming dot === */
  .streaming-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: var(--r-pill);
    background: var(--orange);
    margin-left: 4px;
    animation: pulse var(--pulse-period) var(--ease) infinite;
    pointer-events: none;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50%      { opacity: 1.0; }
  }

  .disclaimer {
    text-align: center;
    margin-top: 8px;
    font-family: var(--font-body);
    font-size: 11.5px;
    color: var(--ink-mute);
    font-style: italic;
  }
</style>
