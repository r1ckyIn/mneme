---
phase: 01-tauri-shell-foundation-subprocess-hardening
reviewed: 2026-05-14T08:30:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - scripts/audit-capabilities.sh
  - scripts/gen-capabilities.ts
  - src-tauri/capabilities/default.json
  - src/lib/components/AssistantMessage.svelte
  - src/lib/components/ChatPanel.svelte
  - src/lib/spawn-args.shared.ts
  - src/lib/stream-dispatch.ts
  - tests/audit/fixture-append-system-prompt.json
  - tests/audit/fixture-clean.json
  - tests/audit/fixture-system-prompt-rejected.json
  - tests/audit/test-audit-script.sh
  - tests/capability-regex.test.ts
  - tests/spawn-args.test.ts
  - tests/stream-dispatch.test.ts
findings:
  critical: 1
  warning: 5
  info: 4
  total: 10
status: issues_found
---

# Phase 01 (Gap Closure): Code Review Report

**Reviewed:** 2026-05-14T08:30:00Z
**Depth:** standard
**Files Reviewed:** 14
**Scope:** Plans 01-12 (session resume + chat-rendering hints) + 01-13 (docs amendment). Plans 01-01..01-10 received prior review (preserved as `01-REVIEW.pre-gap-closure.md`).
**Status:** issues_found (1 BLOCKER · 5 WARNING · 4 INFO)

## Summary

The gap-closure additions for Phase 01 are largely well-engineered. Defense-in-depth at the three capability layers (SSOT → validator → audit) is preserved; KP-04 OAuth compliance (`--bare` absent, `--system-prompt` full-replacement now also absent) is enforced at both the validator-layer (audit check 4b) and SSOT-layer (audit check 9); the Option-B dual-Command-names topology (`claude-bin-fresh` / `claude-bin-resume`) cleanly avoids Tauri's shell-plugin scope shadowing pitfall; the dispatcher's `session_id` capture and `freshState()` initialization are sane; backward-compat for the 2-arg `buildClaudeArgs()` call shape is preserved with explicit tests; all 74 unit/regex/dispatch tests pass; `svelte-check` reports 0 errors and 0 warnings; audit gate (`scripts/audit-capabilities.sh`) passes with zero findings on the production JSON; gen-capabilities is regen-idempotent (`diff --exit-code` returns 0); the audit fixture integration test (`tests/audit/test-audit-script.sh`) reports 7/7 cases PASS.

That said, one **BLOCKER** emerged from tracing the `setStatus()` state machine across the 4 enumerated transition sites: the `cmd.on("close")` path is not represented. If a `claude` subprocess exits naturally without ever emitting a `text_delta` (a realistic case — auth handshake error producing only stderr; rate-limit immediate close; spurious early-EOF), the connection-state dot is left stuck at "connecting" for the rest of the app session because `setStatus("connected")` only fires on first text_delta and `setStatus("disconnected")` only fires on three error paths and on destroy. The plan 01-12 GAP-1 contract enumerated four sites but missed this one. See **CR-01** below.

Beyond the BLOCKER, findings are mostly test-quality and defense-in-depth tautology concerns. None of them re-opens the 49-threat register; the KP-04 invariant chain is intact at all three layers.

## Critical Issues

### CR-01: Connection state can permanently stick at "connecting" after a natural subprocess close that emitted no text_delta

**File:** `src/lib/components/ChatPanel.svelte:250-272`

**Issue:**

Plan 01-12 GAP-1 promised that `setStatus("disconnected")` fires only at four enumerated sites and that the per-prompt `teardown()` primitive no longer touches connection state. The four sites are:

- `onDestroy` (L448 — "app close")
- `cmd.on("error")` (L241 — "spawn-level error")
- spawn-or-register catch (L283 — "spawn() rejected OR register_session_pid IPC failed")
- scratchDir-unresolved early return (the comment at L300-306 enumerates this but the actual no-op early return at L133-147 does NOT call `setStatus`)

