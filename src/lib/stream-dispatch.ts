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

import type {
  ClaudeEvent as VendorClaudeEvent,
  ClaudeContent,
} from "../../vendor/claude-code-parser/src/types/protocol";

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
  // WR-08 fix (2026-05-14): classify system bubbles explicitly instead of
  // string-pattern-matching the .text on the render side. Set at every
  // role:"system" push site. "error" → red border + .error class; "info" →
  // neutral border (matches "stream ended unexpectedly" — an operational
  // signal, not a failure).
  systemKind?: "error" | "info";
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
  // WR-03 fix (2026-05-14): the message-ID counter MUST live on the state
  // object, not at module scope. Module-scope state would be shared across
  // every freshState() instance in the same JS context, contradicting the
  // "no-state-leak" contract pinned by tests/tool-use-collapsible.test.ts:140.
  // Phase 3 multi-session dispatch (N concurrent streams sharing the module)
  // would otherwise see monotonically-merged IDs.
  _uidCounter: number;
  // Plan 01-12 GAP-1 (2026-05-14): captured server-side session id from the
  // first system/init event of the FRESH `claude --print` subprocess. Threaded
  // back into subsequent spawns via buildClaudeArgs(..., { resumeSessionId }).
  // null on initial state and on a vendor event with non-string / empty
  // session_id; replaced verbatim by every system/init event that carries a
  // non-empty string. NO regex check at this layer — the spawn boundary's
  // SESSION_ID_REGEX in buildClaudeArgs is where defense-in-depth lives.
  sessionId: string | null;
};

