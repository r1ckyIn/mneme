<!--
  +page.svelte — Phase 1 main view.
  Three-pane resizable shell + 120px bottom row per UI-SPEC §"Geometry Contract"
  + Round 5 amendments A-05 (drag handles on 5 regions) + A-07 (Finder-style
  file area) + A-10 (titlebar meta) + A-11 (settings modal) + A-12 (middle
  column 2-row split).

  Plan 01-06 (Wave 4) replaces the right-pane placeholder body with ChatPanel,
  preserving the right-pane DragHandle.

  Bottom-row placeholder copy is LOCKED per UI-SPEC §"Three placeholder copy
  (locked)" — do NOT alter without UI-SPEC re-approval.
-->
<script lang="ts">
  import Splitter from "$lib/components/Splitter.svelte";
  import FileArea from "$lib/components/FileArea.svelte";
  import LectureVideo from "$lib/components/LectureVideo.svelte";
  import FilePreview from "$lib/components/FilePreview.svelte";
  import DragHandle from "$lib/components/DragHandle.svelte";
  import TitlebarMeta from "$lib/components/TitlebarMeta.svelte";
</script>

<TitlebarMeta />

<Splitter>
  {#snippet left()}
    <FileArea />
  {/snippet}

  {#snippet middleTop()}
    <LectureVideo />
  {/snippet}

  {#snippet middleBottom()}
    <FilePreview />
  {/snippet}

  {#snippet right()}
    <!-- Plan 01-06 fills this slot with ChatPanel; the DragHandle persists
         (placement #4 of A-05's 5-region drag-handle contract). -->
    <div class="placeholder right-pane-slot" data-pane="right">
      <DragHandle />
      Chat wired in Phase 1 plan 06
    </div>
  {/snippet}

  {#snippet bottom()}
    <div class="placeholder bottom-row-placeholder">
      <DragHandle />
      Mind-map / KG live preview — wired in Phase 7+8
    </div>
  {/snippet}
</Splitter>

<style>
  /* Empty-pane placeholder visual treatment — UI-SPEC §"Empty-pane placeholder
     visual treatment" lines 398-419 verbatim. Right pane uses this until
     plan 01-06 fills with ChatPanel; bottom row is permanent for Phase 1. */
  .placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-family: var(--font-body);
    font-size: var(--fs-h);
    font-style: italic;
    font-weight: var(--fw-regular);
    color: var(--ink-mute);
    text-align: center;
    padding: var(--s-lg);
    user-select: none;
    position: relative;     /* anchor for nested .drag-handle.abs */
  }

  /* .bottom-row-placeholder and .right-pane-slot inherit .placeholder above.
     Empty rulesets removed to satisfy svelte-check's no-empty-rulesets rule;
     classnames remain in markup so plan 01-06 can wire selectors when
     ChatPanel mounts inside .right-pane-slot. */
</style>
