<!--
  Visual: /Users/qinyuan/Downloads/Mneme 3/Mneme Onboarding.html (Step 1 frame)
         + 02-UI-SPEC.md §8.1.1 — Step 1 Welcome

  Hierarchy per UI-SPEC §8.1.1:
   1. Wordmark "mneme" (display 28px serif regular, letter-spacing -0.01em)
   2. --space-6 (24px) gap
   3. Display headline "Let's set up your study vault." (28px serif semibold)
   4. --space-5 (20px) gap
   5. Body copy (16px serif regular, --color-warm-dark-soft, max-width 480px)
   6. --space-10 (40px) gap
   7. Continue CTA (width 200px, orange fill, autofocus on step entry)

  States: idle / pressing (`active:scale-[0.96]` per UI-SPEC §9). Per the
  shared step accessibility contract in §8.1, the primary CTA receives
  autofocus on step entry.

  KD-13 token-only — no hardcoded hex / px / ms. The orange fill is the
  KD-13 main-app palette per CYCLE-2 cluster #12 (NOT Living olive — that
  is reserved for tool HTML per docs/design/living-visual-contract.md).
-->
<script lang="ts">
  interface Props {
    onContinue: () => void;
    saving?: boolean;
  }
  let { onContinue, saving = false }: Props = $props();
</script>

<section class="step1" aria-labelledby="step1-heading">
  <div class="wordmark" aria-hidden="true">mneme</div>
  <h1 id="step1-heading" class="headline">Let's set up your study vault.</h1>
  <p class="body">
    A local-first place for your coursework, notes, and conversations with Claude. Takes about a
    minute.
  </p>
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
  .step1 {
    display: flex;
    flex-direction: column;
    align-items: center;
    /* I3 fix (Phase 02.1 02.1-13): removed uniform gap-5 workaround. Per-element
       margins below give the spec-exact gaps per UI-SPEC §8.1.1 (wordmark→headline
       space-6 / headline→body space-5 / body→CTA space-10). The previous
       gap-5 + margin-bottom: space-1 + margin-top: space-5 stack was
       mathematically correct but fragile — removing either piece would silently
       shift the rhythm. Closes UI-REVIEW.md §Pillar 5 INFO L127. */
    max-width: 560px;
    text-align: center;
  }
  .wordmark {
    font-family: var(--font-serif);
    font-size: var(--fs-display);
    font-weight: var(--fw-regular);
    color: var(--color-warm-dark);
    letter-spacing: -0.01em;
    /* I3 fix: wordmark→headline space-6 per UI-SPEC §8.1.1 */
    margin-bottom: var(--space-6);
  }
  .headline {
    font-family: var(--font-serif);
    font-size: var(--fs-display);
    font-weight: var(--fw-semibold);
    line-height: var(--lh-heading);
    color: var(--color-warm-dark);
    /* I3 fix: headline→body space-5 per UI-SPEC §8.1.1 */
    margin: 0 0 var(--space-5) 0;
  }
  .body {
    font-family: var(--font-serif);
    font-size: var(--fs-body);
    line-height: var(--lh-body);
    color: var(--color-warm-dark-soft);
    margin: 0;
    max-width: 480px;
  }
  .cta {
    /* I3 fix: body→CTA space-10 per UI-SPEC §8.1.1 */
    margin-top: var(--space-10);
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
