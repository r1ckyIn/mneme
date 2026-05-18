<!--
  Visual: /Users/qinyuan/Downloads/Mneme 3/Mneme Onboarding.html (Step 5 frame)
         + 02-UI-SPEC.md §8.1.5 — Step 5 Add first course

  Course code input + chip list + Skip-link.
  - Validation regex via $lib/onboarding-validation validateCourseCode.
  - Add invokes course_create (Plan 02-07 IPC; vault_writer::create_course).
  - Chip list reflects parent's courses array (Onboarding.svelte owns state).
  - Continue CTA enabled only when courses.length >= 1 (Skip moves on anyway).
  - Enter key in input triggers Add (UX shortcut per UI-SPEC §8.1.5 line 499).
-->
<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { validateCourseCode, type CodeValidation } from "$lib/onboarding-validation";

  interface Props {
    vaultRoot: string;
    courses: string[];
    onCoursesChange: (codes: string[]) => void;
    onContinue: () => void;
    onSkip: () => void;
    saving?: boolean;
  }
  let {
    vaultRoot,
    courses,
    onCoursesChange,
    onContinue,
    onSkip,
    saving = false,
  }: Props = $props();

  let input = $state("");
  let validation = $derived<CodeValidation>(validateCourseCode(input));
  let lastAddError = $state<string | null>(null);
  let lastAdded = $state<string | null>(null);
  let fadeTimer: ReturnType<typeof setTimeout> | null = null;

  async function addCourse() {
    if (validation.kind !== "valid" || saving) return;
    // WR-11 fix (gap-closure 02-15): refuse course_create when vaultRoot is
    // empty/whitespace. Step 5 reachable via direct URL /onboarding/5 without
    // Step 3 completion would otherwise scaffold `courses/<CODE>` relative to
    // cwd (project root in dev, `/` or `/Applications` in production).
    // vault_writer::create_course also rejects empty/non-absolute root as
    // defense-in-depth (Rust-side guard in same plan, Task 1).
    if (!vaultRoot || vaultRoot.trim().length === 0) {
      lastAddError = "Vault path not set — go back to Step 3.";
      return;
    }
    const code = input.trim();
    if (courses.includes(code)) {
      lastAddError = `${code} already added.`;
      return;
    }
    try {
      await invoke("course_create", { root: vaultRoot, code });
      onCoursesChange([...courses, code]);
      lastAdded = code;
      input = "";
      lastAddError = null;
      // Auto-fade the "Added: CODE" line after 2s per UI-SPEC §8.1.5
      // validation table.
      if (fadeTimer) clearTimeout(fadeTimer);
      fadeTimer = setTimeout(() => {
        lastAdded = null;
      }, 2000);
    } catch (e) {
      console.error("[onboarding:add-course]", e);
      lastAddError = `Couldn't create that course folder. ${String(e)}`;
    }
  }

  function removeChip(code: string) {
    onCoursesChange(courses.filter((c) => c !== code));
  }

  function onInputKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      void addCourse();
    }
  }
</script>

<section class="step5" aria-labelledby="step5-heading">
  <h1 id="step5-heading" class="headline">Add your first course</h1>
  <p class="body">
    Use the course code from your university schedule. You can add more in Settings
    later.
  </p>

  {#if courses.length > 0}
    <ul class="chips" aria-label="Courses added">
      {#each courses as code (code)}
        <li class="chip">
          {code}
          <button
            type="button"
            class="chip-x"
            onclick={() => removeChip(code)}
            aria-label={`Remove ${code}`}
          >
            ×
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="picker">
    <input
      type="text"
      class="code-input"
      bind:value={input}
      placeholder="e.g. COMP3221"
      autocomplete="off"
      onkeydown={onInputKeydown}
      aria-label="Course code"
    />
    <button
      type="button"
      class="add-btn"
      data-active={validation.kind === "valid"}
      onclick={addCourse}
      disabled={validation.kind !== "valid" || saving}
    >
      Add course
    </button>
  </div>

  <p class="validation" role="status" aria-live="polite">
    {#if lastAdded}
      <span class="icon" aria-hidden="true">✓</span> Added: {lastAdded}
    {:else if lastAddError}
      <span class="icon" aria-hidden="true">!</span> {lastAddError}
    {:else if validation.kind === "valid"}
      <span class="icon" aria-hidden="true">✓</span> Looks like a course code.
    {:else if validation.kind === "invalid"}
      {validation.reason}
    {:else}
      Enter a course code to add.
    {/if}
  </p>

  <!-- svelte-ignore a11y_autofocus —
       UI-SPEC §8.1 shared accessibility contract; see Step1Welcome rationale. -->
  <button
    type="button"
    class="cta"
    onclick={onContinue}
    disabled={courses.length === 0 || saving}
    autofocus
  >
    Continue
  </button>
  <button type="button" class="ghost-link" onclick={onSkip}>
    Skip — add later
  </button>
</section>

<style>
  .step5 {
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
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin: 0 0 var(--space-3);
    padding: 0;
    list-style: none;
  }
  .chip {
    font-family: var(--font-mono);
    font-size: var(--fs-meta);
    background: var(--color-cream-deep);
    color: var(--color-warm-dark);
    padding: 4px var(--space-2);
    border-radius: var(--radius-sm);
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
  }
  .chip-x {
    background: none;
    border: none;
    color: var(--color-warm-dark-mute);
    cursor: pointer;
    padding: 0;
    font-size: 14px;
    line-height: 1;
  }
  .chip-x:hover {
    color: var(--color-warm-dark);
  }
  .picker {
    display: flex;
    gap: var(--space-3);
    width: 100%;
    max-width: 480px;
    align-items: center;
  }
  .code-input {
    flex: 1;
    height: 44px;
    padding: 0 var(--space-4);
    background: var(--color-cream-deep);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark);
  }
  .code-input::placeholder {
    color: var(--color-warm-dark-mute);
  }
  .add-btn {
    width: 120px;
    height: 44px;
    background: var(--color-cream-edge);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-md);
    font-family: var(--font-sans);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark);
    cursor: pointer;
    transition:
      background var(--duration-fast) var(--ease-out),
      color var(--duration-fast) var(--ease-out);
  }
  .add-btn[data-active="true"] {
    background: var(--color-orange);
    color: var(--color-cream);
    border-color: transparent;
  }
  .add-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .validation {
    font-family: var(--font-serif);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-mute);
    margin: var(--space-1) 0 0;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    justify-content: center;
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
