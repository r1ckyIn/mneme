---
phase: 01-tauri-shell-foundation-subprocess-hardening
reviewed: 2026-05-14T03:53:07Z
depth: standard
files_reviewed: 49
files_reviewed_list:
  - .husky/pre-commit
  - package.json
  - rust-toolchain.toml
  - scripts/audit-capabilities.sh
  - scripts/gen-capabilities.ts
  - scripts/screenshot-01-06.mjs
  - scripts/take-screenshot.mjs
  - src-tauri/Cargo.toml
  - src-tauri/build.rs
  - src-tauri/capabilities/default.json
  - src-tauri/src/lib.rs
  - src-tauri/src/main.rs
  - src-tauri/src/session.rs
  - src-tauri/tauri.conf.json
  - src-tauri/tests/kill_pgid.rs
  - src/app.html
  - src/lib/components/AssistantMessage.svelte
  - src/lib/components/ChatFooter.svelte
  - src/lib/components/ChatPanel.svelte
  - src/lib/components/DragHandle.svelte
  - src/lib/components/FileArea.svelte
  - src/lib/components/FilePreview.svelte
  - src/lib/components/LectureVideo.svelte
  - src/lib/components/MindMapBar.svelte
  - src/lib/components/SettingsModal.svelte
  - src/lib/components/Splitter.svelte
  - src/lib/components/TitlebarMeta.svelte
  - src/lib/components/ToolUseGroup.svelte
  - src/lib/components/UsageMeter.svelte
  - src/lib/components/UserBubble.svelte
  - src/lib/connection-state.svelte.ts
  - src/lib/sanitize.ts
  - src/lib/spawn-args.node.ts
  - src/lib/spawn-args.shared.ts
  - src/lib/stream-dispatch.ts
  - src/lib/styles/tokens.css
  - src/routes/+layout.svelte
  - src/routes/+layout.ts
  - src/routes/+page.svelte
  - svelte.config.js
  - tests/audit/test-audit-script.sh
  - tests/capability-regex.test.ts
  - tests/manual/lifecycle/run-quit-loop.sh
  - tests/sanitize.test.ts
  - tests/spawn-args.test.ts
  - tests/stream-dispatch.test.ts
  - tests/tool-use-collapsible.test.ts
  - tsconfig.json
  - vite.config.ts
  - vitest.config.ts
findings:
  blocker: 3
  warning: 12
  info: 7
  total: 22
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-05-14T03:53:07Z
**Depth:** standard
**Files Reviewed:** 49
**Status:** issues_found

## Summary

Phase 1 ships the Tauri 2 + SvelteKit shell that wraps the `claude` CLI as a stream-json subprocess, with strong defense-in-depth across the four critical surfaces called out in the task brief (subprocess lifecycle, capability gating, markdown XSS, NDJSON dispatch). The TDD coverage is genuine — sanitize/stream-dispatch/spawn-args/capability-regex/tool-use-collapsible all assert real contracts rather than ceremonial assertions — and the audit script + Husky gate make SSOT drift hard to commit by accident.

That said, this review is adversarial and the code is not defect-free. Three findings rise to **BLOCKER** because they touch the security and lifecycle surfaces the phase exists to harden:

1. **`kill_pgid` blocks the UI thread for 2 seconds on Cmd+Q** — `thread::sleep(2s)` runs synchronously on Tauri's event-loop thread when the `WindowEvent::CloseRequested` or `RunEvent::ExitRequested` hook fires. The window can't unmount cleanly during the grace window, and macOS shows a "Mneme is not responding" beach-ball under any user-perceptible quit latency.
2. **CSP `connect-src` does not include `ipc:` or `http://ipc.localhost`** — Tauri 2 IPC bridge requests on macOS / Windows go through `ipc://localhost`, and on macOS the WebView's `connect-src` must include `ipc:` to allow them. This is the dogfood-flagged "Plan 01-11" gap, but it is genuinely a **runtime correctness blocker** for production builds (every `invoke()` call silently fails when the CSP enforces).
3. **`renderKatexInDom` walker has an unbounded matching loop on adversarial input** — the inner `while (rest.length > 0)` re-derives both `dispMatch` and `inlineMatch` against `[\s\S]*?` regexes on every iteration. On a pathological prompt like `$a$b$c$d$...` the per-iteration regex cost is O(n) and the loop runs O(n) times → O(n²) on the assistant render path that runs once per text_delta inside a rAF tick. This is partly a perf issue (out of scope per task brief) but the per-iteration regex behavior also has correctness traps documented inline below — the matching is greedy at the head and can misclassify `$$inline$$` boundaries.

The remaining **WARNING** items center on three themes: (a) silent error-swallowing in places where surfacing would aid the developer (`localStorage` try/catch around `mneme.layout.split` & `mneme.vault.path` does not tell the user the persistence broke); (b) defensive logic that prevents itself from working — `clear_session_pid` `unlock().unwrap()` will panic if the Mutex is poisoned, breaking the idempotency contract `lib.rs` comments rely on; (c) **`as any` casts in stream-dispatch.ts** that bypass the vendor type system silently (`evt as any` is repeated 7 times — the project rules state "Avoid `any`; use `unknown` and narrow with `instanceof Error`" — but `e.message`, `e.subtype`, `e.event?.delta?.type` are all read off `any` with zero validation, which is exactly the attack surface for malformed NDJSON streams the dispatcher receives).

The **INFO** items are mostly style and dead-code: vendored `DEV_ONLY_PERMISSIONS` array kept "as documentation" should either be deleted or moved to a comment block, two manual screenshot scripts hardcode absolute paths under a deleted worktree, and `connection-state.svelte.ts` exports `connectionState` as a mutable singleton (rules say to prefer immutable patterns).

## Blockers

### BL-01: `kill_pgid` blocks the Tauri event-loop thread for 2 seconds on Cmd+Q

