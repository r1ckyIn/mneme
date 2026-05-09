// Core parser
export { parseLine } from './parser.js'

// Stateful translator with dedup
export { Translator, extractContent } from './translator.js'

// Stdin message constructors
export { createMessage } from './writer.js'

// Raw protocol types
export type {
  ClaudeEvent,
  ClaudeMessage,
  ClaudeContent,
  ModelUsageEntry,
} from './types/protocol.js'

// Translated event types
export type {
  RelayEvent,
  TextDeltaEvent,
  ThinkingDeltaEvent,
  ToolUseEvent,
  ToolResultEvent,
  SessionMetaEvent,
  TurnCompleteEvent,
  ErrorEvent,
} from './types/events.js'
