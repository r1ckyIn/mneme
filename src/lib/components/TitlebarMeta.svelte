<!--
  TitlebarMeta.svelte — A-10 right-aligned titlebar meta.
  Plan 01-09 polish: tokens swapped to Mneme.html-native (font-mono 11px,
  gap --space-3 = 12px, --color-warm-dark-mute, dot 6×6 with green glow when
  connected) per L145-160.

  Three elements: connection-state dot + "claude-code · {status}" + dot-sep +
  ImportStatusPill + dot-sep + "vault: {path}" + settings cog (26×26 .icon-btn).

  Visual: /Users/qinyuan/Downloads/Mneme 3/Mneme.html L145-174 (CSS) +
                                                  L1179-1190 (markup)
       + 02-UI-SPEC.md §8.8 (Phase 2 delta — ImportStatusPill insertion +
                             live vault path from singleton + long-path
                             truncation)
  Per D-18: every modified Svelte component carries a Visual SSOT header
  pointing at the locked 2026-05-15 Mneme 3 bundle.

  z-index above splitter so it overlays the right pane's 36px reserved zone
  (traffic lights live at top-LEFT; this meta lives at top-RIGHT — no overlap).

  Phase 2 (Wave 7 / Plan 02-10 — CYCLE-2 cluster #13 atomic rewrite):
    - DROPPED `import SettingsModal` + bare `<SettingsModal />` mount (Phase 1
      placeholder file is deleted in the same commit).
    - Cog click DISPATCHES `mneme:open-settings` window CustomEvent.
    - vaultPath reads from the `vault-state.svelte` reactive singleton —
      the Phase 1 localStorage placeholder hardcode is removed (SPEC REQ-1 /
      REQ-14 acceptance: no placeholder text in chrome).

  Phase 2 (Wave 8 / Plan 02-12 — final integration):
    - ImportStatusPill inserted between connection-status and the vault label,
      gated on its own internal `kind !== "idle"` visibility (component
      self-renders nothing when idle, so it does not consume layout width
      until an import is in flight or recent).
    - Pill click DISPATCHES `mneme:open-history` window CustomEvent — parent
      +page.svelte listens + toggles ImportHistoryModal.
    - Long-path middle-truncation helper: if vault_path exceeds 48 chars,
      render `<first-segment>/.../<last-2-segments>` so the chrome stays
      readable on a 13" MacBook. Full path is surfaced via the title attribute.

  CYCLE-3 priority #3 — ownership LOCKED to prop-controlled: TitlebarMeta is
  a pure event dispatcher; it does NOT import or mount SettingsPanel itself.

  Phase 02.1 02.1-12 (W8 fix): removed the blanket "no-drag" CSS opt-out from
  `.titlebar-meta`. Tauri 2 idiom is the HTML attribute
  (`data-tauri-drag-region` on the parent `.titlebar` at page.svelte L165) —
  NOT a CSS app-region declaration. The legacy CSS opt-out was a Tauri 1 /
  Electron carry-over that overrode the inherited drag on the right half of
  the 36px titlebar (UI-REVIEW.md L45). Interactive children (settings cog +
  ImportStatusPill, wrapped in a `.no-drag-wrap` span with
  `display: contents`) carve out via `data-tauri-drag-region="false"` so OS
  drag does NOT swallow their click events. Drag now works from any neutral
  zone in the right half of the titlebar (dot, separator, meta-text spans).
-->
<script lang="ts">
  import { connectionState } from "$lib/connection-state.svelte";
  import { getVaultState } from "$lib/vault-state.svelte";
  import ImportStatusPill from "./ImportStatusPill.svelte";

  const vaultState = getVaultState();

  // Long-path middle-truncation per UI-SPEC §8.8: keeps the chrome row
  // readable on the 13" MacBook baseline (vault paths over 48 chars get
  // a `<first>/.../<last-2>` form; the title attribute surfaces the full
  // path on hover).
  function truncatePath(path: string): string {
    if (!path) return "—";
    if (path.length <= 48) return path;
    const segments = path.split("/");
    if (segments.length <= 3) return path;
    return `${segments[0]}/.../${segments.slice(-2).join("/")}`;
  }

  let displayPath = $derived(truncatePath(vaultState.vault_path));

  function openSettings(): void {
    window.dispatchEvent(new CustomEvent("mneme:open-settings"));
  }

  function openHistory(): void {
    window.dispatchEvent(new CustomEvent("mneme:open-history"));
  }
</script>

<div class="titlebar-meta">
  <span class="dot" data-status={connectionState.status} aria-hidden="true"></span>
  <span class="meta-text">claude-code · {connectionState.status}</span>
  <!-- W8 fix (Phase 02.1 02.1-12): wrap the pill in a span that opts OUT of
       drag so clicking the pill opens history (does NOT initiate window-move).
       display:contents on the wrapper keeps the flex layout identical — the
       wrapper has no box of its own. -->
  <span class="no-drag-wrap" data-tauri-drag-region="false">
    <ImportStatusPill onClick={openHistory} />
  </span>
  <span class="dot-sep">·</span>
  <span class="meta-text" title={vaultState.vault_path || ""}>vault: {displayPath}</span>
  <button
    class="icon-btn"
    type="button"
    aria-label="Settings"
    title="Settings"
    data-tauri-drag-region="false"
    onclick={openSettings}
  >
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  </button>
</div>

<style>
  /* SSOT: Mneme.html L145-160. Mounted inside a parent .titlebar by
     +page.svelte; uses margin-left:auto to right-align within the flex row.
     (No longer position:fixed — that pinned to viewport corner instead of
     window-frame corner once Plan 01-09 added the .stage / .window wrapper.) */
  .titlebar-meta {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: var(--space-3);                     /* 12px */
    color: var(--color-warm-dark-mute);
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.02em;
    /* W8 fix (Phase 02.1 02.1-12): removed the legacy CSS "no-drag" opt-out.
       Tauri 2 uses the data-tauri-drag-region HTML ATTRIBUTE on the parent
       .titlebar (page.svelte L165) — NOT a CSS app-region property. The
       legacy CSS opt-out was a Tauri 1 / Electron carry-over that blocked the
       inherited drag behavior on the right half of the titlebar
       (UI-REVIEW.md L45). Interactive children (settings cog, ImportStatusPill
       via .no-drag-wrap span) carve out via `data-tauri-drag-region="false"`
       per Tauri 2 idiom. */
  }

  /* W8 fix wrapper: opts the ImportStatusPill out of OS drag so its click
     fires `mneme:open-history` instead of starting a window-move. The wrapper
     is layout-invisible — `display: contents` removes its own box so the pill
     keeps its flex slot inside `.titlebar-meta`. */
  .no-drag-wrap {
    display: contents;
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