**File:** `src-tauri/src/lib.rs:41-48` (also see callsites at `:127-135` and `:139-147`)
**Severity:** BLOCKER (UX-blocking; macOS beach-ball; potential App Nap eviction)

`kill_pgid` is invoked synchronously from both `WindowEvent::CloseRequested` and `RunEvent::ExitRequested` handlers. The body calls `thread::sleep(Duration::from_secs(2))` between SIGTERM and SIGKILL — this is the Tauri runtime's main thread. While that thread sleeps, the WebView can't repaint, IPC messages back up, and macOS marks the app "not responding" after roughly 800ms. On a multi-session Phase 3 build this scales by N children (2N seconds blocked).

The current implementation:

```rust
pub fn kill_pgid(pid_u32: u32) {
    let pid = Pid::from_raw(pid_u32 as i32);
    if let Ok(pgid) = getpgid(Some(pid)) {
        let _ = killpg(pgid, Signal::SIGTERM);
        thread::sleep(Duration::from_secs(2));       // <-- blocks event loop
        let _ = killpg(pgid, Signal::SIGKILL);
    }
}
```

**Fix:** Detach the sleep+SIGKILL leg onto a worker thread, or use the existing `tokio` runtime (already a dep at `Cargo.toml:23`) to schedule the SIGKILL via `tokio::spawn` + `sleep`. The current behavior also means `kill_all()` in `session.rs:47` iterates serially with a 2s wait per child — multi-session quit time is O(N).

```rust
// Option A — thread::spawn (no tokio dep required for the kill path)
pub fn kill_pgid(pid_u32: u32) {
    let pid = Pid::from_raw(pid_u32 as i32);
    let Ok(pgid) = getpgid(Some(pid)) else { return; };
    let _ = killpg(pgid, Signal::SIGTERM);
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_secs(2));
        let _ = killpg(pgid, Signal::SIGKILL);
    });
}
```

The Cmd+Q deadline guard in `tests/manual/lifecycle/run-quit-loop.sh:34` is 2.5s; the SIGKILL must STILL be delivered within that window, so a fire-and-forget thread spawn is the right shape. The existing integration test at `src-tauri/tests/kill_pgid.rs:153` waits 2.5s after `kill_pgid()` returns — currently it works because the function is itself synchronous over 2s; after the fix the test logic stays correct (still waits for the asynchronous SIGKILL to land).

A secondary issue with the same root cause: `kill_pgid` cannot run twice safely against the same PGID in fast succession with the current logic because the second invocation re-blocks for 2s on a process group that's already half-killed. The comment at `lib.rs:139-147` claims `kill_all()` is idempotent because `drain_all` empties the map on first call — true, but if the CloseRequested handler races RunEvent::ExitRequested on a macOS version where both fire (the union exists for that exact reason), the second one no-ops in <1µs while the first one blocks. Good. But: if the second handler runs against a different PGID (Phase 3 multi-session), the second 2s sleep stacks. Detaching the SIGKILL leg fixes both.

---

### BL-02: CSP `connect-src` missing `ipc:` directive — every `invoke()` blocked in production build

**File:** `svelte.config.js:30`
**Severity:** BLOCKER (runtime correctness — `invoke('register_session_pid', ...)`, `invoke('clear_session_pid')`, `invoke('stop_session')` all fail in production)

The Tauri 2 docs document that for production CSP modes (`mode: 'auto'`), the WebView must allow the IPC channel:

```text
connect-src 'self' ipc: http://ipc.localhost
```

Current `svelte.config.js:30`:

```javascript
'connect-src': ['self', 'ws:', 'http://localhost:*']
```

`ws:` + `http://localhost:*` cover Vite HMR (dev only). `'self'` does NOT cover the `ipc://localhost` origin that Tauri 2 mounts for `@tauri-apps/api/core` `invoke()` on macOS / Windows. Once SvelteKit `mode: 'auto'` emits a real SHA-256-pinned CSP in the prerendered `index.html`, the WebView refuses the request and the IPC silently fails — meaning:
- `ChatPanel.svelte:244` `register_session_pid` is rejected → session PIDs not in the registry → `kill_all()` finds an empty map on Cmd+Q → **zombie subprocess survives every quit cycle** (REQ-3 regression).
- `ChatPanel.svelte:264` `clear_session_pid` is `.catch(() => {})` → swallowed silently.
- `ChatPanel.svelte:273` `stop_session` `try/catch` warns but won't kill.

The task brief explicitly calls this out: "Plan 01-11 (CSP connect-src ipc: gap) is tracked separately and is the only known remaining gap from dogfood walkthrough." Recording here as a BLOCKER so the merge-gate signal stays consistent with the threat surface — this is the kind of gap that, if missed because of the "tracked separately" framing, will look exactly like an arbitrary nondeterministic zombie process bug in production.

**Fix:**

```javascript
'connect-src': ['self', 'ipc:', 'http://ipc.localhost', 'ws:', 'http://localhost:*']
```

Add a regression test in `tests/csp.test.ts` (does not exist yet) that parses `svelte.config.js` at module-load time and asserts `connect-src` contains `ipc:`.

---

### BL-03: `renderKatexInDom` walker double-matches and silently truncates ambiguous `$$...$$` vs `$...$` boundaries

**File:** `src/lib/sanitize.ts:99-114`
**Severity:** BLOCKER (correctness — assistant message can render incorrect math; partial bypass surface)

The walker does this:

```typescript
while (rest.length > 0) {
  const dispMatch = rest.match(/^([\s\S]*?)\$\$([\s\S]+?)\$\$([\s\S]*)$/);
  const inlineMatch = rest.match(/^([\s\S]*?)\$([^$]+?)\$([\s\S]*)$/);
  if (dispMatch && (!inlineMatch || dispMatch[1].length <= inlineMatch[1].length)) {
    // display branch
  } else if (inlineMatch) {
    // inline branch
  } else {
    parts.push({ kind: "text", src: rest });
    rest = "";
  }
}
```

