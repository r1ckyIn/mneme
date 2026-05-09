<!--
  ToolUseGroup.svelte — Plan 01-09 Task 7 NEW component.
  Renders the dispatch state's `toolUseGroup` as a <details> with chevron
  summary + light-timeline body (Mneme.html L705-802).

  Visual: collapsed when not streaming; open while streaming. Summary text
  derived from gerundHeader (open) / pastTenseHeader (closed) helpers from
  $lib/stream-dispatch. Body is a vertical timeline (1px hairline rail) with
  one .step row per tool call; a final muted "Done" step appears when
  `streaming=false` (mirrors prototype L1351-1358).

  A-14 invariant: `state.toolUseGroup.open` flips false on `result` event
  (collapses); we honor that by NOT forcing open via the `streaming` prop —
  the dispatch-driven `open` is the SSOT. The `streaming` prop is used to
  decide whether to render the "Done" tail step.
-->
<script lang="ts">
  import { gerundHeader, pastTenseHeader, type ToolUseGroup } from "$lib/stream-dispatch";

  interface Props {
    group: ToolUseGroup;
    streaming?: boolean;
  }
  let { group, streaming = false }: Props = $props();
</script>

{#if group.toolUses.length > 0}
  <details class="tool-row" open={group.open}>
    <summary>
      <span class="chev" aria-hidden="true">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 6 15 12 9 18"></polyline>
        </svg>
      </span>
      <span class="summary-text">
        {group.open ? gerundHeader(group) : pastTenseHeader(group)}
      </span>
    </summary>
    <div class="tool-detail">
      {#each group.toolUses as t (t.id)}
        <div class="step tool" class:complete={t.completed}>
          <span class="step-ico" aria-hidden="true">
            <!-- Generic shell icon — Mneme.html L1327-1331. Phase 1 doesn't
                 swap per-tool icons; Phase 2 can branch on t.name. -->
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="4 17 10 11 4 5"></polyline>
              <line x1="12" y1="19" x2="20" y2="19"></line>
            </svg>
          </span>
          <div class="step-body">
            <span class="step-title">{t.name}: {t.inputPreview}</span>
            <span class="step-tag">{t.completed ? "complete" : "running"}</span>
          </div>
        </div>
      {/each}
      {#if !streaming}
        <!-- Final "Done" step — Mneme.html L1351-1358. -->
        <div class="step muted">
          <span class="step-ico" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"></circle>
              <polyline points="8 12.5 11 15.5 16 9.5"></polyline>
            </svg>
          </span>
          <div class="step-body">
            <span class="step-title">Done</span>
          </div>
        </div>
      {/if}
    </div>
  </details>
{/if}

<style>
  /* SSOT: Mneme.html L705-802. */

  .tool-row {
    margin: 4px 0 8px;
    border-radius: var(--radius-md);
  }
  .tool-row > summary {
    list-style: none;
    cursor: pointer;
    user-select: none;
    padding: 4px 6px;
    margin: 0 -6px;
    border-radius: var(--radius-sm);
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--color-warm-dark-mute);
    font-family: var(--font-serif);
    font-size: 14px;
    line-height: 1.5;
    transition:
      background var(--duration-fast) var(--ease-out),
      color var(--duration-fast) var(--ease-out);
  }
  .tool-row > summary::-webkit-details-marker { display: none; }
  .tool-row > summary:hover {
    background: rgba(20, 20, 19, 0.04);
    color: var(--color-warm-dark-soft);
  }
  .tool-row > summary .chev {
    color: var(--color-warm-dark-mute);
    transition: transform var(--duration-base) var(--ease-out);
    display: inline-grid;
    place-items: center;
  }
  .tool-row[open] > summary .chev { transform: rotate(90deg); }
  .tool-row[open] > summary { color: var(--color-warm-dark-soft); }

  /* Light timeline — Mneme.html L741-802. */
  .tool-detail {
    margin: 6px 0 4px;
    padding-left: 8px;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .tool-detail::before {
    content: "";
    position: absolute;
    left: 15px;
    top: 6px;
    bottom: 6px;
    width: 1px;
    background: rgba(20, 20, 19, 0.12);
  }
  .step {
    display: grid;
    grid-template-columns: 24px 1fr;
    align-items: start;
    column-gap: 12px;
    padding: 0;
    border: 0;
    position: relative;
  }
  .step .step-ico {
    width: 22px;
    height: 22px;
    display: inline-grid;
    place-items: center;
    border-radius: 6px;
    color: var(--color-warm-dark-mute);
    background: transparent;
    margin-top: 1px;
  }
  .step.tool .step-ico {
    background: rgba(20, 20, 19, 0.04);
    color: var(--color-warm-dark-soft);
  }
  .step .step-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    padding-top: 2px;
  }
  .step .step-title {
    color: var(--color-warm-dark);
    font-size: 13.5px;
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .step.muted .step-title { color: var(--color-warm-dark-soft); }
  .step .step-tag {
    align-self: flex-start;
    display: inline-flex;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(20, 20, 19, 0.05);
    color: var(--color-warm-dark-soft);
    font-size: 11.5px;
    letter-spacing: 0.01em;
    font-family: var(--font-mono);
  }
  .step.complete .step-tag {
    background: rgba(78, 163, 107, 0.12);
    color: #4ea36b;
  }
</style>
