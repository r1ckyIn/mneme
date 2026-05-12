// src/lib/dev/snapshot-selectors.ts — D-DS-01 selector set for
// __mnemeDevSnapshot__ computed-style harvesting.
//
// SSOT for KD-13 visual identity selectors. Phase 01.1 initial set inherits
// the prototype surface from Mneme.html (Phase 1). Add new selectors when new
// KD-13 design tokens are bound to DOM (e.g., new component types).
//
// NON-NEGOTIABLE: keep zero runtime cost — this is a static const consumed
// by forwarder's snapshot builder, NOT a function that walks the DOM at
// import time. The dev-only forwarder iterates this list inside
// __mnemeDevSnapshot__() to harvest computed styles for each selector.
//
// Selector list rationale (Phase 01.1):
//   - .chat-input / .chat-input::placeholder — primary input affordance;
//     KD-13 typography + placeholder color tokens.
//   - .tool-card — block-level surface that exercises radius + border tokens.
//   - .cost-meter — token-bound numeric indicator (color shifts with budget).
//   - [data-pane="left|middle|right"] — three-pane layout containers;
//     verifies grid/flex tokens + per-pane padding.
//   - .bottom-row — Phase-1 mind-map placeholder bar; verifies row height token.
//   - .titlebar — Tauri window-chrome shell; verifies overlay tokens.
//   - .send-stop-button / .send-stop-button:active — primary action; KD-13
//     active-scale 0.96 (D-22 Phase 1 ratified invariant).
//   - .dropdown-pill — accent pill style; verifies pill radius + accent color.

export const SNAPSHOT_SELECTORS = [
  ".chat-input",
  ".chat-input::placeholder",
  ".tool-card",
  ".cost-meter",
  '[data-pane="left"]',
  '[data-pane="middle"]',
  '[data-pane="right"]',
  ".bottom-row",
  ".titlebar",
  ".send-stop-button",
  ".dropdown-pill",
  // Phase 1 D-22 KD-13 invariants (Active scale + form-isolation contract)
  ".send-stop-button:active", // verifies KD-13 active-scale 0.96 (D-22 Phase 1)
] as const;

export type SnapshotSelector = (typeof SNAPSHOT_SELECTORS)[number];
