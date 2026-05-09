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
  .input-foot {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: var(--s-xs) var(--s-sm);
  }
  .right {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .foot-btn {
    appearance: none;
    background: transparent;
    border: 0;
    width: 28px;
    height: 28px;
    padding: 0;
    border-radius: var(--r-sm);
    color: var(--ink-mute);
    cursor: pointer;
    display: inline-grid;
    place-items: center;
    transition: background var(--d-fast) var(--ease), color var(--d-fast) var(--ease);
  }
  .foot-btn:hover:not(:disabled) {
    background: rgba(20, 20, 19, 0.05);
    color: var(--ink-soft);
  }
  .foot-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  /* A-06 — vault-ctx active state uses orange-tint background + ink color */
  .foot-btn.vault-ctx.active {
    color: var(--ink);
    background: var(--orange-tint);
  }

  .model-select {
    appearance: none;
    background: transparent;
    border: 0;
    padding: 4px 8px;
    border-radius: var(--r-sm);
    color: var(--ink-mute);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono);
    font-size: 11px;
    transition: background var(--d-fast) var(--ease), color var(--d-fast) var(--ease);
  }
  .model-select:hover {
    background: rgba(20, 20, 19, 0.05);
    color: var(--ink-soft);
  }
  /* A-13: Auto mode pill renders in gold/orange text per prototype + AMENDMENT */
  .model-select.auto-mode {
    color: var(--orange);
  }
  .model-select.auto-mode:hover {
    color: var(--orange-deep);
  }
</style>
