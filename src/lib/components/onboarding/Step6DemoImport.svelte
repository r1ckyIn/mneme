<!--
  Visual: /Users/qinyuan/Downloads/Mneme 3/Mneme Onboarding.html (Step 6 frame)
         + 02-UI-SPEC.md §8.1.6 — Step 6 Demo import

  IMPORTANT — Browse-button-only per BLK-3 resolution.
  This component does NOT subscribe to the Tauri window-level drag-drop
  event API (see Plan 11 DropzoneOverlay for the actual global listener).
  Drag-drop is enabled globally ONLY after Finish + redirect to / (Plan 11
  + Plan 12 own the listener; firing window-globally, they would race with
  any step-level subscriber here).

  The "Drop a file here or click Browse to import" copy is decorative;
  only the Browse button (the entire dropzone surface is the button)
  triggers the file picker. SPEC L137-141 REQ-16 acceptance does NOT
  require drag-drop inside onboarding.

  Demo import target: vault_root/_inbox/<filename> via start_import IPC
  (Plan 02-05 import_controller). Course = null + category = "_inbox"
  intentionally bypasses the course picker — demo step is the easy path.

  Per CYCLE-3 NEW HIGH fix, this header deliberately avoids mentioning
  the literal Tauri drag-drop API method name as a string. The audit gates
  grep for the IMPORT statement and CALL site that would only appear if a
  real subscription were installed; both must return 0 matches. See
  02-09-PLAN.md L1016-1017 for the exact grep predicates and rationale.
-->
<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { open } from "@tauri-apps/plugin-dialog";

  interface Props {
    vaultRoot: string;
    onFinish: () => void;
    saving?: boolean;
  }
  let { vaultRoot, onFinish, saving = false }: Props = $props();

  let imported = $state<string | null>(null);
  // WR-001 fix (Phase 02.1 02.1-REVIEW): in-flight guard for the browse →
  // import round-trip. Parent's `saving` flag is flipped only inside
  // Onboarding.next()/finish() — never around Step 6's own picker call.
  // Without this flag a user double-clicking the dropzone before the OS file
  // picker visually opens could fire two `open()` dialogs back-to-back AND
  // two `start_import` IPCs, racing on the `imported` assignment.
  let importing = $state(false);

  async function browseFile() {
    // WR-001 fix: bail out if the parent is in a save cycle OR if we're
    // already mid-import for this step.
    if (importing || saving) return;
    importing = true;
    try {
      const chosen = await open({ multiple: true, directory: false });
      if (!chosen) return;
      const paths = Array.isArray(chosen) ? chosen : [chosen];
      await invoke<string>("start_import", {
        paths,
        course: null,
        category: "_inbox",
        vaultRoot,
      });
      // WR-005 fix (Phase 02.1 02.1-REVIEW): surface the full count when the
      // user picks multiple files. The previous `imported = paths[0]...`
      // silently swallowed 4-of-5 PDFs in the success message, making the
      // user think the rest were lost.
      const firstBasename = paths[0].split("/").pop() ?? "file";
      imported =
        paths.length === 1
          ? firstBasename
          : `${paths.length} files (${firstBasename}, …)`;
    } catch (e) {
      console.error("[onboarding:browse-demo]", e);
    } finally {
      importing = false;
    }
  }
</script>

<section class="step6" aria-labelledby="step6-heading">
  <h1 id="step6-heading" class="headline">Try a quick import</h1>
  <p class="body">
    Click Browse to pick a file from your computer. Skip if you'd rather not.
  </p>

  {#if !imported}
    <button
      type="button"
      class="dropzone"
      onclick={browseFile}
      disabled={saving || importing}
      aria-label="Browse for a demo file to import"
    >
      <span class="dz-icon" aria-hidden="true">⬇</span>
      <span class="dz-main">Drop a file here or click Browse to import</span>
      <span class="dz-sub">click anywhere in this area to open the file picker</span>
      <span class="dz-foot">We'll put it in your _inbox folder.</span>
    </button>
  {:else}
    <p class="success">
      <span class="icon" aria-hidden="true">✓</span> Imported: {imported}
    </p>
  {/if}

  <!-- svelte-ignore a11y_autofocus —
       UI-SPEC §8.1 shared accessibility contract; see Step1Welcome rationale. -->
  <button
    type="button"
    class="cta"
    onclick={onFinish}
    disabled={saving}
    autofocus
  >
    Finish
  </button>
  <button type="button" class="ghost-link" onclick={onFinish}>Skip</button>
</section>

<style>
  .step6 {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
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
    margin: 0 0 var(--space-3);
  }
  .dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    width: 480px;
    height: 200px;
    background: var(--color-cream);
    border: 2px dashed var(--color-cream-edge);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition:
      background var(--duration-fast) var(--ease-out),
      border-color var(--duration-fast) var(--ease-out);
    font-family: var(--font-serif);
    color: var(--color-warm-dark);
  }
  .dropzone:hover {
    background: var(--color-cream-deep);
    border-color: var(--color-orange);
  }
  .dropzone:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .dz-icon {
    font-size: 24px;
  }
  .dz-main {
    font-size: var(--fs-body);
  }
  .dz-sub {
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-mute);
  }
  .dz-foot {
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-mute);
    margin-top: var(--space-3);
  }
  .success {
    font-family: var(--font-serif);
    font-size: var(--fs-body);
    /* B2-class fix (Phase 02.1 02.1-13 Rule-2 follow-up to 02.1-03 leak): UI-SPEC §4
       line 148-153 reserves --color-success (#4ea36b) for onboarding VALIDATION
       sites only (Step 2 auth `found` dot / Step 3 vault valid checkmark /
       Step 5 add-course typing-valid + added). The Step 6 demo-import
       post-success confirmation is an `imported`-state surface, NOT a
       validation site — line 153 explicitly: "The status pill's `imported`
       state uses --color-warm-dark-soft, not green." Same fix as
       02.1-03 commit 9eadbc8 on VaultCategory.svelte. */
    color: var(--color-warm-dark-soft);
  }
  .icon {
    font-weight: var(--fw-semibold);
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
    transition: transform var(--duration-fast) var(--ease-out);
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
  .ghost-link {
    background: none;
    border: none;
    color: var(--color-warm-dark-soft);
    font-family: var(--font-serif);
    font-size: var(--fs-meta);
    text-decoration: underline;
    cursor: pointer;
    padding: var(--space-1);
  }
  .ghost-link:hover {
    color: var(--color-warm-dark);
  }
</style>