Three concrete defects:

1. **Inline regex `\$([^$]+?)\$` eats display-math `$$`** when the streaming buffer is mid-flight. Example: a streaming buffer `Foo $$x = 1$$` — under partial-arrival, the buffer might first contain `Foo $$x` (only one `$$` so far). The inline regex `\$([^$]+?)\$` looks for `$<non-$>$` — won't match because there's a second `$`. Then chunk 2 arrives with `= 1$$`. Now buffer is `Foo $$x = 1$$`. The display regex matches with `[1]="Foo "`, `[2]="x = 1"`, `[3]=""`. That's correct **only** because the regex is greedy at the head (`[\s\S]*?` is lazy, but anchored). The problem: re-rendering happens on **every** text_delta inside a rAF tick (per `ChatPanel.svelte:117 — recompute every tick for streaming messages`). During the rAF where the buffer is `Foo $$x =`, the inline regex matches `[1]="Foo "`, `[2]="$x ="`, `[3]=""` — splitting `$$x =` as inline math with body `$x =`. The display chunk then arrives, the regex re-runs, but the **previous mis-render is already in the DOM** because the walker is one-shot per call. Only the post-result `scheduleHtmlRecompute` (`ChatPanel.svelte:239`) regenerates from scratch.

2. **Tie-break on `dispMatch[1].length <= inlineMatch[1].length`** can be off-by-one. Both `dispMatch[1]` and `inlineMatch[1]` are lazy-matched at the head — they should be the same length for the same prefix, but the `<=` comparison silently prefers display when the lengths tie. That is correct for `$$math$$` (display wins) but not for `$inline$ $$display$$` — when inline appears FIRST, the inline `[1]` is the empty string, and display `[1]` is `$inline$ ` (8 chars). The display match has `[1]` longer → inline wins. OK. But consider `$$$x$$$` (three dollar signs both sides — uncommon but possible in physics notation). Display matches as `[1]="$"`, `[2]="x"`, `[3]="$"`. Inline matches as `[1]=""`, `[2]="$$x$$"`... wait — inline requires `[^$]+?` body, so the `$$` inside is excluded. Inline body `[^$]+?` can't span dollar signs. So inline doesn't match at all here. Fine. But for `\$\$x$y$`, the display regex sees `\$\$` literal at the start (with backslash escapes), inline sees `\$x\$y$` — both will mismatch. The point: **the regex pair is not self-consistent across the full input space**.

3. **`[^$]+?` is too narrow** — inline math like `$a_$1`$$` (subscript with literal dollar sign) is rejected because the inner regex forbids `$`. KaTeX itself allows `\$` to be the literal — but this walker won't even pass the math through.

The streaming side compounds the issue: because the **walker is called on every text_delta** (via the rAF inside `AssistantMessage.svelte:35-45`), every text_delta during streaming re-runs the math walk on the partial buffer. The DOM accumulates mis-rendered fragments that never get cleaned up until the entire HTML is regenerated.

**Fix:** Use a stateful tokenizer instead of regex-on-rest, or — simpler — only run `renderKatexInDom` after `state.isStreaming` flips false on `result` event (i.e. once, on finalized HTML):

```typescript
// AssistantMessage.svelte:35
$effect(() => {
  void html;
  if (!host || rafScheduled) return;
  // Skip KaTeX walking during streaming — KaTeX only runs on finalized HTML.
  if (streaming) return;
  rafScheduled = true;
  requestAnimationFrame(() => {
    rafScheduled = false;
    if (host) renderKatexInDom(host);
  });
});
```

The streaming dot at the end of the assistant message visually communicates "still streaming" so the math-not-rendered-yet state is read by the user as "the prof is still writing equations" rather than a bug. KaTeX rendering on finalized HTML matches Claude Desktop's actual UX.

Test gap to close: `tests/sanitize.test.ts` has no test for the `renderKatexInDom` walker against the streaming-partial-input case. The current tests cover `renderKatex` (the pure function) but not the DOM-walker logic. Add cases for `$$x = 1$$` partial arrivals and a single-line `$a$ $b$ $c$` boundary case.

## Warnings

### WR-01: `SessionRegistry::lock().unwrap()` will panic on a poisoned Mutex; `kill_all` is then never called

**File:** `src-tauri/src/session.rs:34, 38, 42, 47`
**Severity:** WARNING (correctness — single-thread panic propagation to event loop)

Every `Mutex::lock()` in `SessionRegistry` calls `.unwrap()`. If any thread panics while holding the lock (e.g. a future Phase 3 code path that mutates the map and panics mid-mutation), the `Mutex` is poisoned, and every subsequent `.unwrap()` panics — including the `kill_all()` invocation that runs on `WindowEvent::CloseRequested`. A poisoned mutex on quit means: **all spawned `claude` subprocesses leak forever** because the close handler crashes before iterating the map.

The Phase 1 surface is small (`register`, `drain_one`, `drain_all`, `kill_all`) and currently has no panic-throwing operations inside the locked region, so this is latent risk, not active risk. But it directly contradicts the comment at `lib.rs:139-147`:

```rust
// kill_all() is idempotent (drain_all empties the map on first call,
// second invocation is a no-op).
```

This idempotency claim is true only on the happy path. On a poisoned mutex, neither call drains anything.

**Fix:** Match on the poisoned state, recover into the inner data, and log:

```rust
fn locked(&self) -> std::sync::MutexGuard<HashMap<SessionId, ChildHandle>> {
    self.inner.lock().unwrap_or_else(|poisoned| {
        eprintln!("[session] mutex poisoned — recovering inner state");
        poisoned.into_inner()
    })
}

