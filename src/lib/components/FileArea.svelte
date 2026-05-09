<!--
  FileArea.svelte — A-07 left pane Finder-style table shell.
  Phase 1: chrome only. Table BODY is empty + italic placeholder copy.
  Phase 2 wires real files + per-row checkbox state machine.

  Visual SSOT: Mneme.html L1190-1238.
  SVG paths copied verbatim from prototype (Apple HIG-compatible icons).
-->
<script lang="ts">
  import DragHandle from "$lib/components/DragHandle.svelte";
</script>

<section class="file-area">
  <nav class="crumbs" aria-label="Folder navigation">
    <span class="folder-name">COMP3027 · Algorithms</span>
    <DragHandle />
  </nav>

  <div class="crumbs-actions">
    <button class="icon-btn" type="button" aria-label="Grid view" title="Grid view">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1"></rect>
        <rect x="14" y="3" width="7" height="7" rx="1"></rect>
        <rect x="3" y="14" width="7" height="7" rx="1"></rect>
        <rect x="14" y="14" width="7" height="7" rx="1"></rect>
      </svg>
    </button>
    <button class="icon-btn" type="button" aria-label="New file" title="New file">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="12" y1="11" x2="12" y2="17"></line>
        <line x1="9" y1="14" x2="15" y2="14"></line>
      </svg>
    </button>
    <button class="icon-btn" type="button" aria-label="Search" title="Search">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    </button>
  </div>

  <div class="filelist" role="grid" aria-label="Files">
    <div class="head" role="row">
      <div class="cell name-head" role="columnheader">
        <input type="checkbox" class="cbx" aria-label="Select all" disabled>
        <span>Name</span>
      </div>
      <div class="cell" role="columnheader">Size</div>
      <div class="cell" role="columnheader">Type</div>
      <div class="cell" role="columnheader">Modified</div>
    </div>
    <div class="filerows-empty">
      <em>File tree wires when vault arrives (Phase 2)</em>
    </div>
  </div>
</section>

<style>
  .file-area {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;     /* anchor for nested .drag-handle.abs */
  }

  .crumbs {
    display: flex;
    align-items: center;
    padding: 12px 18px 4px;
    gap: 8px;
    color: var(--ink-soft);
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.02em;
  }
  .folder-name { color: var(--ink); font-weight: var(--fw-semibold); }

  .crumbs-actions {
    display: flex;
    gap: 4px;
    padding: 4px 18px 8px;
  }
  .icon-btn {
    appearance: none;
    background: transparent;
    border: 0;
    padding: 6px;
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

  .filelist {
    flex: 1 1 auto;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--border);
  }
  .head {
    display: grid;
    grid-template-columns: 1fr 80px 80px 120px;
    padding: 6px 18px;
    background: var(--bg-soft);
    border-bottom: 1px solid var(--border);
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--ink-mute);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .cell { display: flex; align-items: center; gap: 8px; }
  .name-head { gap: 12px; }
  .cbx {
    width: 14px;
    height: 14px;
    accent-color: var(--orange);
    cursor: not-allowed;     /* Phase 1: disabled until vault arrives */
  }

  .filerows-empty {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ink-mute);
    font-style: italic;
    font-family: var(--font-body);
    font-size: var(--fs-meta);
    padding: var(--s-md);
    text-align: center;
  }
</style>
