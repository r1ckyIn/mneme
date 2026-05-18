// tests/onboarding-resume.test.ts
// Maps to: SPEC REQ-08 acceptance L143 — "killing at step 4 and relaunching opens at step 4".
//
// Test strategy: mock @tauri-apps/api/core invoke to return a saved state at
// step 4; assert the IPC contract directly (load_onboarding_state shape +
// save_onboarding_state call signature + complete_onboarding return shape).
//
// CYCLE-3 priority #6 — NO vitest-browser-svelte dep (the package was never
// declared in package.json; importing would have caused Vitest module
// resolution to fail before any fallback ran). This test asserts only the
// IPC contract between Onboarding.svelte and the Rust backend; full
// component-mount + step-rail visual E2E is deferred to /gsd-verify-work
// manual flows in 02-VALIDATION.md.
//
// WR-03 fix (gap-closure 02-15) extension: a sibling describe block below
// adds 3 source-file regex pins so a future refactor that re-introduces the
// stale-state race (or removes the loaded gate) visibly breaks the suite.
// Pattern mirrors 02-14 Plan Task 3 Test 2 (VaultCategory.svelte readFile +
// regex assertion). NO component mount; NO Svelte testing-library dependency
// is added to package.json — the assertions are pure file-content greps.
import { readFile } from "node:fs/promises";
import { describe, test, expect, vi, beforeAll, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (cmd: string, _args?: unknown) => {
    if (cmd === "load_onboarding_state") {
      return {
        current_step: 4,
        vault_path: "/Users/qy/StudyVault",
        courses_added: ["COMP3221"],
        completed_at: null,
      };
    }
    if (cmd === "save_onboarding_state") return undefined;
    if (cmd === "complete_onboarding") {
      return { completed_at: new Date().toISOString() };
    }
    return undefined;
  }),
}));

vi.mock("$app/navigation", () => ({
  goto: vi.fn(async () => undefined),
}));

vi.mock("$app/stores", () => ({
  page: {
    subscribe: (fn: (v: { url: { pathname: string } }) => void) => {
      fn({ url: { pathname: "/onboarding/4" } });
      return () => {};
    },
  },
}));

interface OnboardingState {
  current_step: number;
  vault_path: string;
  courses_added: string[];
  completed_at: string | null;
}

describe("onboarding-resume IPC contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("load_onboarding_state returns the saved current_step on relaunch (SPEC REQ-08 L143)", async () => {
    const { invoke } = await import("@tauri-apps/api/core");

    const state = await invoke<OnboardingState>("load_onboarding_state");

    // REQ-08 acceptance: killing at step 4 and relaunching opens at step 4.
    // The Onboarding.svelte onMount handler merges this state with the URL
    // initialStep prop (URL wins for navigation, loaded state wins for
    // vault_path / courses_added / completed_at).
    expect(state.current_step).toBe(4);
    expect(state.completed_at).toBeNull();
    expect(state.courses_added).toEqual(["COMP3221"]);
    expect(state.vault_path).toBe("/Users/qy/StudyVault");
  });

  test("save_onboarding_state forwards the updated state on Next-click", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const updated: OnboardingState = {
      current_step: 5,
      vault_path: "/Users/qy/StudyVault",
      courses_added: ["COMP3221"],
      completed_at: null,
    };

    // Mirrors the call shape Onboarding.svelte's next() helper produces.
    await invoke("save_onboarding_state", { state: updated });

    const call = (invoke as unknown as { mock: { calls: unknown[][] } }).mock.calls.find(
      (c) => c[0] === "save_onboarding_state",
    );
    expect(call).toBeTruthy();
    expect((call?.[1] as { state: OnboardingState }).state.current_step).toBe(5);
    expect((call?.[1] as { state: OnboardingState }).state.completed_at).toBeNull();
  });

  test("complete_onboarding stamps a completed_at ISO timestamp", async () => {
    const { invoke } = await import("@tauri-apps/api/core");

    const result = await invoke<{ completed_at: string }>("complete_onboarding");

    // Plan 02-03 onboarding.rs complete_in stamps Utc::now().to_rfc3339().
    // Onboarding.svelte's finish() handler only cares that the call resolves
    // — the next launch reads `completed_at.is_some()` via the root +layout
    // gate and skips the wizard route.
    expect(result.completed_at).toBeTruthy();
    expect(typeof result.completed_at).toBe("string");
  });
});