pub fn register(&self, id: SessionId, handle: ChildHandle) {
    self.locked().insert(id, handle);
}
```

Add a Rust unit test that deliberately poisons the mutex and asserts `kill_all` still drains.

---

### WR-02: `stream-dispatch.ts` casts every event to `any` — bypasses the vendor type system on the exact attack surface NDJSON arrives through

**File:** `src/lib/stream-dispatch.ts:99, 115, 127, 176, 206`
**Severity:** WARNING (type safety / forward-compat / fuzz robustness)

The dispatcher is the entry point for **untrusted bytes** — `claude --output-format stream-json` writes NDJSON on stdout, but the spec is upstream-controlled (Anthropic changes shape between minor versions). The dispatcher protects against this by importing `ClaudeEvent` from the vendored `claude-code-parser/src/types/protocol` and using a `switch (evt.type)` — but immediately re-casts to `any` in every arm:

```typescript
case "system": {
  const e = evt as any;             // bypasses type system
  if (e.subtype === "init") { ... } // .subtype not type-checked
}
```

The project rules `~/.claude/rules/ecc/typescript/coding-style.md` are explicit:

> Avoid `any` in application code. Use `unknown` for external or untrusted input, then narrow it safely.

Concrete trap: a future upstream change that renames `subtype` to `kind` would silently treat every `system` event as an unknown subtype (the `else` branch in `:108-110` quietly `console.log`s the event), masking a regression that an actual `unknown` + narrow flow would surface at compile-time.

The `as any` casts also reach into `e.message?.content`, `e.event?.delta?.text`, `e.usage?.input_tokens`, `e.total_cost_usd` — all of which are read without runtime type validation. An adversarial NDJSON line like `{"type":"stream_event","event":{"delta":{"type":"text_delta","text": ["a","b"]}}}` (array instead of string) would silently corrupt the assistant message buffer because `findOrCreateStreamingAssistant(state).text += delta.text` becomes string + array = `"<...prev>a,b"`. The malformed-line `catch` at `ChatPanel.svelte:196-198` doesn't help because `JSON.parse(raw)` succeeds.

**Fix:** Replace `as any` with `as unknown` and narrow with a typeof / hasOwnProperty guard, OR (better) define small per-arm Zod schemas and validate at the dispatcher entry. At minimum, run the text_delta path through a `typeof delta.text === "string"` check before `+=`.

```typescript
case "stream_event": {
  const e = evt as unknown as { event?: { delta?: unknown } };
  const delta = e.event?.delta;
  if (
    delta &&
    typeof delta === "object" &&
    "type" in delta &&
    delta.type === "text_delta" &&
    "text" in delta &&
    typeof delta.text === "string"
  ) {
    const cur = findOrCreateStreamingAssistant(state);
    cur.text += delta.text;
  }
  return;
}
```

---

### WR-03: `msgCounter` is module-level mutable state in `stream-dispatch.ts` — violates "no module-scope state leak" invariant explicitly tested for `toolUseGroup`

**File:** `src/lib/stream-dispatch.ts:83-86`
**Severity:** WARNING (cross-test pollution; offline contract regression risk)

The `uid()` helper increments `msgCounter` at module scope. The test file `tests/tool-use-collapsible.test.ts:131-138` explicitly tests "no module-level state leak" for `toolUseGroup` and `freshState()`, but `msgCounter` IS module-level state and IS shared across all `freshState()`-derived passes within the same JS context. Two distinct dispatch streams produced in the same module instance will see monotonically-increasing message IDs (`m_<ts>_0`, `m_<ts>_1`, ...) instead of resetting per-stream.

This is mostly cosmetic at Phase 1 (single session) but it directly conflicts with the documented contract: "the dispatch never reads or writes any module-level store" (`tests/tool-use-collapsible.test.ts:136`). It will bite when Phase 3 introduces multi-session dispatch with N concurrent streams sharing the same module — concurrent counter increments are not atomic in JS (they happen to be atomic in practice on V8 single-event-loop, but the *contract* says no shared state).

The same pattern appears in `ChatPanel.svelte:402-405` (`_uidCounter`) which is component-scoped — fine. The fix for `stream-dispatch.ts` is to either (a) take state as a parameter (pass `state.messages.length` as the seed), or (b) accept a `uidFactory` function that the consumer supplies. Option (b) preserves the existing call sites.

**Fix:**

```typescript
// Move counter to state object; freshState() resets it.
export type DispatchState = {
  // ...existing fields
  _uidCounter: number;
};

export function freshState(): DispatchState {
  return {
    // ...existing
    _uidCounter: 0,
  };
}

