// src/lib/stream-dispatch.ts — 6-arm event router for `claude --output-format stream-json`.
//
// Vendor consumption: Path 2 (types-only) per RESEARCH §4.8 + KD-12 + D-13.
// We import the raw `ClaudeEvent` envelope from
// $vendor/claude-code-parser/src/types/protocol — that file exposes the wire
// format from the `--output-format stream-json` NDJSON exactly (string-typed
// `type` to admit forward-compat events). The vendor's `Translator` class,
// `createMessage` helpers, and the post-translate `RelayEvent` union under
// `src/types/events` are NOT consumed in Phase 1 — mneme writes its OWN 6-arm
// dispatch matching spike-002 + AI-SPEC §3 verbatim.
//
// Round 5 amendment scope:
//   - A-09: state.totalInputTokens accumulates result.usage.input_tokens for
//     the chat-input usage meter (01-06 reads this rune). No localStorage.
//   - A-14: state.toolUseGroup is the collapsible state machine —
//     opens on first tool_use block, closes on result event. 01-06's render
//     layer reads .open to emit `<details open>` (streaming) or `<details>`
//     (collapsed). Header text is computed by the render layer from
//     .toolUses[] via gerundHeader / pastTenseHeader (exported below).

import type { ClaudeEvent as VendorClaudeEvent } from "../../vendor/claude-code-parser/src/types/protocol";

// Re-export for downstream consumers (plan 01-06 imports ClaudeEvent from
// $lib/stream-dispatch directly so it does not have to know the vendor path).
export type ClaudeEvent = VendorClaudeEvent;

// === Public state shape (plan 01-06 wraps in Svelte 5 $state) ===

export type Msg = {
  id: string;
  role: "user" | "assistant" | "tool" | "system";
  text: string;
  streaming: boolean;
  toolName?: string;
  toolInputPreview?: string;
  thinking?: boolean;
  toolGroupId?: string; // A-14 — links tool/tool-result msgs to the parent ToolUseGroup
};

export type ToolUseEntry = {
  id: string;          // tool_use_id
  name: string;        // e.g., "Bash", "Read"
  inputPreview: string;
  completed: boolean;
};

export type ToolUseGroup = {
  open: boolean;       // true during streaming; flips false on result event (A-14)
  toolUses: ToolUseEntry[];
};

export type DispatchState = {
  messages: Msg[];
  isStreaming: boolean;
  resultReceived: boolean;
  totalCostUsd?: number;
  totalInputTokens: number;     // A-09 accumulator for usage meter
  toolUseGroup: ToolUseGroup;   // A-14 collapsible state machine
};

export function freshState(): DispatchState {
  return {
    messages: [],
    isStreaming: false,
    resultReceived: false,
    totalInputTokens: 0,
    toolUseGroup: { open: false, toolUses: [] },
  };
}

