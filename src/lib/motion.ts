// src/lib/motion.ts — Phase 02.1 02.1-08 (W2 fix) shared motion helper.
//
// W2 fix root cause (UI-REVIEW.md L73): UI-SPEC §8.1 promised step-swap
// motion (`opacity 0→1 + translateY(8px)→0` over 220ms, with reduced-motion
// fallback to opacity-only). The Onboarding implementation hard-cut between
// steps. This module exports a single SSR-safe `prefersReducedMotion()`
// shim consumed by Onboarding.svelte (and future Phase 2.1+ surfaces like
// SettingsPanel modal / ImportDialog — UI-SPEC §8.2 INFO, backlog).
//
// Why a shared helper (not inline in Onboarding.svelte):
//   - Reusable for SettingsPanel open / modal mount animations.
//   - Single SSR guard implementation — typeof window === "undefined" is the
//     contract that protects SvelteKit prerender (+layout.ts ssr=false but
//     prerender=true; the prerender pass runs in Node where window is absent).
//   - KP-02 zero-add: no new npm dep; svelte/transition + svelte/easing are
//     built-in and tree-shaken.
//
// Test contract (pinned by src/lib/motion.test.ts — 4 cases):
//   1. matchMedia reports matches=true  → returns true
//   2. matchMedia reports matches=false → returns false
//   3. typeof window === "undefined" (SSR) → returns false (no throw)
//   4. window present but matchMedia missing → returns false (no throw)

/**
 * Returns true if the OS-level `prefers-reduced-motion: reduce` media query
 * matches, false otherwise. SSR-safe: returns false when `window` is
 * undefined (SvelteKit prerender pass) or when `window.matchMedia` is
 * unavailable (defensive — older WebKit or jsdom without matchMedia shim).
 *
 * Consumers (Onboarding.svelte step body):
 *   transition:fly={{
 *     y: prefersReducedMotion() ? 0 : 8,
 *     duration: 220,
 *     easing: quintOut,
 *     opacity: 0,
 *   }}
 *
 * The function is called per-transition (NOT memoized) so a runtime OS
 * setting change (user toggles Reduce Motion in System Settings) is picked
 * up on the next render without an app reload. Cost is negligible
 * (matchMedia returns a cached MediaQueryList).
 */
export function prefersReducedMotion(): boolean {
  // Guard 1: SSR / prerender pass — no window object exists in Node.
  if (typeof window === "undefined") return false;
  // Guard 2: defensive — window.matchMedia may be absent in stripped-down
  // jsdom configurations or very old WebKit forks. Returning false matches
  // the desktop default (motion enabled).
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