function uid(state: DispatchState): string {
  return `m_${Date.now()}_${state._uidCounter++}`;
}
```

Then update all call sites in `dispatchEvent` to pass `state`. The `findOrCreateStreamingAssistant` helper already takes `state`.

---

### WR-04: `SCRATCH_DIR_REGEX` rejects valid POSIX home directories that contain hyphens, dots, or non-ASCII characters

**File:** `src/lib/spawn-args.shared.ts:32`
**Severity:** WARNING (false negative; spawn refused for legitimate users)

```typescript
export const SCRATCH_DIR_REGEX = `^/Users/[^/]+/\\.mneme/scratch$`;
```

`[^/]+` admits anything except `/`, which is correct for POSIX usernames. However the docstring at `src/lib/components/ChatPanel.svelte:318-320` claims:

> Are you on macOS with a standard /Users/<name> home? Phase 1 spawn surface refuses to widen.

This rejects:
- Linux users (`/home/<name>`) — the project is macOS-only per `CLAUDE.md` Platform Requirements, fine.
- macOS Server users with home at `/Volumes/<external>/Users/<name>` (uncommon but legal).
- Future portability to Linux/Windows when Phase X relaxes the macOS-only constraint.

The `[^/]+` body also accepts paths like `/Users/ /. mneme/scratch` (space-only username) — POSIX-legal but indicative of misconfiguration. Tighter validation would be `[A-Za-z0-9_.\-]+`. This is **defensive narrowness for a defense-in-depth check** — the real authorization happens in the capability JSON. Don't over-tighten; just make the regex's intent explicit in the comment.

**Fix:** Either:
1. Narrow the regex body to `[A-Za-z0-9_.\-]+` and add a test in `tests/spawn-args.test.ts` for the space-only case.
2. Leave as-is and update the comment to admit the regex is intentionally permissive within the `/Users/` prefix.

Pick one; current state is inconsistent between docstring and behavior.

---

### WR-05: `Splitter.svelte:82` clamp uses `1 - RATIO_MIN - RATIO_MIN` (0.6) but `RATIO_MAX` is 0.5 — inconsistent ceiling, can produce a non-3-pane layout

**File:** `src/lib/components/Splitter.svelte:82-91, 109`
**Severity:** WARNING (subtle layout regression)

The drag logic:

```typescript
if (dragging === "left") {
  const newLeft = clamp(xRatio, RATIO_MIN, 1 - RATIO_MIN - RATIO_MIN);  // 0.6
  if (newLeft + middleRatio + RATIO_MIN <= 1) {
    leftRatio = newLeft;
  } else {
    leftRatio = newLeft;
    middleRatio = clamp(1 - newLeft - RATIO_MIN, RATIO_MIN, RATIO_MAX); // 0.5 max
  }
}
```

- `RATIO_MIN = 0.20`
- `RATIO_MAX = 0.50` (declared but applied only to middle/right)
- Left clamp ceiling: `1 - 0.20 - 0.20 = 0.60` (NOT `RATIO_MAX`)

So `leftRatio` can grow to 0.60, but `middleRatio` and `rightRatio` are capped at 0.50. When `leftRatio = 0.60`, `middleRatio = 0.20`, `rightRatio = $derived(1 - 0.60 - 0.20) = 0.20`. OK — that satisfies the floor. But the inconsistency means: user drags the left handle aggressively right, middle pane snaps to 0.20, right pane snaps to 0.20. **Then `rightRatio = $derived(Math.max(RATIO_MIN, 1 - leftRatio - middleRatio))`** at `:109` — this `Math.max` saves the layout from going negative if the user drags `leftRatio + middleRatio > 0.80`, but in doing so it makes `leftRatio * 100fr + middleRatio * 100fr + rightRatio * 100fr` not sum to `100fr`. The CSS grid then renders weirdly (overflow or pane collision).

Reproduction: with default 0.30/0.40/0.30, drag the left handle to xRatio=0.59 → newLeft=0.59 → `newLeft + middleRatio + RATIO_MIN = 0.59 + 0.40 + 0.20 = 1.19 > 1`, so the else branch runs → `middleRatio = clamp(1 - 0.59 - 0.20, 0.20, 0.50) = clamp(0.21, 0.20, 0.50) = 0.21`. OK. But then `rightRatio = 1 - 0.59 - 0.21 = 0.20` — floor hit exactly. Now drag again to xRatio=0.61 → newLeft=clamp(0.61, 0.20, 0.60) = 0.60 → `0.60 + 0.21 + 0.20 = 1.01 > 1` → else branch → `middleRatio = clamp(1 - 0.60 - 0.20, 0.20, 0.50) = 0.20`. → `rightRatio = $derived(Math.max(0.20, 1 - 0.60 - 0.20)) = Math.max(0.20, 0.20) = 0.20`. Layout sums to 1.0 — OK.

Now: while the drag is in flight at the threshold, the `onPointerMove` `xRatio` is a continuously updating function of mouse position. Between two animation frames, the user could see `leftRatio=0.60, middleRatio=0.21, rightRatio=0.19` — at THIS frame, `rightRatio = $derived(Math.max(0.20, 0.19)) = 0.20` so the grid template uses `60fr 4px 21fr 4px 20fr` which sums to 101fr ≠ 100. Grid then over-allocates by ~1%, causing a ~12px overflow at 1280px window width.

**Fix:** Use `RATIO_MAX` everywhere or compute the left ceiling as `1 - RATIO_MIN - RATIO_MIN` and document why. Also, after every mutation, normalize so `leftRatio + middleRatio + rightRatio === 1` exactly (a single `rightRatio = 1 - leftRatio - middleRatio` assignment when both other ratios are inside floors).

```typescript
function clampAndNormalize(left: number, middle: number) {
  const l = clamp(left, RATIO_MIN, 1 - RATIO_MIN * 2);
  const m = clamp(middle, RATIO_MIN, 1 - l - RATIO_MIN);
  return { leftRatio: l, middleRatio: m, rightRatio: 1 - l - m };
}
```

---

### WR-06: `scripts/audit-capabilities.sh` uses BSD grep `-E` flag in regex that contains `\s` — not portable across BSD vs GNU grep

**File:** `scripts/audit-capabilities.sh:82, 87`
**Severity:** WARNING (portability — would break on a Linux CI runner)

```bash
if grep -qE 'from\s+"(node:)?(os|fs|path)"' src/lib/spawn-args.shared.ts; then
```

BSD grep (macOS default) does NOT support `\s` in ERE by default — it treats `\s` as a literal `s`. The current developer is on macOS Ventura (per CLAUDE.md), so `\s` matches *literal `s`*; the check accidentally works because the import line `import { homedir } from "node:os"` contains `from ` with a space, and the regex falls through to a substring match via the `(node:)?(os|fs|path)` alternation. But the check would silently miss a tab character (`import\t{ ... } from\t"os"` — uncommon but legal).

**Fix:** Use `[[:space:]]+` (POSIX ERE) instead of `\s+`:

```bash
if grep -qE 'from[[:space:]]+"(node:)?(os|fs|path)"' src/lib/spawn-args.shared.ts; then
```

Same pattern applies at line 87 (single-quoted variant) and line 95 (`NODE_LEAK`).

---

### WR-07: `Splitter.svelte:51` `localStorage.getItem` JSON.parse swallows all errors silently — user has no signal that pane ratios reverted

**File:** `src/lib/components/Splitter.svelte:51-64`
**Severity:** WARNING (silent failure; debugging cost)

```typescript
onMount(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.leftRatio === "number" && typeof parsed.middleRatio === "number") {
        leftRatio = clamp(parsed.leftRatio, RATIO_MIN, RATIO_MAX);
        middleRatio = clamp(parsed.middleRatio, RATIO_MIN, RATIO_MAX);
      }
    }
  } catch {
    // Default values stand — no surfacing, this is a best-effort restore.
  }
});
```

The bare `catch {}` matches the project rule explicitly forbidden ("Never silently swallow errors" — `~/.claude/rules/ecc/common/coding-style.md` Error Handling). Same pattern appears in:
- `Splitter.svelte:97-103` (save side)
- `TitlebarMeta.svelte:27-30` (vaultPath read)

The justification in the comment ("best-effort restore") is reasonable for *user-perceived behavior*, but during development a console.warn on the catch arm would catch a corrupted localStorage entry that's silently reverting the layout every session. **Per project rules: log to console, but don't crash.**

**Fix:**

```typescript
} catch (e) {
  console.warn("[splitter] failed to restore layout from localStorage", e);
  // Default values stand — best-effort restore.
}
```

---

### WR-08: `ChatPanel.svelte:407-414` `isErrorMsg` heuristic uses string-prefix matching on translated content — fragile, locale-sensitive

**File:** `src/lib/components/ChatPanel.svelte:407-414`
**Severity:** WARNING (fragile classification — could miss / mis-classify errors)

```typescript
function isErrorMsg(m: Msg): boolean {
  return (
    m.text.startsWith("Failed to") ||
    m.text.startsWith("stream ended") ||
    m.text.includes("not yet resolved") ||
    m.text.includes("&lt;")        // <-- this is the dangerous one
  );
}
```

The `&lt;` heuristic is meant to detect HTML-escaped error messages. But:
1. Any legitimate system message that contains `<` (a syntactically valid but rare case — e.g. a Claude system event with `subtype === "error"` carrying a message like `cwd not found: </path/with/angle/brackets/>`) will be flagged as an error message and get the `.error` red styling. Mostly harmless visually but inconsistent.
2. Future i18n / translation would break the prefix matches.
3. The `stream ended unexpectedly` message at `:230` is itself a non-error operational state (the subprocess closed without a result event) but the visual treatment marks it red.

**Fix:** Store the error state as a discriminator on the `Msg` shape rather than string-pattern matching:

```typescript
export type Msg = {
  // ...existing
  systemKind?: "error" | "info";
};

