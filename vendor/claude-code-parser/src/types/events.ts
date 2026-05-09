/**
 * Translated relay events — the normalized output of the Translator.
 *
 * This is a discriminated union on the `type` field. Consumers can
 * switch on `event.type` to get full type narrowing.
 */
export type RelayEvent =
  | TextDeltaEvent
  | ThinkingDeltaEvent
  | ToolUseEvent
  | ToolResultEvent
  | SessionMetaEvent
  | TurnCompleteEvent
  | ErrorEvent

export interface TextDeltaEvent {
  type: 'text_delta'
  content: string
}

export interface ThinkingDeltaEvent {
  type: 'thinking_delta'
  content: string
}

export interface ToolUseEvent {
  type: 'tool_use'
  toolUseId: string
  toolName: string
  /** Tool input as a JSON string. */
  input: string
}

export interface ToolResultEvent {
  type: 'tool_result'
  toolUseId: string
  output: string
  isError: boolean
}

export interface SessionMetaEvent {
  type: 'session_meta'
  model: string
}

export interface TurnCompleteEvent {
  type: 'turn_complete'
  sessionId?: string
  costUsd?: number
  inputTokens?: number
  outputTokens?: number
  contextWindow?: number
}

export interface ErrorEvent {
  type: 'error'
  message: string
  sessionId?: string
}
