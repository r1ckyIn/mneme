<!--
  TitlebarMeta.svelte — A-10 right-aligned titlebar meta.
  Three elements: connection-state dot + "claude-code · {status}" + "vault: <path>" + settings cog.

  Visual SSOT: Mneme.html L1180-1190.

  z-index: above splitter so it overlays the right pane's 36px reserved zone
  (traffic lights live at top-LEFT; this meta lives at top-RIGHT — no overlap).
-->
<script lang="ts">
  import { onMount } from "svelte";
  import { connectionState } from "$lib/connection-state.svelte";
  import SettingsModal from "$lib/components/SettingsModal.svelte";

  let modal: HTMLDialogElement | undefined = $state();

  // A-10: vault path read from localStorage (default "~/Mneme/usyd-2026s1" for the
  // user's USYD S1 2026 vault). Phase 2 wires this through the settings UI.
  let vaultPath = $state("~/Mneme/usyd-2026s1");
  onMount(() => {
    try {
      vaultPath = localStorage.getItem("mneme.vault.path") ?? "~/Mneme/usyd-2026s1";
    } catch {
      // localStorage unavailable — keep the default
    }
  });

  function openSettings() {
    modal?.showModal();
  }
</script>

<div class="titlebar-meta">
  <span class="dot" data-status={connectionState.status} aria-hidden="true"></span>
  <span class="meta-text">claude-code · {connectionState.status}</span>
  <span class="sep">·</span>
  <span class="meta-text">vault: {vaultPath}</span>
  <button class="icon-btn" type="button" aria-label="Settings" title="Settings" onclick={openSettings}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  </button>
</div>

<SettingsModal bind:dialog={modal} />

<style>
  .titlebar-meta {
    position: fixed;
    top: 0;
    right: 0;
    padding: 6px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 10;     /* above Splitter; same overlay zone as macOS title bar */
    pointer-events: auto;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--ink-mute);
    letter-spacing: 0.02em;
    height: 36px;
    box-sizing: border-box;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: var(--r-pill);
    background: var(--ink-mute);
    flex-shrink: 0;
    transition: background var(--d-base) var(--ease);
  }
  .dot[data-status="connected"]    { background: #4ea36b; }
  .dot[data-status="connecting"]   { background: var(--ink-mute); }
  .dot[data-status="disconnected"] { background: var(--error); }

  .meta-text { white-space: nowrap; }
  .sep { opacity: 0.4; }

  .icon-btn {
    appearance: none;
    background: transparent;
    border: 0;
    padding: 4px;
    border-radius: var(--r-sm);
    color: var(--ink-mute);
    cursor: pointer;
    display: inline-grid;
    place-items: center;
    transition: background var(--d-fast) var(--ease), color var(--d-fast) var(--ease);
  }
  .icon-btn:hover {
    background: rgba(20, 20, 19, 0.05);
    color: var(--ink-soft);
  }
</style>
