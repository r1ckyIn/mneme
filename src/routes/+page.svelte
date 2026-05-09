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
  import MindMapBar from "$lib/components/MindMapBar.svelte";
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
    <!-- Plan 01-09 Task 6: MindMapBar replaces the text placeholder.
         The component owns its own layout + drag handle; the legacy .placeholder
         wrapper is dropped now that the row is no longer empty. -->
    <MindMapBar />
  {/snippet}
</Splitter>

<style>
  /* Plan 01-09: legacy `.placeholder` style removed — bottom row now owns
     its visual via MindMapBar (Task 6). Right pane keeps a wrapper so the
     A-05 5-region drag-handle contract still has its anchor. */
  .right-pane-slot {
    height: 100%;
    position: relative;     /* anchor for the right-pane DragHandle (A-05 #4) */
  }
</style>
