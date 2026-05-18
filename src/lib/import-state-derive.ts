// src/lib/import-state-derive.ts — Phase 2 Plan 02-06 Task 1 pure derivation.
//
// PURE module — no Svelte runes, no Tauri IPC, no jsdom dependency. Lives in
// a plain `.ts` (NOT `.svelte.ts`) so Vitest can unit-test it on the Node fast
// path without mounting Svelte components.
//
// Maps to:
//   - SPEC REQ-13 (sync status surface — 4 pill states)
//   - UI-SPEC §8.5 (status pill 4-state copy contract — idle / importing / imported / error / cancelled)
//
// Architectural rationale (CYCLE-3 priority #4):
//   - The reactive singleton at `src/lib/import-state.svelte.ts` calls
//     `derivePillState(...)` whenever progress / history mutates so the
//     pill_state reflects truth-on-mutation.
//   - Plan 11 `ImportStatusPill.svelte` consumes `pill_state` directly — does
//     NOT call derive itself.
//   - Tests live in `tests/import-status-pill.test.ts` and execute this module
//     directly without Svelte mount.
//
// SSOT mirror (CYCLE-2 cluster #6):
//   `ImportFailure` + `ImportHistoryEntry` field names mirror the Rust
//   `ImportDoneEvent` (src-tauri/src/import_controller.rs — landed in Plan 02-05).
//   Field names use snake_case verbatim: operation_id, total, succeeded, failed,
//   cancelled, course, category, failures. `failures[].reason` (NOT `.message`)
//   matches Rust `ImportFailure.reason` SSOT.
//   When Rust ImportDoneEvent changes, this type MUST change in the same PR.

export interface ImportProgress {
  operation_id: string;
  current: number;
  total: number;
  last_file_name: string;
  last_file_status: "ok" | "error" | "cancelled" | "done";
  last_file_error: string | null;
}

// CYCLE-2 cluster #6 — `reason` (not `message`) mirrors Rust ImportFailure.reason.
export interface ImportFailure {
  path: string;
  reason: string;
}

export interface ImportHistoryEntry {
  operation_id: string;
  // Frontend-derived: Tauri ImportDoneEvent does NOT carry timestamp.
  // The listener in `import-state.svelte.ts` assigns `new Date().toISOString()`
  // at receipt time so the recency string in the pill is browser-clock-relative.
  timestamp_iso: string;
  total: number;
  succeeded: number;
  failed: number;
  cancelled: boolean;
  course: string | null;
  category: string;
  // CYCLE-2 cluster #6 — ALWAYS an array (Rust emits empty Vec on success).
  // ImportHistoryModal renders entries here as per-file failure rows.
  failures: ImportFailure[];
}

export type PillState =
  | { kind: "idle" }
  | { kind: "importing"; current: number; total: number }
  | { kind: "imported"; count: number; recency: string }
  | { kind: "partial"; succeeded: number; failed: number }
  | { kind: "cancelled"; succeeded: number; total: number };

// Per UI-SPEC §8.5 line 1029: pill hides (returns to idle) after >24h.
// 1 day in ms = 24 * 3600 * 1000 = 86_400_000.
const STALE_HISTORY_MS = 24 * 3600 * 1000;

/**
 * Derives the pill state from current progress + recent history.
 *
 * Priority:
 *  1. Active import (progress != null && last_file_status !== "done") wins.
 *  2. Latest history entry within the 24h freshness window drives the state.
 *  3. Otherwise idle.
 */
export function derivePillState(
  progress: ImportProgress | null,
  recent: ImportHistoryEntry[],
  now: Date,
): PillState {
  // Active import wins. Status "done" is treated as completion (history takes over).
  if (progress && progress.last_file_status !== "done") {
    return { kind: "importing", current: progress.current, total: progress.total };
  }

  const latest = recent[0];
  if (!latest) return { kind: "idle" };

  const age = now.getTime() - new Date(latest.timestamp_iso).getTime();
  if (age >= STALE_HISTORY_MS) return { kind: "idle" };

  if (latest.cancelled) {
    return { kind: "cancelled", succeeded: latest.succeeded, total: latest.total };
  }
  if (latest.failed > 0) {
    return { kind: "partial", succeeded: latest.succeeded, failed: latest.failed };
  }
  return {
    kind: "imported",
    count: latest.succeeded,
    recency: formatRecency(latest.timestamp_iso, now),
  };
}

/**
 * Maps a timestamp + reference `now` to a human-readable recency string.
 *
 * Buckets (UI-SPEC §8.5 lines 1026-1029):
 *  - `<60s`   -> `"just now"`
 *  - `<60m`   -> `"Nm ago"`
 *  - `<24h`   -> `"Nh ago"`
 *  - `>=24h`  -> `"Nd ago"` (the pill ITSELF hides at >=24h via derivePillState,
 *                            but this helper is still exercised for unit tests
 *                            and downstream consumers like ImportHistoryModal)
 *
 * Boundary contract: strict `<` per cycle-2 LOW (boundary unified across
 * interface, implementation, and test cases).
 */
export function formatRecency(timestampIso: string, now: Date): string {
  const ageSeconds = Math.floor((now.getTime() - new Date(timestampIso).getTime()) / 1000);
  if (ageSeconds < 60) return "just now";

  const ageMinutes = Math.floor(ageSeconds / 60);
  if (ageMinutes < 60) return `${ageMinutes}m ago`;

  const ageHours = Math.floor(ageMinutes / 60);
  if (ageHours < 24) return `${ageHours}h ago`;

  const ageDays = Math.floor(ageHours / 24);
  return `${ageDays}d ago`;
}
