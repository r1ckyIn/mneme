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

<!-- Plan 01-09 Task 10: window chrome wrapper added so headless 1280×860
     screenshots match the prototype's stage + window frame visual. The .stage
     centers the .window in a dark matte frame; .window applies the cream
     surface + 10px radius + drop shadow. Tauri WebView in production renders
     this same chrome inside the OS window, but the dev preview fills the
     viewport — the .stage padding-0 media query handles small viewports. -->
<div class="stage">
  <div class="window">

    <!-- Titlebar — macOS overlay style. We rely on the OS-rendered traffic
         lights from `decorations:true + titleBarStyle:Overlay + hiddenTitle:true`
         in tauri.conf.json. The 36px `var(--titlebar-height)` row reserves
         space for them on the left. The prototype's fake `.traffic-lights`
         DOM was removed — keeping it caused a double-render (real OS dots +
         fake DOM dots = ghosting). data-tauri-drag-region makes the bar
         draggable; TitlebarMeta children opt out via `data-tauri-drag-region="false"`
         on their interactive elements. -->
    <div class="titlebar" data-tauri-drag-region>
      <div class="titlebar-spacer" aria-hidden="true"></div>
      <TitlebarMeta />
    </div>

    <!-- Main 3-column row + 1px softrule + 120px bottom row (Splitter owns the grid) -->
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
        <!-- Wrapper + DragHandle persist (A-05 placement #4 of 5). ChatPanel
             fills the inner content. -->
        <div class="right-pane-slot" data-pane="right">
          <DragHandle />
          <ChatPanel />
        </div>
      {/snippet}

      {#snippet bottom()}
        <!-- Plan 01-09 Task 6: MindMapBar replaces the text placeholder. -->
        <MindMapBar />
      {/snippet}
    </Splitter>

  </div>
</div>

<style>
  /* SSOT: Mneme.html L94-117 (.stage + .window) + L119-160 (.titlebar +
     traffic lights). Plan 01-09 Task 10 — chrome wrapper added so the
     dev preview matches the prototype 1280x860 visual. */

  .stage {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 24px;
    background: #1f1e1c;     /* Mneme.html L84 — matte dark stage */
  }

  .window {
    width: 1280px;
    height: 860px;
    min-width: 1024px;
    min-height: 600px;
    background: var(--color-cream);
    border-radius: 10px;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.04),
      0 8px 24px rgba(0, 0, 0, 0.35),
      0 24px 60px rgba(0, 0, 0, 0.45);
    overflow: hidden;
    /* Window grid: 36px titlebar | main row | 1px soft rule | 120px bottom.
       Splitter owns the inner main + bottom rows directly (its .grid
       sets height:100% and uses its own grid-template-rows). The titlebar
       sits above. */
    display: grid;
    grid-template-rows: var(--titlebar-height) 1fr;
    transform-origin: center center;
  }

  /* Titlebar — Mneme.html L120-160 visual contract, but with two Tauri-specific
     adaptations: (1) `data-tauri-drag-region` on the wrapper element is what
     Tauri 2 actually honors for native window dragging — the prototype's
     `-webkit-app-region: drag` is Electron/Chrome PWA syntax that Tauri 2
     does NOT recognize. (2) `.titlebar-spacer` reserves the 70-78px traffic-light
     gutter on the left so TitlebarMeta doesn't slide under the OS buttons.
     The prototype rendered fake `.traffic-lights` DOM dots; we removed them
     — Tauri's `decorations:true + titleBarStyle:Overlay + hiddenTitle:true`
     already paints the real ones, and rendering both produced a ghost-halo. */
  .titlebar {
    grid-row: 1;
    position: relative;
    display: flex;
    align-items: center;
    padding: 0 var(--space-4);
    background: transparent;
    z-index: 5;
  }
  .titlebar-spacer {
    /* Reserves space for OS-rendered traffic lights (≈ 70px on macOS overlay
       titleBarStyle). Without this, TitlebarMeta would render under the dots. */
    width: 70px;
    flex: 0 0 auto;
  }

  .right-pane-slot {
    height: 100%;
    position: relative;     /* anchor for the right-pane DragHandle (A-05 #4) */
  }

  /* Scale-to-viewport guard — Mneme.html L1162-1164. When the viewport is
     smaller than the 1280x860 window + 24px stage padding (e.g. 13"
     MacBook), drop the padding so the window fills the viewport. */
  @media (max-height: 920px), (max-width: 1340px) {
    .stage { padding: 0; }
    .window {
      width: 100vw;
      height: 100vh;
      border-radius: 0;
    }
  }
</style>
