// tests/import-status-pill.test.ts — Phase 2 Wave 1 (Plan 02-06) Task 1 RED→GREEN.
//
// Maps to: SPEC REQ-13 (status pill states) + UI-SPEC §8.5 (4-state pill copy).
// Tests the PURE derivation in `src/lib/import-state-derive.ts` — no Svelte runes,
// no jsdom mount ceremony. Runs on the Node fast path.
//
// Cycle-2 cluster #6: ImportHistoryEntry.failures[].reason mirrors Rust ImportFailure SSOT
// (src-tauri/src/import_controller.rs ImportDoneEvent). Field name `reason` NOT `message`.

import { describe, test, expect } from "vitest";
import {
  derivePillState,
  formatRecency,
  type ImportProgress,
  type ImportHistoryEntry,
} from "../src/lib/import-state-derive";

const now = new Date("2026-05-15T12:00:00Z");

function mkProgress(
  current: number,
  total: number,
  status: ImportProgress["last_file_status"],
): ImportProgress {
  return {
    operation_id: "op-1",
    current,
    total,
    last_file_name: `file${current}.pdf`,
    last_file_status: status,
    last_file_error: null,
  };
}

function mkHistory(opts: Partial<ImportHistoryEntry>): ImportHistoryEntry {
  return {
    operation_id: opts.operation_id ?? "op-1",
    timestamp_iso: opts.timestamp_iso ?? now.toISOString(),
    total: opts.total ?? 0,
    succeeded: opts.succeeded ?? 0,
    failed: opts.failed ?? 0,
    cancelled: opts.cancelled ?? false,
    course: opts.course ?? null,
    category: opts.category ?? "_inbox",
    failures: opts.failures ?? [],
  };
}

describe("derivePillState", () => {
  test("idle when no progress and empty history", () => {
    expect(derivePillState(null, [], now)).toEqual({ kind: "idle" });
  });

  test("importing during active operation", () => {
    const p = mkProgress(2, 5, "ok");
    expect(derivePillState(p, [], now)).toEqual({ kind: "importing", current: 2, total: 5 });
  });

  test("imported state with just-now recency", () => {
    const recent = [mkHistory({ succeeded: 3, total: 3, timestamp_iso: now.toISOString() })];
    expect(derivePillState(null, recent, now)).toEqual({
      kind: "imported",
      count: 3,
      recency: "just now",
    });
  });

  test("partial state when failed > 0", () => {
    const recent = [mkHistory({ succeeded: 2, failed: 1, total: 3 })];
    expect(derivePillState(null, recent, now)).toEqual({
      kind: "partial",
      succeeded: 2,
      failed: 1,
    });
  });

  test("cancelled state preserves N-of-M", () => {
    const recent = [mkHistory({ succeeded: 2, total: 5, cancelled: true })];
    expect(derivePillState(null, recent, now)).toEqual({
      kind: "cancelled",
      succeeded: 2,
      total: 5,
    });
  });

  test("returns idle when latest history is too old (>1d) to display", () => {
    const oldTs = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
    const recent = [mkHistory({ succeeded: 5, total: 5, timestamp_iso: oldTs })];
    // Stale-history grace: pill returns to idle to avoid stale "imported 5 · 7d ago" clutter.
    expect(derivePillState(null, recent, now)).toEqual({ kind: "idle" });
  });
});

describe("formatRecency", () => {
  test("just now for <60s (STRICT - cycle-2 LOW boundary fix)", () => {
    const ts = new Date(now.getTime() - 30 * 1000).toISOString();
    expect(formatRecency(ts, now)).toBe("just now");
  });

  test("Nm ago for sub-hour", () => {
    const ts = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    expect(formatRecency(ts, now)).toBe("5m ago");
  });

  test("Nh ago for sub-day", () => {
    const ts = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
    expect(formatRecency(ts, now)).toBe("2h ago");
  });

  test("Nd ago for >=day", () => {
    const ts = new Date(now.getTime() - 86400 * 1000).toISOString();
    expect(formatRecency(ts, now)).toBe("1d ago");
  });
});
