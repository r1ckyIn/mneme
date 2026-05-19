<!--
  +page.svelte — Phase 1 main view + Phase 2 Plan 02-12 integration wave.

  PHASE 1 SHELL (preserved verbatim):
  Three-pane resizable shell + 120px bottom row + Round 5 amendments
  (A-05 drag handles + A-07 Finder file area + A-10 titlebar meta + A-11
  settings modal + A-12 middle 2-row split).

  Wave 4 (plan 01-06) replaced the right-pane inner placeholder TEXT with
  <ChatPanel />. The wrapping div + DragHandle (A-05 placement #4) PERSIST.

  Bottom-row placeholder copy is LOCKED per UI-SPEC §"Three placeholder copy
  (locked)" — do NOT alter without UI-SPEC re-approval.

  Visual: /Users/qinyuan/Downloads/Mneme 3/Mneme.html L94-160 (shell) +
                                              Mneme Settings.html (modal) +
                                              Mneme Import Dialog.html +
                                              Mneme Dropzone Overlay.html +
                                              Mneme Import History.html
       + 02-UI-SPEC.md §8.1-8.9 (Phase 2 surface contract)
  Per D-18 visual SSOT pointer convention.

  PHASE 2 INTEGRATION (Plan 02-12 — Wave 8 final wave):
    - Mounts the four Phase 2 modals/overlays at template-root level
      (OUTSIDE .stage / .window) so they overlay the matte frame too —
      .window has overflow:hidden which would clip a child position:fixed
      element to the window bounds. DropzoneOverlay / ImportDialog /
      ImportHistoryModal / SettingsPanel all live at the template root.
    - PostOnboardingBanner is INLINE inside `.window`, mounted immediately
      after the `<div class="titlebar">` block so it joins the existing 3-row
      grid as a new row (CYCLE-3 priority #8 + cycle-2 NEW HIGH 1 fix —
      cycle-2 mounted at template root which would have rendered the banner
      outside the visible chrome). The banner's CSS uses inline margin (NOT
      position:fixed) so the grid auto-flows it.
    - BLK-3 resolution: DropzoneOverlay subscribes to the window-global
      Tauri onDragDropEvent. Mounted CONDITIONALLY on
      `$page.route.id !== '/onboarding/[step]'` so the global listener
      cannot register while onboarding is active. Defense-in-depth — the
      /onboarding route has its own +layout.svelte that fully replaces the
      three-pane shell, so this +page.svelte should not mount during
      onboarding; the gate is the second layer (the first is Plan 09 Step 6
      Browse-only — no DropzoneOverlay inside the wizard).
    - Cmd+I → @tauri-apps/plugin-dialog `open()` (multiple files) → opens
      ImportDialog with the chosen paths. Per D-13 this is the 5th narrow
      exception to the mouse-first interaction paradigm (macOS standard
      semantic; nothing else in mneme uses Cmd+I).
    - mneme:open-settings + mneme:open-history window CustomEvents are
      listened here and flip local boolean state. The same CustomEvents are
      dispatched by TitlebarMeta (cog click / pill click), SettingsPanel's
      internal Cmd+, hotkey, the +layout.svelte menu:open-settings bridge
      (macOS native menu), and PostOnboardingBanner's Open Settings CTA.
      Single downstream code path — no duplicate state machines.