// at push sites:
dispatch.messages = [
  ...dispatch.messages,
  { id: uid(), role: "system", systemKind: "error", text: ..., streaming: false },
];

// at render:
<div class="bubble system" class:error={msg.systemKind === "error"}>
```

---

### WR-09: `kill_pgid` integration test (`src-tauri/tests/kill_pgid.rs`) depends on a hard-coded `/tmp/mneme_test_*.pid` path — concurrent test runs collide

**File:** `src-tauri/tests/kill_pgid.rs:46-48`
**Severity:** WARNING (test isolation; CI flakiness)

```rust
const PARENT_PID_FILE: &str = "/tmp/mneme_test_parent.pid";
const CHILD1_PID_FILE: &str = "/tmp/mneme_test_child1.pid";
const CHILD2_PID_FILE: &str = "/tmp/mneme_test_child2.pid";
```

Cargo runs integration tests in parallel by default (`cargo test --test kill_pgid` is fine alone; `cargo test` runs all tests concurrently). If a future Phase 3 multi-session test also uses Python+setsid, the PID files alias and the assertions race. The cleanup-on-entry at `:69` (`cleanup_pid_files`) mitigates but doesn't eliminate the race.

The rest of the test suite already uses `tempfile` (a dev-dep — `Cargo.toml:45`), so the fix is mechanical:

```rust
use tempfile::TempDir;

