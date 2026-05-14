<!--
  SettingsModal.svelte — A-11 placeholder modal.
  Phase 1: 1 paragraph + Close button. Esc-to-close via browser-native <dialog>.
  Phase 2 (REQ-14) replaces with full settings UI.

  Plan 01-09 polish: tokens swapped to Mneme.html-native (--shadow-2,
  --radius-md, --color-cream, --font-serif). Visual fits the
  Anthropic/Claude family — quiet centered modal on cream surface.
-->
<script lang="ts">
  let { dialog = $bindable() }: { dialog?: HTMLDialogElement } = $props();

  function close() {
    dialog?.close();
  }
</script>

<dialog bind:this={dialog} class="settings-modal">
  <p>Settings wires in Phase 2</p>
  <button type="button" onclick={close}>Close</button>
</dialog>

<style>
  .settings-modal {
    border: none;
    border-radius: var(--radius-md);
    background: var(--color-cream);
    color: var(--color-warm-dark);
    font-family: var(--font-serif);
    padding: var(--space-6);                     /* 24px */
    box-shadow: var(--shadow-2);
    min-width: 320px;
  }
  .settings-modal::backdrop { background: rgba(20, 20, 19, 0.32); }
  .settings-modal p {
    margin: 0 0 var(--space-4);                  /* 16px */
    font-style: italic;
    color: var(--color-warm-dark-mute);
    font-size: 14.5px;
    line-height: 1.55;
  }
  .settings-modal button {
    appearance: none;
    border: 1px solid var(--border-soft);
    background: transparent;
    color: var(--color-warm-dark-soft);
    padding: 6px 14px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: 11.5px;
    transition:
      background var(--duration-fast) var(--ease-out),
      color var(--duration-fast) var(--ease-out),
      transform var(--duration-fast) var(--ease-out);
  }
  .settings-modal button:hover {
    background: rgba(20, 20, 19, 0.04);
    color: var(--color-warm-dark);
  }
  .settings-modal button:active { transform: scale(0.96); }
</style>