// Lightweight HTML escape for system error text. Duplicated from sanitize.ts so
// this module has no dep on sanitize.ts at TS-import level (keeps test isolation
// clean — dispatch tests don't need a jsdom DOMPurify chain).
function escapeHtmlMin(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

let msgCounter = 0;
function uid(): string {
  return `m_${Date.now()}_${msgCounter++}`;
}

function findOrCreateStreamingAssistant(state: DispatchState): Msg {
  const last = state.messages[state.messages.length - 1];
  if (last && last.role === "assistant" && last.streaming) return last;
  const fresh: Msg = { id: uid(), role: "assistant", text: "", streaming: true };
  state.messages.push(fresh);
  return fresh;
}

export function dispatchEvent(evt: ClaudeEvent, state: DispatchState): void {
  switch (evt.type) {
    case "system": {
      const e = evt as any;
      if (e.subtype === "init") {
        // D-18 telemetry — UI dot only; dev console for model + session
        console.log(`[claude:init] model=${e.model} session=${e.session_id} cwd=${e.cwd}`);
      } else if (e.subtype === "error") {
        // SPEC L93: surface raw subprocess error message in chat (HTML-escaped).
        // UI-SPEC §"System bubble — error variant" handles the visual.
        const text = escapeHtmlMin(String(e.message ?? "unknown error"));
        state.messages.push({ id: uid(), role: "system", text, streaming: false });
      } else {
        console.log(`[claude:system] ${JSON.stringify(e).slice(0, 200)}`);
      }
      return;
    }

    case "stream_event": {
      const e = evt as any;
      const delta = e.event?.delta;
      if (delta?.type === "text_delta" && typeof delta.text === "string") {
        const cur = findOrCreateStreamingAssistant(state);
        cur.text += delta.text;
      }
      // Other delta types (input_json_delta) are tool-use streaming — ignored
      // for chat display; reflected by the consolidated assistant event.
      return;
    }

    case "assistant": {
      const e = evt as any;
      const blocks: any[] = e.message?.content ?? [];
      for (const block of blocks) {
        switch (block?.type) {
          case "text":
            // SKIP — already streamed via stream_event (spike landmine #7).
            break;
          case "tool_use": {
            const inputStr = JSON.stringify(block.input ?? {});
            const truncatedInput = inputStr.length > 200 ? inputStr.slice(0, 197) + "..." : inputStr;
            const preview = `${block.name}: ${truncatedInput}`;
            const toolUseId = String(block.id ?? uid());
            // A-14: open the collapsible group on first tool_use of this turn,
            // and append an entry. Subsequent tool_uses in the same turn append
            // without re-opening (already open).
            state.toolUseGroup.open = true;
            state.toolUseGroup.toolUses.push({
              id: toolUseId,
              name: block.name,
              inputPreview: truncatedInput,
              completed: false,
            });
            state.messages.push({
              id: uid(),
              role: "tool",
              text: preview,
              streaming: false,
              toolName: block.name,
              toolInputPreview: preview.slice(0, 200),
              toolGroupId: toolUseId,
            });
            break;
          }
          case "thinking": {
            // signature is encrypted for OAuth users — do NOT decode (spike landmine #8).
            // We only record a boolean flag on the current streaming assistant msg;
            // neither `thinking` body nor `signature` ever lands in state.
            const cur = findOrCreateStreamingAssistant(state);
            cur.thinking = true;
            break;
          }
          default:
            console.warn(`[claude:unknown-block] ${JSON.stringify(block).slice(0, 100)}`);
        }
      }
      return;
    }

    case "user": {
      const e = evt as any;
      const blocks: any[] = e.message?.content ?? [];
      for (const block of blocks) {
        if (block?.type === "tool_result") {
          const content = typeof block.content === "string"
            ? block.content
            : JSON.stringify(block.content ?? "").slice(0, 200);
          const toolUseId = String(block.tool_use_id ?? "");
          // A-14: flip matching toolUses entry completed=true
          if (toolUseId) {
            const entry = state.toolUseGroup.toolUses.find((t) => t.id === toolUseId);
            if (entry) entry.completed = true;
          }
          state.messages.push({
            id: uid(),
            role: "tool",
            text: `tool_result: ${content.length > 200 ? content.slice(0, 197) + "..." : content}`,
            streaming: false,
            toolGroupId: toolUseId || undefined,
          });
        }
      }
      return;
    }

    case "rate_limit_event":
      console.log(`[claude:rate-limit] ${JSON.stringify(evt).slice(0, 200)}`);
      return;

    case "result": {
      const e = evt as any;
      state.resultReceived = true;
      if (typeof e.total_cost_usd === "number") {
        state.totalCostUsd = e.total_cost_usd;
      }
      // A-09 accumulator for usage meter (01-06 reads state.totalInputTokens).
      // The vendor protocol types `usage` as `unknown` because the upstream
      // shape is loose — we extract input_tokens defensively.
      const usage = e.usage as { input_tokens?: number } | undefined;
      const inputTokens = usage?.input_tokens;
      if (typeof inputTokens === "number") {
        state.totalInputTokens += inputTokens;
      }
      // A-14: collapse the tool-use group on result. Render layer (01-06)
      // re-emits <details> without `open`. The .toolUses[] array is preserved
      // so the past-tense header text can be derived ("Ran 2 commands…").
      state.toolUseGroup.open = false;
      // Mark the current streaming assistant as finalized (plan 01-06's
      // finalize-on-close walks .streaming===false to render markdown+KaTeX).
      for (const m of state.messages) {
        if (m.role === "assistant" && m.streaming) m.streaming = false;
      }
      console.log(
        `[claude:result] cost=$${e.total_cost_usd ?? "?"} ` +
          `duration=${e.duration_ms ?? "?"}ms usage=${JSON.stringify(e.usage ?? {})}`,
      );
      return;
    }

    default:
      console.warn(`[claude:unknown-event] ${JSON.stringify(evt).slice(0, 100)}`);
  }
}

// === A-14 header derivation helpers ===
//
// Render layer (01-06) calls these to produce the <summary> text inside the
// <details> element. Empty group → empty string (render skips <details>).
//
// Heuristic: group tool names by display verb. "Bash" → command/commands;
// "Read" → file/files (read); "Glob"/"Grep" → search/searches. Unknown
// names group as "tools".
//
// A-14 explicitly: "Header text computed by render layer from .toolUses +
// .open; dispatch only owns the data shape." These pure helpers live alongside
// the dispatch but operate on a snapshot — no state mutation.

function classifyTool(name: string): "command" | "file_read" | "search" | "other" {
  switch (name) {
    case "Bash":
      return "command";
    case "Read":
      return "file_read";
    case "Glob":
    case "Grep":
      return "search";
    default:
      return "other";
  }
}

function pluralize(n: number, singular: string, plural: string): string {
  return n === 1 ? `1 ${singular}` : `${n} ${plural}`;
}

function buildHeader(group: ToolUseGroup, tense: "gerund" | "past"): string {
  if (group.toolUses.length === 0) return "";
  const counts = { command: 0, file_read: 0, search: 0, other: 0 };
  for (const t of group.toolUses) counts[classifyTool(t.name)]++;
  const parts: string[] = [];
  if (counts.command > 0) {
    parts.push(
      tense === "gerund"
        ? `Running ${pluralize(counts.command, "command", "commands")}`
        : `Ran ${pluralize(counts.command, "command", "commands")}`,
    );
  }
  if (counts.file_read > 0) {
    parts.push(
      tense === "gerund"
        ? `reading ${pluralize(counts.file_read, "file", "files")}`
        : `read ${pluralize(counts.file_read, "file", "files")}`,
    );
  }
  if (counts.search > 0) {
    parts.push(tense === "gerund" ? `searching notes` : `searched notes`);
  }
  if (counts.other > 0) {
    parts.push(
      tense === "gerund"
        ? `running ${pluralize(counts.other, "tool", "tools")}`
        : `ran ${pluralize(counts.other, "tool", "tools")}`,
    );
  }
  // Capitalize first segment
  if (parts.length > 0) parts[0] = parts[0][0].toUpperCase() + parts[0].slice(1);
  const joined = parts.join(", ");
  return tense === "gerund" ? `${joined}…` : joined;
}

export function gerundHeader(group: ToolUseGroup): string {
  return buildHeader(group, "gerund");
}

export function pastTenseHeader(group: ToolUseGroup): string {
  return buildHeader(group, "past");
}
