<!--
  DragHandle.svelte — A-05 reusable Notion-style 2x3 dots drag handle.
  Phase 1: visual placeholder + no-op tooltip "Block rearranging arrives in Phase 3".
  No drag JS wired; clicking/holding produces visual feedback only.

  Placement contract: each Phase 1 region (files / video / preview / chat / mind-map)
  mounts ONE <DragHandle /> in upper-right via `.abs` positioning. The five regions
  total 5 instances per A-05 acceptance.

  Visual SSOT: Mneme.html L1024-1041 (`.drag-handle.abs`).
-->
<button class="drag-handle abs" type="button"
        aria-label="Drag region"
        title="Block rearranging arrives in Phase 3"
        draggable="false">
  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
    <circle cx="3" cy="2" r="1.1"/>
    <circle cx="9" cy="2" r="1.1"/>
    <circle cx="3" cy="6" r="1.1"/>
    <circle cx="9" cy="6" r="1.1"/>
    <circle cx="3" cy="10" r="1.1"/>
    <circle cx="9" cy="10" r="1.1"/>
  </svg>
</button>

<style>
  .drag-handle {
    appearance: none;
    background: transparent;
    border: 0;
    padding: 4px;
    border-radius: var(--r-sm);
    color: var(--ink-mute);
    cursor: grab;
    display: inline-grid;
    place-items: center;
    opacity: 0.45;
    transition:
      opacity var(--d-fast) var(--ease),
      background var(--d-fast) var(--ease),
      color var(--d-fast) var(--ease),
      transform var(--d-fast) var(--ease);
  }
  .drag-handle:hover {
    opacity: 1;
    background: rgba(20, 20, 19, 0.05);
    color: var(--ink-soft);
  }
  .drag-handle:active {
    cursor: grabbing;
    transform: scale(0.96);
  }
  .drag-handle.abs {
    position: absolute;
    top: 12px;
    right: 18px;
    z-index: 2;
  }
</style>
