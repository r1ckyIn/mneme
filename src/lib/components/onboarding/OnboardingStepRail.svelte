<!--
  Visual: /Users/qinyuan/Downloads/Mneme 3/Mneme Onboarding.html (step rail at frame bottom)
         + 02-UI-SPEC.md §8.1 step rail spec

  6 dots horizontally centered, gap --space-3 (12px):
   - Upcoming: 8px circle filled --border-soft
   - Active:   10px circle filled --color-orange + 2px ring --orange-ring
   - Completed:8px circle filled --color-warm-dark-mute

  Transitions: dot size + color cross-fade over --duration-base (200ms) with
  --ease-out per KD-13 motion token.

  Accessibility: <nav role="progressbar"> with aria-valuenow/min/max — Phase 2
  is forward-only (no click-to-jump per CONTEXT deferred list), so dots
  themselves are aria-hidden and the parent nav announces progress.

  KD-13 palette note (CYCLE-2 cluster #12 disposition): `--color-orange`
  is the locked KD-13 active-state fill. The olive accent in Living visual
  contract (`.planning/references/design/living-visual-contract.md`) is
  reserved for tool HTML (review / dogfood / handoff) — NOT the main app
  UI. Do not swap to olive here.
-->
<script lang="ts">
  interface Props {
    current: number;
    total?: number;
  }
  let { current, total = 6 }: Props = $props();
  // Derive so `steps` re-computes if `total` ever changes from its
  // default. Svelte 5 reactivity warning: a plain `const steps =
  // Array.from({ length: total }, ...)` captures the prop's initial
  // value only; `$derived` keeps it reactive to prop updates.
  const steps = $derived(Array.from({ length: total }, (_, i) => i + 1));
</script>

<nav
  class="rail"
  role="progressbar"
  aria-valuenow={current}
  aria-valuemin={1}
  aria-valuemax={total}
  aria-label="Onboarding progress"
>
  {#each steps as i (i)}
    <span
      class="dot"
      class:active={i === current}
      class:completed={i < current}
      class:upcoming={i > current}
      aria-hidden="true"
    ></span>
  {/each}
</nav>

<style>
  .rail {
    display: flex;
    gap: var(--space-3);
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--border-soft);
    transition:
      background var(--duration-base) var(--ease-out),
      width var(--duration-base) var(--ease-out),
      height var(--duration-base) var(--ease-out),
      box-shadow var(--duration-base) var(--ease-out);
  }
  .dot.completed {
    background: var(--color-warm-dark-mute);
  }
  .dot.active {
    width: 10px;
    height: 10px;
    background: var(--color-orange);
    box-shadow: 0 0 0 2px var(--orange-ring);
  }
  .dot.upcoming {
    background: var(--border-soft);
  }
</style>
