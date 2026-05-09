<!--
  FilePreview.svelte — A-12 middle-bottom placeholder.
  Phase 4 (Marker subprocess + PDF render pipeline) replaces the body. Phase 1
  ships only the chrome (breadcrumb + drag handle + italic placeholder copy).

  AMENDMENT note: prototype uses copy "wired in Phase 6"; the AMENDMENT
  semantic clarifies that PDF preview chrome is Phase 4 (Marker pipeline);
  Phase 6 is Echo360 video. We honor the AMENDMENT.

  Visual SSOT: Mneme.html L1267-1278 (with copy adjusted per A-12).
-->
<script lang="ts">
  import DragHandle from "$lib/components/DragHandle.svelte";
</script>

<section class="middle-bottom">
  <div class="region-header">
    <span class="breadcrumb">~/Mneme/usyd-2026s1 / COMP3027 / tutorial-06.pdf</span>
    <DragHandle />
  </div>
  <div class="placeholder">
    <em>PDF preview · wired in Phase 4</em>
  </div>
</section>

<style>
  .middle-bottom {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;     /* anchor for .drag-handle.abs */
  }

  .region-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 18px 8px;
    border-bottom: 1px solid var(--border);
  }
  .breadcrumb {
    color: var(--ink-mute);
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.02em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-right: 60px;
  }

  .placeholder {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ink-mute);
    font-style: italic;
    font-family: var(--font-body);
    font-size: var(--fs-h);
    text-align: center;
    padding: var(--s-lg);
    user-select: none;
  }
</style>
