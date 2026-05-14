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

  // Restore on mount — try/catch tolerates JSON.parse errors and falls back
  // to the 30/40/30 defaults declared above. WR-07 fix (2026-05-14): surface
  // the parse error via console.warn so a corrupted localStorage entry that
  // silently reverts the layout every session is visible during development.
  // User-perceived behavior unchanged (defaults still apply).
  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.leftRatio === "number" && typeof parsed.middleRatio === "number") {
          // WR-05-pin fix (2026-05-14): route restore through clampAndNormalize
          // so DRAG and RESTORE paths share identical bounds. Prior asymmetric
          // ceilings (RESTORE used RATIO_MAX=0.50 on left; DRAG admitted up to
          // 1-2*RATIO_MIN=0.60) silently clamped saved leftRatio in (0.50, 0.60]
          // down to 0.50 — up to 64px UX drift, violating SPEC L130 "restore
          // within 1px". Surfaced by /gsd-validate-phase 1 audit.
          const normalized = clampAndNormalize(parsed.leftRatio, parsed.middleRatio);
          leftRatio = normalized.leftRatio;
          middleRatio = normalized.middleRatio;
        }
      }
    } catch (err) {
      console.warn("[splitter] failed to restore layout from localStorage", err);
      // Default values stand — best-effort restore.
    }
  });

  function clamp(x: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, x));
  }

  // WR-05 fix (2026-05-14): clamp-and-normalize so leftRatio + middleRatio +
  // rightRatio sum to EXACTLY 1 after every drag-induced mutation. The prior
  // logic used `1 - RATIO_MIN - RATIO_MIN = 0.60` as the left ceiling but
  // RATIO_MAX = 0.50 for middle / right — the asymmetric ceilings combined
  // with the `Math.max` floor on the derived rightRatio could yield a frame
  // where left=0.60, middle=0.21, right=Math.max(0.20, 0.19)=0.20, summing
  // to 1.01fr. CSS grid would then over-allocate ~1% (~12px at 1280px).
  // The normalize function guarantees the invariant on every mutation by
  // returning the rightRatio as exactly `1 - left - middle`.
  function clampAndNormalize(
    leftDesired: number,
    middleDesired: number
  ): { leftRatio: number; middleRatio: number; rightRatio: number } {
    // Left can grow up to `1 - 2*RATIO_MIN` (both other panes hit their floor).
    const l = clamp(leftDesired, RATIO_MIN, 1 - RATIO_MIN * 2);
    // Middle is bounded below by RATIO_MIN, above by whatever is left after
    // honoring left + right's RATIO_MIN floor. Cap at RATIO_MAX so middle
    // never eats more than half the window.
    const mMax = Math.min(RATIO_MAX, 1 - l - RATIO_MIN);
    const m = clamp(middleDesired, RATIO_MIN, mMax);
    // rightRatio derived so all three sum to exactly 1 — never use Math.max
    // here because that would re-introduce the overshoot bug above.
    return { leftRatio: l, middleRatio: m, rightRatio: 1 - l - m };
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
      // Treat xRatio as the desired left-edge of the middle pane (i.e. left
      // ratio). Middle keeps its current ratio; normalize will pull it down
      // if leftDesired + middleRatio > 1 - RATIO_MIN.
      const next = clampAndNormalize(xRatio, middleRatio);
      leftRatio = next.leftRatio;
      middleRatio = next.middleRatio;
    } else if (dragging === "right") {
      // xRatio is the desired left-edge of the right pane (i.e. left + middle).
      // We hold leftRatio fixed and derive middle from (xRatio - leftRatio).
      const next = clampAndNormalize(leftRatio, xRatio - leftRatio);
      leftRatio = next.leftRatio;
      middleRatio = next.middleRatio;
    }
  }

  function endDrag(e: PointerEvent) {
    if (!dragging) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ leftRatio, middleRatio })
      );
    } catch (err) {
      console.warn("[splitter] failed to persist layout to localStorage", err);
      // Default values stand — best-effort persist.
    }
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    dragging = null;
  }

  // WR-05: rightRatio is now derived from the normalize invariant. The
  // Math.max floor is no longer needed because clampAndNormalize already
  // refuses to push left + middle past `1 - RATIO_MIN`.
  let rightRatio = $derived(1 - leftRatio - middleRatio);
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
    /* Plan 01-09 Task 10: 1px soft rule between main and bottom row to
       match the prototype's `.softrule` element (Mneme.html L1048-1051,
       L1452-1453). */
    grid-template-rows: 1fr 1px var(--bottom-row-h);
    /* Plan 01-09 Task 10: parent `.window` element supplies fixed dimensions
       (1280×860 desktop / 100vw×100vh on smaller viewports), so the splitter
       grid now stretches to its parent rather than the global viewport. */
    height: 100%;
    width: 100%;
    overflow: hidden;
    background: var(--color-cream);
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
    background: var(--color-cream);
    /* Plan 01-09 Task 10: the .window grid now reserves a real 36px titlebar
       row above the splitter (was: this padding-top:36px reserved fake space
       within the pane). Removing the padding so the chat header sits flush
       to the top of the right pane. The 5-region drag-handle contract still
       holds — DragHandle.abs anchors to .right-pane-slot. */
  }

  /* A-12 — middle column 2-row split.
     Plan 01-09: row splitter uses Mneme.html L511-516 `.splitter-h` —
     visible 1px hairline (--border-soft) baseline + orange-0.4 tint on hover. */
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
    background: var(--border-soft);
    cursor: row-resize;     /* visual cursor only; Phase 3 wires JS drag */
    user-select: none;
    transition: background var(--duration-fast) var(--ease-out);
  }
  .middle-row-splitter:hover {
    background: rgba(217, 119, 87, 0.4);  /* Mneme.html L516 — orange tint */
  }

  /* Plan 01-09: column splitters use Mneme.html L186-200 `.splitter` —
     transparent track + 1px ::before hairlines on left + right. Hover
     darkens border-softer to border-soft. Drag still tints orange. */
  .handle {
    cursor: col-resize;
    background: transparent;
    position: relative;
    user-select: none;
    touch-action: none;             /* required for setPointerCapture on touch surfaces */
    transition: background var(--duration-base) var(--ease-out);
  }
  .handle::before {
    content: "";
    position: absolute;
    inset: 0;
    border-left: 1px solid var(--border-softer);
    border-right: 1px solid var(--border-softer);
    transition: border-color var(--duration-fast) var(--ease-out);
    pointer-events: none;
  }
  .handle:hover::before {
    border-left-color: var(--border-soft);
    border-right-color: var(--border-soft);
  }
  .grid.dragging .handle {
    /* Drag-active state — UI-SPEC accent allow-list site #4 */
    background: rgba(217, 119, 87, 0.18);
  }
  .grid.dragging .handle::before {
    border-left-color: var(--color-orange);
    border-right-color: var(--color-orange);
  }

  .bottom-row {
    grid-column: 1 / -1;
    grid-row: 3;            /* Plan 01-09 Task 10: skip the 1px softrule on row 2 */
    background: var(--color-cream);
    overflow: hidden;
    position: relative;     /* anchor for bottom-row .drag-handle.abs */
  }
  /* Visible 1px softrule between main row and bottom row — Mneme.html L1048-1051. */
  .grid::before {
    content: "";
    grid-column: 1 / -1;
    grid-row: 2;
    background: var(--border-softer);
  }
</style>
