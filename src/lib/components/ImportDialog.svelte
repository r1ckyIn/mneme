<!--
  Visual: /Users/qinyuan/Downloads/Mneme 3/Mneme Import Dialog.html
  + 02-UI-SPEC.md §8.3
  Adaptive course picker per vault_state.course_list.length (D-10).
  Default category = _inbox (D-11, no remember-last).
  Submit invokes start_import; Cancel invokes cancel_import.

  REVIEW-1 RESOLUTION (Gemini MEDIUM, 2026-05-16): the `start_import` catch
  path detects PermissionDenied (raw error fired by vault_writer when trying
  to overwrite the `chmod 0o444` lock on an already-imported file) and shows
  a friendly inline message instead. No DuplicateResolutionDialog is reached
  in Phase 2 — that component ships in Phase 3 alongside the backend
  duplicate-detection scan.
-->
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { listen, type UnlistenFn } from "@tauri-apps/api/event";
  import { getVaultState } from "$lib/vault-state.svelte";
  import { classifyImportError } from "$lib/import-error";

  type Category =
    | "lectures"
    | "tutorials"
    | "assignments"
    | "announcements"
    | "_inbox";

  interface Props {
    open: boolean;
    paths: string[];
    onClose: () => void;
    onOpenSettings: () => void;
  }
  let {
    open: dialogOpen = false,
    paths = [],
    onClose,
    onOpenSettings,
  }: Props = $props();

  const vaultState = getVaultState();
  let selectedCourse = $state<string | null>(null);
  let selectedCategory = $state<Category>("_inbox");
  let courseTypeahead = $state("");
  let submitting = $state(false);
  let currentOpId = $state<string | null>(null);
  let friendlyError = $state<string | null>(null);

  // G-01 fix (2026-05-18 verify-work dogfood): the dialog SELF-listens for its
  // own currentOpId's `import:done` and dispatches onClose() when the spawned
  // tokio task finishes successfully. The previous contract expected the
  // parent +page.svelte to listen and call closeImportDialog(); that wiring
  // was never landed (verified empirically — +page.svelte onMount only binds
  // mneme:open-settings / mneme:open-history CustomEvents). Result: the dialog
  // got stuck on "Importing…" forever and required Cancel-click to dismiss.
  // Co-locating the listener with currentOpId keeps the contract enforceable
  // by a single regression test on this file alone.
  let unlistenImportDone: UnlistenFn | null = null;

  // CYCLE-2 cluster #6 — inline type mirrors Rust ImportDoneEvent SSOT verbatim
  // (src-tauri/src/import_controller.rs — landed in Plan 02-05). When the Rust
  // shape changes, this listener AND src/lib/import-state.svelte.ts:109 MUST
  // change in the same PR. `failures[].reason` (NOT `.message`) matches Rust
  // `ImportFailure.reason`.
  type ImportDoneEventPayload = {
    operation_id: string;
    total: number;
    succeeded: number;
    failed: number;
    cancelled: boolean;
    course: string | null;
    category: string;
    failures: { path: string; reason: string }[];
  };

  // G-01 fix — register once on mount, dispose on destroy. The handler reads
  // currentOpId fresh on each event (Svelte 5 $state runtime semantics), so a
  // stale-closure regression is structurally impossible. Failure cases
  // (errored imports) are signalled via friendlyError + an `error` row inside
  // import:progress, NOT via cancelled=true on import:done — see
  // src-tauri/src/import_controller.rs:329-386 for the import:progress error
  // arm. The dialog stays open in those cases so the user can read the
  // friendly-error banner and dismiss manually.
  onMount(async () => {
    unlistenImportDone = await listen<ImportDoneEventPayload>(
      "import:done",
      (event) => {
        if (
          currentOpId &&
          event.payload.operation_id === currentOpId &&
          !event.payload.cancelled
        ) {
          onClose();
        }
      },
    );
  });

  onDestroy(() => {
    unlistenImportDone?.();
    unlistenImportDone = null;
  });

  // Reset on each open (D-11). CYCLE-2 cluster #16: if only 1 course exists,
  // auto-select it so the typical single-course user is not blocked by a
  // null-course guard on Submit.
  $effect(() => {
    if (dialogOpen) {
      selectedCourse =
        vaultState.course_list.length === 1 ? vaultState.course_list[0] : null;
      selectedCategory = "_inbox";
      courseTypeahead = "";
      submitting = false;
      currentOpId = null;
      friendlyError = null;
    }
  });

  // CYCLE-2 cluster #16 — Submit-gate derivation.
  // Submit is disabled until:
  //   (a) no paths to import (`paths.length === 0`), OR
  //   (b) a submit is already in-flight, OR
  //   (c) the user picked a non-_inbox category but has NOT selected a course.
  // Case (c) prevents an undefined-course submission flowing into start_import,
  // which would then reject with the cluster #7 course-validation error.
  // _inbox + no course is intentional (D-11 catch-all path).
  let submitDisabled = $derived(
    submitting ||
      paths.length === 0 ||
      (selectedCategory !== "_inbox" && selectedCourse === null),
  );

  let filteredCourses = $derived(
    courseTypeahead.length === 0
      ? vaultState.course_list
      : vaultState.course_list.filter((c) =>
          c.toUpperCase().includes(courseTypeahead.toUpperCase()),
        ),
  );

  async function submit() {
    if (submitting || paths.length === 0) return;
    submitting = true;
    friendlyError = null;
    try {
      const opId = await invoke<string>("start_import", {
        paths,
        course: selectedCourse, // null = _inbox catch-all
        category: selectedCategory,
        vaultRoot: vaultState.vault_path,
      });
      currentOpId = opId;
      // CYCLE-3 priority #4 + cycle-2 NEW HIGH 2 fix — DO NOT close the dialog
      // immediately after start_import returns the op_id. start_import_inner
      // spawns a background tokio task; the await only blocks on validate_inputs
      // + registry registration (< 1ms typical). The user must be able to see
      // an "Importing N of M..." state with a reachable Cancel button. The
      // dialog closes ONLY when:
      //   (a) the user clicks Cancel (cancel_import fires + onClose),
      //   (b) the import completes successfully — the dialog SELF-listens for
      //       its own currentOpId's import:done via the onMount-registered
      //       listener above (G-01 fix, 2026-05-18 verify-work dogfood). The
      //       prior contract expected the parent +page.svelte to listen but
      //       that wiring was never landed; co-locating the listener here
      //       keeps the contract enforceable by a single regression test.
      //   (c) the import errors out (friendlyError surfaces; user dismisses).
      // submitting stays true so the file list + submit CTA stay disabled while
      // the spawned task runs.
    } catch (e) {
      // REVIEW-1 / Gemini MEDIUM resolution: classify error shape and surface
      // a user-friendly inline message for the PermissionDenied / re-import case.
      friendlyError = classifyImportError(e);
      console.error("[import-dialog:submit]", e);
      submitting = false;
    }
  }

  async function cancel() {
    // CYCLE-3 priority #4 + cycle-2 NEW HIGH 2 — Cancel is reachable whenever
    // currentOpId is set (i.e. submitting=true AND op_id assigned). Without
    // op_id (mid-await — < 1ms typical), Cancel acts as a plain Close button
    // (closes the dialog before the import actually starts; the user is
    // bailing on the entire flow). With op_id, Cancel sends cancel_import
    // and closes; the spawned task observes the flip and drains already-
    // written files preserved per D-16.
    if (currentOpId) {
      try {
        await invoke("cancel_import", { operationId: currentOpId });
      } catch (e) {
        console.error("[import-dialog:cancel]", e);
      }
    }
    onClose();
  }
