<!--
  AssistantMessage.svelte — Plan 01-09 Task 7 NEW component.
  Renders an already-sanitized HTML string (DOMPurify-cleaned upstream by
  ChatPanel.sanitizeMarkdown) and runs renderKatexInDom on the mounted
  fragment.

  Visual: flowing text on cream (NO bubble), serif 15px / 1.65 line-height,
  full markdown surface (h3/p/ul/ol/code/pre/strong/em/.eq/.katex per
  prototype L650-702).

  Streaming flag: when true, MAY append a subtle .stream-dot at the end.
  Mounted via {@html} — the bytes inserted have already passed the
  DOMPurify sanitize gate at the source (see ChatPanel.sanitizeMarkdown
  call site + sanitize.ts module-level invariants).

  T-1-47 / A-09 closure: this component renders ALL phases (streaming AND
  finalized). Streaming buffer is sanitized + rendered on every text_delta;
  AssistantMessage just consumes the sanitized HTML.
-->
<script lang="ts">
  import { renderKatexInDom } from "$lib/sanitize";

  interface Props {
    html: string;          // already-sanitized markdown HTML
    streaming?: boolean;   // when true, append blinking stream-dot
  }
  let { html, streaming = false }: Props = $props();

  // Mount target — afterUpdate-style effect re-runs on every html change.
  // requestAnimationFrame batches the renderKatexInDom walk so multiple
  // text_delta chunks within one frame don't cause repeated KaTeX walks.
  let host: HTMLDivElement | undefined = $state();
  let rafScheduled = false;

  $effect(() => {
    // Re-trigger on `html` change. Reading streaming would also work but
    // we WANT KaTeX to re-render even on chunk arrivals during streaming.
    void html;
    if (!host || rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(() => {
      rafScheduled = false;
      if (host) renderKatexInDom(host);
    });
  });
</script>

<div class="msg-assistant" bind:this={host}
     data-msg-role="assistant"
     data-msg-streaming={streaming ? "true" : "false"}>
  <!-- The HTML inserted here has already been DOMPurify-sanitized at the
       source by sanitizeMarkdown() in ChatPanel. T-1-02 invariant maintained. -->
  {@html html}
  {#if streaming}<span class="stream-dot" aria-hidden="true"></span>{/if}
</div>

<style>
  /* SSOT: Mneme.html L650-702 + L827-844 (.stream-dot). */

  .msg-assistant {
    color: var(--color-warm-dark);
    font-family: var(--font-serif);
    font-size: 15px;
    line-height: 1.65;
  }
  .msg-assistant :global(p) { margin: 0 0 12px; }
  .msg-assistant :global(p:last-child) { margin-bottom: 0; }
  .msg-assistant :global(strong) { font-weight: 600; }
  .msg-assistant :global(em) { font-style: italic; }
  .msg-assistant :global(code) {
    font-family: var(--font-mono);
    font-size: 12.5px;
    background: rgba(20, 20, 19, 0.05);
    padding: 1px 5px;
    border-radius: 3px;
  }
  .msg-assistant :global(pre) {
    font-family: var(--font-mono);
    font-size: 12.5px;
    background: var(--color-warm-surface);
    color: #e8e6df;
    padding: 12px 14px;
    border-radius: var(--radius-md);
    overflow-x: auto;
    margin: 10px 0 12px;
    line-height: 1.55;
  }
  .msg-assistant :global(pre code) {
    background: transparent;
    padding: 0;
    border-radius: 0;
    color: inherit;
    font-size: inherit;
  }
  .msg-assistant :global(.katex) {
    font-family: "KaTeX_Main", "Latin Modern Math", var(--font-serif);
    font-style: italic;
  }
  .msg-assistant :global(.eq) {
    display: block;
    text-align: center;
    margin: 8px 0 12px;
    color: var(--color-warm-dark);
    font-size: 16px;
  }
  .msg-assistant :global(h1),
  .msg-assistant :global(h2),
  .msg-assistant :global(h3) {
    font-family: var(--font-serif);
    font-size: 16px;
    font-weight: 600;
    margin: 16px 0 8px;
    color: var(--color-warm-dark);
    letter-spacing: -0.005em;
  }
  .msg-assistant :global(ul),
  .msg-assistant :global(ol) {
    margin: 4px 0 12px;
    padding-left: 22px;
  }
  .msg-assistant :global(li) { margin: 2px 0; }
  .msg-assistant :global(a) {
    color: var(--color-orange);
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
  }
  .msg-assistant :global(a:hover) { color: var(--orange-deep); }
  .msg-assistant :global(blockquote) {
    margin: 8px 0 12px;
    padding-left: 12px;
    border-left: 2px solid var(--border-soft);
    color: var(--color-warm-dark-soft);
    font-style: italic;
  }

  /* Streaming dot — Mneme.html L827-844. */
  .stream-dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-orange);
    margin-left: 6px;
    vertical-align: 1px;
    animation: streamPulse 900ms var(--ease-out) infinite;
  }
  @keyframes streamPulse {
    0%, 100% { transform: scale(1); opacity: 0.55; }
    50%      { transform: scale(1.4); opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .stream-dot { animation: none; opacity: 0.7; }
  }
</style>
