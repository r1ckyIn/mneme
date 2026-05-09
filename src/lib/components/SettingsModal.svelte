<!--
  SettingsModal.svelte — A-11 placeholder modal.
  Phase 1: 1 paragraph + Close button. Esc-to-close via browser-native <dialog>.
  Phase 2 (REQ-14) replaces with full settings UI.
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
    border-radius: var(--r-md);
    background: var(--paper);
    color: var(--ink);
    font-family: var(--font-body);
    padding: var(--s-lg);
    box-shadow: var(--shadow-md);
    min-width: 280px;
  }
  .settings-modal::backdrop { background: rgba(0, 0, 0, 0.3); }
  .settings-modal p {
    margin: 0 0 var(--s-md);
    font-style: italic;
    color: var(--ink-mute);
    font-size: var(--fs-body);
  }
  .settings-modal button {
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--ink);
    padding: var(--s-xs) var(--s-md);
    border-radius: var(--r-sm);
    cursor: pointer;
    font-family: var(--font-body);
    font-size: var(--fs-meta);
    transition: background var(--d-fast) var(--ease);
  }
  .settings-modal button:hover { background: var(--bg-soft); }
</style>
