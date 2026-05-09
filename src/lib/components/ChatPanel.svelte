<!--
  ChatPanel.svelte — Phase 1 single-session Claude chat (REQ-2 + parts of REQ-6).
  Plan 01-09 rewrite (T-1-47 / A-09 closure): streaming render fix +
  prototype-matched layout via UserBubble / AssistantMessage / ToolUseGroup.

  T-1-47 STREAMING RENDER FIX:
    Before: text_delta appended raw chars to a <pre> in monospace; markdown
    only re-rendered on `result`. Mismatch with Claude Desktop UX.
    After: every text_delta updates assistantHtml = sanitizeMarkdown(buffer);
    AssistantMessage re-renders the {@html} fragment + runs renderKatexInDom.
    rAF batching coalesces multiple chunks within one frame.

    Key: the text-buffer per assistant message is owned by stream-dispatch
    (`Msg.text` accumulates in the existing `case "stream_event"` arm).
    ChatPanel just reads .text and re-derives sanitized HTML reactively.

  A-09 closure: usage meter is between scroll and footer; counts read from
  state.totalInputTokens accumulator (already present in stream-dispatch).

  Round 5 amendments preserved:
    A-04 cost meter removal (no $-cap state)
    A-08 Cmd+. added to UNBOUND_CODES (10 combos total)
    A-09 UsageMeter mount above input
    A-13 ChatFooter 1:1 Claude Code layout
    A-14 Tool-use rendering uses ToolUseGroup (state-driven open attr)
    A-10 setStatus updates TitlebarMeta connection-state dot

  Cycle-2 HIGH-1 (preserved): browser-safe homeDir() + buildClaudeArgs
  contract; SCRATCH_DIR_REGEX defense-in-depth.

  Cycle-1 MEDIUM closure (preserved): spawn + invoke wrapped in try/catch;
  finalizeOnce idempotent teardown; control_request interception.

  Visual SSOT: Mneme.html L587-1022 (chat surface: header, scroll, messages,
  composer, input-shell, send-btn, disclaimer).
