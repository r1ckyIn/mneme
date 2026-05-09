<!--
  ChatFooter.svelte — Round 5 A-13 (1:1 Claude Code footer layout).

  Left side (5 elements in order):
    1. Auto-mode dropdown (gold/orange text) — visual placeholder; opens
       dropdown with single enabled option "Auto mode".
    2. + attach button — visual placeholder; toast on click.
    3. Mic icon — disabled (opacity 0.45); REQ-19 voice arrives in v1.x.
    4. Chevron-down — visual placeholder for "more tools".
    5. Vault-context button (A-06) — toggles `.active` class on click;
       Phase 1 visual-only; Phase 2 wires source pinning.

  Right side:
    1. Model pill — text "Opus 4.7 1M · Max" (literal hardcoded — CLI uses
       account default; pill is decorative + reflects-account-truth per A-13).
    2. Send/Stop slot — ChatPanel renders the actual button; we render a
       slot here so the button receives the parent's state.

  Send/Stop button title="Send" / "Stop" (NO `⌘.` hint per A-08).

  Visual SSOT: Mneme.html L1416-1442.
-->
<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    vaultContextActive: boolean;
    onToggleVaultContext: () => void;
    sendStopSlot: Snippet;
  }
  let { vaultContextActive, onToggleVaultContext, sendStopSlot }: Props = $props();

  function unimplementedToast(msg: string) {
    // Phase 1: log + tooltip is the toast surface. Phase 2 wires a real toast.
    console.log(`[chat-footer] ${msg}`);
  }
</script>

<div class="input-foot">
  <!-- 1. Auto mode dropdown (gold/orange) -->
  <button class="model-select auto-mode" type="button"
          aria-label="Tool mode"
          title="Auto mode (more modes in v1.x)"
          onclick={() => unimplementedToast("More modes in v1.x")}>
    <span class="label"><span>Auto mode</span></span>
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  </button>

  <!-- 2. + attach -->
  <button class="foot-btn" type="button"
          aria-label="Attach"
          title="Attachments arrive in v1.x"
          onclick={() => unimplementedToast("Attachments arrive in v1.x")}>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  </button>

  <!-- 3. Mic — disabled per REQ-19 voice in v1.x -->
  <button class="foot-btn mic" type="button"
          aria-label="Voice input (disabled in Phase 1)"
          title="Voice input arrives in v1.x (REQ-19)"
          disabled>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
      <line x1="12" y1="19" x2="12" y2="23"></line>
      <line x1="8" y1="23" x2="16" y2="23"></line>
    </svg>
  </button>

  <!-- 4. Chevron-down (more tools placeholder) -->
  <button class="foot-btn" type="button"
          aria-label="More tools"
          title="More tools (v1.x)"
          onclick={() => unimplementedToast("More tools in v1.x")}>
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  </button>

  <!-- 5. Vault context (A-06) — Phase 1 visual toggle; Phase 2 wires spawn-args -->
  <button class="foot-btn vault-ctx" class:active={vaultContextActive}
          type="button"
          aria-label="NotebookLM mode (vault-grounded replies)"
          aria-pressed={vaultContextActive}
          title="NotebookLM mode (Phase 2 wires source pinning)"
          onclick={onToggleVaultContext}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2"></rect>
      <line x1="9" y1="9" x2="15" y2="9"></line>
      <line x1="9" y1="13" x2="15" y2="13"></line>
      <line x1="9" y1="17" x2="13" y2="17"></line>
    </svg>
  </button>

  <!-- Right side: model pill + Send/Stop slot -->
  <div class="right">
    <button class="model-select" type="button"
            aria-label="Model"
            title="Opus 4.7 1M context · Max effort tier (CLI uses account default; pill is decorative + reflects-account-truth)"
            onclick={() => unimplementedToast("Model selection in v1.x")}>
      <span class="label">
        <span>Opus 4.7 1M · Max</span>
      </span>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>
    {@render sendStopSlot()}
  </div>
</div>

<style>
  /* Plan 01-09 polish — Mneme.html L938-980 SSOT. */
  .input-foot {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px 2px 6px;
  }
  .right {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* foot-btn — Mneme.html L944-959. */
  .foot-btn {
    appearance: none;
    background: transparent;
    border: 0;
    width: 28px;
    height: 28px;
    padding: 0;
    border-radius: var(--radius-md);
    color: var(--color-warm-dark-soft);
    cursor: pointer;
    display: inline-grid;
    place-items: center;
    transition:
      background var(--duration-fast) var(--ease-out),
      color var(--duration-fast) var(--ease-out),
      transform var(--duration-fast) var(--ease-out);
  }
  .foot-btn:hover:not(:disabled) {
    background: rgba(20, 20, 19, 0.05);
    color: var(--color-warm-dark);
  }
  .foot-btn:active:not(:disabled) { transform: scale(0.96); }
  .foot-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  /* A-06 — vault-ctx active state — Mneme.html L959. */
  .foot-btn.vault-ctx.active {
    color: var(--color-orange);
    background: var(--color-orange-soft);
  }

  /* model-select / auto-mode pill — Mneme.html L962-980.
     Prototype renders Auto mode and the model pill at serif 13px (the
     model pill explicitly so per L969). Both share the same hover/transition
     surface. */
  .model-select {
    appearance: none;
    background: transparent;
    border: 0;
    cursor: pointer;
    color: var(--color-warm-dark-soft);
    font-family: var(--font-serif);
    font-size: 13px;
    padding: 5px 8px 5px 10px;
    border-radius: var(--radius-md);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: background var(--duration-fast) var(--ease-out);
  }
  .model-select:hover {
    background: rgba(20, 20, 19, 0.04);
    color: var(--color-warm-dark);
  }
  /* Auto mode rendered in orange per A-13. */
  .model-select.auto-mode { color: var(--color-orange); }
  .model-select.auto-mode:hover { color: var(--orange-deep); }
  .model-select .label {
    display: inline-flex;
    gap: 6px;
    align-items: baseline;
  }
</style>
