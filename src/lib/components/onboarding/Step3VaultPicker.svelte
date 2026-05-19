<!--
  Visual: /Users/qinyuan/Downloads/Mneme 3/Mneme Onboarding.html (Step 3 frame)
         + 02-UI-SPEC.md §8.1.3 — Step 3 Vault path picker

  Default ~/StudyVault display + Browse via @tauri-apps/plugin-dialog
  open({ directory: true }) + path validation via validateVaultPath
  (src/lib/onboarding-validation.ts, Plan 02-09 Task 1).

  CYCLE-2 cluster #15 (preserved): the picker starts INVALID until either
  initialPath is set (resume flow) OR homeDir() resolves. Plain `valid`
  on mount with an empty absolutePath would let a fast click on "Use this
  path" invoke vault_create_scaffold with root="" — that writes into the
  app cwd. Defense-in-depth: confirm() refuses absolutePath === "" even
  if disabled binding bypasses (e.g., Enter on focused button mid-resolve).

  KD-13 token-only. Mono font on the path input for legibility per §8.1.3.

  Phase 02.1 02.1-10 (W4 fix): adds "Choose another folder" ghost-link
  below the primary CTA per UI-SPEC §8.1.3 + UI-REVIEW.md L41. Closes
  the re-entry discoverability gap once the user has moved focus from the
  Browse button to "Use this path". The ghost-link reuses browse() so the
  selection flow is identical to clicking Browse a second time. Element is
  a <button type="button"> (not <span onclick>) to preserve tab focus +
  Phase 2 :focus-visible standard. .ghost-link CSS rule is duplicated from
  Step 5 / Step 2 / Step 6 due to Svelte component-scoped CSS; both
  surfaces match the UI-SPEC §8.1.3 pattern. Future refactor candidate:
  lift into src/lib/styles/links.css.
-->
<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { open } from "@tauri-apps/plugin-dialog";
  import { homeDir } from "@tauri-apps/api/path";
  import { validateVaultPath, type PathValidation } from "$lib/onboarding-validation";

  interface Props {
    initialPath?: string;
    onConfirm: (path: string) => void;
    saving?: boolean;
  }
  let { initialPath = "", onConfirm, saving = false }: Props = $props();

  // Snapshot the prop into a const for use in $state initializers. The parent
  // (Onboarding.svelte) passes onboardingState.vault_path which is stable for
  // the lifetime of this component instance — Step3 unmounts when Onboarding
  // navigates away from /onboarding/3. We intentionally DO NOT track future
  // initialPath changes: re-initializing absolutePath / validation after a
  // parent re-render would clobber the user's Browse selection.
  // svelte-ignore state_referenced_locally
  const initialPathSnapshot = initialPath;

  let homePath = $state<string | null>(null);
  let displayPath = $state<string>(initialPathSnapshot || "~/StudyVault");
  // CYCLE-2 cluster #15 — initialize from initialPath SYNCHRONOUSLY when present
  // (resume flow). Otherwise start empty + use validation.kind="invalid" to
  // gate the CTA until the async homeDir() resolves.
  let absolutePath = $state<string>(initialPathSnapshot || "");
  let validation = $state<PathValidation>(
    initialPathSnapshot !== ""
      ? { kind: "valid", willCreate: true }
      : { kind: "invalid", reason: "Loading default location…" },
  );

  async function resolveHome() {
    try {
      const h = await homeDir();
      homePath = h;
      if (!initialPathSnapshot) {
        // Strip trailing slash from homeDir() output before joining so we don't
        // produce /Users/qy//StudyVault. Tauri's homeDir() is currently a no-
        // trailing-slash impl but being defensive costs nothing.
        const homeNorm = h.endsWith("/") ? h.slice(0, -1) : h;
        absolutePath = `${homeNorm}/StudyVault`;
        displayPath = "~/StudyVault";
        validation = { kind: "valid", willCreate: true };
      }
    } catch (e) {
      console.error("[onboarding:home]", e);
      // Keep validation invalid so CTA stays disabled; user must Browse manually.
      validation = {
        kind: "invalid",
        reason: "Could not detect home folder. Use Browse to choose a location.",
      };
    }
  }
  void resolveHome();

  async function browse() {
    try {
      const chosen = await open({ directory: true, multiple: false });
      if (typeof chosen === "string") {
        absolutePath = chosen;
        // Collapse home prefix to ~ for the display field only — Rust receives
        // the absolute path.
        displayPath =
          homePath && chosen.startsWith(homePath)
            ? chosen.replace(homePath, "~")
            : chosen;
        validation = validateVaultPath(chosen, homePath);
      }
    } catch (e) {
      console.error("[onboarding:browse]", e);
    }
  }

  async function confirm() {
    // CYCLE-2 cluster #15 — defense-in-depth: refuse to invoke with empty
    // absolutePath even if the disabled binding somehow bypasses (e.g. Enter
    // on focused button mid-resolve). NEVER call vault_create_scaffold with "".
    if (validation.kind !== "valid" || saving || absolutePath === "") return;
    try {
      await invoke("vault_create_scaffold", { root: absolutePath });
      await invoke("save_config", {
        state: { vault_path: absolutePath, schema_version: 1 },
      });
      onConfirm(absolutePath);
    } catch (e) {
      console.error("[onboarding:vault-create]", e);
      validation = {
        kind: "invalid",
        reason: "Mneme can't write here. Choose another folder.",
      };
    }
  }