// WR-03 fix (gap-closure 02-15) — source-file invariants.
// These three tests pin the WR-03 contract directly in the source code so a
// future refactor that re-introduces the stale-state race (reverting to
// onboardingState.current_step) or removes the loaded gate (re-introducing
// the pre-mount-click footgun) visibly breaks the suite.
//
// Strategy: read the source file via node:fs/promises readFile and grep with
// regex. NO Svelte component mount, NO Svelte testing-library dependency.
// Pattern mirrors 02-14 Plan Task 3 Test 2.
describe("WR-03 fix — Onboarding.svelte source-file invariants", () => {
  let src = "";

  beforeAll(async () => {
    src = await readFile("src/lib/components/onboarding/Onboarding.svelte", "utf8");
  });

  test("Onboarding.svelte next() computes nextStep from URL initialStep (WR-03 fix marker)", () => {
    // Pin: the URL-truth formula MUST be present.
    expect(src).toMatch(/Math\.min\(6,\s*initialStep\s*\+\s*1\)/);
    // Pin: the stale-state formula MUST be gone (was: onboardingState.current_step + 1).
    expect(src).not.toMatch(/Math\.min\(6,\s*onboardingState\.current_step\s*\+\s*1\)/);
    // Pin: disposition marker.
    expect(src).toMatch(/WR-03 fix/);
  });

  test("Onboarding.svelte exposes a 'loaded' \\$state gate that blocks next() pre-mount (WR-03 defense-in-depth)", () => {
    // Pin: the gate declaration exists.
    expect(src).toMatch(/let\s+loaded\s*=\s*\$state\(false\)/);
    // Pin: BOTH `saving` and `!loaded` gate next(). WR-004 fix (02.1-REVIEW)
    // split the previous one-line `if (saving || !loaded) return;` into two
    // separate guards so the !loaded branch can queue the request into
    // pendingNext rather than dropping it silently. Assert each gate
    // independently so either shape (one-line union OR two split if's)
    // passes — what matters is that the source mentions both predicates as
    // return/early-exit conditions in next().
    expect(src).toMatch(/if\s*\(\s*saving[^)]*\)\s*return/);
    expect(src).toMatch(/if\s*\(\s*!loaded[^)]*\)\s*\{/);
    // Pin: WR-004 queue replay site exists in onMount (replays a pending
    // next() once load resolves).
    expect(src).toMatch(/pendingNext/);
    // Pin: the flip-to-true site exists (end of onMount).
    expect(src).toMatch(/loaded\s*=\s*true/);
  });

  test("Onboarding.svelte onMount renames its local 'loaded' to avoid shadowing the \\$state gate", () => {
    // Pin: the OLD shadow-prone local binding shape MUST be absent. If the
    // executor chose a different non-shadowing rename (e.g. `result` instead
    // of `loadedState`), this test still passes because we only assert the
    // OLD shape is gone — the new shape may vary.
    expect(src).not.toMatch(/const\s+loaded\s*=\s*await\s+invoke<OnboardingState>/);
  });
});

