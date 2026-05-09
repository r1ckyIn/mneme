/**
 * Construct NDJSON messages for Claude Code's `--input-format stream-json` stdin.
 *
 * Each function returns a single NDJSON line (JSON + newline) ready to be
 * written to the Claude Code process's stdin.
 *
 * Port of Go WriteToStdin, WriteToolResult, WriteToolResultWithContent
 * from mobile-code/session.go.
 */
export const createMessage = {
  /**
   * Construct a user chat message.
   *
   * @param content - The message text to send to Claude
   * @returns NDJSON line to write to stdin
   */
  user(content: string): string {
    return JSON.stringify({
      type: 'user',
      message: { role: 'user', content },
    }) + '\n'
  },

  /**
   * Approve a pending tool execution.
   *
   * @param toolUseId - The tool_use block ID to approve
   * @returns NDJSON line to write to stdin
   */
  approve(toolUseId: string): string {
    return JSON.stringify({
      type: 'approve',
      tool_use_id: toolUseId,
    }) + '\n'
  },

  /**
   * Deny a pending tool execution.
   *
   * @param toolUseId - The tool_use block ID to deny
   * @returns NDJSON line to write to stdin
   */
  deny(toolUseId: string): string {
    return JSON.stringify({
      type: 'deny',
      tool_use_id: toolUseId,
    }) + '\n'
  },

  /**
   * Send a tool result with custom content (for interactive tools like AskUserQuestion).
   *
   * @param toolUseId - The tool_use block ID this result is for
   * @param content - The result content to send
   * @returns NDJSON line to write to stdin
   */
  toolResult(toolUseId: string, content: string): string {
    return JSON.stringify({
      type: 'tool_result',
      tool_use_id: toolUseId,
      content,
    }) + '\n'
  },
} as const
