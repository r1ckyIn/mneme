<!--
  AppearanceCategory.svelte — light-only theme toggle stub.

  Visual SSOT:
    - /Users/qinyuan/Downloads/Mneme 3/Mneme Settings.html (Appearance body)
    - 02-UI-SPEC.md §8.2.2 (light radio enabled, dark + font-size disabled with
      microcopy "Dark mode and font sizing arrive in a future ui-phase.")
    - ChatFooter.svelte vault-ctx visual toggle pattern (02-PATTERNS.md L429-438)

  Phase 2 (Wave 7 / Plan 02-10). REQ-14 acceptance: "Appearance toggle no-ops
  but does not error." Dark mode is permanently deferred per KD-13 light-only
  lock (see 02-CONTEXT.md D-17 + .planning/references/design/anthropic-claude-
  aesthetic-deep-dive_zh.md).
-->
<script lang="ts">
  let theme = $state<"light" | "dark">("light");

  function selectTheme(t: "light" | "dark"): void {
    if (t === "dark") {
      // Permanently no-op in v1 per KD-13 light-only lock.
      console.log("[settings:appearance] dark mode arrives in a future ui-phase");
      return;
    }
    theme = t;
  }
</script>

<div class="appearance">
  <h2 class="cat-heading">Appearance</h2>
  <div class="hairline"></div>

  <section class="group">
    <div class="group-label">Theme</div>
    <label class="opt">
      <input
        type="radio"
        name="theme"
        value="light"
        checked={theme === "light"}
        onchange={() => selectTheme("light")}
      />
      <span>Light</span>
    </label>
    <label class="opt disabled">
      <input type="radio" name="theme" value="dark" disabled aria-disabled="true" />
      <span>Dark — coming soon</span>
    </label>
    <p class="microcopy">Dark mode and font sizing arrive in a future ui-phase.</p>
  </section>

  <div class="section-divider"></div>

  <section class="group">
    <div class="group-label">Font size</div>
    <label class="opt disabled">
      <input
        type="radio"
        name="fontsize"
        value="comfortable"
        disabled
        checked
        aria-disabled="true"
      />
      <span>Comfortable (16px body)</span>
    </label>
    <label class="opt disabled">
      <input type="radio" name="fontsize" value="compact" disabled aria-disabled="true" />
      <span>Compact (14px body)</span>
    </label>
  </section>
</div>

<style>
  .appearance { padding: var(--space-6); }
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
    margin-bottom: var(--space-6);
  }
  .group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }
  .group-label {
    font-family: var(--font-sans);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-soft);
    margin-bottom: var(--space-1);
  }
  .opt {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-family: var(--font-serif);
    font-size: var(--fs-body);
    color: var(--color-warm-dark);
    cursor: pointer;
  }
  .opt.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .opt input {
    accent-color: var(--color-orange);
  }
  .microcopy {
    font-family: var(--font-sans);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-mute);
    margin: var(--space-2) 0 0;
  }
  .section-divider {
    height: 1px;
    background: var(--border-soft);
    margin: var(--space-6) 0;
  }
</style>
