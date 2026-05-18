<!--
  Visual: /Users/qinyuan/Downloads/Mneme 3/Mneme Import History.html
  + 02-UI-SPEC.md §8.6
  Most-recent-20 list. Reads from import-state.svelte.ts recent_20.
  Per-file failure expansion via <details>.
-->
<script lang="ts">
  import { getImportState } from "$lib/import-state.svelte";
  import type { ImportHistoryEntry } from "$lib/import-state-derive";

  interface Props {
    open: boolean;
    onClose: () => void;
  }
  let { open: dialogOpen = false, onClose }: Props = $props();

  const importState = getImportState();

  function formatTimestamp(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  function formatStatus(entry: ImportHistoryEntry): string {
    if (entry.cancelled) return `${entry.succeeded} of ${entry.total} · cancelled`;
    if (entry.failed > 0)
      return `${entry.succeeded} of ${entry.total} · ${entry.failed} error${entry.failed === 1 ? "" : "s"}`;
    return `${entry.succeeded} imported`;
  }

  function statusKind(entry: ImportHistoryEntry): "ok" | "partial" | "cancelled" {
    if (entry.cancelled) return "cancelled";
    if (entry.failed > 0) return "partial";
    return "ok";
  }
</script>

{#if dialogOpen}
  <div
    class="backdrop"
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
    onkeydown={(e) => {
      if (e.key === "Escape") onClose();
    }}
    role="presentation"
  >
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-title"
    >
      <header class="header">
        <h2 id="history-title" class="title">Recent imports</h2>
        <button
          type="button"
          class="close-btn"
          onclick={onClose}
          aria-label="Close">×</button
        >
      </header>

      {#if importState.recent_20.length === 0}
        <div class="empty">
          <p class="empty-headline">No imports yet.</p>
          <p class="empty-body">
            Drop files on the window, press Cmd+I, or use Settings → Vault.
          </p>
        </div>
      {:else}
        <div class="list">
          {#each importState.recent_20 as entry (entry.operation_id)}
            <details class="row" data-status={statusKind(entry)}>
              <summary class="summary">
                <span class="ts">{formatTimestamp(entry.timestamp_iso)}</span>
                <span class="target"
                  >{entry.course ?? "_inbox"} · {entry.category}</span
                >
                <span class="status">{formatStatus(entry)}</span>
              </summary>
              {#if entry.failures.length > 0}
                <div class="failures">
                  {#each entry.failures as f (f.path)}
                    <div class="failure">
                      <span class="f-path">{f.path}</span>
                      <!-- CYCLE-2 cluster #6 — `reason` per Rust ImportFailure SSOT (02-05) -->
                      <span class="f-msg">{f.reason}</span>
                    </div>
                  {/each}
                </div>
              {/if}
            </details>
          {/each}
        </div>
      {/if}
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
    z-index: 140;
  }
  .modal {
    /* I2 fix (Phase 02.1 02.1-13): single-source local custom property for the
       56px header height. Header CSS rule below and grid-template-rows reference
       the SAME var; a future header-height shift is now a one-line change.
       UI-SPEC §8.6 fixes the modal header at 56px. No global --row-height-md
       token exists in tokens.css; staying local avoids leaking a one-off
       cross-component contract. */
    --history-header-h: 56px;
    width: 640px;
    height: 540px;
    background: var(--color-cream);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-2);
    display: grid;
    grid-template-rows: var(--history-header-h) 1fr;
    overflow: hidden;
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
  }
  .close-btn:hover {
    background: rgba(20, 20, 19, 0.05);
  }
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-10);
    text-align: center;
  }
  .empty-headline {
    font-family: var(--font-serif);
    font-size: var(--fs-body);
    font-weight: var(--fw-semibold);
    color: var(--color-warm-dark);
    margin: 0;
  }
  .empty-body {
    font-family: var(--font-serif);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-soft);
    margin: 0;
  }
  .list {
    overflow-y: auto;
  }
  .row {
    border-bottom: 1px solid var(--border-soft);
    padding: var(--space-3) var(--space-4);
    border-left: 2px solid transparent;
  }
  .row[data-status="partial"],
  .row[data-status="cancelled"] {
    border-left-color: var(--color-error);
  }
  .summary {
    display: grid;
    grid-template-columns: 160px 1fr 160px;
    gap: var(--space-3);
    align-items: center;
    cursor: pointer;
    list-style: none;
  }
  .summary::-webkit-details-marker {
    display: none;
  }
  .ts {
    font-family: var(--font-mono);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-mute);
  }
  .target {
    font-family: var(--font-sans);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark);
  }
  .status {
    font-family: var(--font-serif);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-soft);
    text-align: right;
  }
  .row[data-status="partial"] .status,
  .row[data-status="cancelled"] .status {
    color: var(--color-error);
  }
  .failures {
    margin-top: var(--space-3);
    padding-left: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .failure {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-family: var(--font-mono);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-soft);
  }
  .f-path {
    color: var(--color-warm-dark);
  }
  .f-msg {
    color: var(--color-error);
  }
</style>
