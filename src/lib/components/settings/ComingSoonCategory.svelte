<!--
  ComingSoonCategory.svelte — reusable placeholder body for 5 deferred Settings
  categories (General / Sync / Claude / Privacy / Advanced).

  Visual SSOT:
    - /Users/qinyuan/Downloads/Mneme 3/Mneme Settings.html (ComingSoon body)
    - 02-UI-SPEC.md §8.2.4 (two-line treatment — heading + explanatory subline;
      supersedes the HTML's single-line stub per UI-SPEC divergence rule)
    - LectureVideo.svelte centered-placeholder-card pattern (02-PATTERNS.md L462-477)

  Phase 2 (Wave 7 / Plan 02-10). Maps to REQ-14 acceptance ("other categories
  render an empty body with `(coming in Phase N)` note").
-->
<script lang="ts">
  interface Props {
    title: string;
    phase: string;
    subline: string;
  }
  let { title, phase, subline }: Props = $props();
</script>

<div class="coming-soon">
  <h2 class="cat-heading">{title}</h2>
  <div class="hairline"></div>
  <div class="card">
    <div class="phase-line">{phase}</div>
    <p class="subline">{subline}</p>
  </div>
</div>

<style>
  .coming-soon { padding: var(--space-6); }
  .cat-heading {
    font-family: var(--font-serif);
    font-size: var(--fs-h);
    font-weight: var(--fw-semibold);
    color: var(--color-warm-dark);
    margin: 0 0 var(--space-2);
  }
  .hairline {
    height: 1px;
    background: var(--border-soft);
    margin-bottom: var(--space-8);
  }
  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    max-width: 400px;
    margin: 0 auto;
    text-align: center;
  }
  .phase-line {
    font-family: var(--font-serif);
    font-size: var(--fs-body);
    color: var(--color-warm-dark-mute);
  }
  .subline {
    font-family: var(--font-sans);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-mute);
    margin: 0;
    line-height: var(--lh-body);
  }
</style>
