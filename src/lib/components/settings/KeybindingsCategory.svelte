<!--
  KeybindingsCategory.svelte — read-only keybinding table.

  Visual SSOT:
    - /Users/qinyuan/Downloads/Mneme 3/Mneme Settings.html (Keybindings body)
    - 02-UI-SPEC.md §8.2.3 (5 rows: Quit / Open Settings / Open file picker /
      Send message / Newline in input)
    - FileArea.svelte static-array-to-table pattern (02-PATTERNS.md L441-458)

  Phase 2 (Wave 7 / Plan 02-10). REQ-14 acceptance: read-only display only —
  override capability deferred to Phase 3+ per docs/reference/notes/
  interaction-paradigm.md (5 narrow exceptions to mouse-first).
-->
<script lang="ts">
  interface Binding {
    action: string;
    combo: string;
  }

  const bindings: Binding[] = [
    { action: "Quit", combo: "⌘ Q" },
    { action: "Open Settings", combo: "⌘ ," },
    { action: "Open file picker", combo: "⌘ I" },
    { action: "Send message", combo: "↵" },
    { action: "Newline in input", combo: "⇧ ↵" },
  ];
</script>

<div class="keybindings">
  <h2 class="cat-heading">Keybindings</h2>
  <div class="hairline"></div>

  <div class="group-label">Active</div>
  <div class="table">
    {#each bindings as kb (kb.action)}
      <div class="row">
        <span class="action">{kb.action}</span>
        <span class="combo">{kb.combo}</span>
      </div>
    {/each}
  </div>
  <p class="microcopy">Override coming in Phase 3+.</p>
</div>

<style>
  .keybindings { padding: var(--space-6); }
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
  .group-label {
    font-family: var(--font-sans);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-soft);
    margin-bottom: var(--space-2);
  }
  .table {
    background: var(--color-cream-deep);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) var(--space-4);
    height: 40px;
    border-bottom: 1px solid var(--border-soft);
  }
  .row:last-child {
    border-bottom: none;
  }
  .action {
    font-family: var(--font-serif);
    font-size: var(--fs-body);
    color: var(--color-warm-dark);
  }
  .combo {
    font-family: var(--font-mono);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-soft);
  }
  .microcopy {
    font-family: var(--font-sans);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-mute);
    margin: var(--space-3) 0 0;
  }
</style>
