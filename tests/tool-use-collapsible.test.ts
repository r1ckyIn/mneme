// tests/tool-use-collapsible.test.ts — Round 5 A-14 dedicated test for the
// ToolUseGroup state machine + the gerund/past-tense header derivation
// helpers that 01-06's render layer will consume.
//
// Why a separate file (not folded into stream-dispatch.test.ts):
// the A-14 contract is that the render layer (01-06 ChatPanel) emits
// <details open> during streaming and <details> (collapsed) after result.
// This test pins the *data shape* the render layer reads — exposing it
// as a standalone file makes the contract reviewable without scrolling
// through the broader 6-arm dispatch fixture.

import { describe, expect, it } from "vitest";
import {
  dispatchEvent,
  freshState,
  gerundHeader,
  pastTenseHeader,
  type ToolUseGroup,
} from "../src/lib/stream-dispatch";

describe("A-14 ToolUseGroup state machine", () => {
  it("opens on first tool_use; toolUses entries land with completed=false", () => {
    const state = freshState();
    dispatchEvent(
      { type: "assistant", message: { id: "m1", role: "assistant", content: [
        { type: "tool_use", id: "tu1", name: "Bash", input: { command: "ls" } },
      ] } } as any,
      state
    );
    dispatchEvent(
      { type: "assistant", message: { id: "m2", role: "assistant", content: [
        { type: "tool_use", id: "tu2", name: "Read", input: { file_path: "/x" } },
      ] } } as any,
      state
    );
    expect(state.toolUseGroup.open).toBe(true);
    expect(state.toolUseGroup.toolUses).toHaveLength(2);
    expect(state.toolUseGroup.toolUses.every((t) => !t.completed)).toBe(true);
  });

  it("flips matching tool_use entry completed=true on tool_result", () => {
    const state = freshState();
    dispatchEvent(
      { type: "assistant", message: { id: "m1", role: "assistant", content: [
        { type: "tool_use", id: "tu1", name: "Bash", input: { command: "ls" } },
        { type: "tool_use", id: "tu2", name: "Read", input: { file_path: "/x" } },
      ] } } as any,
      state
    );
    dispatchEvent(
      { type: "user", message: { role: "user", content: [
        { type: "tool_result", tool_use_id: "tu1", content: "ok" },
        { type: "tool_result", tool_use_id: "tu2", content: "file" },
      ] } } as any,
      state
    );
    expect(state.toolUseGroup.toolUses[0].completed).toBe(true);
    expect(state.toolUseGroup.toolUses[1].completed).toBe(true);
    // Group still open — only `result` collapses.
    expect(state.toolUseGroup.open).toBe(true);
  });

  it("collapses on result event; toolUses preserved", () => {
    const state = freshState();
    dispatchEvent(
      { type: "assistant", message: { id: "m1", role: "assistant", content: [
        { type: "tool_use", id: "tu1", name: "Bash", input: { command: "ls" } },
        { type: "tool_use", id: "tu2", name: "Read", input: { file_path: "/x" } },
      ] } } as any,
      state
    );
    dispatchEvent(
      { type: "user", message: { role: "user", content: [
        { type: "tool_result", tool_use_id: "tu1", content: "ok" },
        { type: "tool_result", tool_use_id: "tu2", content: "file" },
      ] } } as any,
      state
    );
    dispatchEvent(
      { type: "result", subtype: "success", total_cost_usd: 0.01, usage: { input_tokens: 100 } } as any,
      state
    );
    expect(state.toolUseGroup.open).toBe(false);
    expect(state.toolUseGroup.toolUses).toHaveLength(2);
  });

  it("freshState toolUseGroup is closed + empty", () => {
    const g = freshState().toolUseGroup;
    expect(g.open).toBe(false);
    expect(g.toolUses).toEqual([]);
  });
});

