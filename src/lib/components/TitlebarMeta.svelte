<!--
  TitlebarMeta.svelte — A-10 right-aligned titlebar meta.
  Plan 01-09 polish: tokens swapped to Mneme.html-native (font-mono 11px,
  gap --space-3 = 12px, --color-warm-dark-mute, dot 6×6 with green glow when
  connected) per L145-160.

  Three elements: connection-state dot + "claude-code · {status}" + dot-sep +
  "vault: {path}" + settings cog (26×26 .icon-btn).

  Visual SSOT: Mneme.html L145-174 (CSS) + L1179-1190 (markup).

  z-index above splitter so it overlays the right pane's 36px reserved zone
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
  <span class="dot-sep">·</span>
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
  /* SSOT: Mneme.html L145-174. */
  .titlebar-meta {
    position: fixed;
    top: 0;
    right: 0;
    height: var(--titlebar-height);          /* 36px */
    padding: 0 var(--space-4);               /* 16px */
    display: flex;
    align-items: center;
    gap: var(--space-3);                     /* 12px */
    z-index: 10;
    pointer-events: auto;
    color: var(--color-warm-dark-mute);
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.02em;
    box-sizing: border-box;
    -webkit-app-region: no-drag;
  }

  /* Dot: 6×6 with subtle green glow when connected (Mneme.html L156-160). */
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-warm-dark-mute);
    flex-shrink: 0;
    transition: background var(--duration-base) var(--ease-out),
                box-shadow var(--duration-base) var(--ease-out);
  }
  .dot[data-status="connected"] {
    background: #4ea36b;
    box-shadow: 0 0 0 2px rgba(78, 163, 107, 0.18);
  }
  .dot[data-status="connecting"] {
    background: var(--color-warm-dark-mute);
    box-shadow: none;
  }
  .dot[data-status="disconnected"] {
    background: var(--color-error);
    box-shadow: none;
  }

  .meta-text { white-space: nowrap; }
  .dot-sep { opacity: 0.4; }

  /* Settings cog — 26×26 .icon-btn (Mneme.html L161-174). */
  .icon-btn {
    appearance: none;
    background: transparent;
    border: 0;
    width: 26px;
    height: 26px;
    border-radius: var(--radius-sm);
    color: var(--color-warm-dark-soft);
    display: inline-grid;
    place-items: center;
    cursor: pointer;
    transition:
      background var(--duration-base) var(--ease-out),
      transform var(--duration-fast) var(--ease-out);
  }
  .icon-btn:hover { background: rgba(20, 20, 19, 0.05); }
  .icon-btn:active { transform: scale(0.96); }
</style>
