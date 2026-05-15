---
status: complete
phase: 01-tauri-shell-foundation-subprocess-hardening
verification_mode: gap-closure-dogfood
source:
  - 01-12-SUMMARY.md
  - 01-13-SUMMARY.md
  - 01-VERIFICATION.md (gaps_found, score 4/5)
  - 01-REVIEW.md (CR-01 BLOCKER)
started: 2026-05-15T06:52:00Z
updated: 2026-05-15T06:58:00Z
completed: 2026-05-15T06:58:00Z
review_html: .planning/handoff/2026-05-15-phase-01-verify.html
---

## Current Test

[testing complete]

## Tests

### 1. CR-01 close-without-text_delta status recovery
expected: |
  Subprocess close path (`cmd.on("close")` at ChatPanel.svelte:250-272)
  must call `setStatus(...)` so the titlebar dot does NOT stick at
  "connecting" indefinitely when text_delta never arrived.
result: issue
reported: "pre-confirmed BLOCKER from 01-REVIEW.md / 01-VERIFICATION.md truth #2 FAILED; user acknowledged in verify HTML review without override"
severity: blocker
bucket: window
anchor: src/lib/components/ChatPanel.svelte:250-272

### 2. Session continuity dogfood (3 prompts)
expected: |
  Launch app. Send "我叫 Ricky" → wait reply. Send "我叫什么?" → reply
  must contain "Ricky". Send a follow-up referencing prior turn → reply
  must echo Ricky. DevTools `[claude:init]` shows SAME session_id on
  prompts 2 + 3 as prompt 1. Titlebar dot stays green.
result: pass
reported: "user replied 'pass' on batched verify HTML 2026-05-15"
bucket: window
anchor: src/lib/components/ChatPanel.svelte:175 (claude-bin-resume command selection)

### 3. No ASCII fallback after KaTeX math (3 math prompts)
expected: |
  Replies to 3 math prompts (泰勒展开式 / 勾股定理 / 二次方程求根公式)
  render KaTeX equations only; zero ASCII-fallback lines (no `2!f''(a)(x-a)2`
  plain text after a `$$...$$` block).
result: pass
reported: "user replied 'pass' on batched verify HTML 2026-05-15"
bucket: visual
anchor: src/lib/spawn-args.shared.ts CHAT_RENDERING_HINTS (passed via --append-system-prompt)

### 4. Heading hierarchy + hr visual distinguishability
expected: |
  h1 visually larger than h2 visually larger than h3 (≥ 2px scale step).
  `---` renders as a visible horizontal rule (1px soft-border line).
result: pass
reported: "user replied 'pass' on batched verify HTML 2026-05-15"
bucket: visual
anchor: src/lib/components/AssistantMessage.svelte:126,138,147,159 (h1 21px / h2 17.5px / h3 15.5px / hr 1px border-soft)

## Summary

total: 4
passed: 3
issues: 1
pending: 0
skipped: 0

## Gaps

<!-- pre-seeded from 01-REVIEW.md CR-01 BLOCKER + VERIFICATION.md -->
- truth: "Subprocess lifecycle is clean and connection-state dot does not stick at 'connecting' after a natural subprocess close"
  status: failed
  reason: "cmd.on('close') path in ChatPanel.svelte:250-272 calls teardown() but not setStatus(). If subprocess closes naturally without ever emitting a text_delta event (auth handshake error → stderr, rate-limit immediate close, sporadic early-EOF), setStatus('connected') never fires (gated on firstTextDeltaSeen at L213) and setStatus('disconnected') is not called on the close path. Titlebar dot stuck at 'connecting'."
  severity: blocker
  test: 1
  root_cause: "Plan 01-12 enumerated 4 setStatus transition sites but missed this 5th path. Per A-16 contract, teardown() must NOT touch connection-state (correct for normal close), but close-without-text_delta is the 5th distinct lifecycle state that needs an enumerated transition."
  artifacts:
    - path: "src/lib/components/ChatPanel.svelte"
      issue: "cmd.on('close') handler at lines 250-272 does not call setStatus('disconnected') when !firstTextDeltaSeen"
  missing:
    - "Add setStatus('disconnected') inside cmd.on('close') when !dispatch.resultReceived AND !firstTextDeltaSeen — or equivalently, add setStatus('connected') at the first dispatch.resultReceived site as a fallback for the case where text_delta never arrived"
  debug_session: ""
