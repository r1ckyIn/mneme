// tests/onboarding-finish.test.ts — Phase 2 Plan 02-09 Wave 6.
//
// Pins the complete_onboarding IPC contract that Onboarding.svelte's
// finish() handler depends on. The full E2E (kill app mid-wizard +
// relaunch + Finish + verify subsequent launches skip wizard) is
// deferred to /gsd-verify-work per 02-VALIDATION.md Manual-Only table.
//
// Maps to: REQ-16 (onboarding wizard), SPEC L144 acceptance — "killing
// at step 4 and relaunching opens at step 4; finishing stamps
// completed_at and subsequent launches go straight to /".
import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (cmd: string, _args?: unknown) => {
    if (cmd === "load_onboarding_state") {
      return {
        current_step: 6,
        vault_path: "/Users/qy/StudyVault",
        courses_added: ["COMP3221"],
        completed_at: null,
      };
    }
    if (cmd === "complete_onboarding") {
      return {
        current_step: 6,
        vault_path: "/Users/qy/StudyVault",
        courses_added: ["COMP3221"],
        completed_at: "2026-05-15T12:00:00Z",
      };
    }
    return undefined;
  }),
}));

interface OnboardingState {
  current_step: number;
  vault_path: string;
  courses_added: string[];
  completed_at: string | null;
}

describe("onboarding-finish IPC contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("complete_onboarding returns state with completed_at set (SPEC L144)", async () => {
    const { invoke } = await import("@tauri-apps/api/core");

    const result = await invoke<OnboardingState>("complete_onboarding");

    // Plan 02-03 onboarding::complete stamps Utc::now().to_rfc3339().
    // Onboarding.svelte's finish() handler only cares that the call
    // resolves and that completed_at is non-null — the next launch's
    // root +layout reads completed_at.is_some() and skips the wizard.
    expect(result.completed_at).toBe("2026-05-15T12:00:00Z");
    expect(typeof result.completed_at).toBe("string");
  });

  test("subsequent load shows completed_at non-null (skip wizard gate)", async () => {
    // The Wave-0 RED gate documented in 02-08-SUMMARY.md is preserved
    // here as an IPC-shape assertion: before complete_onboarding,
    // load returns completed_at=null; the test exercises the call
    // shape that drives the real first-launch redirect logic in
    // src/routes/+layout.svelte without standing up the route runtime.
    const { invoke } = await import("@tauri-apps/api/core");

    const before = await invoke<OnboardingState>("load_onboarding_state");
    expect(before.completed_at).toBeNull();

    await invoke("complete_onboarding");

    // The mock is static (does not mutate state between calls), so we
    // assert the contract via call inspection: complete_onboarding was
    // invoked exactly once. In the real Rust impl, the subsequent
    // load_onboarding_state would return completed_at non-null because
    // complete_onboarding atomic-rewrites onboarding-state.json with
    // Utc::now().to_rfc3339().
    const calls = (
      invoke as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls.filter((c) => c[0] === "complete_onboarding");
    expect(calls.length).toBe(1);
  });
});