describe("A-14 header derivation (render-layer helpers)", () => {
  it("gerundHeader for 1 Bash + 1 Read renders gerund-form", () => {
    const group: ToolUseGroup = {
      open: true,
      toolUses: [
        { id: "tu1", name: "Bash", inputPreview: "{}", completed: false },
        { id: "tu2", name: "Read", inputPreview: "{}", completed: false },
      ],
    };
    const text = gerundHeader(group);
    // Acceptable shapes: "Running 1 command, reading a file…" OR
    // "Running 2 tools…". We pin the gerund-form root and ellipsis.
    expect(text.toLowerCase()).toMatch(/(running|reading)/);
    expect(text).toContain("…");
  });

  it("pastTenseHeader for same group renders past-tense", () => {
    const group: ToolUseGroup = {
      open: false,
      toolUses: [
        { id: "tu1", name: "Bash", inputPreview: "{}", completed: true },
        { id: "tu2", name: "Read", inputPreview: "{}", completed: true },
      ],
    };
    const text = pastTenseHeader(group);
    // Past-tense form — "Ran 2 commands, read a file" or "Ran 2 tools".
    expect(text.toLowerCase()).toMatch(/(ran|read)/);
    expect(text).not.toContain("…");
  });

  it("gerundHeader returns empty string for empty group (render layer skips <details>)", () => {
    const empty: ToolUseGroup = { open: false, toolUses: [] };
    expect(gerundHeader(empty)).toBe("");
    expect(pastTenseHeader(empty)).toBe("");
  });
});

// === Round 5 cycle-1 carry-forward MEDIUM (REVIEWS.md): ToolUseGroup state leak ===
//
// The reviewer flagged that opportunistic-absorption work in 01-03 should
// ensure no global / module-level state leaks across distinct dispatch
// passes. The contract is enforced by `freshState()` returning a brand-new
// object each call — the dispatch never reads or writes any module-level
// store. This test pins that contract by deliberately reusing the helper
// across two distinct streams and asserting no group bleed.
describe("A-14 no-state-leak (cycle-1 carry-forward MEDIUM)", () => {
  it("two distinct freshState instances do not share toolUseGroup state", () => {
    const stateA = freshState();
    const stateB = freshState();
    dispatchEvent(
      { type: "assistant", message: { id: "ma", role: "assistant", content: [
        { type: "tool_use", id: "tuA", name: "Bash", input: {} },
      ] } } as any,
      stateA
    );
    // stateA opened; stateB must remain closed
    expect(stateA.toolUseGroup.open).toBe(true);
    expect(stateA.toolUseGroup.toolUses).toHaveLength(1);
    expect(stateB.toolUseGroup.open).toBe(false);
    expect(stateB.toolUseGroup.toolUses).toHaveLength(0);

    // Mutate stateB independently
    dispatchEvent(
      { type: "assistant", message: { id: "mb", role: "assistant", content: [
        { type: "tool_use", id: "tuB1", name: "Read", input: {} },
        { type: "tool_use", id: "tuB2", name: "Read", input: {} },
      ] } } as any,
      stateB
    );
    expect(stateB.toolUseGroup.toolUses).toHaveLength(2);

    // stateA still has only its own one entry
    expect(stateA.toolUseGroup.toolUses).toHaveLength(1);
    expect(stateA.toolUseGroup.toolUses[0].id).toBe("tuA");
  });

  it("collapsing one stream does not collapse a sibling stream", () => {
    const sA = freshState();
    const sB = freshState();
    // Open both
    dispatchEvent(
      { type: "assistant", message: { content: [{ type: "tool_use", id: "x", name: "Bash", input: {} }] } } as any,
      sA
    );
    dispatchEvent(
      { type: "assistant", message: { content: [{ type: "tool_use", id: "y", name: "Read", input: {} }] } } as any,
      sB
    );
    expect(sA.toolUseGroup.open).toBe(true);
    expect(sB.toolUseGroup.open).toBe(true);
    // Collapse only sA
    dispatchEvent(
      { type: "result", subtype: "success", total_cost_usd: 0.01, usage: { input_tokens: 1 } } as any,
      sA
    );
    expect(sA.toolUseGroup.open).toBe(false);
    // sB must remain open — no shared state
    expect(sB.toolUseGroup.open).toBe(true);
  });
});
