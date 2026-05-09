import type { ClaudeEvent } from './types/protocol.js'

/**
 * Parse a single NDJSON line from Claude Code's stdout into a typed event.
 *
 * Returns `null` for empty lines or unparseable JSON (matching the Go
 * reference which logs and skips bad lines).
 *
 * @param line - One line of NDJSON from Claude Code's stdout
 * @returns Typed ClaudeEvent, or null if the line is empty/invalid
 */
export function parseLine(line: string): ClaudeEvent | null {
  const trimmed = line.trim()
  if (trimmed.length === 0) return null

  try {
    return JSON.parse(trimmed) as ClaudeEvent
  } catch {
    return null
  }
}
