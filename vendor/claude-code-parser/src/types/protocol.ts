/**
 * Raw NDJSON types from Claude Code's `--output-format stream-json`.
 *
 * These mirror the wire format exactly. Fields use snake_case to match
 * the JSON keys Claude Code emits. Types are intentionally loose —
 * the protocol is undocumented and can add fields/types without notice.
 */

/** Per-model token usage breakdown, keyed by model ID in ClaudeEvent.modelUsage. */
export interface ModelUsageEntry {
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
  contextWindow: number
}

/** Raw NDJSON envelope from Claude Code's stdout. */
export interface ClaudeEvent {
  type: string
  subtype?: string
  message?: ClaudeMessage
  /** Double-encoded JSON string — must be JSON.parse()'d to get actual text. */
  result?: unknown
  session_id?: string
  model?: string
  tools?: string[]
  duration_ms?: number
  duration_api_ms?: number
  cost_usd?: number
  total_cost_usd?: number
  is_error?: boolean
  num_turns?: number
  modelUsage?: Record<string, ModelUsageEntry>
  usage?: unknown
}

/** Message payload within a ClaudeEvent. */
export interface ClaudeMessage {
  content: ClaudeContent[]
  role?: string
  stop_reason?: string
}

/**
 * Polymorphic content block.
 *
 * `type` is deliberately `string` (not a union) because Claude Code
 * can add new block types in any release. The translator handles
 * known types and silently skips unknown ones.
 */
export interface ClaudeContent {
  type: string
  /** Text content (for `text` blocks, also fallback for `thinking` blocks in some formats). */
  text?: string
  /** Thinking content (primary field for `thinking` blocks). */
  thinking?: string
  /** Tool use ID (for `tool_use` blocks). */
  id?: string
  /** Tool name (for `tool_use` blocks). */
  name?: string
  /** Tool input — kept as unknown since shapes vary by tool. */
  input?: unknown
  /**
   * Tool result content — polymorphic:
   * - `string` — plain text
   * - `Array<{ type: string; text: string }>` — structured text blocks
   * - `null` — no content
   */
  content?: unknown
  /** Back-reference to the tool_use block (for `tool_result` blocks). */
  tool_use_id?: string
  /** Whether the tool result is an error (for `tool_result` blocks). */
  is_error?: boolean
}
