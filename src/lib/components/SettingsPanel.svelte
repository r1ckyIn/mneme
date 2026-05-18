<!--
  SettingsPanel.svelte — 8-category Settings shell (REPLACES Phase 1 SettingsModal).

  Visual SSOT:
    - /Users/qinyuan/Downloads/Mneme 3/Mneme Settings.html (shell + 8-cat rail)
    - 02-UI-SPEC.md §8.2 (880×600 modal, 200px rail + 1px hairline + 1fr body,
      <div role="dialog"> overlay NOT <dialog> — 8-cat layout exceeds modal-
      native ergonomics)
    - Splitter.svelte localStorage persistence pattern (02-PATTERNS.md L359-378)

  Phase 2 (Wave 7 / Plan 02-10). Cmd+, opens panel via dispatched
  `mneme:open-settings` window CustomEvent (parent in 02-12 +page.svelte owns
  the boolean state + listens for this event + flips `settingsOpen = true`).
  Esc + backdrop click close. localStorage key `mneme.settings.activeCategory`
  persists last-active category across sessions.

  CYCLE-3 priority #3 contract (LOCKED) — PROP-CONTROLLED ownership:
    - SettingsPanel takes `open: boolean` + `onClose: () => void` props.
    - The PARENT (02-12 +page.svelte) owns the boolean state and listens for
      `mneme:open-settings` (cog click + Cmd+, key) and `menu:open-settings`
      (macOS native menu via Tauri event → bridge in +layout.svelte).
    - SettingsPanel ONLY dispatches `mneme:open-settings` from its internal
      `<svelte:window>` Cmd+, handler — it does NOT subscribe to that event
      itself. No `installSettingsShortcut()` export. No duplicate state.

  Maps to: REQ-14 (settings UI), REQ-06 (course add via Vault category),
  REQ-11 (vault path move via Vault category).
