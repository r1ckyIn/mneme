<!--
  LectureVideo.svelte — A-12 middle-top placeholder card.
  Phase 1: chrome only — slot-path breadcrumb (top-left, font-mono 11.5px) +
  drag handle (top-right) + 16:9 stripey placeholder card with frame icon.
  Phase 4 (Echo360 webview) replaces the placeholder with real video element.

  Visual SSOT: Mneme.html L486-559 (CSS) + L1244-1263 (markup).
-->
<script lang="ts">
  import DragHandle from "$lib/components/DragHandle.svelte";
</script>

<section class="preview-slot" data-slot="video">
  <!-- User feedback 2026-05-14: drop the breadcrumb ancestors; only show the
       leaf filename. Parent course/term context is already implied by the
       FileArea pane on the left + the active course in the titlebar. -->
  <span class="slot-path">
    <span class="leaf">L06 — Dynamic Programming.mp4</span>
  </span>
  <DragHandle />
  <div class="preview-placeholder">
    <div class="pp-frame">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polygon points="23 7 16 12 23 17 23 7"></polygon>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
      </svg>
    </div>
    <div class="pp-title">Lecture video player</div>
    <div class="pp-sub">EchoVideo wired in Phase 4</div>
  </div>
</section>

<style>
  /* SSOT: Mneme.html L486-559. */

  .preview-slot {
    display: grid;
    place-items: center;
    padding: 18px;
    padding-top: 42px;       /* Mneme.html L510 — clear absolute slot-path */
    min-height: 0;
    height: 100%;
    overflow: hidden;
    position: relative;
    background: var(--color-cream);
  }

  .slot-path {
    position: absolute;
    top: 12px;
    left: 18px;
    right: 18px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 11.5px;
    letter-spacing: 0.01em;
    color: var(--color-warm-dark-soft);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    user-select: text;
  }
  .slot-path .leaf { color: var(--color-warm-dark); }

  .preview-placeholder {
    width: min(560px, 92%);
    max-height: 100%;
    aspect-ratio: 16 / 9;
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-lg);
    background:
      repeating-linear-gradient(
        135deg,
        rgba(20, 20, 19, 0.025) 0 8px,
        transparent 8px 16px
      ),
      var(--color-cream-deep);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 14px;
    color: var(--color-warm-dark-soft);
    text-align: center;
    padding: 24px;
  }
  .preview-placeholder .pp-frame {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-md);
    background: var(--color-cream);
    border: 1px solid var(--border-soft);
    display: grid;
    place-items: center;
    color: var(--color-warm-dark-mute);
    box-shadow: var(--shadow-1);
  }
  .preview-placeholder .pp-title {
    font-family: var(--font-serif);
    font-size: 16px;
    color: var(--color-warm-dark);
    letter-spacing: -0.005em;
  }
  .preview-placeholder .pp-sub {
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--color-warm-dark-mute);
    letter-spacing: 0.02em;
  }
</style>
