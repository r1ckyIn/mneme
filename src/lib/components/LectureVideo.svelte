<!--
  LectureVideo.svelte — A-12 middle-top placeholder.
  Phase 6 (Echo360 webview) replaces the body of `.placeholder` with the real
  video element + WKWebView wrapping. Phase 1 ships only the chrome
  (breadcrumb + drag handle + italic placeholder copy).

  Visual SSOT: Mneme.html L1244-1265.
-->
<script lang="ts">
  import DragHandle from "$lib/components/DragHandle.svelte";
</script>

<section class="middle-top">
  <div class="region-header">
    <span class="breadcrumb">~/Mneme/usyd-2026s1 / COMP3027 / L06 — Dynamic Programming.mp4</span>
    <DragHandle />
  </div>
  <div class="placeholder">
    <em>Lecture video player · EchoVideo wired in Phase 6</em>
  </div>
</section>

<style>
  .middle-top {
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
    margin-right: 60px;     /* leave room for drag handle */
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
