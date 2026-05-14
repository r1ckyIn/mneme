<!--
  FileArea.svelte — A-07 left pane Finder-style table.
  Plan 01-09: prototype-matched 6-row mock list (5 files + 1 folder) with
  inline SVG icons + grid-template-columns table.

  Phase 1: chrome only. NO real file tree (Phase 2 wires the vault). Mock
  data is the EXACT strings from Mneme.html VAULT (`COMP3027 · Algorithms`).
  The 6 rows visible are the children of that folder (folder-first sort).

  Visual SSOT: Mneme.html L232-471 (CSS) + L1196-1238 (markup) +
  L1577-1632 (mock VAULT data + iconFor helper).

  IMPORTANT: per Phase 1 contract, NO interactivity is wired. Buttons /
  rows accept clicks visually (hover) but produce no navigation. Phase 2
  wires real folder navigation + checkbox state machine.
-->
<script lang="ts">
  import DragHandle from "$lib/components/DragHandle.svelte";

  // Mock 6-row dataset — folder-first per prototype L1581-1588.
  // Order: transcripts (folder), L05/L06 (mp4), tutorial-06 (pdf), notes.md.
  // Mneme.html sorts mtime desc by default — we hardcode that ordering for visual fidelity.
  type Row = {
    name: string;
    kind: "folder" | "video" | "pdf" | "md";
    size: string;        // formatted display string ("482 MB", "—" for folders)
    type: string;        // "Folder" | "MP4 file" | "PDF file" | "MD file"
    mtime: string;       // "2026-05-08 16:51"
    active?: boolean;    // selected highlight (matches Mneme.html L1582)
  };

  const rows: Row[] = [
    { name: "transcripts", kind: "folder", size: "—", type: "Folder", mtime: "2026-05-07 22:10" },
    { name: "notes.md", kind: "md", size: "12 KB", type: "MD file", mtime: "2026-05-08 16:51" },
    { name: "tutorial-06.pdf", kind: "pdf", size: "1.2 MB", type: "PDF file", mtime: "2026-05-06 13:45" },
    { name: "L06 — Dynamic Programming.mp4", kind: "video", size: "610 MB", type: "MP4 file", mtime: "2026-05-06 11:02" },
    { name: "L05 — Greedy Algorithms.mp4", kind: "video", size: "482 MB", type: "MP4 file", mtime: "2026-04-29 09:14" },
  ];

  // Phase 1: sort indicator on Modified column (default mtime desc per prototype L1714).
  // Cast widens the literal so the head-row template's
  // `class:active-sort={activeSortKey === "name"}` checks compile cleanly.
  type SortKey = "name" | "size" | "type" | "mtime";
  const activeSortKey = "mtime" as SortKey;
</script>

