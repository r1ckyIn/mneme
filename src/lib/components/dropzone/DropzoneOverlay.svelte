<!--
  Visual: /Users/qinyuan/Downloads/Mneme 3/Mneme Dropzone Overlay.html (locked 2026-05-15 bundle)
  + 02-UI-SPEC.md §8.4 + 02.1-CONTEXT.md §D-04
  Pattern: 02-SPIKE-dragdrop.md option-2 — Tauri onDragDropEvent with dragDropEnabled=true.
  payload.paths.length > 0 discriminates native file drag from text drag.

  B1 fix (Phase 02.1 02.1-06): backdrop swapped from --color-cream to dark veil
  rgba(20,20,19,0.45) + blur(4px). Hero card adds arrow-down-into-tray icon +
  serif title + soft subtitle per D-04 + Mneme 3 SSOT. Previous backdrop
  made the overlay invisible against the main UI (UI-REVIEW.md L70-72).

  D-04 deliberately diverges from the Mneme 3 SSOT's cream-on-cream (rgba(250,249,245,0.92))
  in favor of a darker veil so the overlay reads as a clear modal affordance.
  The cream hero card preserves contrast against the veil.
-->
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
  import type { UnlistenFn } from "@tauri-apps/api/event";

  interface Props {
    onPathsDropped: (paths: string[]) => void;
  }
  let { onPathsDropped }: Props = $props();

  let visible = $state(false);
  let unlisten: UnlistenFn | null = null;

  onMount(async () => {
    const win = getCurrentWebviewWindow();
    // CYCLE-2 cluster #14 — Tauri 2 onDragDropEvent payload shapes differ by type:
    //   - `enter` and `drop` carry `paths: string[]` AND `position: { x, y }`.
    //   - `over` carries ONLY `position: { x, y }` — NO `paths` field. Reading
    //     `payload.paths.length` on an `over` event throws TypeError at runtime
    //     (the cycle-1 codex finding). Original snippet ran fine in spike but
    //     would crash production once we widen the test matrix.
    // Strategy:
    //   - `enter`: read `paths.length > 0` to gate visibility (file drag vs text drag).
    //   - `over`: KEEP current visibility — already discriminated by `enter`. No paths field touched.
    //   - `leave`: hide unconditionally.
    //   - `drop`: hide + invoke callback with `payload.paths`.
    unlisten = await win.onDragDropEvent(({ payload }) => {
      // CYCLE-3 priority #4 cycle-2 NEW HIGH 1 fix — REMOVED `@ts-expect-error`.
      // After the `switch (payload.type)` narrowing, the Tauri 2 DragDropEvent
      // discriminated union resolves `payload.paths` on enter/drop without
      // any cast. The @ts-expect-error directives in cycle-2 became "unused"
      // (TS6133) once narrowing landed and would have failed `npm run check`.
      // The fallback `?? []` defends against runtime undefined.
      const p = payload as { type: string; paths?: string[]; position?: { x: number; y: number } };
      switch (payload.type) {
        case "enter": {
          // enter carries paths
          const paths: string[] = p.paths ?? [];
          visible = paths.length > 0;
          break;
        }
        case "over":
          // CYCLE-2 cluster #14 — over carries position only, NOT paths.
          // Preserve current `visible` value (already set by the preceding `enter`).
          break;
        case "leave":
          visible = false;
          break;
        case "drop": {
          visible = false;
          const paths: string[] = p.paths ?? [];
          if (paths.length > 0) onPathsDropped(paths);
          break;
        }
      }
    });
  });

  onDestroy(() => {
    unlisten?.();
  });
</script>

{#if visible}
  <div class="overlay" aria-live="polite" aria-label="Drop to import">
    <div class="hero">
      <svg
        class="hero-icon"
        width="48"
        height="48"
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <!-- arrow-down-into-tray glyph: matches Mneme 3 SSOT visual contract -->
        <line x1="32" y1="8" x2="32" y2="40" />
        <polyline points="20 28 32 40 44 28" />
        <path d="M10 44 L10 54 A2 2 0 0 0 12 56 L52 56 A2 2 0 0 0 54 54 L54 44" />
      </svg>
      <h2 class="hero-title">Drop to import</h2>
      <p class="hero-subtitle">Files will be routed to your vault</p>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    /* B1 fix: dark veil (was --color-cream, invisible against the main UI).
       Uses --color-scrim + --blur-soft tokens (added in tokens.css for reuse). */
    background: var(--color-scrim);
    backdrop-filter: blur(var(--blur-soft));
    -webkit-backdrop-filter: blur(var(--blur-soft)); /* Safari / WKWebView */
    display: grid;
    place-items: center;
    z-index: 200;
    pointer-events: none;
    /* 200ms ease-out fade — compositor-friendly (opacity only). */
    animation: dz-fade-in var(--duration-base) var(--ease-out) both;
  }
  .hero {
    background: var(--color-cream);
    padding: var(--space-6);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    color: var(--color-warm-dark);
    box-shadow: var(--shadow-2);
  }
  .hero-icon {
    color: var(--color-warm-dark);
    flex-shrink: 0;
  }
  .hero-title {
    font-family: var(--font-serif);
    /* --fs-display (28px) matches Mneme 3 SSOT .dz-hero and UI-SPEC §8.4 hero scale.
       --fs-h (20px) is the next step down in the legacy 4-size scale — display is
       the right token for the dropzone hero line per UI-SPEC L106. */
    font-size: var(--fs-display);
    font-weight: var(--fw-semibold);
    letter-spacing: -0.01em;
    line-height: var(--lh-heading);
    margin: 0;
    color: var(--color-warm-dark);
  }
  .hero-subtitle {
    font-family: var(--font-serif);
    font-size: var(--fs-body);
    color: var(--color-warm-dark-soft);
    margin: 0;
  }

  @keyframes dz-fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* Reduced-motion: opacity-only (no transform) and instant per tokens.css.
     The animation duration is already gated by tokens.css @media reduced-motion
     setting --duration-base to 0ms — but be explicit here for safety. */
  @media (prefers-reduced-motion: reduce) {
    .overlay {
      animation: none;
    }
  }
</style>