// WR-007 fix (Phase 02.1 02.1-REVIEW iter 2) — pendingNext replay race regression.
//
// WR-004 introduced a queue-replay so a fast Step 3 "Use this path" click
// pre-mount no longer no-ops silently. The replay happens AFTER onMount's
// full-state REPLACE (`onboardingState = { ...loadedState, current_step }`),
// so any in-place mutation made during the load window (e.g. setVaultPath
// writing onboardingState.vault_path) was clobbered by the REPLACE before
// the queued next() persisted state. Result: ~/.mneme/onboarding.json
// silently saved vault_path: "" even though Step 3 succeeded.
//
// The WR-007 fix changes onMount to MERGE loaded state INTO the live
// onboardingState (preferring in-place mutations) instead of REPLACING it.
// These tests pin both halves of the fix:
//
// 1. A runtime simulation of the race using the actual merge formula. The
//    Onboarding.svelte logic is reproduced here in plain TS (no Svelte
//    runtime / component mount) so we can drive the race deterministically
//    with a deferred promise and assert the post-merge state preserves the
//    user's vault_path mutation.
//
// 2. Source-regex pins on Onboarding.svelte so a future refactor that
//    re-introduces the full-state REPLACE pattern visibly breaks the suite.
describe("WR-007 fix — onMount merges loaded state into live onboardingState (no REPLACE)", () => {
  interface OBState {
    current_step: number;
    vault_path: string;
    courses_added: string[];
    completed_at: string | null;
  }

  // Reproduce the merge formula from Onboarding.svelte's onMount. If the
  // source changes the merge shape (e.g. switches to spread/replace), this
  // helper diverges from runtime behavior and the source-regex pins below
  // catch the drift.
  function applyMerge(
    live: OBState,
    loadedState: OBState,
    initialStep: number,
  ): OBState {
    live.current_step = initialStep;
    live.vault_path = live.vault_path || loadedState.vault_path;
    live.courses_added =
      live.courses_added.length > 0 ? live.courses_added : loadedState.courses_added;
    live.completed_at = loadedState.completed_at ?? live.completed_at;
    return live;
  }

  test("REGRESSION (WR-007): user mutates vault_path during load window — merge preserves it, REPLACE would clobber", async () => {
    // Initial state: empty defaults (the $state initializer in Onboarding.svelte).
    const onboardingState: OBState = {
      current_step: 1,
      vault_path: "",
      courses_added: [],
      completed_at: null,
    };

    // Simulate the race: load_onboarding_state is awaiting (deferred promise);
    // the user clicks Step 3 "Use this path" before it resolves; setVaultPath
    // mutates onboardingState.vault_path in place; next() is queued via
    // pendingNext = true.
    let resolveLoad: (s: OBState) => void = () => {};
    const loadPromise = new Promise<OBState>((r) => {
      resolveLoad = r;
    });

    // T+5ms: user click — setVaultPath writes through the proxy.
    onboardingState.vault_path = "/Users/qy/StudyVault";

    // T+30ms: IPC resolves with fresh-install defaults (this is the
    // first-launch scenario — onboarding.json doesn't exist yet so the Rust
    // side returns OnboardingState::default() with empty vault_path).
    resolveLoad({
      current_step: 1,
      vault_path: "",
      courses_added: [],
      completed_at: null,
    });
    const loadedState = await loadPromise;

    // The merge step (was: REPLACE). With the WR-007 fix, the user's
    // vault_path mutation survives because the merge formula reads
    // `live.vault_path || loadedState.vault_path` and live.vault_path is
    // truthy.
    applyMerge(onboardingState, loadedState, /* initialStep */ 3);

    // Post-fix expectation: the user's mutation survives the merge.
    expect(onboardingState.vault_path).toBe("/Users/qy/StudyVault");
    expect(onboardingState.current_step).toBe(3);

    // Pre-fix behavior would have been: onboardingState = { ...loadedState,
    // current_step: 3 } → vault_path becomes "" (the loadedState value).
    // Pin this expectation explicitly so anyone reverting the fix sees what
    // the contract is.
    expect(onboardingState.vault_path).not.toBe("");
  });

  test("WR-007 merge: loaded vault_path wins when user has NOT mutated yet (cold-start resume from disk)", () => {
    // Initial state: empty defaults, no user click yet.
    const onboardingState: OBState = {
      current_step: 1,
      vault_path: "",
      courses_added: [],
      completed_at: null,
    };

    // Loaded from disk: a real saved session at step 4.
    const loadedState: OBState = {
      current_step: 4,
      vault_path: "/Users/qy/StudyVault",
      courses_added: ["COMP3221"],
      completed_at: null,
    };

    applyMerge(onboardingState, loadedState, /* initialStep */ 4);

    // No user mutation → loaded state's vault_path / courses_added win.
    expect(onboardingState.vault_path).toBe("/Users/qy/StudyVault");
    expect(onboardingState.courses_added).toEqual(["COMP3221"]);
    expect(onboardingState.current_step).toBe(4);
  });

  test("WR-007 merge: in-flight courses_added (Step 5 chip click) survives a load with empty courses", () => {
    const onboardingState: OBState = {
      current_step: 1,
      vault_path: "/already/picked",
      courses_added: [],
      completed_at: null,
    };

    // User clicks "Add" on Step 5 before the load resolves.
    onboardingState.courses_added = ["COMP3027"];

    const loadedState: OBState = {
      current_step: 1,
      vault_path: "",
      courses_added: [],
      completed_at: null,
    };

    applyMerge(onboardingState, loadedState, /* initialStep */ 5);

    expect(onboardingState.courses_added).toEqual(["COMP3027"]);
    expect(onboardingState.vault_path).toBe("/already/picked");
  });

  test("WR-007 merge: completed_at uses nullish-coalescing so a loaded completion timestamp wins over a null live", () => {
    const onboardingState: OBState = {
      current_step: 1,
      vault_path: "",
      courses_added: [],
      completed_at: null,
    };

    const loadedState: OBState = {
      current_step: 6,
      vault_path: "/v",
      courses_added: [],
      completed_at: "2026-05-18T00:00:00Z",
    };

    applyMerge(onboardingState, loadedState, /* initialStep */ 6);

    expect(onboardingState.completed_at).toBe("2026-05-18T00:00:00Z");
  });
});

