// src/lib/motion.test.ts — Phase 02.1 02.1-08 (W2 fix) helper contract.
//
// Pins the 4-case contract for `prefersReducedMotion()` so a future refactor
// of the SSR guard or matchMedia probe visibly breaks the suite. Vitest is
// jsdom-environment by default (vitest.config.ts), which provides a real
// `window` object — tests 1, 2, and 4 mutate the live window.matchMedia
// reference; test 3 simulates SSR via `vi.stubGlobal("window", undefined)`.
//
// Why each test exists:
//   - Test 1 pins the happy-path "user has Reduce Motion enabled in System
//     Settings" branch.
//   - Test 2 pins the inverse "user has motion enabled" branch — guards
//     against an inverted-boolean regression in the matchMedia query.
//   - Test 3 pins the SSR contract — SvelteKit prerender pass runs in Node
//     where `typeof window === "undefined"` MUST be safely handled (no
//     ReferenceError surfacing through +layout.ts ssr=false but prerender=true).
//   - Test 4 pins the defensive guard — older WebKit / stripped jsdom may
//     have window without matchMedia; returning false matches the
//     desktop default (motion enabled) rather than throwing.

import {
  describe,
  test,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import { prefersReducedMotion } from "./motion";

type MatchMediaFn = typeof window.matchMedia;

describe("prefersReducedMotion — W2 fix helper contract (4 cases)", () => {
  let originalMatchMedia: MatchMediaFn | undefined;

  beforeEach(() => {
    // Capture the live window.matchMedia (jsdom may provide a stub or none).
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    // Order matters: unstub `window` itself FIRST (test 3 sets it to
    // undefined via vi.stubGlobal) so the matchMedia restore below has a
    // real window object to write into.
    vi.unstubAllGlobals();
    if (typeof window !== "undefined" && originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    }
  });

  test("returns true when matchMedia reports matches=true (Reduce Motion ON)", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as MatchMediaFn;

    expect(prefersReducedMotion()).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith(
      "(prefers-reduced-motion: reduce)",
    );
  });

  test("returns false when matchMedia reports matches=false (Reduce Motion OFF)", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as MatchMediaFn;

    expect(prefersReducedMotion()).toBe(false);
  });

  test("returns false when window is undefined (SSR / prerender simulation)", () => {
    // Simulate SvelteKit prerender pass — `typeof window === "undefined"`.
    // vi.stubGlobal replaces the global binding for the duration of the test;
    // afterEach's vi.unstubAllGlobals() restores it.
    vi.stubGlobal("window", undefined);

    expect(prefersReducedMotion()).toBe(false);
  });

  test("returns false when matchMedia is missing from window (defensive)", () => {
    // Defensive guard: older WebKit / stripped jsdom may have window without
    // matchMedia. Removing the property exercises the second typeof guard
    // in motion.ts. Using a typed cast avoids any-cast lint while still
    // letting us delete the optional property.
    (
      window as unknown as { matchMedia?: MatchMediaFn }
    ).matchMedia = undefined;

    expect(prefersReducedMotion()).toBe(false);
  });
});