-->
<script lang="ts">
  import { onMount } from "svelte";
  import VaultCategory from "./settings/VaultCategory.svelte";
  import AppearanceCategory from "./settings/AppearanceCategory.svelte";
  import KeybindingsCategory from "./settings/KeybindingsCategory.svelte";
  import ComingSoonCategory from "./settings/ComingSoonCategory.svelte";

  type CategoryKey =
    | "general"
    | "vault"
    | "sync"
    | "claude"
    | "privacy"
    | "appearance"
    | "keybindings"
    | "advanced";

  interface RailItem {
    key: CategoryKey;
    label: string;
    functional: boolean;
  }

  interface Props {
    open?: boolean;
    onClose: () => void;
  }
  let { open: panelOpen = false, onClose }: Props = $props();

  const STORAGE_KEY = "mneme.settings.activeCategory";
  let activeCategory = $state<CategoryKey>("vault");

  const rail: RailItem[] = [
    { key: "general", label: "General", functional: false },
    { key: "vault", label: "Vault", functional: true },
    { key: "sync", label: "Sync", functional: false },
    { key: "claude", label: "Claude", functional: false },
    { key: "privacy", label: "Privacy", functional: false },
    { key: "appearance", label: "Appearance", functional: true },
    { key: "keybindings", label: "Keybindings", functional: true },
    { key: "advanced", label: "Advanced", functional: false },
  ];

  interface ComingSoonCopy {
    phase: string;
    subline: string;
  }

  const comingSoonCopy: Record<CategoryKey, ComingSoonCopy | null> = {
    general: {
      phase: "Coming in Phase 3.",
      subline:
        "General settings — window size, startup behavior, language — arrive when Phase 3 introduces multi-session.",
    },
    sync: {
      phase: "Coming in v2.",
      subline:
        "Sync between devices is a v2 feature. Mneme is single-device-first by design.",
    },
    claude: {
      phase: "Coming in Phase 3.",
      subline:
        "Model selection, system-prompt config, and per-session limits arrive when Phase 3 wires multi-session.",
    },
    privacy: {
      phase: "Coming in Phase 7.",
      subline:
        "Data residency controls and conversation retention arrive when Phase 7 ships the knowledge graph.",
    },
    advanced: {
      phase: "Coming in Phase 4+.",
      subline:
        "Power-user toggles (vault index reset, log export, MCP overrides) arrive incrementally.",
    },
    vault: null,
    appearance: null,
    keybindings: null,
  };

  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CategoryKey;
        if (rail.some((r) => r.key === parsed)) {
          activeCategory = parsed;
        }
      }
    } catch (err: unknown) {
      console.warn("[settings:restore-activeCategory]", err);
    }
  });

  function selectCategory(key: CategoryKey): void {
    activeCategory = key;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(key));
    } catch (err: unknown) {
      console.warn("[settings:persist-activeCategory]", err);
    }
  }

  function onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) onClose();
  }

  function onPanelKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape" && panelOpen) {
      e.preventDefault();
      onClose();
    }
  }

  /**
   * Global Cmd+, listener — DISPATCHES `mneme:open-settings`.
   * Parent (02-12 +page.svelte) is the SOLE listener that flips its
   * own `settingsOpen` state. SettingsPanel does NOT subscribe to its
   * own dispatched event (CYCLE-3 priority #3 prop-controlled contract).
   */
  function onWindowKeydown(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && e.key === ",") {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("mneme:open-settings"));
    }
  }
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#if panelOpen}
  <div
    class="backdrop"
    onclick={onBackdropClick}
    onkeydown={onPanelKeydown}
    role="presentation"
  >
    <div
      class="panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <header class="header">
        <h2 id="settings-title" class="title">Settings</h2>
        <button
          type="button"
          class="close-btn"
          onclick={onClose}
          aria-label="Close settings"
        >×</button>
      </header>
      <div class="body-grid">
        <nav class="rail" aria-label="Settings categories">
          {#each rail as item (item.key)}
            <button
              type="button"
              class="rail-item"
              class:active={activeCategory === item.key}
              class:disabled={!item.functional}
              onclick={() => selectCategory(item.key)}
            >
              {item.label}
            </button>
          {/each}
        </nav>
        <div class="hairline"></div>
        <main class="body">
          {#if activeCategory === "vault"}
            <VaultCategory />
          {:else if activeCategory === "appearance"}
            <AppearanceCategory />
          {:else if activeCategory === "keybindings"}
            <KeybindingsCategory />
          {:else if comingSoonCopy[activeCategory]}
            <ComingSoonCategory
              title={rail.find((r) => r.key === activeCategory)?.label ?? ""}
              phase={comingSoonCopy[activeCategory]!.phase}
              subline={comingSoonCopy[activeCategory]!.subline}
            />
          {/if}
        </main>
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(20, 20, 19, 0.32);
    display: grid;
    place-items: center;
    z-index: 100;
  }
  .panel {
    width: 880px;
    height: 600px;
    background: var(--color-cream);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-2);
    overflow: hidden;
    display: grid;
    grid-template-rows: 56px 1fr;
    position: relative;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-4);
    border-bottom: 1px solid var(--border-soft);
  }
  .title {
    font-family: var(--font-serif);
    font-size: var(--fs-h);
    font-weight: var(--fw-semibold);
    color: var(--color-warm-dark);
    margin: 0;
  }
  .close-btn {
    width: 26px;
    height: 26px;
    background: none;
    border: none;
    color: var(--color-warm-dark-soft);
    cursor: pointer;
    font-size: 20px;
    border-radius: var(--radius-sm);
    transition: background var(--duration-fast) var(--ease-out),
                transform var(--duration-fast) var(--ease-out);
  }
  .close-btn:hover {
    background: rgba(20, 20, 19, 0.05);
  }
  .close-btn:active {
    transform: scale(0.96);
  }
  .body-grid {
    display: grid;
    grid-template-columns: 200px 1px 1fr;
    overflow: hidden;
    min-height: 0;
  }
  .rail {
    display: flex;
    flex-direction: column;
    padding: var(--space-4) 0;
  }
  .rail-item {
    text-align: left;
    height: 36px;
    padding: 0 var(--space-5) 0 var(--space-4);
    background: none;
    border: none;
    border-left: 2px solid transparent;
    font-family: var(--font-sans);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-soft);
    cursor: pointer;
    transition: background var(--duration-fast) var(--ease-out),
                color var(--duration-fast) var(--ease-out);
  }
  .rail-item:hover:not(.disabled) {
    background: var(--color-cream-deep);
  }
  /* W3 fix (Phase 02.1 02.1-09): keyboard-navigation focus ring matches the
     --orange-ring standard used by Step1Welcome CTA (L101-104), VaultCategory CTA
     (L355-357), and all other Phase 2 interactive focus surfaces. Previously
     rail items rendered the browser-default outline (system-themed; visually
     inconsistent). Ordering note: kept BEFORE .active so an active+focused
     rail-item still shows the active background — visual stacking is determined
     by source order at equal specificity. Closes UI-REVIEW.md L142-144. */
  .rail-item:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px var(--orange-ring);
  }
  .rail-item.active {
    background: var(--color-cream-deep);
    border-left-color: var(--color-orange);
    color: var(--color-warm-dark);
  }
  .rail-item.disabled {
    opacity: 0.7;
  }
  .hairline {
    background: var(--border-soft);
  }
  .body {
    overflow-y: auto;
    position: relative;
  }
</style>
