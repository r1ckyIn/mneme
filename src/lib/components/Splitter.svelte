<!--
  Splitter.svelte — vanilla three-column + bottom-row CSS Grid splitter (D-01).
  ~120 LOC fresh write per RESEARCH §Wave 1 step 1; rejected svelte-splitpanes
  per CONTEXT.md D-01 (Svelte 5 runes compat issues + 1 maintainer fails D-08).

  Drag handle interaction follows D-07: setPointerCapture prevents cursor escape.
  CSS Grid minmax + ratio clamp enforces UI-SPEC §"Pane proportions + dividers"
  min-width 200px per pane (translates to 0.20 ratio floor at 1024px window;
  acceptable approximation — exact px-floor would require ResizeObserver, deferred).

  localStorage key `mneme.layout.split` per SPEC L37 + CONTEXT.md D-02.
  Stored value: JSON {"leftRatio": number, "middleRatio": number}.

  Round 5 A-12: middle column itself splits into 2 rows
  (grid-template-rows: 1fr 4px 1fr) so the middle pane carries video on top
  and preview on bottom with a 4px non-resizable splitter between them. Phase 3
  wires the row-splitter to be drag-resizable.

  Slots (Svelte 5 snippets): left / middleTop / middleBottom / right / bottom.
  Plan 01-06 fills the `right` slot with the chat panel.

  Native traffic-light avoidance zone: the right pane wrapper applies
  `padding-top: 36px` to clear macOS overlay-style title bar (D-06). TitlebarMeta
  (A-10) sits in the same overlay zone but right-aligned (no overlap with
  traffic lights at top-LEFT).
-->
<script lang="ts">
  import { onMount, type Snippet } from "svelte";

  interface Props {
    left?: Snippet;
    middleTop?: Snippet;
    middleBottom?: Snippet;
    right?: Snippet;
    bottom?: Snippet;
  }

  let { left, middleTop, middleBottom, right, bottom }: Props = $props();

  const STORAGE_KEY = "mneme.layout.split";
  const HANDLE_WIDTH_PX = 4;
  const RATIO_MIN = 0.20;     // ~200px floor at 1024px window
  const RATIO_MAX = 0.50;     // never let a single pane eat more than half

  let leftRatio = $state(0.30);
  let middleRatio = $state(0.40);
  let dragging = $state<"left" | "right" | null>(null);

  // Restore on mount — try/catch swallows JSON.parse errors and falls back
  // to the 30/40/30 defaults declared above.
  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.leftRatio === "number" && typeof parsed.middleRatio === "number") {
          leftRatio = clamp(parsed.leftRatio, RATIO_MIN, RATIO_MAX);
          middleRatio = clamp(parsed.middleRatio, RATIO_MIN, RATIO_MAX);
        }
      }
    } catch {
      // Default values stand — no surfacing, this is a best-effort restore.
    }
  });

  function clamp(x: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, x));
  }

  function startDrag(which: "left" | "right", e: PointerEvent) {
    dragging = which;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    const totalWidth = window.innerWidth;
    if (totalWidth <= 0) return;
    const xRatio = e.clientX / totalWidth;
    if (dragging === "left") {
      const newLeft = clamp(xRatio, RATIO_MIN, 1 - RATIO_MIN - RATIO_MIN);
      if (newLeft + middleRatio + RATIO_MIN <= 1) {
        leftRatio = newLeft;
      } else {
        leftRatio = newLeft;
        middleRatio = clamp(1 - newLeft - RATIO_MIN, RATIO_MIN, RATIO_MAX);
      }
    } else if (dragging === "right") {
      const newMiddle = clamp(xRatio - leftRatio, RATIO_MIN, RATIO_MAX);
      middleRatio = newMiddle;
    }
  }

  function endDrag(e: PointerEvent) {
    if (!dragging) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ leftRatio, middleRatio })
      );
    } catch {
      // localStorage unavailable — best-effort persist.
    }
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    dragging = null;
  }

  let rightRatio = $derived(Math.max(RATIO_MIN, 1 - leftRatio - middleRatio));
</script>

<div
  class="grid"
  class:dragging={dragging !== null}
  style:grid-template-columns="{leftRatio * 100}fr {HANDLE_WIDTH_PX}px {middleRatio * 100}fr {HANDLE_WIDTH_PX}px {rightRatio * 100}fr"
  role="presentation"
  onpointermove={onPointerMove}
>
  <div class="pane left">
    {#if left}{@render left()}{/if}
  </div>
  <div
    class="handle"
    role="separator"
    aria-orientation="vertical"
    aria-label="Resize left pane"
    onpointerdown={(e) => startDrag("left", e)}
    onpointerup={endDrag}
  ></div>
  <div class="pane middle">
    <!-- A-12: middle column splits into 2 rows (top=video, bottom=preview)
         with a non-resizable 4px row splitter between them. Phase 3 wires
         row-splitter drag-to-resize. -->
    <div class="middle-stack">
      <div class="middle-top">
        {#if middleTop}{@render middleTop()}{/if}
      </div>
      <div class="middle-row-splitter" aria-hidden="true"></div>
      <div class="middle-bottom">
        {#if middleBottom}{@render middleBottom()}{/if}
      </div>
    </div>
  </div>
  <div
    class="handle"
    role="separator"
    aria-orientation="vertical"
    aria-label="Resize middle pane"
    onpointerdown={(e) => startDrag("right", e)}
    onpointerup={endDrag}
  ></div>
  <div class="pane right">
    {#if right}{@render right()}{/if}
  </div>
  <div class="bottom-row">
    {#if bottom}{@render bottom()}{/if}
  </div>
</div>

<style>
  .grid {
    display: grid;
    grid-template-rows: 1fr var(--bottom-row-h);
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    background: var(--bg);
  }

  .pane {
    overflow: hidden;
    min-width: var(--pane-min-w);
    position: relative;     /* A-05 — anchor for .drag-handle.abs children */
  }
  .pane.left {
    background: var(--bg-soft);
  }
  .pane.middle {
    background: var(--bg-soft);
  }
  .pane.right {
    background: var(--bg);
    /* Native traffic-light avoidance zone — D-06 + UI-SPEC §"Window Chrome Contract".
       The first 36px from top of the right pane is reserved padding so the
       overlay-style title bar's red/yellow/green buttons sit over empty space. */
    padding-top: 36px;
  }

  /* A-12 — middle column 2-row split */
  .middle-stack {
    display: grid;
    grid-template-rows: 1fr 4px 1fr;
    height: 100%;
  }
  .middle-top, .middle-bottom {
    overflow: hidden;
    position: relative;     /* anchor for .drag-handle.abs */
  }
  .middle-row-splitter {
    background: var(--border);
    cursor: default;        /* Phase 3 wires col-resize + drag JS */
    user-select: none;
  }

  .handle {
    cursor: col-resize;
    background: var(--border);
    transition: background var(--d-base) var(--ease);
    user-select: none;
    touch-action: none;             /* required for setPointerCapture on touch surfaces */
  }
  .handle:hover {
    background: var(--border-strong);
  }
  .grid.dragging .handle {
    /* Drag-active state — UI-SPEC accent allow-list site #4 */
    background: var(--orange);
  }

  .bottom-row {
    grid-column: 1 / -1;
    background: var(--bg-deep);
    border-top: 1px solid var(--border);
    overflow: hidden;
    position: relative;     /* anchor for bottom-row .drag-handle.abs */
  }
</style>
