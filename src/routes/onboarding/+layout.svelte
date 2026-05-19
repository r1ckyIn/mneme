<!--
  Visual: /Users/qinyuan/Downloads/Mneme 3/Mneme Onboarding.html (shared step shell frame)
         + 02-UI-SPEC.md §8.1 (Shared step shell — geometry + step rail mount)

  Phase 2 D-01 — full-screen route takes over the entire viewport below the
  36px overlay titlebar. NO Splitter / NO MindMapBar / NO chat. The 36px
  titlebar from Phase 1 stays visible (it lives in the ROOT +layout, not
  here) so Cmd+Q drain path still works (Phase 1 D-06 chrome lock).

  Layout:
   - Cream backdrop fills the entire onboarding viewport
   - 2-row grid: body (1fr) + step rail (64px)
   - The Onboarding.svelte child paints `<main class="step-body">` into row 1
     and `<footer class="rail-host">` into row 2 (matches UI-SPEC ASCII).

  Note: `position: fixed; inset: 36px 0 0 0` deliberately overlays the
  Phase 1 main shell so the wizard always sits ABOVE any prerendered
  three-pane DOM (which never paints because the root layout's `ready`
  gate suppresses children until onboarding state is known).
-->
<script lang="ts">
  let { children } = $props();
</script>

<div class="onboarding-shell">
  {@render children()}
</div>

<style>
  .onboarding-shell {
    position: fixed;
    inset: 36px 0 0 0;
    background: var(--color-cream);
    color: var(--color-warm-dark);
    overflow: hidden;
    display: grid;
    grid-template-rows: 1fr 64px;  /* body + step rail */
  }
</style>
