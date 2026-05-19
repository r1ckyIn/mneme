<!--
  VaultCategory.svelte — vault path + Move + course list + Add course inline form.

  Visual SSOT:
    - /Users/qinyuan/Downloads/Mneme 3/Mneme Settings.html (Vault body)
    - 02-UI-SPEC.md §8.2.1 (path display + Browse/Move + courses list + Add course)
    - ChatFooter.svelte button-row composition (02-PATTERNS.md L394-426)

  Phase 2 (Wave 7 / Plan 02-10). Maps to:
    - REQ-06 (course add via course_create IPC)
    - REQ-11 (vault path move via move_vault safe-copy IPC; old vault preserved)
    - REQ-14 (Vault category v1-functional)

  Reads vault path + course list from `$lib/vault-state.svelte` singleton.
  Writes via Tauri IPC: load_config / save_config / list_courses / course_create
  / move_vault.

  CR-001 fix (Phase 02.1 02.1-REVIEW): collapsed the inline strict-regex
  validator into the shared `$lib/onboarding-validation` import. The W6 fix
  in 02.1-04 relaxed the Rust validator to accept real USYD codes
  (BIOL2010S2, COMP3027L, cs-101, MATH1062) but this surface kept the legacy
  4-letter+4-digit gate — the dogfood-killer was still reachable here. The
  shared module now mirrors the same minimal path-safe contract on both
  sides (length 1..=32, no path separators, no NUL, no "."/"..", at least
  one alphanumeric char). See 02.1-REVIEW.md CR-001.

  Prior DEVIATION note (Rule 3 — Plan inline import substitution) is now
  obsolete: Plan 02-09 has long landed and the shared validator exists.

  CR-01 fix (gap-closure 02-14): Browse and Move are now distinct handlers.
  Browse opens the picker for path inspection only (no state mutation); Move
  stages the confirm overlay. REQ-14 headline CTA is now reachable as
  documented in UI-SPEC §8.2.1.
