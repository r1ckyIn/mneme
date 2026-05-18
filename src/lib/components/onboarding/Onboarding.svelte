<!--
  Visual: /Users/qinyuan/Downloads/Mneme 3/Mneme Onboarding.html (state-owner shell)
         + 02-UI-SPEC.md §8.1 (shared step shell composition)

  Phase 2 D-02 state owner. Reads the URL `initialStep` prop (resolved by
  +page.ts load + clamped to [1..6]), routes to the matching step child,
  and owns the per-step persistence orchestration:

   - on mount: invoke load_onboarding_state() → merge loaded state but
     trust URL initialStep for navigation (avoids racing on a stale
     current_step in the JSON file).
   - on Next click (step child invokes next()):
       1. clamp(current_step + 1, 6) → updated state
       2. invoke save_onboarding_state({ state }) — Plan 02-03
          backing module atomically temp+renames the JSON file.
       3. goto(`/onboarding/<n>`, { replaceState: true })
   - on Step 6 Finish click (step child invokes finish()):
       1. invoke complete_onboarding() — Plan 02-03 stamps completed_at
          with Utc::now().to_rfc3339().
       2. goto("/", { replaceState: true }) — the root +layout sees
          completed_at.is_some() on the next launch and skips redirect.

  Step children rendered (Plan 02-08 + 02-09):
   - Step 1: Step1Welcome (UI-SPEC §8.1.1)        — Plan 02-08
   - Step 2: Step2AuthCheck (UI-SPEC §8.1.2)      — Plan 02-09 (claude_auth_check IPC)
   - Step 3: Step3VaultPicker (UI-SPEC §8.1.3)    — Plan 02-09 (plugin-dialog + vault_create_scaffold + save_config)
   - Step 4: Step4MCPStatus (UI-SPEC §8.1.4)      — Plan 02-08
   - Step 5: Step5AddCourse (UI-SPEC §8.1.5)      — Plan 02-09 (course_create IPC, chip list)
   - Step 6: Step6DemoImport (UI-SPEC §8.1.6)     — Plan 02-09 (start_import IPC, Browse-only per BLK-3)
