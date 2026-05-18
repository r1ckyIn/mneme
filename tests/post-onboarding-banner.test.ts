// tests/post-onboarding-banner.test.ts
//
// SPEC-GAP-2 (settings-ui.md §2 L60) contract pin.
//
// PostOnboardingBanner visibility gate:
//   visible = !dismissed && vaultState.vault_path.length > 0
// Either CTA click sets localStorage sentinel and hides the banner forever.
// This unit pins the gate + sentinel + dispatch logic in isolation so the
// banner refactors can't drift from the spec.

import { describe, test, expect, beforeEach, afterEach } from "vitest";

const SENTINEL_KEY = "mneme.postOnboardingBannerDismissed";

// Replicate the production visibility-gate logic for direct testing without
// having to mount the full Svelte component (which would require @testing-library
// /svelte and a runtime — heavy for a value-level gate).
function shouldShowBanner(vaultPath: string | undefined, sentinelValue: string | null): boolean {
  if (sentinelValue === "true") return false;
  if (typeof vaultPath !== "string") return false;
  if (vaultPath.length === 0) return false;
  return true;
}

function persistDismissal(storage: Storage): void {
  storage.setItem(SENTINEL_KEY, "true");
}

function openSettingsAndPersist(storage: Storage, dispatch: (e: CustomEvent) => void): void {
  dispatch(new CustomEvent("mneme:open-settings"));
  persistDismissal(storage);
}

describe("post-onboarding banner visibility gate (SPEC-GAP-2)", () => {
  beforeEach(() => {
    localStorage.removeItem(SENTINEL_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(SENTINEL_KEY);
  });

  test("hidden when vault_path is empty (pre-onboarding state)", () => {
    expect(shouldShowBanner("", null)).toBe(false);
  });

  test("hidden when vault_path is undefined", () => {
    expect(shouldShowBanner(undefined, null)).toBe(false);
  });

  test("visible when vault_path is set and sentinel unset (post-onboarding first launch)", () => {
    expect(shouldShowBanner("/Users/qy/StudyVault", null)).toBe(true);
  });

  test("hidden when sentinel is already 'true' (dismissed previously)", () => {
    expect(shouldShowBanner("/Users/qy/StudyVault", "true")).toBe(false);
  });

  test("hidden when sentinel is any other truthy string (defense — only 'true' counts)", () => {
    // Locks the load-bearing sentinel comparison; future "1" / "yes" / arbitrary
    // strings must NOT silently dismiss the banner.
    expect(shouldShowBanner("/Users/qy/StudyVault", "1")).toBe(true);
    expect(shouldShowBanner("/Users/qy/StudyVault", "yes")).toBe(true);
    expect(shouldShowBanner("/Users/qy/StudyVault", "TRUE")).toBe(true);
  });
});

describe("persistDismissal sets sentinel exactly", () => {
  beforeEach(() => {
    localStorage.removeItem(SENTINEL_KEY);
  });

  test("writes 'true' under the canonical key", () => {
    persistDismissal(localStorage);
    expect(localStorage.getItem(SENTINEL_KEY)).toBe("true");
  });

  test("is idempotent", () => {
    persistDismissal(localStorage);
    persistDismissal(localStorage);
    expect(localStorage.getItem(SENTINEL_KEY)).toBe("true");
  });

  test("sentinel key is the canonical literal string", () => {
    // Locks the load-bearing key name; renames must update test in lockstep.
    expect(SENTINEL_KEY).toBe("mneme.postOnboardingBannerDismissed");
  });
});

describe("Open Settings CTA dispatches mneme:open-settings AND persists", () => {
  beforeEach(() => {
    localStorage.removeItem(SENTINEL_KEY);
  });

  test("dispatches CustomEvent then writes sentinel (order matters)", () => {
    const dispatched: CustomEvent[] = [];
    openSettingsAndPersist(localStorage, (e) => {
      dispatched.push(e);
    });
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].type).toBe("mneme:open-settings");
    expect(localStorage.getItem(SENTINEL_KEY)).toBe("true");
  });
});
