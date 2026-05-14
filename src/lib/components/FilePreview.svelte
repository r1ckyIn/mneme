<!--
  FilePreview.svelte — A-12 middle-bottom placeholder card.
  Phase 1: chrome only — slot-path breadcrumb (top-left, font-mono 11.5px) +
  drag handle (top-right) + 16:9 stripey placeholder card with PDF icon.

  Sub-copy "tutorial-06.pdf · wired in Phase 6" — defer to prototype L1281
  per 01-09-PLAN Task 4 ("Phase 4 in original; prototype shows Phase 6 — defer
  to prototype"). Phase 4 (Marker subprocess) actually does PDF→md, so the
  Phase 6 reference here is the prototype's intended copy choice.

  Visual SSOT: Mneme.html L486-559 (CSS) + L1265-1283 (markup).
-->
<script lang="ts">
  import DragHandle from "$lib/components/DragHandle.svelte";
</script>

<section class="preview-slot" data-slot="pdf">
  <span class="slot-path">
    <span>~/Mneme/usyd-2026s1</span>
    <span class="sep">/</span>
    <span>COMP3027</span>
    <span class="sep">/</span>
    <span class="leaf">tutorial-06.pdf</span>
  </span>
  <DragHandle />
  <div class="preview-placeholder">
    <div class="pp-frame">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="9" y1="13" x2="15" y2="13"></line>
        <line x1="9" y1="17" x2="15" y2="17"></line>
      </svg>
    </div>
    <div class="pp-title">PDF preview</div>
    <div class="pp-sub">tutorial-06.pdf · wired in Phase 6</div>
  </div>
</section>

<style>
  /* SSOT: Mneme.html L486-559 (same `.preview-slot` family as LectureVideo). */

  .preview-slot {
    display: grid;
    place-items: center;
    padding: 18px;
    padding-top: 42px;
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
  .slot-path .sep { color: var(--color-warm-dark-mute); opacity: 0.55; }
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
