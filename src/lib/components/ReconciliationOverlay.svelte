<!--
  Visual: /Users/qinyuan/Downloads/Mneme 3/Mneme Reconciliation.html
  + 02-UI-SPEC.md §8.9
  D-14 DR1 — full-screen blocking spinner on startup. Unmounts on reconcile:done.
-->
<!--
  CR-04 fix (gap-closure 02-14): listeners (lines 21-34) were originally dead
  because Rust never emitted reconcile:progress / reconcile:done. Backend half
  of the fix landed in 02-14 Task 2 (lib.rs reconcile_vault_index +
  vault_index.rs reconcile_with_progress). N/M counter promised by UI-SPEC §8.9
  now populates because total > 0 evaluates true after the first emit. No
  markup change needed; the {#if total > 0} gate already guarded the counter.
-->
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { listen } from "@tauri-apps/api/event";
  import type { UnlistenFn } from "@tauri-apps/api/event";

  interface Props {
    onDone?: () => void;
  }
  let { onDone }: Props = $props();

  let current = $state(0);
  let total = $state(0);
  let visible = $state(true);
  let unlisteners: UnlistenFn[] = [];

  onMount(async () => {
    try {
      const u1 = await listen<{ current: number; total: number }>(
        "reconcile:progress",
        (e) => {
          current = e.payload.current;
          total = e.payload.total;
        },
      );
      const u2 = await listen("reconcile:done", () => {
        visible = false;
        onDone?.();
      });
      unlisteners.push(u1, u2);
    } catch (e) {
      console.error("[reconciliation:listen]", e);
      // Fail-open: if events don't wire, hide overlay so we don't block forever.
      visible = false;
    }
  });

  onDestroy(() => {
    unlisteners.forEach((u) => u());
  });
</script>

{#if visible}
  <div class="overlay" role="status" aria-live="polite">
    <div class="content">
      <div class="spinner" aria-hidden="true"></div>
      <div class="label">Indexing vault…</div>
      {#if total > 0}
        <div class="counter">{current} / {total}</div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: var(--color-cream);
    display: grid;
    place-items: center;
    z-index: 300;
  }
  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
  }
  .spinner {
    width: 32px;
    height: 32px;
    border: 2px solid var(--color-cream-edge);
    border-top-color: var(--color-orange);
    border-radius: 50%;
    animation: spin 1.2s linear infinite;
  }
  .label {
    font-family: var(--font-serif);
    font-size: var(--fs-body);
    color: var(--color-warm-dark);
  }
  .counter {
    font-family: var(--font-mono);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-mute);
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
