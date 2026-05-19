<!--
  Visual: /Users/qinyuan/Downloads/Mneme 3/Mneme Status Pill.html
  + 02-UI-SPEC.md §8.5
  Reactive pill inside TitlebarMeta. 5 visual states via data-status attribute.

  W1 fix (Phase 02.1 02.1-07): adds icon prefixes (◐ ✓ ! ⊘) + spinner SVG
  (importing state) + state-specific backgrounds per UI-SPEC §8.5. Closes
  UI-REVIEW.md L138-144 four-gap finding. Reduces brand "feels broken"
  perception during import (dogfood signal).
-->
<script lang="ts">
  import { getImportState, refreshPillState } from "$lib/import-state.svelte";
  import type { PillState } from "$lib/import-state-derive";
  import { onMount, onDestroy } from "svelte";

  interface Props {
    onClick: () => void;
  }
  let { onClick }: Props = $props();

  const importState = getImportState();
  let displayText = $derived(formatPill(importState.pill_state));
  let dataStatus = $derived(importState.pill_state.kind);

  function formatPill(state: PillState): string {
    switch (state.kind) {
      case "idle":
        return "";
      case "importing":
        return `importing ${state.current} of ${state.total}…`;
      case "imported":
        return `imported ${state.count} · ${state.recency}`;
      case "partial":
        return `imported ${state.succeeded} · ${state.failed} errors`;
      case "cancelled":
        return `imported ${state.succeeded} of ${state.total} · cancelled`;
    }
  }

  // W1 fix: per-state icon prefix mapping. Importing renders an animated SVG
  // arc separately; the other three states render this glyph in .status-icon.
  function iconForState(kind: PillState["kind"]): string {
    switch (kind) {
      case "importing":
        return "◐";
      case "imported":
        return "✓";
      case "partial":
        return "!";
      case "cancelled":
        return "⊘";
      default:
        return "";
    }
  }
  let displayIcon = $derived(iconForState(importState.pill_state.kind));

  // Refresh pill state on a timer so recency strings stay current ("5m ago", etc.).
  let timer: ReturnType<typeof setInterval> | null = null;
  onMount(() => {
    timer = setInterval(() => refreshPillState(new Date()), 30_000);
  });
  onDestroy(() => {
    if (timer) clearInterval(timer);
  });
</script>

{#if dataStatus !== "idle"}
  <button
    type="button"
    class="pill"
    data-status={dataStatus}
    onclick={onClick}
    aria-label="Open import history"
  >
    {#if dataStatus === "importing"}
      <!-- W1 fix: spinning arc SVG for importing state. Falls back to static
           (animation: none) under prefers-reduced-motion via @media query below. -->
      <svg
        class="spinner"
        width="12"
        height="12"
        viewBox="0 0 12 12"
        aria-hidden="true"
      >
        <circle
          cx="6"
          cy="6"
          r="5"
          stroke="currentColor"
          stroke-width="1.5"
          fill="none"
          stroke-dasharray="20 8"
        />
      </svg>
    {:else}
      <span class="status-icon" aria-hidden="true">{displayIcon}</span>
    {/if}
    <span class="status-label">{displayText}</span>
  </button>
{/if}

<style>
  .pill {
    background: none;
    border: none;
    padding: 2px var(--space-2);
    font-family: var(--font-mono);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-mute);
    cursor: pointer;
    border-radius: var(--radius-sm);
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    transition:
      background var(--duration-base) var(--ease-out),
      color var(--duration-base) var(--ease-out);
  }
  .pill:hover {
    background: var(--color-cream-deep);
  }

  /* W1 fix: per-state backgrounds per UI-SPEC §8.5 (L998-1016). All values
     derive from existing tokens.css entries — no new tokens introduced. */
  .pill[data-status="importing"] {
    color: var(--color-orange);
    background: var(--orange-soft);
  }
  .pill[data-status="imported"] {
    color: var(--color-warm-dark-soft);
    background: var(--color-cream-deep);
  }
  .pill[data-status="partial"] {
    color: var(--color-error);
    background: var(--color-cream);
    border-left: 2px solid var(--color-error);
    /* Keep total horizontal padding stable across states (border-left adds 2px). */
    padding-left: calc(var(--space-2) - 2px);
  }
  .pill[data-status="cancelled"] {
    color: var(--color-warm-dark-mute);
    background: var(--color-cream-deep);
  }

  /* W1 fix: icon + spinner styling. */
  .status-icon {
    display: inline-block;
    line-height: 1;
    font-size: var(--fs-meta);
  }
  .status-label {
    line-height: 1;
  }
  .spinner {
    display: inline-block;
    flex-shrink: 0;
    animation: spinner-rotate 1s linear infinite;
  }
  @keyframes spinner-rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  /* W1 fix: reduced-motion fallback — spinner stops; the arc glyph stays
     visible so the importing state remains legible. */
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
    }
  }
</style>