<section class="file-area">
  <!-- Finder-style nav row: back / forward (disabled) + folder name + drag handle -->
  <nav class="crumbs finder" aria-label="Folder navigation">
    <button class="navbtn" type="button" aria-label="Back" title="Back" disabled>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    </button>
    <button class="navbtn" type="button" aria-label="Forward" title="Forward" disabled>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </button>
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

  <div class="filelist">
    <div class="head">
      <div class="cell name-head" class:active-sort={activeSortKey === "name"}>
        <input type="checkbox" class="cbx" aria-label="Select all">
        <span class="head-spacer" aria-hidden="true"></span>
        <span class="head-label"><span>Name</span><span class="sort" aria-hidden="true"></span></span>
      </div>
      <div class="cell" class:active-sort={activeSortKey === "size"}>
        <span>Size</span><span class="sort" aria-hidden="true"></span>
      </div>
      <div class="cell" class:active-sort={activeSortKey === "type"}>
        <span>Type</span><span class="sort" aria-hidden="true"></span>
      </div>
      <div class="cell" class:active-sort={activeSortKey === "mtime"}>
        <span>Modified</span>
        <span class="sort" aria-hidden="true">
          <!-- desc indicator (chevron-down) — mtime sort default -->
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </div>
    </div>
    <div id="filerows">
      {#each rows as r (r.name)}
        <div class="row" data-kind={r.kind === "folder" ? "folder" : "file"} class:selected={r.active}>
          <div class="cell">
            <div class="name-cell">
              <input type="checkbox" class="cbx" aria-label="Select {r.name}">
              {#if r.kind === "folder"}
                <span class="ico folder">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
                    <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2h9A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z"/>
                  </svg>
                </span>
              {:else if r.kind === "video"}
                <span class="ico thumb">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                </span>
              {:else if r.kind === "pdf"}
                <span class="ico">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                </span>
              {:else}
                <span class="ico">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="9" y1="13" x2="15" y2="13"></line>
                    <line x1="9" y1="17" x2="15" y2="17"></line>
                  </svg>
                </span>
              {/if}
              <span class="name">{r.name}</span>
            </div>
          </div>
          <div class="cell muted">
            {#if r.kind === "folder"}<span style:opacity="0.45">—</span>{:else}{r.size}{/if}
          </div>
          <div class="cell muted">{r.type}</div>
          <div class="cell muted">{r.mtime}</div>
        </div>
      {/each}
    </div>
  </div>
</section>

<style>
  /* SSOT: Mneme.html L232-471 — file-area + crumbs + filelist + cells. */

  .file-area {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;     /* anchor for nested .drag-handle.abs */
    background: var(--color-cream);
  }

  /* Finder nav row — Mneme.html L235-274. */
  .crumbs.finder {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 42px;
    padding: 0 18px;
    box-sizing: border-box;
    font-family: var(--font-mono);
    font-size: 11.5px;
    letter-spacing: 0.01em;
    color: var(--color-warm-dark-soft);
    flex: 0 0 auto;
  }
  .crumbs.finder .navbtn {
    appearance: none;
    background: transparent;
    border: 0;
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--color-warm-dark-soft);
    border-radius: 6px;
    cursor: pointer;
    transition:
      background var(--duration-fast) var(--ease-out),
      color var(--duration-fast) var(--ease-out),
      transform var(--duration-fast) var(--ease-out);
  }
  .crumbs.finder .navbtn:hover {
    background: rgba(20, 20, 19, 0.05);
    color: var(--color-warm-dark);
  }
  .crumbs.finder .navbtn:active { transform: scale(0.96); }
  .crumbs.finder .navbtn[disabled] { opacity: 0.32; cursor: default; }
  .crumbs.finder .navbtn[disabled]:hover { background: transparent; color: var(--color-warm-dark-soft); }
  .crumbs.finder .folder-name {
    margin-left: 8px;
    color: var(--color-warm-dark);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1 1 auto;
    min-width: 0;
  }

  /* Crumbs actions — Mneme.html L275-281. */
  .crumbs-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 18px 10px;
    flex: 0 0 auto;
  }
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

  /* Filelist grid — Mneme.html L331-435. */
  .filelist {
    display: grid;
    grid-template-columns:
      minmax(180px, 2.4fr)
      minmax(58px, 0.5fr)
      minmax(64px, 0.5fr)
      minmax(0, 0.6fr);
    column-gap: 0;
    align-content: start;
    font-family: var(--font-serif);
    font-size: 13.5px;
    color: var(--color-warm-dark);
    flex: 1 1 auto;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .filelist .head,
  .filelist .row,
  .filelist > #filerows {
    display: contents;
  }
  .filelist .cell {
    padding: 0;
    align-self: stretch;
    display: flex;
    align-items: center;
  }
  .filelist .head .cell {
    padding: 8px 0 10px;
    color: var(--color-warm-dark-mute);
    font-size: 12.5px;
    border-bottom: 1px solid var(--border-soft);
    cursor: pointer;
    user-select: none;
    display: flex;
    align-items: center;
    gap: 4px;
    padding-right: 12px;
    padding-left: 0;
    transition: color var(--duration-fast) var(--ease-out);
  }
  .filelist .head .cell:hover { color: var(--color-warm-dark); }
  .filelist .head .cell.active-sort { color: var(--color-warm-dark); }
  .filelist .head .cell:first-child { padding-left: 18px; padding-right: 12px; }
  .filelist .head .cell:last-child { padding-right: 18px; }

  .filelist .head .cell.name-head {
    gap: 12px;
  }
  .filelist .head .cell.name-head .head-spacer {
    width: 30px;
    flex: 0 0 auto;
  }
  .filelist .head .cell.name-head .head-label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .filelist .head .sort {
    width: 10px;
    height: 10px;
    display: inline-grid;
    place-items: center;
    color: var(--color-orange);
    flex: 0 0 auto;
  }

  .filelist .row .cell {
    padding: 12px 0;
    padding-right: 12px;
    padding-left: 0;
    border-bottom: 1px solid var(--border-softer);
    color: var(--color-warm-dark);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .filelist .row .cell:first-child { padding-left: 18px; padding-right: 12px; }
  .filelist .row .cell:last-child { padding-right: 18px; }
  .filelist .row .cell.muted { color: var(--color-warm-dark-mute); }
  .filelist .row.selected .cell { background: rgba(217, 119, 87, 0.06); }

  .filelist .name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .filelist .name-cell .cbx { flex: 0 0 auto; }
  .filelist .name-cell .ico {
    flex: 0 0 auto;
    width: 30px;
    height: 30px;
    border-radius: var(--radius-sm);
    display: grid;
    place-items: center;
    background: var(--color-cream-deep);
    color: var(--color-warm-dark-mute);
    overflow: hidden;
  }
  .filelist .name-cell .ico.folder {
    background: rgba(217, 119, 87, 0.10);
    color: var(--color-orange);
  }
  .filelist .name-cell .ico.thumb {
    background:
      repeating-linear-gradient(135deg,
        rgba(20, 20, 19, 0.06) 0 4px,
        rgba(20, 20, 19, 0.02) 4px 8px),
      var(--color-cream-deep);
  }
  .filelist .name-cell .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-warm-dark);
  }
  .filelist .row[data-kind="folder"] { cursor: pointer; }
  .filelist .row[data-kind="folder"]:hover .cell { background: rgba(20, 20, 19, 0.025); }
  .filelist .row[data-kind="file"]:hover .cell { background: rgba(20, 20, 19, 0.018); }

  /* Checkbox — Mneme.html L439-465. */
  .cbx {
    appearance: none;
    -webkit-appearance: none;
    box-sizing: border-box;
    width: 16px;
    height: 16px;
    flex: 0 0 16px;
    border: 1.25px solid rgba(20, 20, 19, 0.28);
    border-radius: 3px;
    background: var(--color-cream);
    cursor: pointer;
    display: inline-grid;
    place-items: center;
    margin: 0;
    transition:
      border-color var(--duration-fast) var(--ease-out),
      background var(--duration-fast) var(--ease-out);
  }
  .cbx:hover { border-color: var(--color-orange); }
  .cbx:checked {
    background: var(--color-orange);
    border-color: var(--color-orange);
  }
  .cbx:checked::after {
    content: "";
    width: 8px;
    height: 4px;
    border-left: 1.5px solid var(--color-cream);
    border-bottom: 1.5px solid var(--color-cream);
    transform: rotate(-45deg) translate(1px, -1px);
  }

  /* Scrollbar — Mneme.html L1124-1138. */
  .filelist::-webkit-scrollbar { width: 10px; }
  .filelist::-webkit-scrollbar-thumb {
    background: rgba(20, 20, 19, 0.10);
    border: 3px solid transparent;
    background-clip: padding-box;
    border-radius: 10px;
  }
  .filelist::-webkit-scrollbar-thumb:hover {
    background: rgba(20, 20, 19, 0.18);
    background-clip: padding-box;
    border: 3px solid transparent;
  }
</style>
