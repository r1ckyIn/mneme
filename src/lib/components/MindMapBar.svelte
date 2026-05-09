<!--
  MindMapBar.svelte — Plan 01-09 Task 6 NEW component.
  120px-tall bottom row mounted in Splitter's `bottom` snippet (was a
  text placeholder in 01-05).

  Layout (SSOT: Mneme.html L1052-1100, L1456-1521):
    - Left section (220px wide): kicker (mono 10.5px uppercase) + title
      (serif 14px) + sub (mono 11px) — all in --color-warm-dark-mute /
      --color-warm-dark.
    - Center: bottom-canvas with SVG dot pattern background + 7 mock
      concept-node chips connected by faint hairlines. Mock concepts
      hardcoded per prototype L1488-1514: rod-cutting → recurrence →
      memoisation (orange-tinted highlight) → O(n²) time → DP table →
      base case → r(0)=0.
    - Right (.bottom-actions): refresh + expand ↗ ghost-buttons.
    - Right edge: drag-handle.abs covered by parent wrapper.

  Phase 1: NO interactivity wired. Phase 7+8 wires real graph layout.
-->
<script lang="ts">
  import DragHandle from "$lib/components/DragHandle.svelte";
</script>

<footer class="bottom" data-screen-label="bottom/kg">
  <DragHandle />
  <div class="bottom-label">
    <span class="kicker">Mind-map / KG live preview</span>
    <span class="title">Concepts surfacing from this session</span>
    <span class="sub">wired in Phase 7 + 8</span>
  </div>
  <div class="bottom-canvas">
    <!-- Dotted-grid background + soft edges + 7 concept-node chips.
         All hardcoded coords from Mneme.html L1467-1515. -->
    <svg viewBox="0 0 800 96" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <pattern id="mmbDots" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1.2" cy="1.2" r="0.8" fill="rgba(20,20,19,0.10)"></circle>
        </pattern>
      </defs>
      <rect x="0" y="0" width="800" height="96" fill="url(#mmbDots)"></rect>

      <!-- edges (faint hairlines) -->
      <g stroke="rgba(20,20,19,0.18)" stroke-width="1" fill="none">
        <path d="M 90 48 Q 180 20 260 50"></path>
        <path d="M 260 50 Q 360 78 440 46"></path>
        <path d="M 440 46 Q 540 22 620 52"></path>
        <path d="M 620 52 Q 690 70 740 44"></path>
        <path d="M 260 50 Q 320 80 360 78"></path>
        <path d="M 440 46 L 460 76"></path>
      </g>

      <!-- nodes — 7 concept chips, memoisation highlighted with orange tint -->
      <g font-family="var(--font-mono), monospace" font-size="11" fill="#4a4843">
        <g>
          <rect x="50" y="36" width="80" height="22" rx="4" fill="#f3f1ea" stroke="rgba(20,20,19,0.10)"></rect>
          <text x="90" y="51" text-anchor="middle">rod-cutting</text>
        </g>
        <g>
          <rect x="220" y="38" width="80" height="22" rx="4" fill="#f3f1ea" stroke="rgba(20,20,19,0.10)"></rect>
          <text x="260" y="53" text-anchor="middle">recurrence</text>
        </g>
        <g>
          <rect x="400" y="34" width="80" height="22" rx="4" fill="#faf9f5" stroke="rgba(217,119,87,0.55)" stroke-width="1.25"></rect>
          <text x="440" y="49" text-anchor="middle" fill="#141413">memoisation</text>
        </g>
        <g>
          <rect x="580" y="40" width="80" height="22" rx="4" fill="#f3f1ea" stroke="rgba(20,20,19,0.10)"></rect>
          <text x="620" y="55" text-anchor="middle">O(n²) time</text>
        </g>
        <g>
          <rect x="700" y="32" width="76" height="22" rx="4" fill="#f3f1ea" stroke="rgba(20,20,19,0.10)"></rect>
          <text x="738" y="47" text-anchor="middle">DP table</text>
        </g>
        <g>
          <rect x="320" y="68" width="80" height="22" rx="4" fill="#f3f1ea" stroke="rgba(20,20,19,0.10)"></rect>
          <text x="360" y="83" text-anchor="middle">base case</text>
        </g>
        <g>
          <rect x="430" y="66" width="60" height="22" rx="4" fill="#f3f1ea" stroke="rgba(20,20,19,0.10)"></rect>
          <text x="460" y="81" text-anchor="middle">r(0)=0</text>
        </g>
      </g>
    </svg>
  </div>
  <div class="bottom-actions">
    <button class="ghost-btn" type="button" title="wired in Phase 7+8">refresh</button>
    <button class="ghost-btn" type="button" title="wired in Phase 7+8">expand ↗</button>
  </div>
</footer>

<style>
  /* SSOT: Mneme.html L1048-1121. */

  .bottom {
    height: 100%;
    position: relative;
    background: var(--color-cream);
    display: flex;
    align-items: stretch;
    padding: 12px 18px;
    gap: 16px;
    overflow: hidden;
    border-top: 1px solid var(--border-softer);   /* matches `.softrule` (Mneme L1048-1051) */
  }

  .bottom-label {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
    justify-content: center;
    color: var(--color-warm-dark-soft);
    width: 220px;
  }
  .bottom-label .kicker {
    font-family: var(--font-mono);
    font-size: 10.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-warm-dark-mute);
  }
  .bottom-label .title {
    font-family: var(--font-serif);
    font-size: 14px;
    color: var(--color-warm-dark);
  }
  .bottom-label .sub {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-warm-dark-mute);
  }

  .bottom-canvas {
    flex: 1 1 auto;
    border-left: 1px solid var(--border-softer);
    padding-left: 16px;
    position: relative;
    overflow: hidden;
  }
  .bottom-canvas svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  .bottom-actions {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Ghost-button (Mneme.html L1102-1121). */
  .ghost-btn {
    appearance: none;
    background: transparent;
    border: 1px solid var(--border-soft);
    color: var(--color-warm-dark-soft);
    font-family: var(--font-mono);
    font-size: 11px;
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition:
      background var(--duration-base) var(--ease-out),
      border-color var(--duration-base) var(--ease-out),
      color var(--duration-base) var(--ease-out),
      transform var(--duration-fast) var(--ease-out);
  }
  .ghost-btn:hover {
    background: rgba(20, 20, 19, 0.035);
    color: var(--color-warm-dark);
  }
  .ghost-btn:active { transform: scale(0.96); }
</style>