-->
<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { invoke } from "@tauri-apps/api/core";
  // Phase 02.1 02.1-08 (W2 fix): step body wrapped in a Svelte keyed block
  // (the {#key} on initialStep) + a fly transition directive on the inner
  // wrapper. Uses $lib/motion.prefersReducedMotion() so OS-level
  // reduced-motion users get opacity-only fade. svelte/transition +
  // svelte/easing are built-in (KP-02 zero-add). Closes UI-REVIEW.md L73
  // (no step transition animation) per D-05 in 02.1-CONTEXT.md.
  import { fly } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import { prefersReducedMotion } from "$lib/motion";
  import Step1Welcome from "./Step1Welcome.svelte";
  import Step2AuthCheck from "./Step2AuthCheck.svelte";
  import Step3VaultPicker from "./Step3VaultPicker.svelte";
  import Step4MCPStatus from "./Step4MCPStatus.svelte";
  import Step5AddCourse from "./Step5AddCourse.svelte";
  import Step6DemoImport from "./Step6DemoImport.svelte";
  import OnboardingStepRail from "./OnboardingStepRail.svelte";

  interface Props {
    initialStep: number;
  }
  let { initialStep }: Props = $props();

  interface OnboardingState {
    current_step: number;
    vault_path: string;
    courses_added: string[];
    completed_at: string | null;
  }

  // Initialize with empty defaults; the URL-driven `initialStep` is merged
  // into `current_step` on every prop change via the $effect below. Svelte 5
  // `$state` initializer captures the prop's INITIAL value only, so reading
  // `initialStep` directly inside this object literal would lose URL-change
  // reactivity when the user navigates from /onboarding/1 to /onboarding/2.
  let onboardingState = $state<OnboardingState>({
    current_step: 1,
    vault_path: "",
    courses_added: [],
    completed_at: null,
  });
  let saving = $state(false);
  // WR-03 fix (gap-closure 02-15): defense-in-depth `loaded` gate. Flips to
  // true at the end of onMount (after the async load_onboarding_state IPC
  // resolves OR throws). next() refuses to fire until this flips so a fast
  // Continue click cannot advance with un-merged loaded state.
  let loaded = $state(false);
  // WR-004 fix (Phase 02.1 02.1-REVIEW): when next() is invoked before
  // onMount resolves (fast Step 3 "Use this path" click, or any other step
  // racing the initial load IPC), the previous code silently returned and
  // the user saw nothing happen. We now record the intent in `pendingNext`
  // and let onMount replay it once `loaded` flips. This is a local fix that
  // does not require threading `loaded` to every step child.
  let pendingNext = $state(false);

  // Keep `current_step` in sync with the URL prop. SvelteKit reuses the
  // +page.svelte instance across same-route navigation, so the Onboarding
  // component does NOT remount when only the [step] param changes — this
  // effect bridges the prop into the reactive state object.
  $effect(() => {
    onboardingState.current_step = initialStep;
  });

  onMount(async () => {
    try {
      // WR-03 fix (gap-closure 02-15): rename local to `loadedState` so it
      // does NOT shadow the module-scope `loaded` $state gate declared above.
      const loadedState = await invoke<OnboardingState>("load_onboarding_state");
      // WR-007 fix (Phase 02.1 02.1-REVIEW iter 2): MERGE loaded state INTO
      // the live `onboardingState` object instead of REPLACING it. The
      // previous `onboardingState = { ...loadedState, current_step: initialStep }`
      // wiped out any in-place user mutations (e.g. setVaultPath from Step 3)
      // that happened during the load window between IPC start and resolution.
      // Combined with the pendingNext queue (WR-004), that race silently
      // corrupted ~/.mneme/onboarding.json with vault_path: "" when a fast
      // Step 3 "Use this path" click landed before the load resolved.
      //
      // Merge rule: for each persisted field, prefer the in-place mutation
      // the user already made (if any) over the loaded-from-disk value.
      // URL `initialStep` still wins for current_step (forward-only wizard).
      // For string fields we treat "" as "not yet set"; for arrays we treat
      // length === 0 as "not yet set". completed_at flips from null → ISO
      // string monotonically, so loaded-from-disk wins if non-null.
      onboardingState.current_step = initialStep;
      onboardingState.vault_path =
        onboardingState.vault_path || loadedState.vault_path;
      onboardingState.courses_added =
        onboardingState.courses_added.length > 0
          ? onboardingState.courses_added
          : loadedState.courses_added;
      onboardingState.completed_at =
        loadedState.completed_at ?? onboardingState.completed_at;
    } catch (e) {
      console.error("[onboarding:load]", e);
    }
    // WR-03 fix (gap-closure 02-15): flip the gate AFTER the try/catch so
    // next() can fire regardless of whether the IPC succeeded. If IPC failed
    // we still want forward progress with empty defaults; the next save will
    // persist a fresh state and the next launch recovers from disk.
    loaded = true;
    // WR-004 fix (Phase 02.1 02.1-REVIEW): replay a queued next() request if
    // the user clicked the CTA before this onMount resolved. This closes the
    // silent-no-op path documented in REVIEW.md WR-004 — without it, a fast
    // click on Step 3 "Use this path" would set vault_path, dispatch into
    // next()/!loaded, return silently, and leave the user staring at a
    // disabled-looking screen.
    if (pendingNext) {
      pendingNext = false;
      void next();
    }
  });

  async function next() {
    // WR-03 fix (gap-closure 02-15): block until onMount has resolved so we
    // never compute nextStep from un-merged state. Combined with the
    // initialStep formula below, this eliminates the slow-IPC stale-state
    // race documented in REVIEW.md L184-194.
    //
    // WR-004 fix (Phase 02.1 02.1-REVIEW): when invoked before `loaded`
    // flips, record the intent in `pendingNext` instead of returning
    // silently. onMount replays the call after the load IPC resolves.
    if (saving) return;
    if (!loaded) {
      pendingNext = true;
      return;
    }
    saving = true;
    try {
      // WR-03 fix (gap-closure 02-15): compute from initialStep (URL truth),
      // NOT onboardingState.current_step which may be stale between $effect
      // propagation and a fast Continue click. Defense-in-depth: the !loaded
      // gate above prevents this branch from running before onMount's async
      // load resolves.
      const nextStep = Math.min(6, initialStep + 1);
      const updated = { ...onboardingState, current_step: nextStep };
      onboardingState = updated;
      await invoke("save_onboarding_state", { state: updated });
      await goto(`/onboarding/${nextStep}`, { replaceState: true });
    } catch (e) {
      console.error("[onboarding:next]", e);
    } finally {
      saving = false;
    }
  }

  // Step 3 child invokes this on "Use this path" → persist vault_path + advance.
  function setVaultPath(path: string) {
    onboardingState.vault_path = path;
    void next();
  }

  // Step 5 child invokes this when chip list mutates (add or remove).
  function setCourses(codes: string[]) {
    onboardingState.courses_added = codes;
  }

  // Step 5 "Skip — add later" link — advances to step 6 with no chip required.
  function skipStep5() {
    void next();
  }

  async function finish() {
    if (saving) return;
    saving = true;
    try {
      await invoke("complete_onboarding");
      await goto("/", { replaceState: true });
    } catch (e) {
      console.error("[onboarding:finish]", e);
    } finally {
      saving = false;
    }
  }
