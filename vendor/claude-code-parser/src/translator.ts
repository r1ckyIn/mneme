import type { ClaudeEvent, ClaudeMessage, ClaudeContent } from './types/protocol.js'
import type { RelayEvent } from './types/events.js'

/**
 * Translates raw ClaudeEvents into deduplicated RelayEvents.
 *
 * Tracks content block index to avoid re-emitting blocks that were
 * already sent in previous `assistant` events (the `--verbose` mode
 * cumulative snapshot problem).
 *
 * Port of the Go Translator in mobile-code/translator.go.
 */
export class Translator {
  private lastContentIndex = 0
  private lastFirstBlockKey: string | undefined
  private _sessionId: string | undefined
  private _model: string | undefined

  /** The session ID captured from the most recent `system/init` event. */
  get sessionId(): string | undefined {
    return this._sessionId
  }

  /** The model name captured from the most recent `system/init` event. */
  get model(): string | undefined {
    return this._model
  }

  /** Reset content index tracking. Call on new turn/session. */
  reset(): void {
    this.lastContentIndex = 0
    this.lastFirstBlockKey = undefined
  }

  /** Convert a raw ClaudeEvent into zero or more RelayEvents. */
  translate(raw: ClaudeEvent): RelayEvent[] {
    switch (raw.type) {
      case 'system':
        return this.translateSystem(raw)
      case 'result':
        return this.translateResult(raw)
      case 'assistant':
        return this.translateAssistant(raw)
      case 'user':
        return this.translateUser(raw)
      default:
        // progress, rate_limit_event, and unknown types are ignored
        return []
    }
  }

  private translateSystem(raw: ClaudeEvent): RelayEvent[] {
    switch (raw.subtype) {
      case 'init':
        if (raw.session_id) this._sessionId = raw.session_id
        if (raw.model) this._model = raw.model
        return [{
          type: 'session_meta',
          model: raw.model ?? 'unknown',
        }]

      case 'result': {
        const resultText = parseDoubleEncodedResult(raw.result)
        if (raw.is_error) {
          this.reset()
          return [{
            type: 'error',
            message: resultText,
            sessionId: raw.session_id,
          }]
        }
        this.reset()
        return [{
          type: 'turn_complete',
          sessionId: raw.session_id,
        }]
      }

      default:
        return []
    }
  }

  private translateResult(raw: ClaudeEvent): RelayEvent[] {
    const resultText = parseDoubleEncodedResult(raw.result)

    if (raw.subtype === 'error' || raw.is_error) {
      this.reset()
      return [{
        type: 'error',
        message: resultText,
        sessionId: raw.session_id,
      }]
    }

    const ev: RelayEvent = {
      type: 'turn_complete',
      sessionId: raw.session_id,
      costUsd: raw.total_cost_usd,
    }

    // Extract usage from modelUsage (take first model entry)
    if (raw.modelUsage) {
      for (const usage of Object.values(raw.modelUsage)) {
        (ev as { inputTokens?: number }).inputTokens =
          usage.inputTokens + usage.cacheReadInputTokens + usage.cacheCreationInputTokens;
        (ev as { outputTokens?: number }).outputTokens = usage.outputTokens;
        (ev as { contextWindow?: number }).contextWindow = usage.contextWindow
        break // Take the first (usually only) model
      }
    }

    this.reset()
    return [ev]
  }

  private translateAssistant(raw: ClaudeEvent): RelayEvent[] {
    const msg = raw.message as ClaudeMessage | undefined
    if (!msg?.content || msg.content.length === 0) return []

    // Detect context switches (new turn, different sub-agent, etc.)
    // by fingerprinting the first content block. If it doesn't match
    // what we were tracking, this is a different message stream → reset.
    const firstKey = blockFingerprint(msg.content[0])
    if (firstKey !== this.lastFirstBlockKey) {
      this.lastContentIndex = 0
      this.lastFirstBlockKey = firstKey
    }

    // Safety: if content shrank below our index for any other reason, reset.
    if (msg.content.length < this.lastContentIndex) {
      this.lastContentIndex = 0
    }

    const events: RelayEvent[] = []

    // Only process content blocks we haven't sent yet (dedup)
    for (let i = this.lastContentIndex; i < msg.content.length; i++) {
      const block = msg.content[i]
      const ev = this.translateContentBlock(block)
      if (ev) events.push(ev)
    }

    this.lastContentIndex = msg.content.length
    return events
  }

  private translateUser(raw: ClaudeEvent): RelayEvent[] {
    const msg = raw.message as ClaudeMessage | undefined
    if (!msg?.content) return []

    const events: RelayEvent[] = []
    for (const block of msg.content) {
      if (block.type === 'tool_result') {
        events.push({
          type: 'tool_result',
          toolUseId: block.tool_use_id ?? '',
          output: extractContent(block.content),
          isError: block.is_error ?? false,
        })
      }
    }
    return events
  }

  private translateContentBlock(block: ClaudeContent): RelayEvent | null {
    switch (block.type) {
      case 'text':
        return {
          type: 'text_delta',
          content: block.text ?? '',
        }

      case 'thinking': {
        const text = block.thinking ?? block.text ?? ''
        if (!text) return null
        return {
          type: 'thinking_delta',
          content: text,
        }
      }

      case 'tool_use':
        return {
          type: 'tool_use',
          toolUseId: block.id ?? '',
          toolName: block.name ?? '',
          input: block.input != null ? JSON.stringify(block.input) : '',
        }

      case 'tool_result':
        return {
          type: 'tool_result',
          toolUseId: block.tool_use_id ?? '',
          output: extractContent(block.content),
          isError: block.is_error ?? false,
        }

      default:
        // Unknown block types are silently skipped
        return null
    }
  }
}

/**
 * Handle the polymorphic `content` field in tool_result blocks.
 *
 * Three possible shapes:
 * 1. `string` — plain text
 * 2. `Array<{ type: string; text: string }>` — structured text blocks, joined with newline
 * 3. `null` / `undefined` — empty string
 */
export function extractContent(raw: unknown): string {
  if (raw == null) return ''

  if (typeof raw === 'string') return raw

  if (Array.isArray(raw)) {
    const parts: string[] = []
    for (const block of raw) {
      if (block && typeof block === 'object' && 'text' in block && typeof block.text === 'string') {
        if (block.text) parts.push(block.text)
      }
    }
    return parts.join('\n')
  }

  // Fallback: stringify whatever we got
  return String(raw)
}

/**
 * Create a fingerprint for a content block to detect context switches.
 *
 * Uses the block's stable identity: tool_use blocks have unique IDs,
 * text/thinking blocks use a prefix of their content. This lets the
 * translator detect when interleaved sub-agent events switch context.
 */
function blockFingerprint(block: ClaudeContent): string {
  // tool_use blocks have unique IDs — best signal
  if (block.id) return `${block.type}:${block.id}`
  // thinking/text blocks — use first 64 chars as fingerprint
  const text = block.thinking ?? block.text ?? ''
  if (text) return `${block.type}:${text.slice(0, 64)}`
  // Fallback for exotic blocks
  return `${block.type}:${block.tool_use_id ?? 'unknown'}`
}

/**
 * Parse the double-encoded `result` field.
 * Claude Code's result field is a JSON-encoded string (e.g., `"\"actual text\""`).
 */
function parseDoubleEncodedResult(result: unknown): string {
  if (result == null) return ''
  if (typeof result === 'string') {
    try {
      const parsed = JSON.parse(result)
      if (typeof parsed === 'string') return parsed
    } catch {
      // Not double-encoded, use as-is
    }
    return result
  }
  return String(result)
}