-->
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { open as openDialog } from "@tauri-apps/plugin-dialog";
  import { page } from "$app/stores";

  // Phase 1 imports (preserved).
  import Splitter from "$lib/components/Splitter.svelte";
  import FileArea from "$lib/components/FileArea.svelte";
  import LectureVideo from "$lib/components/LectureVideo.svelte";
  import FilePreview from "$lib/components/FilePreview.svelte";
  import DragHandle from "$lib/components/DragHandle.svelte";
  import TitlebarMeta from "$lib/components/TitlebarMeta.svelte";
  import ChatPanel from "$lib/components/ChatPanel.svelte";
  import MindMapBar from "$lib/components/MindMapBar.svelte";

  // Phase 2 imports.
  import DropzoneOverlay from "$lib/components/dropzone/DropzoneOverlay.svelte";
  import ImportDialog from "$lib/components/ImportDialog.svelte";
  import ImportHistoryModal from "$lib/components/ImportHistoryModal.svelte";
  import SettingsPanel from "$lib/components/SettingsPanel.svelte";
  import PostOnboardingBanner from "$lib/components/PostOnboardingBanner.svelte";

  // Phase 2 modal/overlay state — local to this route, owned at the page
  // level so a single boolean drives each surface. SettingsPanel's prop-
  // controlled contract (CYCLE-3 #3 locked) requires the parent to own the
  // open boolean and listen for entry events.
  let importDialogOpen = $state(false);
  let importDialogPaths = $state<string[]>([]);
  let historyOpen = $state(false);
  let settingsOpen = $state(false);

  function openImportDialogWith(paths: string[]): void {
    if (paths.length === 0) return;
    importDialogPaths = paths;
    importDialogOpen = true;
  }

  function closeImportDialog(): void {
    importDialogOpen = false;
    importDialogPaths = [];
  }

  async function onCmdI(): Promise<void> {
    try {
      const chosen = await openDialog({
        multiple: true,
        directory: false,
        filters: [
          { name: "Documents", extensions: ["pdf", "docx", "pptx", "md", "txt", "epub"] },
        ],
      });
      if (!chosen) return;
      const paths = Array.isArray(chosen) ? chosen : [chosen];
      openImportDialogWith(paths);
    } catch (e) {
      console.error("[+page:cmd-i]", e);
    }
  }

  function onWindowKeydown(e: KeyboardEvent): void {
    // Cmd+I (mac) / Ctrl+I (cross-platform fallback) per D-13.
    // Avoid swallowing Cmd+Shift+I (devtools); the metaKey AND no-shift gate
    // narrows the surface — Cmd+Shift+I + similar combos pass through.
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === "i" || e.key === "I")) {
      e.preventDefault();
      void onCmdI();
    }
  }

  function onOpenSettingsEvent(): void {
    settingsOpen = true;
  }

  function onOpenHistoryEvent(): void {
    historyOpen = true;
  }

  onMount(() => {
    window.addEventListener("keydown", onWindowKeydown);
    window.addEventListener("mneme:open-settings", onOpenSettingsEvent);
    window.addEventListener("mneme:open-history", onOpenHistoryEvent);
  });

  onDestroy(() => {
    window.removeEventListener("keydown", onWindowKeydown);
    window.removeEventListener("mneme:open-settings", onOpenSettingsEvent);
    window.removeEventListener("mneme:open-history", onOpenHistoryEvent);
  });
</script>

<!-- Plan 01-09 Task 10: window chrome wrapper added so headless 1280×860
     screenshots match the prototype's stage + window frame visual. The .stage
     centers the .window in a dark matte frame; .window applies the cream
     surface + 10px radius + drop shadow. Tauri WebView in production renders
     this same chrome inside the OS window, but the dev preview fills the
     viewport — the .stage padding-0 media query handles small viewports. -->
<!-- stage = matte frame around the window. Click+drag in this 24px bezel
     should drag the OS window. The window itself opts out so internal
     clicks (chat input, file rows, etc.) don't accidentally drag. The
     titlebar inside reopts in via its own data-tauri-drag-region. -->
<div class="stage" data-tauri-drag-region>
  <div class="window" data-tauri-drag-region="false">

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
    <!-- CYCLE-3 priority #8 + cycle-2 NEW HIGH 1: PostOnboardingBanner is
         INLINE under the titlebar. The component self-gates visibility on
         vaultState.vault_path + localStorage sentinel; it returns null
         otherwise so the row has zero layout cost pre-onboarding. -->
    <PostOnboardingBanner />

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

<!-- CYCLE-3 priority #8 — position:fixed overlays + modals mount at template
     root (OUTSIDE .stage / .window) so they overlay the matte bezel too.
     The .window has overflow:hidden which would clip a child position:fixed
     surface. PostOnboardingBanner is the only Phase 2 surface mounted inline
     (above) because it joins the .window grid as a new row. -->

<!-- BLK-3: DropzoneOverlay subscribes to Tauri onDragDropEvent which is
     window-global. Mounting unconditionally could race with Plan 09 Step 6
     (Browse-only) if +page.svelte ever co-mounts under /onboarding. The
     onboarding route's own +layout.svelte fully replaces this shell — the
     gate is defense-in-depth (two-layer). -->
{#if $page.route.id !== "/onboarding/[step]"}
  <DropzoneOverlay onPathsDropped={openImportDialogWith} />
{/if}

<ImportDialog
  open={importDialogOpen}
  paths={importDialogPaths}
  onClose={closeImportDialog}
  onOpenSettings={() => { closeImportDialog(); settingsOpen = true; }}
/>
<ImportHistoryModal open={historyOpen} onClose={() => { historyOpen = false; }} />
<SettingsPanel open={settingsOpen} onClose={() => { settingsOpen = false; }} />

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
    /* Window grid: 36px titlebar | (optional PostOnboardingBanner row — auto)
       | main row | 1px soft rule | 120px bottom. The banner self-gates
       visibility (returns null when not shown) so the auto row is collapsed
       in the no-show case. Splitter owns the main + bottom rows. */
    display: grid;
    grid-template-rows: var(--titlebar-height) auto 1fr;
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