-->
<script lang="ts">
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { open } from "@tauri-apps/plugin-dialog";
  import {
    getVaultState,
    setVaultPath,
    setCourseList,
    addCourse,
    removeCourse,
  } from "$lib/vault-state.svelte";
  // CR-001 fix: shared validator (length 1..=32, no path separators, no NUL,
  // no "."/"..", at least one alphanumeric). Mirrors vault_writer::
  // validate_course_code on the Rust side.
  import { validateCourseCode } from "$lib/onboarding-validation";

  interface ConfigShape {
    vault_path: string;
    schema_version: number;
  }

  interface MoveVaultSummary {
    files_copied: number;
    bytes_copied: number;
    old_root_preserved: boolean;
  }

  const vaultState = getVaultState();

  let moveConfirming = $state<{ newPath: string } | null>(null);
  let moveStatus = $state<"idle" | "moving" | "done" | "error">("idle");
  let moveError = $state<string | null>(null);

  let addingCourse = $state(false);
  let courseInput = $state("");
  let lastError = $state<string | null>(null);

  onMount(async () => {
    try {
      const cfg = await invoke<ConfigShape>("load_config");
      if (cfg?.vault_path) setVaultPath(cfg.vault_path);
    } catch (err: unknown) {
      console.error("[settings:vault-load-config]", err);
    }
    try {
      const courses = await invoke<string[]>("list_courses");
      setCourseList(courses ?? []);
    } catch (err: unknown) {
      console.error("[settings:vault-load-courses]", err);
    }
  });

  // CR-01 fix: revealInFinder is read-only path inspection — discards
  // picker result. Opens the native folder picker (plugin-dialog open() with
  // directory:true) so the user can browse the filesystem to inspect or copy
  // the vault path; NO state mutation, NO moveConfirming staging. The Move
  // button below uses a separate handler (browseAndMove) when the user
  // actually wants to move.
  async function revealInFinder(): Promise<void> {
    try {
      const defaultPath = vaultState.vault_path?.trim() ? vaultState.vault_path : undefined;
      await open({ directory: true, multiple: false, defaultPath });
      // Returned value intentionally discarded — this handler exists for
      // path discovery via the native picker, not state mutation.
    } catch (err: unknown) {
      console.error("[settings:browse-inspect]", err);
    }
  }

  async function browseAndMove(): Promise<void> {
    try {
      const chosen = await open({ directory: true, multiple: false });
      if (typeof chosen === "string") {
        moveConfirming = { newPath: chosen };
        moveStatus = "idle";
        moveError = null;
      }
    } catch (err: unknown) {
      console.error("[settings:browse-move]", err);
    }
  }

  async function confirmMove(): Promise<void> {
    if (!moveConfirming) return;
    moveStatus = "moving";
    moveError = null;
    const target = moveConfirming.newPath;
    try {
      const summary = await invoke<MoveVaultSummary>("move_vault", {
        oldRoot: vaultState.vault_path,
        newRoot: target,
      });
      setVaultPath(target);
      await invoke("save_config", {
        state: { vault_path: target, schema_version: 1 },
      });
      moveStatus = "done";
      moveConfirming = null;
      console.log("[settings:move-vault] complete", summary);
    } catch (err: unknown) {
      moveStatus = "error";
      moveError = err instanceof Error ? err.message : String(err);
      console.error("[settings:move-vault]", err);
    }
  }

  function cancelMove(): void {
    moveConfirming = null;
    moveStatus = "idle";
    moveError = null;
  }

  async function tryAddCourse(): Promise<void> {
    if (validateCourseCode(courseInput).kind !== "valid") return;
    const code = courseInput.trim();
    try {
      await invoke("course_create", { root: vaultState.vault_path, code });
      addCourse(code);
      courseInput = "";
      lastError = null;
      addingCourse = false;
    } catch (err: unknown) {
      lastError = `Couldn't create that course folder. ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  function tryRemoveCourse(code: string): void {
    // Phase 2 SPEC: removing from settings does NOT delete files on disk; UI-only.
    // Phase 3+ may wire a real `course_remove` IPC.
    removeCourse(code);
  }
</script>

<div class="vault">
  <h2 class="cat-heading">Vault</h2>
  <div class="hairline"></div>

  <section class="group">
    <div class="group-label">Vault path</div>
    <input
      type="text"
      class="path-input"
      value={vaultState.vault_path || "Not set"}
      readonly
      aria-label="Vault path"
    />
    <div class="row-actions">
      <button type="button" class="ghost-btn" onclick={revealInFinder}>Browse…</button>
      <button type="button" class="ghost-btn" onclick={browseAndMove}>Move…</button>
    </div>
    {#if moveStatus === "done"}
      <p class="status success">
        Move complete. The original folder stays at the previous location for you to delete manually in Finder.
      </p>
    {:else if moveStatus === "error" && moveError}
      <p class="status error">{moveError}</p>
    {/if}
  </section>

  {#if moveConfirming}
    <div class="confirm-overlay" role="dialog" aria-modal="true" aria-label="Confirm vault move">
      <div class="confirm-card">
        <p class="confirm-text">
          Move vault to <code>{moveConfirming.newPath}</code>?<br />
          The original folder stays at <code>{vaultState.vault_path || "the previous location"}</code> for you to delete manually in Finder.
        </p>
        <div class="confirm-actions">
          <button type="button" class="ghost-btn" onclick={cancelMove}>Cancel</button>
          <button
            type="button"
            class="cta"
            onclick={confirmMove}
            disabled={moveStatus === "moving"}
          >
            {moveStatus === "moving" ? "Moving…" : "Move vault"}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <div class="section-divider"></div>

  <section class="group">
    <div class="group-label">Courses</div>
    <div class="course-list">
      {#each vaultState.course_list as code (code)}
        <div class="course-row">
          <span class="code">{code}</span>
          <span class="note-count">notes (—)</span>
          <button
            type="button"
            class="row-x"
            onclick={() => tryRemoveCourse(code)}
            aria-label={`Remove ${code}`}
          >⋯</button>
        </div>
      {/each}
    </div>

    {#if addingCourse}
      <div class="add-form">
        <input
          type="text"
          class="code-input"
          bind:value={courseInput}
          placeholder="e.g. COMP3221"
          autocomplete="off"
          onkeydown={(e) => {
            if (e.key === "Enter") tryAddCourse();
          }}
        />
        <button
          type="button"
          class="cta"
          onclick={tryAddCourse}
          disabled={validateCourseCode(courseInput).kind !== "valid"}
        >Add</button>
        <button
          type="button"
          class="ghost-btn"
          onclick={() => {
            addingCourse = false;
            courseInput = "";
            lastError = null;
          }}
        >Cancel</button>
      </div>
      {#if lastError}
        <p class="status error">{lastError}</p>
      {/if}
    {:else}
      <button
        type="button"
        class="add-trigger"
        onclick={() => {
          addingCourse = true;
        }}
      >+ Add course</button>
    {/if}
  </section>
</div>

<style>
  .vault { padding: var(--space-6); }
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
    gap: var(--space-3);
    margin-bottom: var(--space-3);
  }
  .group-label {
    font-family: var(--font-sans);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-soft);
  }
  .path-input {
    padding: var(--space-3) var(--space-4);
    background: var(--color-cream-deep);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark);
  }
  .row-actions {
    display: flex;
    gap: var(--space-3);
  }
  .ghost-btn {
    height: 36px;
    padding: 0 var(--space-4);
    background: var(--color-cream-edge);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-md);
    font-family: var(--font-sans);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark);
    cursor: pointer;
    transition: background var(--duration-fast) var(--ease-out),
                transform var(--duration-fast) var(--ease-out);
  }
  .ghost-btn:hover {
    background: var(--color-cream-deep);
  }
  .ghost-btn:active {
    transform: scale(0.96);
  }
  .cta {
    height: 36px;
    padding: 0 var(--space-4);
    background: var(--color-orange);
    color: var(--color-cream);
    border: none;
    border-radius: var(--radius-md);
    font-family: var(--font-sans);
    font-size: var(--fs-meta);
    cursor: pointer;
    transition: background var(--duration-fast) var(--ease-out),
                transform var(--duration-fast) var(--ease-out);
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
  .status {
    font-family: var(--font-serif);
    font-size: var(--fs-meta);
    margin: var(--space-2) 0 0;
  }
  /* B2 fix (Phase 02.1 02.1-03): --color-success is reserved for onboarding validation per UI-SPEC §4 (Step 2 / Step 3 / Step 5). Vault-move success message is NOT an onboarding state — use --color-warm-dark-soft (same soft-success tone as ImportStatusPill imported state). */
  .status.success {
    color: var(--color-warm-dark-soft);
  }
  .status.error {
    color: var(--color-error);
  }
  .confirm-overlay {
    position: absolute;
    inset: 0;
    background: rgba(20, 20, 19, 0.32);
    display: grid;
    place-items: center;
    padding: var(--space-6);
    border-radius: inherit;
  }
  .confirm-card {
    background: var(--color-cream);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    max-width: 480px;
    box-shadow: var(--shadow-2);
  }
  .confirm-text {
    font-family: var(--font-serif);
    font-size: var(--fs-body);
    color: var(--color-warm-dark);
    margin: 0 0 var(--space-5);
  }
  .confirm-text code {
    font-family: var(--font-mono);
    font-size: var(--fs-meta);
  }
  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
  }
  .section-divider {
    height: 1px;
    background: var(--border-soft);
    margin: var(--space-6) 0;
  }
  .course-list {
    display: flex;
    flex-direction: column;
  }
  .course-row {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: var(--space-4);
    align-items: center;
    height: 48px;
    padding: 0 var(--space-4);
    border-bottom: 1px solid var(--border-soft);
  }
  .course-row:last-child {
    border-bottom: none;
  }
  .code {
    font-family: var(--font-mono);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark);
  }
  .note-count {
    font-family: var(--font-sans);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-mute);
  }
  .row-x {
    width: 26px;
    height: 26px;
    background: none;
    border: none;
    color: var(--color-warm-dark-soft);
    cursor: pointer;
    font-size: 16px;
    border-radius: var(--radius-sm);
  }
  .row-x:hover {
    background: var(--color-cream-edge);
  }
  .add-form {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    margin-top: var(--space-3);
  }
  .code-input {
    flex: 1;
    height: 36px;
    padding: 0 var(--space-3);
    background: var(--color-cream-deep);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark);
  }
  .add-trigger {
    background: none;
    border: none;
    color: var(--color-warm-dark-soft);
    font-family: var(--font-sans);
    font-size: var(--fs-meta);
    cursor: pointer;
    padding: var(--space-2) 0;
    margin-top: var(--space-3);
    text-align: left;
  }
  .add-trigger:hover {
    color: var(--color-warm-dark);
  }
</style>
