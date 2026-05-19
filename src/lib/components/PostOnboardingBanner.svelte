<!--
  PostOnboardingBanner.svelte — Phase 2 Plan 02-12 / SPEC-GAP-2 resolution.

  Visual: /Users/qinyuan/Downloads/Mneme 3/Mneme.html (post-onboarding contextual surfaces)
       + 02-UI-SPEC.md §8.8 delta (inline banner mounted under TitlebarMeta on
                                   the first main-UI mount after onboarding
                                   completion).
  Per D-18: every modified Svelte component carries a Visual SSOT header
  pointing at the locked 2026-05-15 Mneme 3 bundle.

  SPEC-GAP-2 (settings-ui.md §2 L60, 2026-05-16 replan): a one-time inline
  banner surfaces on the first main-UI mount after `complete_onboarding`
  resolves. Visibility gate:
    visible = !dismissed
              && typeof vaultState.vault_path === "string"
              && vaultState.vault_path.length > 0
  Either CTA click sets the localStorage sentinel
  `mneme.postOnboardingBannerDismissed = "true"` and hides the banner forever.
  Open Settings CTA additionally dispatches the existing
  `mneme:open-settings` window CustomEvent — single downstream code path
  (cog click / Cmd+, / macOS native menu / banner all funnel through it).

  KD-13 token usage: cream-deep surface with a KD-13 orange accent stripe.
  Inline (NOT modal) — non-blocking; it joins the .window grid as a new row
  via inline margin (no position:fixed). Pre-onboarding the component renders
  nothing so the `auto` grid row collapses with zero layout cost.

  CYCLE-2 cluster #12 — KD-13 orange accent CORRECT per tokens.css L27 +
  Mneme.html L9-21 SSOT (the olive accent belongs to the Living visual
  contract for handoff `.html` documents, which is a permanent dual-track
  distinct from the main mneme app UI per 2026-05-14 ratification).
-->
<script lang="ts">
  import { onMount } from "svelte";
  import { getVaultState } from "$lib/vault-state.svelte";

  const SENTINEL_KEY = "mneme.postOnboardingBannerDismissed";

  const vaultState = getVaultState();
  let dismissed = $state(false);

  // Re-check sentinel on mount so HMR-triggered re-mounts respect a prior dismiss.
  onMount(() => {
    try {
      if (localStorage.getItem(SENTINEL_KEY) === "true") dismissed = true;
    } catch (e) {
      console.warn("[post-onboarding-banner:sentinel-read]", e);
    }
  });

  // Reactive visibility — vault_path set (post-onboarding) AND not yet dismissed.
  let visible = $derived(
    !dismissed
      && typeof vaultState.vault_path === "string"
      && vaultState.vault_path.length > 0,
  );

  function persistDismissal(): void {
    try {
      localStorage.setItem(SENTINEL_KEY, "true");
    } catch (e) {
      console.warn("[post-onboarding-banner:sentinel-write]", e);
    }
    dismissed = true;
  }

  function openSettings(): void {
    window.dispatchEvent(new CustomEvent("mneme:open-settings"));
    persistDismissal();
  }

  function dismiss(): void {
    persistDismissal();
  }
</script>

{#if visible}
  <aside class="banner" aria-label="Post-onboarding settings prompt">
    <div class="copy">
      <h2 class="headline">完成了 — 要不要现在看一眼设置？</h2>
      <p class="body">Browse the Vault, Appearance, and Keybindings categories — they're all live now.</p>
    </div>
    <div class="actions">
      <button type="button" class="cta" onclick={openSettings}>Open Settings</button>
      <button type="button" class="ghost" onclick={dismiss}>Dismiss</button>
    </div>
  </aside>
{/if}

<style>
  .banner {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-5);
    /* INLINE margin layout per CYCLE-3 priority #8 — the banner joins the
       .window grid as a new row, NOT position:fixed. */
    margin: var(--space-3) var(--space-5) 0;
    background: var(--color-cream-deep);
    border-left: 3px solid var(--color-orange);
    border-radius: var(--radius-md);
  }
  .copy {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .headline {
    font-family: var(--font-serif);
    font-size: var(--fs-h);
    font-weight: var(--fw-semibold);
    color: var(--color-warm-dark);
    margin: 0;
    line-height: var(--lh-heading);
  }
  .body {
    font-family: var(--font-sans);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-soft);
    margin: 0;
    line-height: var(--lh-body);
  }
  .actions {
    display: flex;
    gap: var(--space-2);
  }
  /* KD-13 orange CTA — tokens.css L27 + Mneme.html L9-21 SSOT. */
  .cta {
    height: 32px;
    padding: 0 var(--space-4);
    background: var(--color-orange);
    color: var(--color-cream);
    border: none;
    border-radius: var(--radius-md);
    font-family: var(--font-sans);
    font-size: var(--fs-meta);
    cursor: pointer;
    transition: transform var(--duration-fast) var(--ease-out);
  }
  .cta:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px var(--orange-ring);
  }
  .cta:active {
    transform: scale(0.96);
  }
  .ghost {
    height: 32px;
    padding: 0 var(--space-3);
    background: none;
    border: none;
    color: var(--color-warm-dark-soft);
    font-family: var(--font-sans);
    font-size: var(--fs-meta);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: background var(--duration-fast) var(--ease-out),
                color var(--duration-fast) var(--ease-out);
  }
  .ghost:hover {
    background: rgba(20, 20, 19, 0.05);
    color: var(--color-warm-dark);
  }
</style>