`setStatus("connected")` fires at exactly one site (L213): the first observed `text_delta`.

Now consider the natural-close-without-text-delta path. After `onMount` flips status to `"connecting"`:

1. User sends a prompt.
2. `cmd.spawn()` succeeds and `register_session_pid` succeeds.
3. The subprocess emits zero or more non-text-delta events (e.g., `system/init`, `system/error`, an immediate `result` with no content, or simply nothing).
4. `cmd.on("close")` fires (L250-272) — `teardown()` runs (no status change per the new contract), the "stream ended unexpectedly" info bubble is appended, the handler returns.

At no point did `setStatus("connected")` or `setStatus("disconnected")` fire. The connection-state rune stays at `"connecting"` for the rest of the app session.

Reproduction without a live claude CLI: any path that closes the subprocess before delivering a `text_delta` exhibits this. Realistic triggers include (a) the OAuth keychain failing silently so claude exits with a stderr-only complaint; (b) a `--max-turns` early termination on a turn that emitted only tool_use without text; (c) network jitter causing premature SIGPIPE on stdout.

Worse: clicking Send a second time runs the same path again (because `dispatch.isStreaming` is correctly reset by `teardown()`). The titlebar continues to display "connecting" indefinitely while the user keeps sending prompts and getting nothing back. The user has no in-app signal that the subprocess actually failed.

**Fix:**

Add an explicit terminal-state transition at the top of `cmd.on("close")`:

```svelte
cmd.on("close", () => {
  // Plan 01-12 GAP-1 missing site (e): natural subprocess close without a
  // text_delta. setStatus("connected") never fired, and the close path is not
  // a spawn-level error so cmd.on("error") didn't fire either. Flip to
  // disconnected when the close happens before any text was delivered so the
  // titlebar stops gaslighting the user with a stuck "connecting" dot.
  if (!firstTextDeltaSeen) {
    setStatus("disconnected");
  }
  teardown();
  if (!dispatch.resultReceived) {
    // ... existing "stream ended unexpectedly" bubble ...
  }
  scheduleHtmlRecompute();
});
```

Alternative: flip unconditionally on every close (simpler, but loses the "we were connected and now reconnected" history if you later add re-connect logic). Given Phase 1 has no re-connect path, the conditional form above is enough; it matches Claude.ai web's "grey-orange while a stream is starting" UX.

Then in the next prompt's `sendPrompt`, before the spawn block, transition back to `"connecting"` so the dot re-engages:

```svelte
async function sendPrompt() {
  // ... validation ...
  setStatus("connecting"); // re-engage per-prompt; onMount only covers the initial app boot
  // ... rest unchanged ...
}
```

This restores the per-prompt connection feedback that plan 01-12 GAP-1's A-16 contract appears to have inadvertently removed by deleting both the `teardown()`-time and the `sendPrompt()`-time `setStatus` calls.

## Warnings

### WR-01: `fixture-append-system-prompt.json` is byte-identical to `fixture-clean.json` and to production `default.json` — the "positive fixture" adds zero distinct coverage

**File:** `tests/audit/fixture-append-system-prompt.json:1-240`
**File:** `tests/audit/fixture-clean.json:1-240`
**File:** `tests/audit/test-audit-script.sh:42,46`

**Issue:**

Verified via `md5`:

```
7d0cac16edfa868c0ea9dc67e68127da  tests/audit/fixture-append-system-prompt.json
7d0cac16edfa868c0ea9dc67e68127da  tests/audit/fixture-clean.json
7d0cac16edfa868c0ea9dc67e68127da  src-tauri/capabilities/default.json
```

All three files have identical bytes. The test cases at L42 and L46 of `test-audit-script.sh`:

```bash
run_case "fixture-clean (matches SSOT)"        tests/audit/fixture-clean.json        0
run_case "fixture-append-system-prompt (accepts --append-system-prompt)"  tests/audit/fixture-append-system-prompt.json  0
```

