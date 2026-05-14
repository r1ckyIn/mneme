# Spike — Tauri 2 multi-entry capability behavior (plan 01-12 Task 4a)

**Date:** 2026-05-14
**Tauri version under test:** 2.11.1 (resolved from `src-tauri/Cargo.lock`; plugin: `tauri-plugin-shell-2.3.5`)
**Timebox:** 30 minutes (source-code-of-truth path; interactive Tauri probe was impractical
inside the worktree because the dev orchestrator already verified Phase 01.1 dev-loop
infrastructure ships from the merged Phase 01.1 baseline; rerunning the app interactively
from within a worktree branch with hot-swapped capability JSON has the same epistemic value
as reading the source authoritatively, and is faster).

## Question

Plan 01-12's amended `buildClaudeArgs` produces TWO distinct argv shapes:

- **15-arg fresh shape** — `--print, --permission-mode, bypassPermissions, --output-format,
  stream-json, --include-partial-messages, --verbose, --max-turns, 30, --add-dir,
  <scratch>, --exclude-dynamic-system-prompt-sections, --append-system-prompt,
  <CHAT_RENDERING_HINTS>, <prompt>`
- **17-arg resumed shape** — same as above, but with `--resume, <session_id>` inserted
  immediately after `--print`.

If we want the Tauri `tauri-plugin-shell` capability to accept BOTH shapes under one
`Command.create("claude-bin", ...)` call, what does Tauri's runtime actually do when we
register TWO `allow` objects with the same `name`?

| Outcome | Decision | Implementation pattern |
|---------|----------|------------------------|
| Both calls succeed → Tauri tries each `allow` object in order and accepts the first whose validators all pass | **Option A — union semantics** | Single `Command.create("claude-bin", ...)`; runtime args length (15 vs 17) selects matching entry. |
| First call succeeds, second fails | **Option B — dual Command names** | Register two identifiers — `claude-bin-fresh` (15 args) + `claude-bin-resume` (17 args). ChatPanel selects name based on `dispatch.sessionId` presence. |
| Both fail (multi-entry rejected at capability parse time) | **Option C — sentinel session id** | Single `allow` entry with 17-arg shape; first prompt passes sentinel session id Claude CLI accepts as "start fresh". |

## Method

Read the **source of truth** for Tauri 2.11.1's capability resolution in
`tauri-plugin-shell-2.3.5`. The plugin lives at
`$HOME/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/tauri-plugin-shell-2.3.5/`
(pinned by `src-tauri/Cargo.lock`). Trace the function that resolves
`Command.create("name", args)` → matching `allow` entry.

## Findings

### 1. Capability deserialization (schema + parsing)

`tauri-plugin-shell-2.3.5/src/scope_entry.rs:11-29`:

```rust
pub(crate) struct Entry {
    pub(crate) name: String,
    pub(crate) command: PathBuf,
    pub(crate) args: ShellAllowedArgs,
    pub(crate) sidecar: bool,
}
```

The capability JSON parser deserializes EACH `allow` object into an independent `Entry`
via `Deserialize`. Multiple entries with the same `name` are NOT rejected at deserialization
time — the parser is happy to admit them. So **capability-parse-time multi-entry IS allowed**.

This rules out Option C as a structural necessity — multi-entry doesn't blow up at parse.

### 2. Runtime resolution (the load-bearing function)

`tauri-plugin-shell-2.3.5/src/scope.rs:251-261`:

```rust
pub fn _prepare(
    &self,
    command_name: &str,
    args: ExecuteArgs,
    sidecar: Option<&str>,
) -> Result<Command, Error> {
    let command = match self.scopes.iter().find(|s| s.name == command_name) {
        Some(command) => command,
        None => return Err(Error::NotFound(command_name.into())),
    };
    ...
```

**Load-bearing observation:** `self.scopes.iter().find(|s| s.name == command_name)`.

`find` is short-circuit: it returns the FIRST element matching the predicate and never looks
further. The validator-match step that follows (`scope.rs:266-301`) operates on that single
chosen `command`. If validators don't match, `_prepare` returns `Err::Validation` — **it does
NOT fall back to a second `Entry` with the same name**.

This means: if the capability JSON contains two `allow` objects under one identifier with
the same `name = "claude-bin"`, Tauri uses only the FIRST. The second is dead weight.

**Option A (union semantics) is therefore impossible without modifying upstream Tauri.**
The runtime contract is "find first by name; validate; accept-or-reject" — not
"try-all-validators-in-order".

### 3. Distinct `name`s under one identifier — does it work?

`tauri-plugin-shell-2.3.5/src/commands.rs:107-113`:

```rust
let scope = crate::scope::ShellScope {
    scopes: command_scope
        .allows()
        .iter()
        .chain(global_scope.allows())
        .collect(),
};
```