</script>

<section class="step3" aria-labelledby="step3-heading">
  <h1 id="step3-heading" class="headline">Choose your vault location</h1>
  <p class="body">
    Mneme will create folders here for your courses, sources, notes, and concepts.
  </p>

  <div class="picker">
    <input
      type="text"
      class="path-input"
      value={displayPath}
      readonly
      aria-label="Vault path"
    />
    <button
      type="button"
      class="browse-btn"
      onclick={browse}
      disabled={saving}
      aria-haspopup="dialog"
    >
      Browse…
    </button>
  </div>

  <p class="validation" data-kind={validation.kind} role="status" aria-live="polite">
    {#if validation.kind === "valid"}
      <span class="icon" aria-hidden="true">✓</span> Path will be created.
    {:else}
      <span class="icon" aria-hidden="true">!</span> {validation.reason}
    {/if}
  </p>

  <!-- svelte-ignore a11y_autofocus —
       UI-SPEC §8.1 shared accessibility contract; see Step1Welcome rationale. -->
  <button
    type="button"
    class="cta"
    onclick={confirm}
    disabled={validation.kind !== "valid" || saving || absolutePath === ""}
    autofocus
  >
    Use this path
  </button>

  <!-- W4 fix (Phase 02.1 02.1-10): secondary re-entry path per UI-SPEC §8.1.3 +
       UI-REVIEW.md L41. The primary Browse button at the top of the picker
       remains the discoverable entry; this ghost-link is the discoverable
       RE-ENTRY once the user has committed focus to "Use this path". Reuses
       browse() so the path goes through the same plugin-dialog flow. Element
       is a real <button type="button"> (not a styled <span>) so it is
       tab-focusable and the Phase 2 :focus-visible orange-ring standard
       applies. `disabled={saving}` mirrors the primary Browse button (L132-
       133) so the user cannot trigger a new file picker mid-save. -->
  <button
    type="button"
    class="ghost-link"
    onclick={browse}
    disabled={saving}
  >
    Choose another folder
  </button>
</section>

<style>
  .step3 {
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
  .picker {
    display: flex;
    gap: var(--space-3);
    width: 100%;
    max-width: 480px;
    align-items: center;
  }
  .path-input {
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
  .browse-btn {
    width: 96px;
    height: 36px;
    background: var(--color-cream-edge);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-md);
    font-family: var(--font-sans);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark);
    cursor: pointer;
    transition: background var(--duration-fast) var(--ease-out);
  }
  .browse-btn:hover {
    background: var(--color-cream-deep);
  }
  .browse-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .validation {
    font-family: var(--font-serif);
    font-size: var(--fs-meta);
    margin: var(--space-1) 0 0;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-warm-dark-mute);
  }
  .validation[data-kind="valid"] {
    color: var(--color-success);
  }
  .validation[data-kind="invalid"] {
    color: var(--color-error);
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
  /* W4 fix (Phase 02.1 02.1-10): ghost-link affordance — text-only button,
     no chrome. Pattern shared with Step 5 / Step 2 / Step 6 ghost-link per
     UI-SPEC §8.1.3. Duplicated here because Svelte CSS is component-scoped;
     future refactor candidate: lift into src/lib/styles/links.css and
     replace this rule across the 4 onboarding step components. The richer
     :focus-visible + :disabled / :hover-not-disabled treatment here
     captures the Phase 2 standard (W3 focus-ring + W4 ghost-link unified
     across re-entry surfaces). */
  .ghost-link {
    margin-top: var(--space-2);
    background: none;
    border: none;
    padding: var(--space-1) var(--space-2);
    font-family: var(--font-serif);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-mute);
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
    border-radius: var(--radius-sm);
    transition: color var(--duration-fast) var(--ease-out);
  }
  .ghost-link:hover:not(:disabled) {
    color: var(--color-warm-dark);
  }
  .ghost-link:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px var(--orange-ring);
  }
  .ghost-link:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
</style>