export function freshState(): DispatchState {
  return {
    messages: [],
    isStreaming: false,
    resultReceived: false,
    totalInputTokens: 0,
    toolUseGroup: { open: false, toolUses: [] },
    _uidCounter: 0,
    sessionId: null,
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

// WR-03 fix: caller-provided counter via state. No module-level mutation.
function uid(state: DispatchState): string {
  return `m_${Date.now()}_${state._uidCounter++}`;
}

function findOrCreateStreamingAssistant(state: DispatchState): Msg {
  const last = state.messages[state.messages.length - 1];
  if (last && last.role === "assistant" && last.streaming) return last;
  const fresh: Msg = { id: uid(state), role: "assistant", text: "", streaming: true };
  state.messages.push(fresh);
  return fresh;
}

// WR-02 fix (2026-05-14): NDJSON arriving from the `claude` subprocess is the
// untrusted-input attack surface. The vendor `ClaudeEvent` type already
// declares the structural fields we read (`subtype`, `session_id`, `model`,
// `message`, `total_cost_usd`, `duration_ms`, `usage`) so we use the vendor
// type directly inside each case arm. The few extension fields the vendor
// does NOT model (e.g. `event.delta.text` on stream_event, `block.input` on
// tool_use, `block.tool_use_id` on tool_result) get narrowed locally with
// `typeof` / `in` checks at the parse boundary. No `as any` survives.
//
// `cwd` is the one field the vendor doesn't model on system/init; we read it
// off the event via an `in` check rather than casting to any.
function readString(obj: unknown, key: string): string | undefined {
  if (typeof obj === "object" && obj !== null && key in obj) {
    const v = (obj as Record<string, unknown>)[key];
    if (typeof v === "string") return v;
  }
  return undefined;
}

export function dispatchEvent(evt: ClaudeEvent, state: DispatchState): void {
  switch (evt.type) {
    case "system": {
      // vendor ClaudeEvent already types subtype/model/session_id; cwd is a
      // system/init-only field the vendor doesn't model — read via readString.
      if (evt.subtype === "init") {
        // D-18 telemetry — UI dot only; dev console for model + session
        console.log(
          `[claude:init] model=${evt.model ?? "?"} session=${evt.session_id ?? "?"} cwd=${readString(evt, "cwd") ?? "?"}`,
        );
        // Plan 01-12 GAP-1 (2026-05-14): capture the server-side session id
        // so ChatPanel's NEXT prompt threads it via --resume <id>. Guard:
        // accept only non-empty string values. The defense-in-depth regex
        // check lives at the spawn boundary (buildClaudeArgs); the dispatcher
        // accepts whatever wire-format Claude emits.
        if (typeof evt.session_id === "string" && evt.session_id.length > 0) {
          state.sessionId = evt.session_id;
        }
      } else if (evt.subtype === "error") {
        // SPEC L93: surface raw subprocess error message in chat (HTML-escaped).
        // UI-SPEC §"System bubble — error variant" handles the visual.
        // The system/error event carries `.message` at the EVENT root (not
        // .message.content[]). vendor types .message as ClaudeMessage which
        // would not match a raw string — accept either shape defensively.
        const rawMessage = readString(evt, "message");
        const text = escapeHtmlMin(rawMessage ?? "unknown error");
        state.messages.push({ id: uid(state), role: "system", systemKind: "error", text, streaming: false });
      } else {
        console.log(`[claude:system] ${JSON.stringify(evt).slice(0, 200)}`);
      }
      return;
    }

    case "stream_event": {
      // vendor ClaudeEvent does NOT model the `event.delta.text` path —
      // narrow via property checks at the parse boundary. Defensive against
      // an adversarial NDJSON line like `{"event":{"delta":{"type":"text_delta","text":["a","b"]}}}`
      // (array instead of string) — the typeof guard rejects it.
      const eventField = (evt as { event?: unknown }).event;
      if (typeof eventField === "object" && eventField !== null && "delta" in eventField) {
        const delta = (eventField as { delta?: unknown }).delta;
        if (
          typeof delta === "object" &&
          delta !== null &&
          "type" in delta &&
          (delta as { type?: unknown }).type === "text_delta" &&
          "text" in delta &&
          typeof (delta as { text?: unknown }).text === "string"
        ) {
          const text = (delta as { text: string }).text;
          const cur = findOrCreateStreamingAssistant(state);
          cur.text += text;
        }
      }
      // Other delta types (input_json_delta) are tool-use streaming — ignored
      // for chat display; reflected by the consolidated assistant event.
      return;
    }

    case "assistant": {
      // vendor types: evt.message?.content is ClaudeContent[] | undefined
      const blocks: ClaudeContent[] = evt.message?.content ?? [];
      for (const block of blocks) {
        switch (block.type) {
          case "text":
            // SKIP — already streamed via stream_event (spike landmine #7).
            break;
          case "tool_use": {
            // block.input is unknown per vendor type — JSON.stringify accepts it.
            const inputStr = JSON.stringify(block.input ?? {});
            const truncatedInput = inputStr.length > 200 ? inputStr.slice(0, 197) + "..." : inputStr;
            // block.name is optional string per vendor type
            const toolName = block.name ?? "tool";
            const preview = `${toolName}: ${truncatedInput}`;
            const toolUseId = String(block.id ?? uid(state));
            // A-14: open the collapsible group on first tool_use of this turn,
            // and append an entry. Subsequent tool_uses in the same turn append
            // without re-opening (already open).
            state.toolUseGroup.open = true;
            state.toolUseGroup.toolUses.push({
              id: toolUseId,
              name: toolName,
              inputPreview: truncatedInput,
              completed: false,
            });
            state.messages.push({
              id: uid(state),
              role: "tool",
              text: preview,
              streaming: false,
              toolName,
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
      // vendor types: evt.message?.content is ClaudeContent[] | undefined.
      // block.tool_use_id and block.content are typed in ClaudeContent.
      const blocks: ClaudeContent[] = evt.message?.content ?? [];
      for (const block of blocks) {
        if (block.type === "tool_result") {
          // block.content is unknown per vendor type (polymorphic) — extract
          // string defensively. typeof guard rejects array/object payloads.
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
            id: uid(state),
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
      // vendor ClaudeEvent already types total_cost_usd / duration_ms / usage.
      state.resultReceived = true;
      if (typeof evt.total_cost_usd === "number") {
        state.totalCostUsd = evt.total_cost_usd;
      }
      // A-09 accumulator for usage meter (01-06 reads state.totalInputTokens).
      // The vendor protocol types `usage` as `unknown` because the upstream
      // shape is loose — narrow with a property check rather than casting.
      const usage = evt.usage;
      if (typeof usage === "object" && usage !== null && "input_tokens" in usage) {
        const inputTokens = (usage as { input_tokens?: unknown }).input_tokens;
        if (typeof inputTokens === "number") {
          state.totalInputTokens += inputTokens;
        }
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
        `[claude:result] cost=$${evt.total_cost_usd ?? "?"} ` +
          `duration=${evt.duration_ms ?? "?"}ms usage=${JSON.stringify(evt.usage ?? {})}`,
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