let tmp = TempDir::new().expect("tempdir");
let parent_pid_file = tmp.path().join("parent.pid");
// pass paths into the Python script via env
let script = format!(r#"
import os, subprocess, time
os.setsid()
parent_pid = os.getpid()
with open(r"{parent_pid_file}", "w") as f:
    f.write(str(parent_pid))
// ...
"#, parent_pid_file = parent_pid_file.display());
```

---

### WR-10: `scripts/screenshot-01-06.mjs` and `scripts/take-screenshot.mjs` reference absolute paths under a deleted worktree

**File:** `scripts/screenshot-01-06.mjs:9-13`, `scripts/take-screenshot.mjs:46-48`
**Severity:** WARNING (dead-on-arrival scripts; misleading documentation)

```javascript
const SCREENSHOT_DIR = resolve(
  "/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.claude/worktrees/agent-aeff29bb776aaf470/.planning/..."
);
const PROTOTYPE_PATH =
  "file:///Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.claude/worktrees/agent-aeff29bb776aaf470/.planning/handoff/...";
```

The `agent-aeff29bb776aaf470` worktree doesn't exist anymore (`.claude/worktrees/` is per-session). Running these scripts at the current commit either errors out (path-not-found) or writes screenshots into a directory that doesn't represent the current planning state.

**Fix:** Resolve paths relative to the script location:

```javascript
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = resolve(__dirname, "..", ".planning/phases/01-tauri-shell-foundation-subprocess-hardening/design/screenshots");
const PROTOTYPE_PATH = `file://${resolve(__dirname, "..", ".planning/handoff/2026-05-09-mneme-prototype/mneme/project/Mneme.html")}`;
```

Or — given these are one-shot visual-verify scripts — delete them if they aren't tracked as the canonical visual-fidelity tool. The Phase 01.1 dev-feedback-loop seems to be the replacement; if so, leaving the obsolete scripts in `scripts/` creates a trap for future contributors.

---

### WR-11: `sanitize.ts:61` uses `e: any` for the caught error — explicit violation of project's "narrow `unknown` with `instanceof Error`" rule

**File:** `src/lib/sanitize.ts:61-65`
**Severity:** WARNING (rule violation; not a bug)

```typescript
} catch (e: any) {
  const escapedMsg = escapeHtml(typeof e?.message === "string" ? e.message : String(e));
  return `<span class="katex-error">[KaTeX error: ${escapedMsg}]</span>`;
}
```

Project rule `~/.claude/rules/ecc/typescript/coding-style.md` Error Handling:

> Use async/await with try-catch and narrow unknown errors safely.
> ```typescript
> } catch (error: unknown) {
>   if (error instanceof Error) { return error.message; }
>   return "Unexpected error";
> }
> ```

The current code achieves the same safety as the rule prescribes (the optional-chaining `e?.message` short-circuits non-error throws), but the type annotation is `any` instead of `unknown`. Trivial fix:

```typescript
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return `<span class="katex-error">[KaTeX error: ${escapeHtml(msg)}]</span>`;
}
```

---

### WR-12: `tests/manual/lifecycle/run-quit-loop.sh` orphan grep includes `[r]g[ -]` — false-positive on any unrelated `ripgrep` process

**File:** `tests/manual/lifecycle/run-quit-loop.sh:41-46`
**Severity:** WARNING (test specificity)

```bash
orphan_count() {
  ps aux \
    | grep -E "[c]laude --print|[m]cp[ -]|[r]g[ -]|[r]ipgrep" \
    | grep -v "grep -E" \
    | wc -l \
    | tr -d ' '
}
```

`[r]g[ -]` matches any `rg ` or `rg-...` command in `ps aux` — that includes:
- The developer's IDE running ripgrep for a project-wide search.
- A separate Claude Code session in another terminal.
- `cargo` running a build with `rg` in its argv (unlikely but possible).

The test then attributes every `rg` process to a Phase 1 orphan and fails the harness. The patterns `[c]laude --print` (specific) and `[m]cp[ -]` (MCP server processes specifically — narrow enough) are fine; `[r]g[ -]` and `[r]ipgrep` are too broad.

**Fix:** Constrain by parent PID (the harness knows the `tauri_pid` from `:122`):

```bash
orphan_count() {
  # Only count processes whose parent is dead OR descended from the harness's tauri_pid
  pgrep -P "$tauri_pid" 2>/dev/null | wc -l | tr -d ' '
}
```

Or scope the grep to `claude --print` only — that IS the Phase 1 subprocess of interest. The MCP / rg / ripgrep ones are Phase 1.x (when MCP integration ships).

## Info

### IN-01: `scripts/gen-capabilities.ts:78-85` keeps `DEV_ONLY_PERMISSIONS` array purely as documentation — should be a comment

**File:** `scripts/gen-capabilities.ts:78-85`

```typescript
const DEV_ONLY_PERMISSIONS: string[] = [
  "allow-dev-log-console-entry",
  // ...
];
void DEV_ONLY_PERMISSIONS; // suppress "unused" — kept for documentation
```

The comment immediately above (lines 43-77) is the actual documentation. The variable + `void` suppression adds nothing the comment doesn't already say, and confuses readers grepping for capability identifiers. Move the array values into a comment block:

```typescript
// Phase 01.1 (D-TR-04 + R9 Approach A): the following dev-only Tauri commands
// are intentionally NOT spread into the capability JSON — see comment above:
//   allow-dev-log-console-entry
//   allow-dev-log-network-entry
//   allow-dev-log-perf-entry
//   allow-dev-capture-screenshot
//   allow-dev-query-state
```

---

### IN-02: `src/lib/styles/tokens.css:81-160` "LEGACY COMPAT TOKENS" block is 80+ lines of `--foo: var(--bar);` aliases — should be split or deleted

**File:** `src/lib/styles/tokens.css:81-160`

The legacy compatibility tokens (`--bg`, `--bg-soft`, `--ink`, `--orange-deep`, `--r-xs`, `--s-md`, `--fs-body`, `--d-fast`, etc.) are documented as "kept for components written against the 01-05 / 01-06 token names." Phase 1 plan 01-09 already swept the components to the Mneme.html native tokens — grep `src/lib/components` for `var(--bg)` returns 1 match (`Splitter.svelte:182, 185`); `var(--r-sm)` returns zero; `var(--fs-body)` returns zero; `var(--d-base)` returns zero.

Most of the legacy block is therefore dead code waiting to be removed. Either:
1. Audit + delete unused tokens (use a tool like `purgecss` or a manual `grep -rn 'var(--bg)' src/` sweep).
2. Move the still-used legacy aliases into a `legacy-tokens.css` sub-file that loads after `tokens.css` so deletion is one-step in a future cleanup.

---

### IN-03: `connection-state.svelte.ts:27` exports a mutable singleton — rule violation but Svelte-idiomatic

**File:** `src/lib/connection-state.svelte.ts:27-33`

```typescript
export const connectionState = $state<{ status: ConnectionStatus }>({
  status: "disconnected",
});