-->
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Command } from "@tauri-apps/plugin-shell";
  import { invoke } from "@tauri-apps/api/core";
  import { homeDir } from "@tauri-apps/api/path";
  import { buildClaudeArgs, SCRATCH_DIR_REGEX } from "$lib/spawn-args.shared";
  import {
    dispatchEvent,
    freshState,
    type DispatchState,
    type Msg,
  } from "$lib/stream-dispatch";
  import { sanitizeMarkdown, escapeHtml } from "$lib/sanitize";
  import { setStatus } from "$lib/connection-state.svelte";
  import UsageMeter from "$lib/components/UsageMeter.svelte";
  import ChatFooter from "$lib/components/ChatFooter.svelte";
  import UserBubble from "$lib/components/UserBubble.svelte";
  import AssistantMessage from "$lib/components/AssistantMessage.svelte";
  import ToolUseGroup from "$lib/components/ToolUseGroup.svelte";

  // ---------- state ----------
  let prompt = $state("");
  let dispatch = $state<DispatchState>(freshState());
  let pulseDotVisible = $state(false);
  let scroller: HTMLDivElement | undefined = $state();
  let inputBox: HTMLTextAreaElement | undefined = $state();
  let finalizeOnce: (() => void) | null = null;

  // T-1-47 / A-09 streaming-render cache: msg.id -> sanitized HTML.
  // Reactive map driven by `messages` mutation in dispatchEvent. The cache is
  // recomputed inside an rAF tick in onChunk to coalesce multiple text_delta
  // events arriving within one frame (the marked + DOMPurify pipeline is fast
  // but called once per delta would still saturate the main thread on dense
  // streams).
  //
  // We keep this in a $state Map so AssistantMessage's `html` prop is a plain
  // string read from the map keyed by message id; Svelte 5 fine-grained
  // reactivity tracks the lookup.
  let assistantHtmlCache = $state<Map<string, string>>(new Map());

  // A-06 visual toggle (no spawn-args effect Phase 1)
  let vaultContextActive = $state(false);
  function toggleVaultContext() {
    vaultContextActive = !vaultContextActive;
  }

  // A-09 — first-prompt anchor for the rolling session timer
  let sessionStartedAt = $state<Date | null>(null);

  // Cycle-2 HIGH-1 — scratchDir resolved on mount via @tauri-apps/api/path's
  // homeDir() (Tauri 2 IPC bridge — browser-safe; Vite-bundlable).
  let scratchDir = $state<string | null>(null);
  let scratchDirError = $state<string | null>(null);

  function autoGrow() {
    if (!inputBox) return;
    inputBox.style.height = "auto";
    inputBox.style.height = `${Math.min(inputBox.scrollHeight, 160)}px`;
  }

  // T-1-47 streaming-render core: rAF-batched recompute of the streaming
  // assistant message's sanitized HTML. Called from the stdout `data` handler
  // after dispatchEvent has appended the chunk to .text. Only walks the
  // CURRENTLY-streaming assistant Msg (the last assistant in messages where
  // streaming=true).
  let pendingRecompute = false;
  function scheduleHtmlRecompute() {
    if (pendingRecompute) return;
    pendingRecompute = true;
    requestAnimationFrame(() => {
      pendingRecompute = false;
      const next = new Map(assistantHtmlCache);
      for (const m of dispatch.messages) {
        if (m.role !== "assistant") continue;
        // Re-sanitize streaming OR finalized assistant messages whose text
        // hasn't been hashed yet, OR whose text changed since last hash.
        // Simple fingerprint: cache key = message id; recompute every tick
        // for streaming messages (text grows monotonically), recompute once
        // for finalized messages (text is stable).
        const cached = next.get(m.id);
        if (m.streaming || !cached || cached.length < m.text.length) {
          next.set(m.id, sanitizeMarkdown(m.text));
        }
      }
      assistantHtmlCache = next;
    });
  }

  // ---------- send-prompt orchestration ----------
  async function sendPrompt() {
    if (!prompt.trim() || dispatch.isStreaming) return;

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
    setStatus("connecting");

    let cmd: Command<string>;
    try {
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
      let mutated = false;
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
            setStatus("connected");
          }
          if (evt?.type === "control_request") {
            console.log("[claude:control_request] skipped (Phase 1 baseline)", evt);
            continue;
          }
          dispatchEvent(evt, dispatch);
          mutated = true;
        } catch {
          // Malformed line — drop silently per spike landmine #2
        }
      }
      if (mutated) {
        // T-1-47 — recompute sanitized HTML for streaming assistants AND
        // force Svelte 5 reactivity by reassigning the messages array.
        dispatch.messages = dispatch.messages;
        scheduleHtmlRecompute();
        scrollToBottomMaybe();
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
      // Final HTML recompute — flushes any in-flight text into the cache.
      // (T-1-47 already recomputes during streaming so this is mostly a
      // safety net for the last partial chunk between rAF tick + close.)
      scheduleHtmlRecompute();
    });

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
    invoke("clear_session_pid").catch(() => {});
    setStatus("disconnected");
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
  }

  // ---------- keyboard ----------
  function handleKey(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      sendPrompt();
    }
    // Shift+Enter falls through to default textarea newline (D-20).
  }

  // Hotkey unbinding — REQ-6 + Round 5 A-08. 10 combos.
  const UNBOUND_CODES = new Set([
    "KeyL", "KeyK", "KeyW", "Comma", "KeyP", "KeyO", "KeyN", "KeyR", "Period",
  ]);
  function onWindowKeydown(e: KeyboardEvent) {
    if (!(e.metaKey || e.ctrlKey)) return;
    if (UNBOUND_CODES.has(e.code)) {
      e.preventDefault();
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
  async function resolveScratchDir() {
    try {
      const home = await homeDir();
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
    void resolveScratchDir();
    // Plan 01-09 Task 10 dev hook: visiting `?stream=demo` triggers the
    // dev probe with a synthetic stream-event sequence so the visual
    // verification step can capture an in-progress (mid-stream) snapshot
    // without a live Claude subprocess. Gated by import.meta.env.DEV so
    // production builds never auto-inject.
    if (import.meta.env.DEV && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("stream") === "demo") {
        // Push a user prompt + simulate a partial assistant response with
        // markdown + KaTeX + a tool-use group. Snapshot is taken BEFORE
        // the synthetic `result` event so streaming flag stays true.
        dispatch.messages = [
          ...dispatch.messages,
          {
            id: uid(),
            role: "user",
            text: "In the lecture around 24:00, the prof writes the Bellman equation for the rod-cutting problem. Can you transcribe the recurrence and explain why the inner max ranges over i = 1..n?",
            streaming: false,
          },
        ];
        // Simulate the consolidated assistant event WITH a tool_use block so
        // ToolUseGroup renders. Then stream text deltas.
        dispatchEvent({
          type: "assistant",
          message: {
            content: [
              { type: "tool_use", id: "tu_1", name: "Read",   input: { path: "transcript.vtt" } },
              { type: "tool_use", id: "tu_2", name: "Grep",   input: { pattern: "rod-cutting" } },
            ],
          },
        } as any, dispatch);
        const chunks = [
          "From the transcript at `24:08` the recurrence is:\n\n",
          "$$r(n) = \\max_{1 \\le i \\le n} \\{ p_i + r(n-i) \\}$$\n\n",
          "The inner `max` ranges over every possible *first cut*: ",
          "you commit to selling a piece of length `i` for price `p_i`, ",
          "then recursively solve the remaining rod of length `n − i`. ",
          "Since `i` can be anything from `1` (cut off a unit piece) to `n` ",
          "(don't cut at all — sell the whole rod), the loop is `i = 1..n`.\n\n",
          "The base case $r(0) = 0$ closes the recursion.",
        ];
        for (const text of chunks) {
          dispatchEvent({
            type: "stream_event",
            event: { delta: { type: "text_delta", text } },
          } as any, dispatch);
        }
        // Force reactivity + recompute HTML; do NOT inject `result` event so
        // the streaming flag stays true (.stream-dot visible at end).
        dispatch.messages = dispatch.messages;
        dispatch.isStreaming = true;
        scheduleHtmlRecompute();
      }
    }
  });
  onDestroy(() => {
    window.removeEventListener("keydown", onWindowKeydown);
    teardown();
  });

  // ---------- helpers ----------
  // Plan 01-09 fix: ChatPanel and stream-dispatch each maintain their own
  // counter; without distinct prefixes the two prefixes collided in the same
  // millisecond and triggered `each_key_duplicate` (Svelte 5 keyed each).
  // Use `cp_` so the two id namespaces never overlap.
  let _uidCounter = 0;
  function uid(): string {
    return `cp_${Date.now()}_${_uidCounter++}`;
  }

  function isErrorMsg(m: Msg): boolean {
    return (
      m.text.startsWith("Failed to") ||
      m.text.startsWith("stream ended") ||
      m.text.includes("not yet resolved") ||
      m.text.includes("&lt;")
    );
  }

  // === T-1-47 dev probe (mounted on window for visual_fidelity verification) ===
  // Lets the visual-verification step inject a synthetic stream-event sequence
  // and assert the rendered DOM contains marked-up content — NOT a single <pre>
  // block of raw text. Activated only in dev mode (import.meta.env.DEV).
  if (typeof window !== "undefined" && import.meta.env.DEV) {
    (window as any).__mneme_inject_stream__ = (chunks: string[]) => {
      // Synthesize a fresh assistant message via the dispatch system using
      // stream_event envelopes; runs the same code path as a live spawn.
      for (const text of chunks) {
        dispatchEvent({
          type: "stream_event",
          event: { delta: { type: "text_delta", text } },
        } as any, dispatch);
      }
      dispatch.messages = dispatch.messages;
      scheduleHtmlRecompute();
    };
    (window as any).__mneme_finalize_stream__ = () => {
      dispatchEvent({
        type: "result",
        usage: { input_tokens: 0 },
        total_cost_usd: 0,
      } as any, dispatch);
      dispatch.messages = dispatch.messages;
      scheduleHtmlRecompute();
    };
  }
</script>

<section class="chat">
  <header class="chat-header">
    <span class="slot-path">
      <svg class="folder-ico" width="12" height="12" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
           stroke-linejoin="round" aria-hidden="true">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>
      </svg>
      <span>COMP3027</span>
      <span class="sep">/</span>
      <span class="leaf">Rod-cutting recurrence</span>
    </span>
  </header>

  <div class="chat-scroll" bind:this={scroller}>
    <div class="messages">
      {#each dispatch.messages as msg (msg.id)}
        {#if msg.role === "system"}
          <!-- Single legal {@html} site for system errors — text was
               escapeHtml-cleaned at dispatch / sendPrompt time (T-1-27). -->
          <div class="bubble system" class:error={isErrorMsg(msg)}>
            {@html msg.text}
          </div>
        {:else if msg.role === "user"}
          <UserBubble text={msg.text} />
        {:else if msg.role === "assistant"}
          <AssistantMessage
            html={assistantHtmlCache.get(msg.id) ?? ""}
            streaming={msg.streaming}
          />
        {/if}
      {/each}

      <!-- A-14 tool-use group (collapsed/expanded driven by dispatch.toolUseGroup.open). -->
      <ToolUseGroup
        group={dispatch.toolUseGroup}
        streaming={dispatch.isStreaming}
      />
    </div>
  </div>

  <div class="composer">
    <UsageMeter dispatchState={dispatch} sessionStartedAt={sessionStartedAt} />

    <div class="input-shell" class:streaming={dispatch.isStreaming}>
      <textarea
        bind:this={inputBox}
        bind:value={prompt}
        oninput={autoGrow}
        onkeydown={handleKey}
        placeholder="Write a message…"
        rows="1"
        spellcheck="false"
      ></textarea>

      <ChatFooter
        vaultContextActive={vaultContextActive}
        onToggleVaultContext={toggleVaultContext}
      >
        {#snippet sendStopSlot()}
          {#if dispatch.isStreaming}
            <button type="button" class="send-btn" data-state="streaming"
                    onclick={onStop} aria-label="Stop streaming" title="Stop">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" aria-hidden="true">
                <rect x="5" y="5" width="14" height="14" rx="1.5" />
              </svg>
            </button>
          {:else}
            <button type="button" class="send-btn"
                    data-state={prompt.trim() ? "idle-typed" : "idle-empty"}
                    onclick={sendPrompt}
                    disabled={!prompt.trim()}
                    aria-label="Send message" title="Send">
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

    <div class="disclaimer">Claude can make mistakes; verify against the source.</div>
  </div>
</section>

<style>
  /* SSOT: Mneme.html L587-1022. */

  .chat {
    display: grid;
    grid-template-rows: auto 1fr auto;
    height: 100%;
    min-height: 0;
    position: relative;
    background: var(--color-cream);
  }

  /* Chat header — slot-path breadcrumb (mono 11.5px). Mneme.html L595-615 +
     L1293-1303. Padding tuned so it sits in the right pane's 36px reserved
     zone (TitlebarMeta lives at top-right of the WINDOW; this header lives
     at top-of-pane so it ends up below the meta). */
  .chat-header {
    position: relative;
    min-height: 42px;
    padding: 14px 22px 8px;
    display: flex;
    align-items: center;
  }
  .chat-header .slot-path {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 11.5px;
    letter-spacing: 0.01em;
    color: var(--color-warm-dark-soft);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .chat-header .slot-path .sep { color: var(--color-warm-dark-mute); opacity: 0.55; }
  .chat-header .slot-path .leaf { color: var(--color-warm-dark); }
  .chat-header .folder-ico { opacity: 0.55; flex: 0 0 auto; }

  /* Scroll surface — Mneme.html L617-630. */
  .chat-scroll {
    overflow-y: auto;
    padding: 8px 26px 16px;
    min-height: 0;
    scroll-behavior: smooth;
  }
  .messages {
    display: flex;
    flex-direction: column;
    gap: 22px;
    max-width: 720px;
    margin: 0 auto;
  }

  /* System bubble — quiet variant + error variant. Single {@html} site upstream. */
  .bubble.system {
    background: transparent;
    color: var(--color-warm-dark-mute);
    font-family: var(--font-mono);
    font-size: 12.5px;
    border-left: 3px solid var(--border-soft);
    padding: 8px 14px;
    margin: 8px 0;
    align-self: flex-start;
    max-width: 78%;
  }
  .bubble.system.error {
    border-left-color: var(--color-error);
    color: var(--color-error);
  }

  /* Composer — Mneme.html L870-1022. */
  .composer {
    flex: 0 0 auto;
    padding: 4px 22px 16px;
    background: var(--color-cream);
  }

  .input-shell {
    position: relative;
    background: var(--color-cream);
    border: 1px solid var(--border-soft);
    border-radius: 16px;
    transition:
      border-color var(--duration-base) var(--ease-out),
      box-shadow var(--duration-base) var(--ease-out);
    box-shadow: var(--shadow-1);
    padding: 4px 4px 6px;
  }
  .input-shell:focus-within {
    border-color: rgba(217, 119, 87, 0.45);
    box-shadow:
      0 0 0 3px rgba(217, 119, 87, 0.08),
      var(--shadow-1);
  }

  textarea {
    display: block;
    width: 100%;
    border: 0;
    outline: 0;
    resize: none;
    background: transparent;
    color: var(--color-warm-dark);
    font-family: var(--font-serif);
    font-size: 14.5px;
    line-height: 1.5;
    padding: 10px 14px 6px;
    min-height: 30px;
    max-height: 160px;
  }
  textarea::placeholder { color: var(--color-warm-dark-mute); }

  /* Send/Stop button — Mneme.html L982-1013.
     idle-empty: mute-fill; idle-typed/streaming: warm-dark filled. */
  .send-btn {
    appearance: none;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--color-warm-dark);
    border: 0;
    color: var(--color-cream);
    display: grid;
    place-items: center;
    cursor: pointer;
    transition:
      transform var(--duration-fast) var(--ease-out),
      background var(--duration-base) var(--ease-out),
      border-radius var(--duration-base) var(--ease-out),
      opacity var(--duration-base) var(--ease-out);
  }
  .send-btn:hover { transform: scale(1.05); }
  .send-btn:active { transform: scale(0.96); }
  .send-btn[data-state="idle-empty"],
  .send-btn:disabled {
    background: rgba(20, 20, 19, 0.08);
    color: var(--color-warm-dark-mute);
    cursor: default;
  }
  .send-btn[data-state="idle-empty"]:hover,
  .send-btn:disabled:hover { transform: none; }
  .send-btn[data-state="streaming"] {
    border-radius: 8px;     /* circle → squared morph */
    background: var(--color-warm-dark);
  }

  .disclaimer {
    text-align: center;
    margin-top: 8px;
    font-family: var(--font-serif);
    font-size: 11.5px;
    color: var(--color-warm-dark-mute);
    letter-spacing: 0;
  }

  /* Scrollbars — Mneme.html L1124-1138. */
  .chat-scroll::-webkit-scrollbar { width: 10px; }
  .chat-scroll::-webkit-scrollbar-thumb {
    background: rgba(20, 20, 19, 0.10);
    border: 3px solid transparent;
    background-clip: padding-box;
    border-radius: 10px;
  }
  .chat-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(20, 20, 19, 0.18);
    background-clip: padding-box;
    border: 3px solid transparent;
  }
</style>
