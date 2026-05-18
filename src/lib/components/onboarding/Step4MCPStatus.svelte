<!--
  Visual: /Users/qinyuan/Downloads/Mneme 3/Mneme Onboarding.html (Step 4 frame)
         + 02-UI-SPEC.md §8.1.4 — Step 4 MCP detection (self-ecosystem mode)

  Self-ecosystem decision (2026-05-11): v1 ships with zero external MCP /
  Canvas / Ed integration — everything stays on the user's machine. Step 4
  is the user-facing explanation of that choice: a neutral status block
  (NOT green / red — the absence of external MCP is a deliberate v1 state,
  not an error or a success).

  Visual treatment per §8.1.4:
   - Headline "You're in self-ecosystem mode" (display 28px serif semibold)
   - Body copy explaining the local-only flow
   - Status block (same shape as Step 2 auth status):
       max-width 480px, padding --space-5, --color-cream-deep bg,
       --border-soft border, --radius-lg corners
   - Dot is --color-warm-dark-mute (neutral — NOT --color-success / --color-error)
   - Continue CTA (200×44, orange fill, autofocus)

  States: idle only (no async work — pure informational).
-->
<script lang="ts">
  interface Props {
    onContinue: () => void;
    saving?: boolean;
  }
  let { onContinue, saving = false }: Props = $props();
</script>

<section class="step4" aria-labelledby="step4-heading">
  <h1 id="step4-heading" class="headline">You're in self-ecosystem mode</h1>
  <p class="body">
    Mneme doesn't talk to external MCP servers right now. Everything stays on your machine.
  </p>

  <div class="status-block" role="status">
    <span class="dot" aria-hidden="true"></span>
    <div class="status-text">
      <div class="status-main">No external MCP configured</div>
      <div class="status-sub">v1 ships with local-only flow</div>
    </div>
  </div>

  <!-- svelte-ignore a11y_autofocus —
       UI-SPEC §8.1 shared accessibility contract requires primary CTA
       autofocus on step entry. The wizard is a full-screen single-action
       surface, so the usual "competing focus targets" concern does not
       apply (no other interactive elements on the step). -->
  <button
    type="button"
    class="cta"
    onclick={onContinue}
    disabled={saving}
    autofocus
  >
    Continue
  </button>
</section>

<style>
  .step4 {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-5);
    max-width: 560px;
    text-align: center;
  }
  .headline {
    font-family: var(--font-serif);
    font-size: var(--fs-display);
    font-weight: var(--fw-semibold);
    line-height: var(--lh-heading);
    color: var(--color-warm-dark);
    margin: 0;
  }
  .body {
    font-family: var(--font-serif);
    font-size: var(--fs-body);
    line-height: var(--lh-body);
    color: var(--color-warm-dark-soft);
    margin: 0;
    max-width: 480px;
  }
  .status-block {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    max-width: 480px;
    width: 100%;
    padding: var(--space-5);
    background: var(--color-cream-deep);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-lg);
    margin-top: var(--space-3);
    text-align: left;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-warm-dark-mute);
    flex-shrink: 0;
  }
  .status-text {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .status-main {
    font-family: var(--font-serif);
    font-size: var(--fs-body);
    color: var(--color-warm-dark);
  }
  .status-sub {
    font-family: var(--font-sans);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-mute);
  }
  .cta {
    margin-top: var(--space-5);
    width: 200px;
    height: 44px;
    background: var(--color-orange);
    color: var(--color-cream);
    border: none;
    border-radius: var(--radius-md);
    font-family: var(--font-serif);
    font-size: var(--fs-body);
    cursor: pointer;
    transition:
      transform var(--duration-fast) var(--ease-out),
      box-shadow var(--duration-base) var(--ease-out);
  }
  .cta:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px var(--orange-ring);
  }
  .cta:active {
    transform: scale(0.96);
  }
  .cta:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
</style>