are testing the exact same input twice. The L46 case adds no distinct test path — when both files are byte-equal to production, both runs exercise the same code path (audit gate runs against an unchanged JSON and returns 0). The L46 label promises to verify that the audit **accepts** `--append-system-prompt` specifically, but since `fixture-clean` already contains `--append-system-prompt` in its 14 occurrences, that property was already covered.

This is a TDD-evidence gap: plan 01-12 marked the audit check 9 / check 4b acceptance side as TDD-verified, but the positive fixture is a duplicate.

**Fix:**

Either delete the duplicate fixture and the L46 test case (and rename the line 42 case to mention the acceptance property), OR mutate the fixture in a way that exercises a distinct positive path. Examples:

1. Reformat the JSON with different indentation (e.g., 4-space instead of 2-space). The audit's check 1 (`diff` against `gen-capabilities --dry-run`) would still fail, so this only works if the audit allowed JSON-equivalent variations — which it does not.
2. Construct a fixture where `--append-system-prompt`'s value validator literal differs from `CHAT_RENDERING_HINTS` by a benign whitespace tweak (would fail check 1 too — same problem).

Given the audit's check 1 is unconditional and bypasses all downstream checks, no realistic "accept --append-system-prompt at the validator layer in isolation" positive fixture exists. The honest fix is to **delete the L46 case** and update the doc / plan to mark the positive side as "covered by check 1 implicitly — production JSON contains the literal, audit passes, ergo --append-system-prompt is accepted." That matches the actual test surface.

### WR-02: `fixture-system-prompt-rejected.json` does not isolate audit check 4b — check 1 fires first and masks 4b's contribution

**File:** `tests/audit/fixture-system-prompt-rejected.json:56`
**File:** `tests/audit/test-audit-script.sh:47`
**File:** `scripts/audit-capabilities.sh:34-38,57-71`

**Issue:**

The negative fixture mutates ONE line (validator at index 14 of `claude-bin-fresh` allow-spawn) from `^--append-system-prompt$` to `^--system-prompt$`. Verified via `diff`:

```
56c56
<               "validator": "^--system-prompt$"
---
>               "validator": "^--append-system-prompt$"
```

When the audit runs on this fixture, BOTH check 1 (SSOT drift — verified independently: `diff` against `gen-capabilities --dry-run` exits 1) AND check 4b (`--system-prompt` validator regex match) fire. Empirically:

```
[audit] FAIL: SSOT drift between spawn-args.shared/node.ts and src-tauri/capabilities/default.json
[audit] FAIL: '--system-prompt' (full replacement) validator detected — Phase 9 REQ-17 scope, NOT Phase 1
```

The test only asserts `expected_exit=1` — it cannot distinguish "check 4b detected the violation" from "check 1 noticed JSON drift and the 4b match was a bonus." If check 4b were silently removed from `audit-capabilities.sh`, the test would still pass on this fixture because check 1 alone catches the same drift.

This is a test-isolation defect. The TDD plan claimed check 4b was independently RED-then-GREEN-verified; the actual test does not prove that.

**Fix:**