</script>

<main class="step-body" aria-labelledby="step-heading">
  <!-- W2 fix (Phase 02.1 02.1-08): the Svelte keyed block re-creates the
       wrapping div on each initialStep change so the fly directive on the
       child fires entry+exit. y:8px / opacity 0→1 / 220ms / quintOut per
       UI-SPEC §8.1 shared-motion contract. prefersReducedMotion()
       collapses y to 0 (opacity-only) for OS-level reduced-motion users.
       Closes UI-REVIEW.md L73 (no step transition animation). D-05 in
       02.1-CONTEXT.md locks symmetric transition (not in:/out: split). -->
  {#key initialStep}
    <div
      class="step-fly-wrapper"
      transition:fly={{
        y: prefersReducedMotion() ? 0 : 8,
        duration: 220,
        easing: quintOut,
        opacity: 0,
      }}
    >
      {#if initialStep === 1}
        <Step1Welcome onContinue={next} {saving} />
      {:else if initialStep === 2}
        <Step2AuthCheck onContinue={next} {saving} />
      {:else if initialStep === 3}
        <Step3VaultPicker
          initialPath={onboardingState.vault_path}
          onConfirm={setVaultPath}
          {saving}
        />
      {:else if initialStep === 4}
        <Step4MCPStatus onContinue={next} {saving} />
      {:else if initialStep === 5}
        <Step5AddCourse
          vaultRoot={onboardingState.vault_path}
          courses={onboardingState.courses_added}
          onCoursesChange={setCourses}
          onContinue={next}
          onSkip={skipStep5}
          {saving}
        />
      {:else if initialStep === 6}
        <Step6DemoImport
          vaultRoot={onboardingState.vault_path}
          onFinish={finish}
          {saving}
        />
      {/if}
    </div>
  {/key}
</main>

<footer class="rail-host">
  <OnboardingStepRail current={initialStep} />
</footer>

<style>
  .step-body {
    display: grid;
    place-items: center;
    padding: var(--space-10) var(--space-6);
    overflow-y: auto;
  }
  /* W2 fix (Phase 02.1 02.1-08): the Svelte keyed re-wrap adds an
     intermediate div between .step-body's grid and each Step child. Mirror
     .step-body's `place-items: center` so the wrapper does not break the
     vertical+horizontal centering each Step relies on (Step1Welcome's hero,
     Step3VaultPicker's input column, etc.). display:contents would have
     been simpler but breaks grid-child semantics on Safari/WKWebView. */
  .step-fly-wrapper {
    display: grid;
    place-items: center;
    width: 100%;
  }
  .rail-host {
    padding: var(--space-3) 0 var(--space-6);
  }
</style>
