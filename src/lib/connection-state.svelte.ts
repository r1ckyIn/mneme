// src/lib/connection-state.svelte.ts — A-10 shared connection state for the titlebar.
//
// Phase 1 lifecycle (CR-02 2026-05-15 supersedes A-16 onMount transition):
//   - "disconnected" — module-default before mount; also flipped at the FIVE
//                      enumerated disconnect sites (onDestroy / cmd.on('error') /
//                      spawn-or-register catch / scratchDir no-op / cmd.on('close')
//                      WHEN !firstTextDeltaSeen [CR-01])
//   - "connected"    — flipped at onMount (app shell is up = infrastructure
//                      ready = mneme has nothing to "connect to" since it is
//                      a Tauri shell + claude CLI subprocess wrapper, not a
//                      WebSocket client). Re-asserted (idempotently) on first
//                      text_delta as defense-in-depth.
//   - "connecting"   — RETIRED at runtime; no code path sets this state in
//                      Phase 1. Kept in the type union for future use (e.g.
//                      explicit reconnection states if MCP / remote services
//                      get added in later phases).
//
// TitlebarMeta (Task 7) reads .status to render the dot color + label.
// ChatPanel (01-06) imports setStatus() and calls it at lifecycle transitions.
//
// Filename note: Svelte 5 requires `.svelte.ts` (or `.svelte.js`) for module-level
// `$state` rune to work across module boundaries reactively. A plain `.ts` would
// silently degrade to a non-reactive plain object, violating the Cycle-1 MEDIUM
// review carry-forward (A-10 connection state must be reactive). See
// https://svelte.dev/docs/svelte/$state#$state-in-module-scripts.
//
// Cycle-1 MEDIUM closure: this module exports a reactive $state singleton; consumers
// (TitlebarMeta + future ChatPanel) read connectionState.status and Svelte 5
// fine-grained tracking propagates updates without manual subscribe/unsubscribe.

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

// Module-level $state — reactive across the app. Mutating .status (via setStatus)
// triggers re-renders in any component that reads connectionState.status.
export const connectionState = $state<{ status: ConnectionStatus }>({
  status: "disconnected",
});

export function setStatus(status: ConnectionStatus): void {
  connectionState.status = status;
}