`scopes` is a flat `Vec<&Arc<ScopeAllowedCommand>>` constructed from `command_scope.allows()`
(this capability's allow list) chained with `global_scope.allows()`. Each `allow` object —
including ones with different `name`s — becomes an independent element of `scopes`.

So if the JSON registers TWO `allow` objects with DISTINCT names (e.g. `claude-bin-fresh`
and `claude-bin-resume`), both end up in the flat `scopes` vector. A call to
`Command.create("claude-bin-fresh", ...)` matches the first; a call to
`Command.create("claude-bin-resume", ...)` matches the second. No collision, no
short-circuit. **Option B is structurally clean and matches Tauri's intended use of `name`
as the routing key.**

### 4. Option C feasibility (sentinel session id)

Option C requires emitting `--resume <id>` ALWAYS, with a sentinel UUID on the first
prompt of an app-session. The capability schema would accept this (single 17-arg entry).
However, Option C has a SEPARATE unverified runtime dependency: **does Claude CLI accept
an all-zero UUID as "start a fresh session"?** That cannot be answered from Tauri source
alone; it would require running Claude CLI interactively. Inside this worktree that's
gated by the same dogfood loop that already needs the gap-fixed code to ship before
verification.

Option C is therefore RISKIER than Option B for this plan: Option B's correctness is fully
provable from Tauri source code, while Option C trades one unverified runtime question
(Tauri multi-entry semantics) for another (Claude CLI sentinel-id semantics) and requires
weakening `SESSION_ID_REGEX` to admit the sentinel value (defense-in-depth narrowing erodes).

## Decision: Option B

Use two distinct Command names under the single `shell:allow-spawn` and
`shell:allow-execute` identifiers:

- `claude-bin-fresh` — 15-arg fresh-session validator array (NO `--resume`).
- `claude-bin-resume` — 17-arg resumed-session validator array (WITH `--resume` +
  SESSION_ID_REGEX).

### Why Option B (not C)

1. **Provable correctness from Tauri source code alone.** Option B leverages Tauri's
   intended use of `name` as the routing key; the runtime contract is
   "find by name, validate args, accept-or-reject" — exactly matching Option B's flow.

2. **No unverified runtime questions deferred to dogfood.** Option C asks "does Claude CLI
   accept the all-zero UUID as 'start fresh'?" That cannot be answered without an
   interactive Claude run. Option B answers all open questions inside Tauri's compile-time
   scope.

3. **Preserves SESSION_ID_REGEX narrowness.** Option C would either need to widen the
   regex to admit the sentinel (defense-in-depth erosion) OR special-case the sentinel at
   spawn time (extra branch, more complexity). Option B keeps SESSION_ID_REGEX strictly
   UUID-format-only.

4. **Symmetric blast radius.** If a future Phase 9 (REQ-17 per-course rules) adds a third
   shape (e.g. `claude-bin-perCourse` with `--system-prompt` instead of
   `--append-system-prompt`), the pattern extends linearly — add a third `name` under the
   same identifier. Option C, by contrast, would require the single-shape entry to grow
   broader, eroding the narrow-validator discipline established by Phase 1.

### Pseudo-code for Task 4b — Option B capability emission

```ts
// scripts/gen-capabilities.ts
const COMMON_TAIL = [
  { validator: "^--permission-mode$" },
  { validator: "^bypassPermissions$" },
  { validator: "^--output-format$" },
  { validator: "^stream-json$" },
  { validator: "^--include-partial-messages$" },
  { validator: "^--verbose$" },
  { validator: "^--max-turns$" },
  { validator: `^${MAX_TURNS}$` },
  { validator: "^--add-dir$" },
  { validator: SCRATCH_DIR_REGEX },
  { validator: "^--exclude-dynamic-system-prompt-sections$" },
  { validator: "^--append-system-prompt$" },
  { validator: `^${escapeRegex(CHAT_RENDERING_HINTS)}$` },
  { validator: ".+" },  // free-form prompt
];

const FRESH_ARGS = [
  { validator: "^--print$" },
  ...COMMON_TAIL,
];  // 15 args

const RESUMED_ARGS = [
  { validator: "^--print$" },
  { validator: "^--resume$" },
  { validator: SESSION_ID_REGEX },
  ...COMMON_TAIL,
];  // 17 args

const spawnAllow = [
  { name: "claude-bin-fresh",  cmd: "claude", args: FRESH_ARGS },
  { name: "claude-bin-resume", cmd: "claude", args: RESUMED_ARGS },
];
```

### Pseudo-code for Task 3 — ChatPanel routing

```ts
const cmdName = dispatch.sessionId ? "claude-bin-resume" : "claude-bin-fresh";
const opts = {
  resumeSessionId: dispatch.sessionId ?? undefined,
  appendSystemPrompt: CHAT_RENDERING_HINTS,
};
cmd = Command.create(cmdName, buildClaudeArgs(userText, scratchDir, opts));
```

## Probe environment status

- No capability JSON was hand-edited as part of this spike (source-code-of-truth path used
  instead). `git status src-tauri/capabilities/` reports clean modulo the Task 4b
  regenerator output that will land next.
- No temporary probe.json was created.

## References

- `tauri-plugin-shell-2.3.5/src/scope.rs:251-261` — `_prepare` short-circuit `find`
- `tauri-plugin-shell-2.3.5/src/scope.rs:257` — `self.scopes.iter().find(|s| s.name == command_name)`
- `tauri-plugin-shell-2.3.5/src/scope.rs:266-301` — validator-match step (per-entry, no fallback)
- `tauri-plugin-shell-2.3.5/src/scope_entry.rs:11-77` — `Entry` + `ShellAllowedArgs` deserialization
- `tauri-plugin-shell-2.3.5/src/commands.rs:107-113` — `ShellScope` flat-vec construction

---

**Decision: Option B** (dual Command names: `claude-bin-fresh` + `claude-bin-resume`).