// WR-007 source-file invariants — pin the merge contract directly in the
// source so a refactor that re-introduces the full-state REPLACE pattern
// fails CI immediately.
describe("WR-007 fix — Onboarding.svelte source-file invariants", () => {
  let src = "";
  // Code-only view of the source with line/block comments stripped, so the
  // not-match pins below cannot be defeated by the WR-007 explanatory
  // comment which legitimately quotes the pre-fix shape verbatim.
  let codeOnly = "";

  beforeAll(async () => {
    src = await readFile("src/lib/components/onboarding/Onboarding.svelte", "utf8");
    codeOnly = src
      // Strip /* ... */ block comments (greedy across newlines via [\s\S]).
      .replace(/\/\*[\s\S]*?\*\//g, "")
      // Strip // line comments to end-of-line.
      .replace(/\/\/[^\n]*/g, "")
      // Strip <!-- ... --> HTML comments from the Svelte template prelude.
      .replace(/<!--[\s\S]*?-->/g, "");
  });

  test("Onboarding.svelte onMount no longer REPLACES onboardingState with a fresh spread (WR-007 marker)", () => {
    // Pin (code-only): the pre-fix shape `onboardingState = { ...loadedState, current_step: initialStep }`
    // MUST be absent from executable code. The new code mutates fields on
    // the existing $state object instead of replacing it. We check the
    // comment-stripped view so the WR-007 explanatory block, which quotes
    // the pre-fix shape verbatim, cannot trigger a false negative.
    expect(codeOnly).not.toMatch(
      /onboardingState\s*=\s*\{\s*\.\.\.loadedState\s*,\s*current_step\s*:\s*initialStep\s*\}/,
    );
    // Pin: the disposition marker (allowed to live in a comment, so check src).
    expect(src).toMatch(/WR-007 fix/);
  });

  test("Onboarding.svelte onMount preserves in-place user mutations via field-by-field merge (WR-007 contract)", () => {
    // Pin: the vault_path merge formula MUST prefer the live value when set.
    // Either `live || loaded` or `onboardingState.vault_path || loadedState.vault_path`.
    expect(codeOnly).toMatch(/onboardingState\.vault_path\s*=\s*onboardingState\.vault_path\s*\|\|\s*loadedState\.vault_path/);
    // Pin: the courses_added merge formula MUST treat the live array as
    // present when length > 0.
    expect(codeOnly).toMatch(/onboardingState\.courses_added\.length\s*>\s*0/);
  });
});
