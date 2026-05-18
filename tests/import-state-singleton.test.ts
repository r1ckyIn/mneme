// tests/import-state-singleton.test.ts — Phase 2 Wave 1 (Plan 02-06) Task 2 RED→GREEN.
//
// Maps to: SPEC REQ-13 (import-state singleton + recordHistory + courseCount + listener idempotence).
// Cycle-3 iter-1 BLK-2: split out of import-error-surface.test.ts; this file's owner is 02-06 wave 1 only.
//
// Test strategy:
//   - `import-state.svelte.ts` + `vault-state.svelte.ts` are Svelte 5 module-scope
//     `$state` reactive singletons. Mutations go through exported setters, and
//     reads return the live $state object — Vitest verifies state.recent_20[0]
//     after each setter call.
//   - `installImportListeners()` calls `listen(...)` from @tauri-apps/api/event.
//     We mock that module so we can count subscription calls and assert that
//     calling install twice does NOT double-subscribe.

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

// Pin the wall clock so the 24h freshness window in derivePillState stays
// deterministic. Without this, tests using a fixed timestamp_iso pass on the
// day they were authored and fail the next calendar day.
const FROZEN_NOW = new Date("2026-05-15T12:01:00Z");

// Mock @tauri-apps/api/event BEFORE importing the singleton module so the
// in-module `listen` reference is the spy. Each test resets the call list.
const listenSpy = vi.fn(async (_eventName: string, _handler: unknown) => {
  // Return a no-op unlisten function.
  return async () => {};
});
vi.mock("@tauri-apps/api/event", () => ({
  listen: listenSpy,
}));

describe("import history error surfacing", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_NOW);
    listenSpy.mockClear();
    const { resetImportStateForTest } = await import("../src/lib/import-state.svelte");
    resetImportStateForTest();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("recordHistory makes failures visible in recent_20[0]", async () => {
    const { recordHistory, getImportState } = await import("../src/lib/import-state.svelte");
    recordHistory({
      operation_id: "op-1",
      timestamp_iso: "2026-05-15T12:00:00Z",
      total: 3,
      succeeded: 2,
      failed: 1,
      cancelled: false,
      course: "COMP3221",
      category: "lectures",
      // CYCLE-2 cluster #6 — field is `reason` (matches Rust ImportFailure SSOT) not `message`.
      failures: [
        { path: "/v/courses/COMP3221/_source/lectures/bad.pdf", reason: "write: permission denied" },
      ],
    });
    const s = getImportState();
    expect(s.recent_20).toHaveLength(1);
    expect(s.recent_20[0].failures).toHaveLength(1);
    expect(s.recent_20[0].failures[0].reason).toBe("write: permission denied");
    // Pill is now in partial state.
    expect(s.pill_state.kind).toBe("partial");
  });

  test("recent_20 FIFO drops oldest after 20 entries", async () => {
    const { recordHistory, getImportState } = await import("../src/lib/import-state.svelte");
    for (let i = 0; i < 21; i++) {
      recordHistory({
        operation_id: `op-${i}`,
        timestamp_iso: new Date().toISOString(),
        total: 1,
        succeeded: 1,
        failed: 0,
        cancelled: false,
        course: null,
        category: "_inbox",
        failures: [],
      });
    }
    const s = getImportState();
    expect(s.recent_20).toHaveLength(20);
    // Oldest (op-0) is gone; latest (op-20) at front.
    expect(s.recent_20[0].operation_id).toBe("op-20");
    expect(s.recent_20.find((e) => e.operation_id === "op-0")).toBeUndefined();
  });
});

describe("vault-state singleton", () => {
  beforeEach(async () => {
    const { resetVaultStateForTest } = await import("../src/lib/vault-state.svelte");
    resetVaultStateForTest();
  });

  test("setCourseList sorts alphabetically and getVaultState reflects order", async () => {
    const { setCourseList, getVaultState } = await import("../src/lib/vault-state.svelte");
    setCourseList(["INFO1110", "COMP3221", "MATH1062"]);
    const s = getVaultState();
    expect(s.course_list).toEqual(["COMP3221", "INFO1110", "MATH1062"]);
  });

  test("setVaultPath updates state.vault_path", async () => {
    const { setVaultPath, getVaultState } = await import("../src/lib/vault-state.svelte");
    setVaultPath("/Users/qy/StudyVault");
    expect(getVaultState().vault_path).toBe("/Users/qy/StudyVault");
  });

  test("courseCount reflects course_list length (CYCLE-3 cluster 2 — cycle-2 MEDIUM)", async () => {
    // cycle-2 MEDIUM: courseCount was a must-have but no test exercised it.
    const { courseCount, setCourseList } = await import("../src/lib/vault-state.svelte");
    setCourseList([]);
    expect(courseCount()).toBe(0);
    setCourseList(["COMP3221", "INFO1110", "MATH1062"]);
    expect(courseCount()).toBe(3);
  });
});

describe("installImportListeners idempotence (CYCLE-3 cluster 2 — cycle-2 MEDIUM)", () => {
  // CYCLE-2 MEDIUM: behavior requires idempotent install, but no test mocked
  // listen() or called installImportListeners() twice. Cycle-3 adds the contract pin.
  test("calling installImportListeners twice does NOT double-subscribe", async () => {
    const { installImportListeners, uninstallImportListeners } = await import(
      "../src/lib/import-state.svelte"
    );
    // Clear any prior listener-install bookkeeping from previous tests.
    uninstallImportListeners();
    listenSpy.mockClear();

    await installImportListeners();
    await installImportListeners();

    const eventNames = listenSpy.mock.calls.map((c) => c[0]);
    const progressInstalls = eventNames.filter((n) => n === "import:progress").length;
    const doneInstalls = eventNames.filter((n) => n === "import:done").length;
    expect(progressInstalls).toBe(1);
    expect(doneInstalls).toBe(1);
  });
});