export function setStatus(status: ConnectionStatus): void {
  connectionState.status = status;
}
```

Project rule "Immutability (CRITICAL)" says "ALWAYS create new objects, NEVER mutate existing ones." Svelte 5 runes specifically require mutation (`connectionState.status = "connecting"`) to trigger reactivity; you cannot reassign the `connectionState` const to a new object and have other components see the change without going through a Svelte store.

This is a legitimate exception (Svelte-idiomatic vs general rule) — leave the code as-is, but document the exception in `src/lib/connection-state.svelte.ts` header so a future contributor (or reviewer) doesn't waste time flagging it. Add:

```typescript
// EXCEPTION TO IMMUTABILITY RULE: Svelte 5 runes require in-place mutation
// of the `$state` reactive object to trigger fine-grained reactivity.
// Replacing the export with `let connectionState = $state({...})` would
// require a `connectionState = { status: "connecting" }` reassignment that
// is not visible to importers (Svelte tracks the original binding, not
// the rebinding). Mutation is the documented Svelte 5 idiom.
```

---

### IN-04: `package.json:14` `prebuild` invokes the generator + audit serially — should fail fast on either

**File:** `package.json:14`

```json
"prebuild": "node --experimental-strip-types scripts/gen-capabilities.ts && bash scripts/audit-capabilities.sh",
```

`&&` already gates on the generator's exit, so the audit only runs after a successful regen. Good. But: the regen overwrites `default.json` BEFORE the audit checks for drift. So the audit's drift check `:34` (`diff <(...) src-tauri/capabilities/default.json`) ALWAYS passes when prebuild runs, because both inputs are now in sync. This effectively means the drift check is a Husky pre-commit-only check, not a prebuild check.

That's fine if the intent is "Husky validates committed state; prebuild rebuilds." But the audit script's stated purpose (`:32-33`) implies both run identical checks. The other checks (wildcard, --bare, browser-safety) are still meaningful at prebuild.

**Fix:** Either document the intent ("prebuild regenerates AND audits non-drift checks; Husky audits everything including drift"), or skip the regen in the audit path:

```json
"prebuild": "node --experimental-strip-types scripts/gen-capabilities.ts && bash scripts/audit-capabilities.sh --skip-drift",
```

with the audit script honoring the flag.

---

### IN-05: `src/routes/+page.svelte:34` `data-tauri-drag-region` on `.stage` could let user accidentally drag the window via the 24px matte bezel

**File:** `src/routes/+page.svelte:34-35`

```html
<div class="stage" data-tauri-drag-region>
  <div class="window" data-tauri-drag-region="false">
```

The comment at `:30-33` says this is intentional — the 24px stage bezel is a drag surface, the inner window opts out, and the titlebar opts back in via its own `data-tauri-drag-region`. This works on macOS but creates a UX trap: on small viewports (`@media (max-height: 920px)` at `:150`), the stage padding collapses to 0 — meaning the `.stage` element is now zero-width around the `.window` element. Any pointerdown on the body that doesn't hit `.window` falls into `.stage` → window drags. Practically, this is the body background. A user can drag the OS window by clicking the 1px gap between the body edge and the window edge, which happens to be invisible on small viewports.

Not a bug per se — Tauri's `data-tauri-drag-region` is well-tested — but worth a regression test that asserts on `(max-width: 1340px)` the `.stage` element has zero pointer-event surface.

**Fix:** Add `pointer-events: none` to `.stage` in the small-viewport media query, then explicitly re-enable on `.titlebar`:

```css
@media (max-height: 920px), (max-width: 1340px) {
  .stage { padding: 0; pointer-events: none; }
  .stage > .window { pointer-events: auto; }
}
```

---

### IN-06: `tests/sanitize.test.ts:55-59` KaTeX `\href{javascript:...}` test passes but the query selector is wrong

**File:** `tests/sanitize.test.ts:55-59`

```typescript
it("blocks KaTeX \\href{javascript:...} via trust:false", () => {
  const html = renderKatex("\\href{javascript:alert(6)}{x}");
  const doc = new DOMParser().parseFromString(html, "text/html");
  expect(alertSpy).not.toHaveBeenCalled();
  expect(doc.querySelector("a[href^='javascript:']")).toBeNull();
});
```

The test selector `a[href^='javascript:']` looks for an `<a>` whose href starts with `javascript:`. KaTeX with `trust:false` doesn't render the `\href` macro at all — it emits a `.mord` or similar error span, NOT an `<a>`. So `doc.querySelector("a[href^='javascript:']")` returns `null` regardless of whether KaTeX rendered the link safely or not. The test would also pass if KaTeX silently emitted `<a href="javascript:alert(6)">` outside an `<a>` tag (impossible but the test wouldn't catch it).

**Fix:** Assert on the actual KaTeX trust:false behavior — the rendered HTML should contain the `\href` literal text (i.e., not interpreted):

```typescript
it("blocks KaTeX \\href{javascript:...} via trust:false", () => {
  const html = renderKatex("\\href{javascript:alert(6)}{x}");
  const doc = new DOMParser().parseFromString(html, "text/html");
  expect(alertSpy).not.toHaveBeenCalled();
  // No anchor element with javascript: href anywhere in the output
  for (const a of doc.querySelectorAll("a")) {
    const href = a.getAttribute("href") ?? "";
    expect(href).not.toMatch(/^javascript:/i);
  }
  // (Optional stronger assertion: KaTeX should emit an error span.)
});
```

---

### IN-07: `src-tauri/capabilities/default.json` duplicates the `claude-bin` allow entry across `shell:allow-spawn` and `shell:allow-execute`

**File:** `src-tauri/capabilities/default.json:12-111`

The same 13-element validator array is duplicated verbatim in both permission scopes. The audit covers structural identity (`tests/capability-regex.test.ts:103-108`), but the generator emits the duplicated structure (`scripts/gen-capabilities.ts:119-124`):

```typescript
{
  identifier: "shell:allow-spawn",
  allow: [{ name: "claude-bin", cmd: "claude", args: ARG_VALIDATORS }],
},
{
  identifier: "shell:allow-execute",
  allow: [{ name: "claude-bin", cmd: "claude", args: ARG_VALIDATORS }],
},
```

`shell:allow-execute` covers `Command.execute()` (returns final stdout); `shell:allow-spawn` covers `Command.spawn()` (returns Child handle). Phase 1 only uses `spawn()` (`ChatPanel.svelte:243`). The `shell:allow-execute` entry is forward-compat for v1.x — fine. But:
1. The duplicated structure doubles the audit failure surface (any future arg-order change must update two places).
2. If Phase 1 actually never calls `Command.execute()`, the `allow-execute` permission is dead capability.

Either drop the `allow-execute` scope entirely (Phase 4+ adds back if Echo360 webview needs sync subprocess), or refactor the generator to emit a single capability source-of-truth that both scopes share by reference.

---

_Reviewed: 2026-05-14T03:53:07Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
