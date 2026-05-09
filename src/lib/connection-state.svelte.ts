// src/lib/connection-state.svelte.ts — A-10 shared connection state for the titlebar.
//
// Phase 1 lifecycle:
//   - "disconnected" — initial state on app launch (no subprocess yet, or after exit)
//   - "connecting"   — flipped by ChatPanel (01-06) when sendPrompt() is called and
//                      the spawn is in flight; cleared on first stream_event/text_delta
//   - "connected"    — flipped on first stream_event/text_delta; held until
//                      cmd.on("close") fires
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
