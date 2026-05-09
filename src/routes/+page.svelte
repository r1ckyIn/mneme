<!--
  +page.svelte — Phase 1 main view.
  Three-pane resizable shell + 120px bottom row + Round 5 amendments
  (A-05 drag handles + A-07 Finder file area + A-10 titlebar meta + A-11
  settings modal + A-12 middle 2-row split).

  Wave 4 (plan 01-06) replaces the right-pane inner placeholder TEXT with
  <ChatPanel />. The wrapping div + DragHandle (A-05 placement #4) PERSIST.

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
  import ChatPanel from "$lib/components/ChatPanel.svelte";
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
    <!-- Wrapper + DragHandle persist (A-05 placement #4 of 5).
         ChatPanel fills the inner content; the placeholder italic text
         is replaced by ChatPanel's own surface. -->
    <div class="right-pane-slot" data-pane="right">
      <DragHandle />
      <ChatPanel />
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
     visual treatment". Right pane no longer needs this (ChatPanel owns its
     own background); bottom row keeps it for Phase 1. */
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

  .right-pane-slot {
    height: 100%;
    position: relative;     /* anchor for the right-pane DragHandle (A-05 #4) */
  }

  /* .bottom-row-placeholder inherits .placeholder above. */
</style>