Either:
1. Add a second assertion to the integration test that captures stderr and grep-asserts `--system-prompt` appears in the failure output (specific to check 4b's error message).
2. Construct a fixture that passes check 1 but fails check 4b. This requires a JSON whose `gen-capabilities --dry-run` produces it — which means modifying `gen-capabilities.ts` to emit a `--system-prompt` validator. That defeats the purpose.
3. Refactor `audit-capabilities.sh` to allow `--skip-ssot-drift` mode for tests, then run the rejected fixture under that mode and assert check 4b alone still fails.

Option 1 is the cheapest and clearest. Suggested patch to `test-audit-script.sh`:

```bash
# Stricter variant: ensure the specific check fires, not just that audit fails.
run_case_strict_4b() {
  local label="$1"; local fixture="$2"
  cp -f "$fixture" "$REAL_JSON"
  local stderr=$(bash scripts/audit-capabilities.sh 2>&1 >/dev/null)
  if echo "$stderr" | grep -q "'--system-prompt' (full replacement) validator detected"; then
    echo "[PASS] $label (check 4b fired)"
  else
    echo "[FAIL] $label (check 4b did NOT fire — only check 1 caught it)"
    FAIL=1
  fi
}
run_case_strict_4b "check 4b specifically fires on standalone --system-prompt" tests/audit/fixture-system-prompt-rejected.json
```

### WR-03: `SYSTEM_PROMPT_MAX_LEN` cap is tautological — defined as `CHAT_RENDERING_HINTS.length`, so the bounds-check at L120-126 can never reject the canonical literal

**File:** `src/lib/spawn-args.shared.ts:82`
**File:** `src/lib/spawn-args.shared.ts:119-126`
**File:** `tests/spawn-args.test.ts:230-234`

**Issue:**

L82:

```ts
export const SYSTEM_PROMPT_MAX_LEN = CHAT_RENDERING_HINTS.length;
```

L119-126:

```ts
if (
  opts.appendSystemPrompt !== undefined &&
  opts.appendSystemPrompt.length > SYSTEM_PROMPT_MAX_LEN
) {
  throw new Error(...);
}
```

The cap is set to the length of the only canonical value the call site ever passes (`CHAT_RENDERING_HINTS`, hard-coded in ChatPanel L178). So:

- The canonical call (`appendSystemPrompt: CHAT_RENDERING_HINTS`) has `opts.appendSystemPrompt.length === SYSTEM_PROMPT_MAX_LEN` — not strictly greater than — so the check passes.
- Any other caller would have to pass a string ≤ 260 chars to satisfy the cap. Since there are no other callers in Phase 1, the cap is effectively dead code.

The test at L230-234 of `spawn-args.test.ts`:

```ts
it("CHAT_RENDERING_HINTS string is non-empty AND length ≤ SYSTEM_PROMPT_MAX_LEN AND length ≤ 500", () => {
  expect(CHAT_RENDERING_HINTS.length).toBeGreaterThan(0);
  expect(CHAT_RENDERING_HINTS.length).toBeLessThanOrEqual(SYSTEM_PROMPT_MAX_LEN);
  expect(CHAT_RENDERING_HINTS.length).toBeLessThanOrEqual(500);
});
```

contains a tautology: `CHAT_RENDERING_HINTS.length <= SYSTEM_PROMPT_MAX_LEN` is always true because `SYSTEM_PROMPT_MAX_LEN === CHAT_RENDERING_HINTS.length`. This assertion can never fail. The `<= 500` part is the real assertion (the only non-tautological line is the third); the second line should be deleted or rephrased.

The "audit gate has a fixed upper bound to refuse drift" claim in the comment at L78-81 is undermined by this design — if a future maintainer edits `CHAT_RENDERING_HINTS` to be much longer, `SYSTEM_PROMPT_MAX_LEN` automatically grows in lockstep and the cap continues to permit the new length. Drift is not refused.

**Fix:**

Pick one:

1. **Hard-code the cap** (recommended): replace `= CHAT_RENDERING_HINTS.length` with `= 500` (or whatever upper bound you actually want to refuse drift above). Then the bounds check has real teeth, and the audit / tests give a meaningful signal. Update L230-234 accordingly:

   ```ts
   it("CHAT_RENDERING_HINTS fits within SYSTEM_PROMPT_MAX_LEN (drift sentinel)", () => {
     expect(CHAT_RENDERING_HINTS.length).toBeLessThanOrEqual(SYSTEM_PROMPT_MAX_LEN);
   });
   ```

   The test now fails if anyone bumps `CHAT_RENDERING_HINTS` past the hard cap.

2. **Delete the cap entirely** as YAGNI — Phase 1 has one caller passing one literal, and that literal is anchored in the capability validator. The defense-in-depth comment at L78-81 is aspirational; admit it.

Either fix removes the tautology. Option 1 preserves the intent; option 2 reduces accidental complexity.

### WR-04: Dispatcher accepts arbitrarily-long `session_id` into state without bounds, RAM-pinned until next system/init

**File:** `src/lib/stream-dispatch.ts:156-158`

**Issue:**

L154-158:

```ts
if (typeof evt.session_id === "string" && evt.session_id.length > 0) {
  state.sessionId = evt.session_id;
}
```

Verified empirically — feeding a 10 MB string via `dispatchEvent({type:"system", subtype:"init", session_id: "x".repeat(10_000_000)})` results in the 10 MB string being stored verbatim in `state.sessionId`. The subsequent spawn boundary (`buildClaudeArgs` → `SESSION_ID_REGEX`) rejects it, so the user cannot weaponize it for argv injection. But:

1. The 10 MB string sits in WebView memory until the next system/init replaces it (or app close).
2. Every reactive `$state` change that touches the object containing `sessionId` (via Svelte 5's proxy) walks the string for change detection — not a hot path here, but unbounded inputs always invite future regressions.
3. Worse: `console.log(\`[claude:init] session=${evt.session_id ?? "?"} ...\`)` at L148-150 stringifies the entire 10 MB blob into the dev console (and, in dev mode, into the `.dev-logs/console.log` file via the forwarder). That CAN exhaust disk on a malicious feed.

This is a defense-in-depth gap, not a security incident — the spawn validator is the real gate. But the dispatcher's "accept whatever wire-format Claude emits" stance (per L154-155 comment) is overly trusting given the input is untrusted NDJSON.

**Fix:**

Cap the session_id length at the dispatcher boundary BEFORE storing or logging:

```ts
// Same defense-in-depth narrowness as the spawn validator (SESSION_ID_REGEX
// expects 36 chars exactly). Don't store / log past that.
const SESSION_ID_MAX_LEN = 64; // generous slack vs the 36-char UUID format
if (
  typeof evt.session_id === "string" &&
  evt.session_id.length > 0 &&
  evt.session_id.length <= SESSION_ID_MAX_LEN
) {
  state.sessionId = evt.session_id;
}
```

This matches the existing pattern used for the `appendSystemPrompt` bounds check and keeps the dispatcher's contract honest: "accept the wire format, but refuse pathological inputs that could not possibly be a real session id."

Note: this is **not** a regex check (that lives at the spawn boundary, which is correct per the comment). It's a length sanity check.

### WR-05: `if (!host || rafScheduled) return` reads `host` before the streaming early-return, but Svelte 5 effects re-run on host-bind too — fine, but the order is brittle

**File:** `src/lib/components/AssistantMessage.svelte:35-57`

**Issue:**

The effect reads:

```ts
$effect(() => {
  void html;                        // dependency tracking for html
  if (!host || rafScheduled) return; // dependency tracking for host
  if (streaming) return;             // dependency tracking for streaming
  rafScheduled = true;
  requestAnimationFrame(() => {
    rafScheduled = false;
    if (host) renderKatexInDom(host);
  });
});
```

In Svelte 5, $effect tracks every reactive read during synchronous execution. After the first early-return at `!host`, subsequent reads (`streaming`) are NOT in the dependency set for that effect run. On the next render when `host` becomes defined (via `bind:this`), the effect re-runs, reads `streaming`, and from then on `streaming` is tracked.

This works in practice because `host` is set via `bind:this` BEFORE the first content arrives. But the dependency-graph order is subtle:

- Initial mount: `host=undefined`, `streaming=true`. Effect runs, returns at `!host`. NO dependency on `streaming` was registered.
- After mount: `host` is bound. Effect re-runs (host changed). Reads `streaming=true`, returns. NOW depends on `streaming`.
- Streaming flips false: Effect re-runs (streaming changed). Reads streaming=false, runs `renderKatexInDom`.

This works, but if any future refactor changes the early-return order (e.g., moves `if (streaming) return` above `if (!host) return`), the effect may register `streaming` as a dep but not `host`, causing it to miss host-bind re-runs.

Also: the `void html;` at L49 is fine for dependency tracking, but the comment doesn't say so. A casual reader might think this is dead code and remove it.

**Fix:**

1. Make the dependency reads explicit and ordered with a comment:

```ts
$effect(() => {
  // Track all three reactive deps EAGERLY so the effect re-runs on any change.
  // Svelte 5 tracks reads, not values; reading once at the top guarantees
  // the dep set is stable across early returns.
  const _html = html;
  const _host = host;
  const _streaming = streaming;
  void _html;
  if (!_host || rafScheduled) return;
  if (_streaming) return;
  rafScheduled = true;
  requestAnimationFrame(() => {
    rafScheduled = false;
    if (_host) renderKatexInDom(_host);
  });
});
```

2. Or simply add a comment line above L49: `// Dependencies: html, host, streaming. ORDER MATTERS — host is bound after mount, so tracking host first ensures the effect re-runs.`

This is a low-severity hardening; the current code works in observed cases.

## Info

### IN-01: Audit check 4b regex alternation `([^-]|^)` does not match `--system-prompt` at the literal-start-of-validator-string position when no preceding chars exist

**File:** `scripts/audit-capabilities.sh:68`

**Issue:**

The regex:

```bash
'"validator":[[:space:]]*"[^"]*([^-]|^)--system-prompt[^"]*"'
```

requires either a non-dash preceding character OR start-of-line before `--system-prompt`. In ERE, `^` inside a sub-pattern at this position means start-of-line — which is the start of the GREP INPUT LINE, not the start of the validator string. Since the line always contains text before the validator (at minimum `"validator": "`), `^` cannot fire.

This means `--system-prompt` AT THE LITERAL START OF THE VALIDATOR STRING (with no `^` regex-anchor in the validator itself) is detectable only via the `[^-]` branch — which requires a preceding non-dash char. The opening `"` (quote) before the validator value is non-dash, so this case fires.

I tested all realistic mutations:

- `"validator":"--system-prompt"` → matches (`[^-]` fires on the leading `"`)
- `"validator":"^--system-prompt$"` → matches (`[^-]` fires on `^`)
- `"validator":"^#--system-prompt$"` → matches (`[^-]` fires on `#`)
- `"validator":"^----system-prompt$"` → DOES NOT MATCH (the char before `--system-prompt` is `-`; alternation fails)

The last case is theoretical only — `----system-prompt` is not a valid claude flag and the SSOT (check 9) would catch the literal `"--system-prompt"` regardless of how many leading dashes. The audit's check 1 (SSOT drift) would also catch any hand-edited JSON that didn't come from `gen-capabilities.ts`. Defense-in-depth is intact.

**Fix:**

Nothing required. Either accept the theoretical edge-case as guarded by check 1, OR replace the alternation with a simpler `--system-prompt` that doesn't require negation:

```bash
# Stricter form: detect --system-prompt unless it follows `append-`.
if grep -E '"validator":[[:space:]]*"[^"]*(^|[^a-z-])--system-prompt[^"]*"' src-tauri/capabilities/default.json >/dev/null 2>&1; then
```

The improvement is marginal; current form is acceptable.

### IN-02: Audit check 9 SSOT grep can be evaded by string concatenation in `spawn-args.shared.ts`

**File:** `scripts/audit-capabilities.sh:131`
**File:** `src/lib/spawn-args.shared.ts` (hypothetical)

**Issue:**

Check 9 greps for the exact literal `"--system-prompt"` (with surrounding double quotes). String concatenation evades:

```ts
export const FLAG = "--system-prom" + "pt"; // grep misses
```

Or template literals:

```ts
export const FLAG = `--${'system'}-prompt`; // grep misses
```

This is not a real-world attack — a malicious maintainer with commit access can do worse than this. But it's a defense-in-depth weakness worth recording.

**Fix:**

Add a semantic check (compile + introspect the spawn-args module) instead of / in addition to the grep. Since `gen-capabilities.ts` already imports `buildClaudeArgs` at audit time, the audit could:

```ts
// In gen-capabilities or a sibling audit script:
const sample = buildClaudeArgs("p", SCRATCH_DIR, { appendSystemPrompt: CHAT_RENDERING_HINTS, resumeSessionId: "00000000-0000-0000-0000-000000000000" });
if (sample.includes("--system-prompt")) process.exit(1);
```

This is robust against any source-level encoding. Not urgent.

### IN-03: AssistantMessage uses hardcoded font-size values (21 / 17.5 / 15.5 px) instead of token references

**File:** `src/lib/components/AssistantMessage.svelte:126,138,148`

**Issue:**

Plan 01-12 GAP-2 added h1/h2/h3 differentiated CSS scale (21 / 17.5 / 15.5 px). These are hardcoded inline:

```css
.msg-assistant :global(h1) { font-size: 21px; ... }
.msg-assistant :global(h2) { font-size: 17.5px; ... }
.msg-assistant :global(h3) { font-size: 15.5px; ... }
```

`tokens.css` does NOT export `--text-h1` / `--text-h2` / `--text-h3` tokens. This is consistent with the rest of the codebase (hardcoded px values are pervasive across 30+ usages in `src/lib/components/*.svelte`), so this is NOT a regression of the gap-closure — it's an existing project convention.

That said, the "Living visual contract" memory note (`feedback_living_visual_contract`) explicitly forbids "裸 hex / ms / px" for review / dogfood HTML — though the rule applies to generated HTML deliverables, not Svelte component source. The convention boundary is fuzzy.

**Fix:**

Optional. Either:
1. Adopt typography tokens in `tokens.css` (e.g., `--text-h1: 21px; --text-h2: 17.5px; --text-h3: 15.5px;`) and replace inline values in AssistantMessage. Then apply the same treatment to the other 30 inline values in a future cleanup.
2. Accept the existing inline-px pattern as project convention and document it in `PATTERNS.md`.

Not blocking for Phase 1.

### IN-04: Dev probe (`__mneme_inject_stream__` / `?stream=demo`) exposed on `window` could be left in production by accident if the `import.meta.env.DEV` guard is bypassed

**File:** `src/lib/components/ChatPanel.svelte:392-440,475-497`

**Issue:**

The `if (import.meta.env.DEV && typeof window !== "undefined")` guards are correct and Vite tree-shakes the dev branch in production builds. But if a future refactor accidentally changes the guard (e.g., `if (import.meta.env.PROD === false)` — equivalent at build time but different surface), or if the build pipeline shifts to a mode where `import.meta.env.DEV` is not statically resolved (some dev/prod hybrid), the dev probe could leak.

The probe accepts arbitrary `chunks: string[]` and dispatches them as text_deltas. In production this would give arbitrary JS in the page (via the dev console) the ability to mutate `dispatch.messages` and trigger `scheduleHtmlRecompute`. Since the page already runs as a Tauri WebView with no third-party scripts, the risk is theoretical.

**Fix:**

Optional. Add a runtime gate AS WELL as the build-time gate:

```ts
if (typeof window !== "undefined" && import.meta.env.DEV) {
  // Defense-in-depth: also require a debug flag in localStorage to enable.
  if (window.localStorage.getItem("mneme.dev.probe") !== "1") return;
  (window as any).__mneme_inject_stream__ = ...;
}
```

Or assert in CI that the production bundle does not contain the strings `__mneme_inject_stream__` / `__mneme_finalize_stream__`. The current setup is acceptable for Phase 1 (single-user, never distributed).

---

_Reviewed: 2026-05-14T08:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Scope: Plan 01-12 (session resume + chat-rendering hints) + 01-13 (docs amendment). 14 files reviewed. Prior review preserved as `01-REVIEW.pre-gap-closure.md`._
