// tests/stream-dispatch.test.ts — 6-arm router contract + A-14 toolUseGroup
// state machine + A-09 totalInputTokens accumulator. Replays the NDJSON
// fixture from Task 2 to assert end-state matches the spike-002 dispatch
// taxonomy.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { dispatchEvent, freshState } from "../src/lib/stream-dispatch";

describe("dispatchEvent — 6-arm router", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("freshState() initializes A-09 + A-14 fields", () => {
    const state = freshState();
    expect(state.totalInputTokens).toBe(0);
    expect(state.toolUseGroup.open).toBe(false);
    expect(state.toolUseGroup.toolUses).toEqual([]);
    expect(state.resultReceived).toBe(false);
    expect(state.messages).toEqual([]);
    expect(state.isStreaming).toBe(false);
  });

  it("system init: logs to console; no UI message", () => {
    const state = freshState();
    dispatchEvent(
      { type: "system", subtype: "init", session_id: "sess_abc", model: "claude-sonnet-4.5", cwd: "/tmp" } as any,
      state
    );
    expect(state.messages).toHaveLength(0);
    expect(logSpy).toHaveBeenCalled();
  });

  it("system error: appends system bubble with escaped text", () => {
    const state = freshState();
    dispatchEvent(
      { type: "system", subtype: "error", message: "<oh no>" } as any,
      state
    );
    const sysMsgs = state.messages.filter((m) => m.role === "system");
    expect(sysMsgs).toHaveLength(1);
    expect(sysMsgs[0].text).toContain("&lt;oh no&gt;");
  });

  it("3 consecutive stream_event text_deltas concatenate into ONE assistant msg", () => {
    const state = freshState();
    const deltas = ["Hello", " world", "."];
    for (const t of deltas) {
      dispatchEvent(
        { type: "stream_event", event: { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: t } } } as any,
        state
      );
    }
    const asst = state.messages.filter((m) => m.role === "assistant");
    expect(asst).toHaveLength(1);
    expect(asst[0].text).toBe("Hello world.");
    expect(asst[0].streaming).toBe(true);
  });

  it("assistant event with text block — SKIPS (no double-render)", () => {
    const state = freshState();
    dispatchEvent(
      { type: "stream_event", event: { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Hi" } } } as any,
      state
    );
    const before = state.messages.length;
    dispatchEvent(
      { type: "assistant", message: { id: "msg_x", role: "assistant", content: [{ type: "text", text: "Hi" }] } } as any,
      state
    );
    expect(state.messages.length).toBe(before);
    const asst = state.messages.filter((m) => m.role === "assistant");
    expect(asst[0].text).toBe("Hi");
  });

  it("assistant tool_use block: pushes tool msg + opens A-14 toolUseGroup", () => {
    const state = freshState();
    const longInput = { file_path: "/Users/qinyuan/.mneme/scratch/very-long-file-name-".padEnd(500, "x") };
    dispatchEvent(
      { type: "assistant", message: { id: "msg_y", role: "assistant", content: [{ type: "tool_use", id: "toolu_001", name: "Read", input: longInput }] } } as any,
      state
    );
    const toolMsgs = state.messages.filter((m) => m.role === "tool");
    expect(toolMsgs).toHaveLength(1);
    expect(toolMsgs[0].toolName).toBe("Read");
    expect(toolMsgs[0].toolInputPreview).toBeDefined();
    expect((toolMsgs[0].toolInputPreview as string).length).toBeLessThanOrEqual(200);
    // A-14 collapsible state
    expect(state.toolUseGroup.open).toBe(true);
    expect(state.toolUseGroup.toolUses).toHaveLength(1);
    expect(state.toolUseGroup.toolUses[0].name).toBe("Read");
    expect(state.toolUseGroup.toolUses[0].completed).toBe(false);
  });

  it("assistant thinking block: marks msg thinking=true; signature never leaks", () => {
    const state = freshState();
    dispatchEvent(
      { type: "stream_event", event: { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "x" } } } as any,
      state
    );
    dispatchEvent(
      { type: "assistant", message: { id: "msg_z", role: "assistant", content: [{ type: "thinking", thinking: "REDACTED", signature: "SECRETSIG_BASE64_DO_NOT_LEAK" }] } } as any,
      state
    );
    const asst = state.messages.find((m) => m.role === "assistant");
    expect(asst?.thinking).toBe(true);
    const allText = JSON.stringify(state);
    expect(allText).not.toContain("SECRETSIG_BASE64_DO_NOT_LEAK");
  });

  it("user tool_result: pushes tool-result msg + flips matching A-14 entry completed=true", () => {
    const state = freshState();
    // First push a tool_use so there is an entry to match
    dispatchEvent(
      { type: "assistant", message: { id: "msg_t", role: "assistant", content: [{ type: "tool_use", id: "toolu_001", name: "Read", input: {} }] } } as any,
      state
    );
    expect(state.toolUseGroup.toolUses[0].completed).toBe(false);
    dispatchEvent(
      { type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu_001", content: "file contents" }] } } as any,
      state
    );
    expect(state.messages.some((m) => m.role === "tool")).toBe(true);
    expect(state.toolUseGroup.toolUses[0].completed).toBe(true);
  });

  it("rate_limit_event: console.log only; no UI message", () => {
    const state = freshState();
    dispatchEvent({ type: "rate_limit_event", subtype: "snapshot", remaining: 42 } as any, state);
    expect(state.messages).toHaveLength(0);
    expect(logSpy).toHaveBeenCalled();
  });

  it("result event: sets resultReceived, captures totalCostUsd + totalInputTokens, collapses A-14, marks assistant streaming=false", () => {
    const state = freshState();
    dispatchEvent(
      { type: "stream_event", event: { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "x" } } } as any,
      state
    );
    // Open the A-14 group via a tool_use
    dispatchEvent(
      { type: "assistant", message: { id: "msg_u", role: "assistant", content: [{ type: "tool_use", id: "toolu_xx", name: "Bash", input: {} }] } } as any,
      state
    );
    expect(state.toolUseGroup.open).toBe(true);

    dispatchEvent(
      { type: "result", subtype: "success", total_cost_usd: 0.0123, duration_ms: 4500, usage: { input_tokens: 150, output_tokens: 50, cache_creation_input_tokens: 18000, cache_read_input_tokens: 0 } } as any,
      state
    );
    expect(state.resultReceived).toBe(true);
    expect(state.totalCostUsd).toBe(0.0123);
    expect(state.totalInputTokens).toBe(150);   // A-09 accumulator
    expect(state.toolUseGroup.open).toBe(false); // A-14 collapse
    const asst = state.messages.find((m) => m.role === "assistant");
    expect(asst?.streaming).toBe(false);
  });

  it("unknown event type: console.warn with [claude:unknown-event]", () => {
    const state = freshState();
    dispatchEvent({ type: "definitely_not_a_known_type", payload: "x" } as any, state);
    expect(state.messages).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalled();
    const warnText = warnSpy.mock.calls.map((c) => c.join(" ")).join(" ");
    expect(warnText).toContain("claude:unknown-event");
  });

  it("full NDJSON fixture replay: end state matches contract", () => {
    const fixturePath = resolve(__dirname, "fixtures", "stream-events.ndjson");
    const lines = readFileSync(fixturePath, "utf8").split("\n").filter(Boolean);
    const state = freshState();
    for (const raw of lines) {
      try { dispatchEvent(JSON.parse(raw), state); } catch { /* malformed line — drop, mirrors production buffer behavior */ }
    }
    expect(state.resultReceived).toBe(true);
    expect(state.totalCostUsd).toBe(0.0123);
    expect(state.totalInputTokens).toBeGreaterThan(0);
    expect(state.toolUseGroup.open).toBe(false);
    expect(state.messages.length).toBeGreaterThan(2);
    expect(state.messages.some((m) => m.role === "system")).toBe(true);
    expect(state.messages.some((m) => m.role === "assistant")).toBe(true);
    expect(state.messages.some((m) => m.role === "tool")).toBe(true);
  });
});
