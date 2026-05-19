// src/lib/import-state.svelte.ts — Phase 2 D-15 reactive singleton.
//
// .svelte.ts SUFFIX IS MANDATORY for module-scope $state per Phase 1
// connection-state.svelte.ts pattern. A plain `.ts` would silently degrade
// to a non-reactive plain object (Svelte 5 only wires the rune in `.svelte`
// and `.svelte.{ts,js}` files). See
// https://svelte.dev/docs/svelte/$state#$state-in-module-scripts.
//
// Maps to:
//   - SPEC REQ-13 (status pill + recent-20 modal — single source of truth)
//   - UI-SPEC §8.5 (pill state derived via derivePillState from $lib/import-state-derive)
//   - 02-CONTEXT.md D-15 (reactive singleton pattern follows Phase 1 connection-state shape)
//
// Architecture:
//   - One module-scope `$state` object owned exclusively by this file.
//   - Exported setters (`setProgress`, `recordHistory`) mutate the object;
//     readers obtain the live reference via `getImportState()` and rely on
//     Svelte 5 fine-grained tracking for reactivity.
//   - `installImportListeners()` is HMR-safe via an `installed` flag (a plain
//     `.ts` reload would lose the flag, but Svelte 5 module-scope state IS
//     preserved across HMR boundaries — verified in Phase 1 connection-state).
//   - `pill_state` is RECOMPUTED on every mutation via `derivePillState` so
//     downstream `ImportStatusPill.svelte` reads a derived rather than raw shape.

import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  derivePillState,
  type ImportProgress,
  type ImportHistoryEntry,
  type PillState,
} from "$lib/import-state-derive";

interface ImportStateShape {
  current_op_id: string | null;
  progress: ImportProgress | null;
  recent_20: ImportHistoryEntry[];
  pill_state: PillState;
}

// Module-scope $state — reactive across the app. Consumers obtain the live
// reference via getImportState() and let Svelte 5 fine-grained tracking
// propagate changes.
const state = $state<ImportStateShape>({
  current_op_id: null,
  progress: null,
  recent_20: [],
  pill_state: { kind: "idle" },
});

const MAX_HISTORY = 20;
let installed = false;
let unlisteners: UnlistenFn[] = [];

export function getImportState(): ImportStateShape {
  return state;
}

/**
 * Prepends `entry` to recent_20, drops the oldest if length exceeds 20,
 * clears active progress, recomputes pill_state.
 *
 * Called by the `import:done` listener AND by Vitest tests that synthesize
 * history without going through the Tauri event bus.
 */
export function recordHistory(entry: ImportHistoryEntry): void {
  state.recent_20 = [entry, ...state.recent_20].slice(0, MAX_HISTORY);
  state.progress = null;
  state.current_op_id = null;
  state.pill_state = derivePillState(state.progress, state.recent_20, new Date());
}

/** Recomputes pill_state from the current progress + recent_20. */
export function refreshPillState(now: Date = new Date()): void {
  state.pill_state = derivePillState(state.progress, state.recent_20, now);
}

/**
 * Updates the active-progress slice. Called by the `import:progress` listener.
 * Passing `null` clears progress without touching recent_20.
 */
export function setProgress(p: ImportProgress | null): void {
  state.progress = p;
  if (p) state.current_op_id = p.operation_id;
  refreshPillState();
}

/**
 * Subscribes to `import:progress` + `import:done` Tauri events.
 *
 * IDEMPOTENT (cycle-2 MEDIUM contract — cycle-3 cluster 2 test pin):
 * calling this twice MUST NOT double-subscribe. The `installed` flag short-
 * circuits the second call. `uninstallImportListeners()` clears the flag so
 * test setup can re-install with a fresh mock.
 */
export async function installImportListeners(): Promise<void> {
  if (installed) return;
  installed = true;

  const u1 = await listen<ImportProgress>("import:progress", (event) => {
    setProgress(event.payload);
  });

  // CYCLE-2 cluster #6 — inline type mirrors Rust ImportDoneEvent SSOT verbatim
  // (src-tauri/src/import_controller.rs — landed in Plan 02-05). When the Rust
  // shape changes, this listener AND the ImportHistoryEntry interface in
  // $lib/import-state-derive MUST change in the same PR.
  //
  // `failures[].reason` (NOT `.message`) matches Rust `ImportFailure.reason`.
  type ImportDoneEventPayload = {
    operation_id: string;
    total: number;
    succeeded: number;
    failed: number;
    cancelled: boolean;
    course: string | null;
    category: string;
    failures: { path: string; reason: string }[];
  };
  const u2 = await listen<ImportDoneEventPayload>("import:done", (event) => {
    recordHistory({
      operation_id: event.payload.operation_id,
      // Tauri ImportDoneEvent does NOT carry timestamp — assign on receipt.
      timestamp_iso: new Date().toISOString(),
      total: event.payload.total,
      succeeded: event.payload.succeeded,
      failed: event.payload.failed,
      cancelled: event.payload.cancelled,
      course: event.payload.course,
      category: event.payload.category,
      failures: event.payload.failures,
    });
  });

  unlisteners.push(u1, u2);
}

export function uninstallImportListeners(): void {
  unlisteners.forEach((u) => u());
  unlisteners = [];
  installed = false;
}

/**
 * Test-only — resets the singleton state. Phase 1 convention uses a
 * `_ForTest` suffix rather than re-importing the module so the shared
 * $state reference stays stable.
 */
export function resetImportStateForTest(): void {
  state.current_op_id = null;
  state.progress = null;
  state.recent_20 = [];
  state.pill_state = { kind: "idle" };
  uninstallImportListeners();
}