</script>

{#if dialogOpen}
  <div class="backdrop" aria-hidden="true">
    <div
      class="dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-title"
    >
      <h2 id="import-title" class="title">Import files</h2>

      {#if vaultState.course_list.length === 0}
        <div class="empty-state">
          <p class="empty-headline">No courses yet.</p>
          <p class="empty-body">
            Add a course in Settings → Vault, then re-drop your files.
          </p>
          <div class="footer">
            <button type="button" class="ghost-btn" onclick={onClose}
              >Close</button
            >
            <button type="button" class="cta" onclick={onOpenSettings}
              >Open Settings</button
            >
          </div>
        </div>
      {:else}
        {#if friendlyError}
          <div class="friendly-error" role="alert">
            <span class="fe-icon" aria-hidden="true">!</span>
            <span class="fe-text">{friendlyError}</span>
            <button
              type="button"
              class="fe-dismiss"
              onclick={() => {
                friendlyError = null;
              }}
              aria-label="Dismiss">×</button
            >
          </div>
        {/if}

        <section class="files">
          <div class="section-label">Files to import</div>
          <ul class="file-list">
            {#each paths as p (p)}
              <li class="file-row">{p.split("/").pop()}</li>
            {/each}
          </ul>
        </section>

        <section class="course-picker">
          <div class="section-label">Course</div>
          {#if vaultState.course_list.length <= 3}
            {#each vaultState.course_list as code (code)}
              <label class="opt">
                <input
                  type="radio"
                  name="course"
                  value={code}
                  bind:group={selectedCourse}
                />
                <span>{code}</span>
              </label>
            {/each}
          {:else if vaultState.course_list.length <= 10}
            <select class="course-select" bind:value={selectedCourse}>
              <option value={null}>Choose a course…</option>
              {#each vaultState.course_list as code (code)}
                <option value={code}>{code}</option>
              {/each}
            </select>
          {:else}
            <input
              type="search"
              class="typeahead"
              placeholder="Type to filter courses…"
              bind:value={courseTypeahead}
              autocomplete="off"
            />
            <ul class="typeahead-list">
              {#each filteredCourses.slice(0, 8) as code (code)}
                <li>
                  <button
                    type="button"
                    class="ta-row"
                    class:selected={selectedCourse === code}
                    onclick={() => {
                      selectedCourse = code;
                    }}
                  >
                    {code}
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </section>

        <section class="category-picker">
          <div class="section-label">Category</div>
          {#each ["lectures", "tutorials", "assignments", "announcements", "_inbox"] as cat (cat)}
            <label class="opt">
              <input
                type="radio"
                name="category"
                value={cat}
                bind:group={selectedCategory}
              />
              <span class="cap"
                >{cat === "_inbox"
                  ? `_inbox  (default — uncategorized)`
                  : cat[0].toUpperCase() + cat.slice(1)}</span
              >
            </label>
          {/each}
        </section>

        <div class="footer">
          <!-- CYCLE-3 cycle-2 NEW HIGH 2: Cancel is ALWAYS reachable while the
               dialog is open. Pre-submit: closes the dialog. Mid-submit (submitting
               + currentOpId set): sends cancel_import RPC + closes. -->
          <button type="button" class="ghost-btn" onclick={cancel}>
            {submitting && currentOpId ? "Cancel import" : "Cancel"}
          </button>
          <!-- CYCLE-2 cluster #16 — wired to submitDisabled derived state (course=null gate) -->
          <!-- CYCLE-3 cycle-2 NEW HIGH 2: Submit CTA is disabled while a job is in flight
               (submitting=true) so the user can NOT double-spawn import operations. -->
          <button
            type="button"
            class="cta"
            onclick={submit}
            disabled={submitDisabled}
          >
            {submitting
              ? `Importing…`
              : `Import ${paths.length} file${paths.length === 1 ? "" : "s"}`}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(20, 20, 19, 0.32);
    display: grid;
    place-items: center;
    z-index: 150;
  }
  .dialog {
    width: 480px;
    max-height: 80vh;
    overflow-y: auto;
    background: var(--color-cream);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-2);
    padding: var(--space-6);
  }
  .title {
    font-family: var(--font-serif);
    font-size: var(--fs-h);
    font-weight: var(--fw-semibold);
    color: var(--color-warm-dark);
    margin: 0 0 var(--space-5);
  }
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-6) 0;
    text-align: center;
  }
  .empty-headline {
    font-family: var(--font-serif);
    font-size: var(--fs-body);
    font-weight: var(--fw-semibold);
    color: var(--color-warm-dark);
    margin: 0;
  }
  .empty-body {
    font-family: var(--font-serif);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-soft);
    margin: 0 0 var(--space-5);
  }
  .friendly-error {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    margin-bottom: var(--space-4);
    background: var(--color-cream-deep);
    border-left: 2px solid var(--color-error);
    border-radius: var(--radius-md);
    font-family: var(--font-serif);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark);
    line-height: var(--lh-body);
  }
  .fe-icon {
    color: var(--color-error);
    font-weight: var(--fw-semibold);
    flex-shrink: 0;
  }
  .fe-text {
    flex: 1;
  }
  .fe-dismiss {
    background: none;
    border: none;
    color: var(--color-warm-dark-soft);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 0 var(--space-1);
    flex-shrink: 0;
  }
  .fe-dismiss:hover {
    color: var(--color-warm-dark);
  }
  .files,
  .course-picker,
  .category-picker {
    margin-bottom: var(--space-5);
  }
  .section-label {
    font-family: var(--font-sans);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-soft);
    margin-bottom: var(--space-2);
  }
  .file-list {
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: 96px;
    overflow-y: auto;
    background: var(--color-cream-deep);
    border-radius: var(--radius-md);
  }
  .file-row {
    font-family: var(--font-mono);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark);
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border-soft);
  }
  .file-row:last-child {
    border-bottom: none;
  }
  .opt {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-family: var(--font-serif);
    font-size: var(--fs-body);
    color: var(--color-warm-dark);
    margin-bottom: var(--space-1);
    cursor: pointer;
  }
  .opt input {
    accent-color: var(--color-orange);
  }
  .cap {
    font-family: var(--font-sans);
  }
  .course-select,
  .typeahead {
    width: 100%;
    height: 36px;
    padding: 0 var(--space-3);
    background: var(--color-cream-deep);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-md);
    font-family: var(--font-sans);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark);
  }
  .typeahead-list {
    list-style: none;
    padding: 0;
    margin: var(--space-2) 0 0;
    max-height: 200px;
    overflow-y: auto;
    background: var(--color-cream-deep);
    border-radius: var(--radius-md);
  }
  .ta-row {
    width: 100%;
    text-align: left;
    height: 32px;
    padding: 0 var(--space-3);
    background: none;
    border: none;
    font-family: var(--font-mono);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark);
    cursor: pointer;
  }
  .ta-row.selected,
  .ta-row:hover {
    background: var(--color-cream-edge);
  }
  .footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    margin-top: var(--space-3);
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
  }
  .ghost-btn:hover {
    background: var(--color-cream-deep);
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
  }
  .cta:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px var(--orange-ring);
  }
  .cta:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
</style>
