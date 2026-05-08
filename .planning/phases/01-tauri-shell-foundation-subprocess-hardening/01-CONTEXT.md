# Phase 1: Tauri Shell Foundation + Subprocess Hardening - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Productionize a fresh-built Tauri 2 + SvelteKit shell at the repo root that lifts (point-ports, does NOT bulk-copy) the locked patterns from spike-002, while productionizing REQ-01/REQ-02/REQ-10 and closing the three CRITICAL Phase 1 pitfalls (zombies / capability wildcards / streaming XSS). Delivery threshold = `npm run tauri dev` runnable; no `.app` packaging / codesign / notarization.

This discussion focused exclusively on **HOW** decisions — WHAT/WHY are locked by `01-SPEC.md` (6 requirements, ambiguity 0.08).

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**6 requirements are locked.** See `01-SPEC.md` for full requirements, boundaries, and acceptance criteria (19 pass/fail checks).

Downstream agents MUST read `01-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md L70-82):**
- Production Tauri 2 project freshly bootstrapped at repo root via `npm create tauri-app`, then point-port locked patterns from spike-002
- Three-column resizable layout shell (currently SPEC says `<header>` reservation + 3 columns; **SEE D-03 below — modified to bottom-row reservation + 3 columns + window chrome change**)
- Single Claude chat session (one active subprocess at a time; launch always blank; no "new chat" button)
- Streaming subprocess pipeline with `--max-turns 30` + `--add-dir <SCRATCH>` + `--exclude-dynamic-system-prompt-sections`
- Subprocess lifecycle (Cmd+Q SIGTERM → 2s → SIGKILL; zero zombies after 5 cycles)
- Capability hardening (~13 exact-regex validators, KaTeX ≥ 0.16.21, DOMPurify explicit FORBID_TAGS/FORBID_ATTR, CSP meta tag)
- `vendor/claude-code-parser/` per KD-12
- `~/.mneme/scratch/` directory auto-created on first launch
- `scripts/audit-capabilities.sh` CI/pre-commit guard
- Production identity: `productName: "Mneme"`, `identifier: "dev.mneme.app"`, icons from `icon-assets/icon.icns`

**Out of scope (from SPEC.md L82-107):** 22+ items including `.app` packaging, vault structure (Phase 2), settings UI (Phase 2), real file tree (Phase 2), PDF rendering (Phase 4), top-bar mind-map (Phase 8 — **see D-03 amendment below: now bottom-row mind-map placeholder**), multi-session sidebar (Phase 3), command palette (Phase 3), Echo360 (Phase 5/6), citations (Phase 9), document ingestion (Phase 4), block editor (Phase 3), KG/memory (Phase 7), FSRS/review (Phase 10), voice input (REQ-19 v1.x).

**SPEC.md amendments required by this discussion** — plan-phase to apply as a SPEC patch:

1. **REQ-1 layout**: top-bar `<header>` reservation → bottom-row reservation (`Mind-map / KG live preview` placeholder, ~120px height); add window chrome fields `decorations: true` + `titleBarStyle: "Overlay"` + `hiddenTitle: true`; add initial window size `1280 × 860` (minimum `1024 × 600` already locked); change middle-pane placeholder text from `"Select a file to preview"` → `"Lecture video / file preview — wired in Phase 4 + 6"`.
2. **REQ-6 hotkeys (extension)**: extend the strict `Cmd+Q + Enter` only set to also include `Shift+Enter` (newline in input) and a Stop button (UI element, not hotkey, shown only during active stream). Aligns with Claude Desktop / Cursor / ChatGPT / Notion conventions.
3. **REQ-6 hotkeys (unbound list addition — added 2026-05-08 post-UI-SPEC alignment)**: append `Cmd+W` to the explicit unbound hotkey list (alongside the existing `Cmd+L / Cmd+K / Cmd+, / Cmd+P / Cmd+O / Cmd+Shift+P / Cmd+N / Cmd+R`). Phase 1 single-window single-session semantics make Cmd+W functionally redundant with Cmd+Q; explicitly unbinding it (rather than letting macOS default close-window behavior fire without our PGID-kill path) avoids a subprocess-leak path. UI-SPEC originally inferred `Cmd+W` should mirror Cmd+Q; the alignment audit chose stricter "unbound" treatment to keep the SPEC REQ-6 surface narrow + explicit. UI-SPEC L677 keyboard contract row to be updated by plan-phase along with the SPEC patch.

</spec_lock>

<decisions>
## Implementation Decisions

### Layout (Area 1 + 5 follow-ups)

- **D-01 Implementation strategy**: vanilla CSS Grid + Svelte 5 `$state` runes + pointer events (~80 LOC fresh write); zero npm-dep cost, no KP-08 registry burden, runes-native (no compat-mode bug), KP-09 zero style pollution. Rejected `svelte-splitpanes` v8.0.14: 471★ + 1 maintainer (under user's adoption criteria — see D-08), known Svelte 5 runes compat-mode build error, default styles need full override later anyway.
- **D-02 First-launch column widths**: 30% / 40% / 30% (left file-tree+preview / middle video preview / right chat). Locked via localStorage key `mneme.layout.split` (SPEC).
- **D-03 Layout structure (modifies SPEC REQ-1)**: drop top `<header>` reservation. Layout = three columns + bottom row. Bottom row reserved for Phase 7+8 mind-map / KG live preview (static placeholder text `"Mind-map / KG live preview — wired in Phase 7+8"`, height ~120px, distinct from the middle pane's placeholder).
- **D-04 Middle pane placeholder text**: `"Lecture video / file preview — wired in Phase 4 + 6"` (replaces SPEC REQ-1's `"Select a file to preview"` — covers both Phase 4 PDF + Phase 6 Echo360 video semantics).
- **D-05 Initial window size**: `1280 × 860` (default Tauri window config). Minimum `1024 × 600` already SPEC-locked. Window-size persistence remains out of scope (Phase 2 REQ-14 settings).
- **D-06 Window chrome (modifies SPEC REQ-1)**: `decorations: true` + `titleBarStyle: "Overlay"` + `hiddenTitle: true` — preserves macOS native red/yellow/green buttons, hides the title-bar text, content extends under the buttons. Aligns with Claude Desktop's macOS visual identity (verified via user-provided screenshot 2026-05-08). Rejected `decorations: false` (custom drag region + button rendering = a11y risk + Phase 1 visual deferred).
- **D-07 Drag handle interaction**: standard pointer events with `setPointerCapture` to prevent cursor escape during drag; min-width 200px per pane enforced via CSS Grid `minmax()`; resize below window minimum `1024×600` blocked by Tauri config. (Plan-phase decides exact LOC structure of the splitter component.)

### OSS Adoption Criteria (Refines KP-02 — applied this phase)

- **D-08 OSS adoption criteria** (locked by user 2026-05-08; refines KP-02):
  - **Direct use / fork-extend**: ≥1k GitHub stars + multiple active maintainers + clean codebase + active release cadence + permissive license (MIT / Apache-2.0 / MPL-2.0)
  - **Reference-only (vendored read-only or targeted read)**: code has clear value but fails one or more direct-use criteria (e.g., < 1k stars, single maintainer, unmaintained, license incompatible — see D-09)
  - **From scratch**: no qualifying candidate exists OR stack mismatch makes adaptation cost exceed greenfield write
  - This criterion will likely be promoted to a PROJECT.md KP-02 implementation note at next milestone (deferred — see deferred ideas).
- **D-09 AGPL posture (locked by user 2026-05-08; maintains current PROJECT.md license posture)**:
  - mneme **retains license selection freedom** (future MIT / Apache release allowed)
  - AGPL projects (e.g., opcode 21.7k★, siteboon/claudecodeui 10.6k★): READ-ONLY REFERENCE — never copy/fork/link code into mneme codebase. Reading source for understanding, screenshot/UX studies, and architecture writeups are allowed.
  - Rejected the alternative posture of integrating AGPL code + accepting strong-copyleft "infection" (would force mneme + all forks into AGPL forever, blocking future portfolio MIT release per OOS-01 amendment).
  - Subprocess-boundary isolation (姿态 2 — used by marker GPL today) remains available for future AGPL CLI tools but not relevant to Phase 1.

### Subprocess Lifecycle (Area 2)

- **D-10 State machine layer**: full Rust state machine. Frontend (`@tauri-apps/plugin-shell`) only spawns and consumes streams; lifecycle ownership lives in Rust.
  - Storage: `tauri::State<Mutex<Option<CommandChild>>>` (single-session per SPEC REQ-6; Phase 3 will refactor to multi-session — out of scope here).
  - Hook union: `on_window_event(WindowEvent::CloseRequested)` + `app.run(|_, RunEvent::ExitRequested|)` registered together. Reason: macOS Cmd+Q dispatches `NSApplicationTerminate` (= `RunEvent::ExitRequested`), not window close — JS `onCloseRequested` cannot cover this. Tauri issue [#9198](https://github.com/tauri-apps/tauri/issues/9198) shows `ExitRequested` is unreliable on some macOS versions, hence the union.
  - Kill sequence: `libc::killpg(getpgid(pid) as i32, SIGTERM)` → 2s wait → `SIGKILL` if still alive. Required because `claude` CLI calls `setsid()` — `child.kill()` only kills PID, leaving the process group of grandchildren (grep, file_read, MCP). Process group kill is the only way to satisfy SPEC REQ-3 acceptance ("5 quit cycles, cumulative orphan count 0").
- **D-11 Cargo dep for PGID kill**: new dep needed (`nix` or `libc` crate). Plan-phase decides specific crate based on existing transitive deps in Tauri 2 — both work; `nix` is more idiomatic Rust API, `libc` is lower-level and likely already pulled in.
- **D-12 State pattern reusability**: this Rust state machine is a base for Phase 4 (Marker subprocess), Phase 7 (KG embedding subprocess), Phase 5 (Echo360 webview spike) — Phase 1 implements it as a one-subprocess foundation; later phases extend (e.g., to `Mutex<HashMap<SessionId, CommandChild>>` for Phase 3 multi-session).

### Parser Vendor + Validator SSOT (Area 3)

- **D-13 `claude-code-parser` vendoring depth (extends KD-12)**: copy `vendor/claude-code-parser/src/` + `LICENSE` + a new `VENDOR.md` (snapshot date `2026-05-08` + upstream commit hash + statement: `"frozen reference per KD-12; upstream effectively unmaintained"`). Do NOT copy `tests/`, `examples/`, or CI files. Add 2-3 stream-json roundtrip cases to mneme's own test directory as living documentation replacement.
- **D-14 Capability validator SSOT**: `src/lib/spawn-args.ts` exports a single TS const declaring the `claude` spawn argument list as the authoritative source. `scripts/gen-capabilities.ts` (run as a `prebuild` hook in `package.json`) reads that const and writes the validator regex array into `src-tauri/capabilities/default.json`. `scripts/audit-capabilities.sh` (referenced by SPEC REQ-4) is rewritten as `diff <(node scripts/gen-capabilities.ts --dry-run) src-tauri/capabilities/default.json && grep -c '"args": true' src-tauri/capabilities/default.json && grep -c '"\*"' src-tauri/capabilities/default.json` — composing the SSOT-drift check (`diff`) with the original wildcard checks. Audit defense value upgrades from "no wildcards" → "no SSOT drift" + "no wildcards".
- **D-15 Why not Rust programmatic capability**: Tauri 2 capability is **purely declarative JSON/TOML** at compile time; no runtime `tauri::ipc::Capability` builder bypasses `default.json` for `shell:scope` registration (verified via Tauri 2 docs + tauri-plugin-shell `build.rs` source). B3 (Rust programmatic) is not feasible — only B1 (manual JSON) or B2 (TS SSOT + gen) are real options.

### RQ-03 Community Pattern Absorption (Area 4)

- **D-16 Targeted read** (plan-phase researcher, ~1-2 hours):
  - **OpenCovibe** (`AnyiWang/OpenCovibe`, **Tauri 2 + Svelte 5 + Apache-2.0**, v0.1.57, 156★) — *direct stack match* (discovered by advisor, was missing from STACK.md). Read: session-actor pattern + multi-pane layout components (~3-4 source files). Code-level patterns may be adopted directly (Apache-2.0 — passes D-09).
  - **TOKENICODE** (`yiliqi78/TOKENICODE`, Tauri 2 + React 19 + Apache-2.0, 503 commits) — read `useStreamProcessor.ts` for two patterns to adopt: (a) `finalizeOnce` idempotent teardown (prevents double-cleanup when CLI exits before Cmd+Q), (b) `control_request` event interception (prevents bypass-mode hangs). The third pattern — rAF-batched flushing — is **deferred to Phase 3** per D-21, so absorb the concept but don't implement.
  - **opcode** (`getAsterisk/opcode`, Tauri 2 + React 19, **AGPL-3.0**, 21.7k★) — UX screenshot study only (~15 min): tool-use card layout, status presentation, interaction vocabulary. Per D-09, **no source-level code adoption**.
  - **NOT read** (excluded): `markes76/claude-code-gui` (JSONL-tail architecture is fundamentally different, we've committed to spawn pattern); `siteboon/claudecodeui` (web architecture + AGPL, not desktop pattern).
- **D-17 NotebookLM clone OSS** (verified 2026-05-08): no qualifying alternatives. Surveyed candidates (`Open Notebook` / `SurfSense` / `NotebookLLaMA` / `InsightsLM`) are all React + web + Supabase/cloud + RAG-pipeline architectures — stack-incompatible with mneme's local-first + agentic-search + Tauri+SvelteKit posture. Not pursued.

### Telemetry / Stream UX (5-of-5 follow-up)

- **D-18 Telemetry policy**: UI shows only a `streaming dot` indicator while a stream is active. TTFT / event count / duration / cache_creation_input_tokens are emitted via `console.log` to the dev-mode console (Cmd+Option+I) per SPEC REQ-2 acceptance ("subprocess command line visible in dev-mode debug log"). Aligns with Claude Desktop's "no telemetry chrome" UI style. Cost meter is structurally not applicable (SPEC Round 4 — OAuth subscription mode has no per-call billing).
- **D-19 Stop button (extends SPEC REQ-6)**: UI button rendered only during active stream. Click → invokes Rust kill path (same as Cmd+Q lifecycle but without app exit). Already-streamed text is preserved (no rollback). ~30 LOC.
- **D-20 Enter / Shift+Enter (extends SPEC REQ-6)**: `Enter` sends prompt; `Shift+Enter` inserts newline (multi-line input). Aligns with Claude Desktop / Cursor / ChatGPT / Notion conventions. Plan-phase to coordinate with SPEC REQ-6's "only Cmd+Q + Enter" hotkey list.
- **D-21 stream_event rAF flushing — DEFERRED to Phase 3**: TOKENICODE's lesson (50-100 re-renders/sec on long streams) is acknowledged but not implemented in Phase 1. Phase 1 prompts in scope are short; revisit when Phase 3 multi-session + long sessions surface real perceived jank.

### Visual Contract Pointer (D-22 — UI-SPEC integration, added 2026-05-08)

- **D-22 Phase 1 颜色派生锁**: Phase 1 颜色契约由 `01-UI-SPEC.md` 锁定，**CONTEXT.md 不复制 token 值**（避免 SSOT 漂移）。
  - **范围**: 60/30/10 + 4 个 user/assistant 表面色 + accent 6-site allow-list + `--error` Semantic Lock + SSOT 0' override 规则。
  - **追溯**: commits `62a21c9 → 65cb83f → d764b6f → 987261a → 42aadc8 → 95302fe → 2fd7f6e`（initial → revisions → approved → bubble override + error lock → self-consistency fix）。
  - **跨 phase 适用**: Phase 2+ 所有视觉决策必须读 `tokens.css`（实现）+ `01-UI-SPEC.md`（语义说明）。新增 token 走 ui-phase N 流程。`gsd-ui-checker` 跨 phase 验证 `#c15f3c` form-isolation 不被破坏。
- **D-22 also ratifies two cross-phase rules introduced in UI-SPEC**:
  - **(a) SSOT 0' — Live Anthropic Product UI > documentation snapshots**: user-screenshot evidence may override SSOT 1/2 hex values when Anthropic's live product diverges from the documented baseline. First override applied in UI-SPEC: `--bubble-user: #DDD9CE` (deep-dive zh) → `#EEEBE2` (Claude Desktop screenshot, 2026-05-08).
  - **(b) `--error` Semantic Lock**: `#c15f3c` originated as a "UI accent color" in deep-dive zh (same terra-cotta family as `#d97757`). mneme reassigns it as exclusively destructive-semantic. **form-isolation contract**:
    - `--orange` only as fill (button background, dot indicator)
    - `--error` only as stroke / text color (left rule, error message text)
    - Phase 2+ any UI-accent use case is forbidden from `#c15f3c`; must pick from `--orange / --orange-deep`
    - `gsd-ui-checker` cross-phase greps `#c15f3c` and verifies it has not drifted into non-`--error` consumers.
- **KD-13 active-scale ratification (2026-05-08)**: `active:scale-[0.98]` (KD-13 baseline) → `active:scale-[0.96]` (Phase 1 UI-SPEC ratification, applied project-wide). PROJECT.md L762 + `references/design/anthropic-claude-aesthetic-deep-dive_zh.md` L59 both updated; deep-dive zh notes the deviation from Anthropic's 0.98 baseline. Affects all future ui-phase N decisions — the canonical mneme value is 0.96.

### Phase 1 LOC Estimate (fresh write)

Reaffirms SPEC L13-20 ("lift only locked patterns, do NOT bulk-copy ... created **fresh** at the repo root via `npm create tauri-app`"):

| Module | LOC (estimated) |
|---|---|
| SvelteKit `+page.svelte` (3-column layout + drag handles + bottom row + streaming render + Stop + Shift+Enter + status dot) | ~500-700 |
| Rust subprocess state + hooks union + `libc::killpg` kill sequence | ~150-200 |
| TS `spawn-args.ts` SSOT + `gen-capabilities.ts` script | ~80 |
| `vendor/claude-code-parser/` (src + LICENSE + VENDOR.md + 2-3 mneme test cases) | ~100 |
| `scripts/audit-capabilities.sh` | ~30 |
| Configuration (`tauri.conf.json`, `capabilities/default.json`, `Cargo.toml`, `package.json`, `+layout.ts`, `.gitignore`, `rust-toolchain.toml`) | ~150 |
| **Total** | **~1000-1200 fresh LOC** |

Spike-002 source (`/.planning/spikes/sources/002-tauri-claude-shell/app/`) stays untouched; it is reference-only (validated patterns sink into `spike-findings-mneme/SKILL.md` for execute-time consultation).

### Claude's Discretion

- Exact LOC structure of the Svelte splitter component (single component vs `use:action`) — D-01 commits to vanilla; specific structure is plan-phase concern.
- Exact `rust-toolchain.toml` pin granularity (`1.88` vs `1.88.0`) — plan-phase decides per Phase 0 LEARNINGS macOS-CLI version-precision lesson.
- Exact API of the dev console.log telemetry helper (per-event vs aggregated) — plan-phase decides.
- Order of Cargo dep introduction (`nix` vs `libc`) — plan-phase decides per existing transitive deps.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope + locked requirements
- `.planning/phases/01-tauri-shell-foundation-subprocess-hardening/01-SPEC.md` — **Locked requirements (6 reqs, ambiguity 0.08, 19 acceptance criteria, 22+ out-of-scope items). MUST READ.** Note: this CONTEXT.md amends layout (REQ-1) and hotkey (REQ-6) — see `<spec_lock>` "SPEC.md amendments required" list above; plan-phase to apply as SPEC patch.
- `.planning/ROADMAP.md` — Phase 1 entry: goal, depends-on, success criteria, OSS adoption note
- `.planning/PROJECT.md` — KP-01 to KP-09, KD-01 to KD-13 (especially **KD-01** stack lock, **KD-02** frontend libs, **KD-03** Rust ≥ 1.88, **KD-12** claude-code-parser vendoring, **KD-13** + **KP-09** visual aesthetic — though defer to `/gsd-ui-phase 1`)
- `.planning/REQUIREMENTS.md` — REQ-01-19 + OOS-01-08 + Phase mapping
- `.planning/STATE.md` — current milestone, accumulated context, pending todos

### Validated foundation (reference only — DO NOT BULK-COPY per SPEC L13-20)
- `.claude/skills/spike-findings-mneme/SKILL.md` — **auto-loaded during implementation work**; contains validated subprocess + UI patterns
- `.claude/skills/spike-findings-mneme/references/claude-subprocess.md` — 6-event JSONL taxonomy, line buffering pattern, `--bare` is incompatible with OAuth subscription
- `.claude/skills/spike-findings-mneme/references/tauri-shell-ui.md` — Tauri 2 + SvelteKit + adapter-static + plugin-shell + DOMPurify pattern
- `.planning/spikes/sources/002-tauri-claude-shell/app/src/routes/+page.svelte` — validated end-to-end demo (REFERENCE ONLY — production code is fresh-written)
- `.planning/spikes/sources/001-stream-json-recon/` — initial event taxonomy reconnaissance

### Phase 0 baseline (Phase 1 inherits)
- `.planning/phases/00-identity-branding-lock/00-CONTEXT.md` — D-10 (`dev.mneme.app`), D-14 (window title `Mneme`), D-15 (codename history footer)
- `.planning/phases/00-identity-branding-lock/00-LEARNINGS.md` — 8 lessons (BSD sed `-i ''`, `iconutil -V` Sequoia-only, `pipefail` + `rg --count-matches` silent abort, harness self-modify denial, etc.) + 8 patterns (atomic rename 4-stage, `git mv` for skill rename, `gh repo create` one-shot, etc.)
- `.planning/phases/00-identity-branding-lock/00-NAME-DECISION.md` — frontmatter handoff (`final_name: Mneme`, `bundle_id_app: dev.mneme.app`)

### KP-08 OSS dependency tracking
- `.planning/dependencies.md` — KP-08 registry. Phase 1 must register: `nix` or `libc` Cargo crate (D-11), `vendor/claude-code-parser/` (D-13). Existing entries already cover Tauri 2 / SvelteKit / marked / katex / dompurify per spike-findings.

### Tauri lifecycle / capability technical references
- [Tauri issue #9198 — `ExitRequested` not fired on macOS](https://github.com/tauri-apps/tauri/issues/9198) — justifies double-hook union in D-10
- [Tauri discussion #3273 — Kill process on exit](https://github.com/tauri-apps/tauri/discussions/3273) — base pattern for D-10
- [`CommandChild` — tauri-plugin-shell docs.rs](https://docs.rs/tauri-plugin-shell/latest/tauri_plugin_shell/process/struct.CommandChild.html) — confirms `kill()` only kills the PID
- [Tauri Capabilities v2 docs](https://v2.tauri.app/security/capabilities/) — confirms purely-declarative JSON/TOML, no runtime builder (D-15)
- [tauri-plugin-shell `build.rs` v2](https://github.com/tauri-apps/tauri-plugin-shell/blob/v2/build.rs) — backs D-15

### Community wrappers (RQ-03 targeted read)
- [`AnyiWang/OpenCovibe`](https://github.com/AnyiWang/OpenCovibe) — **Tauri 2 + Svelte 5 + Apache-2.0** session-actor + layout components. **Stack match — code-level adoption allowed per D-09**
- [`yiliqi78/TOKENICODE`](https://github.com/yiliqi78/TOKENICODE) — Apache-2.0 — `useStreamProcessor.ts` for `finalizeOnce` + `control_request` patterns (Apache-2.0 → adoption allowed; rAF deferred to Phase 3 per D-21)
- [`getAsterisk/opcode`](https://github.com/getAsterisk/opcode) — **AGPL-3.0** — UX screenshots only (~15 min), per D-09 no code adoption
- [`udhaykumarbala/claude-code-parser`](https://github.com/udhaykumarbala/claude-code-parser) — vendored per KD-12 + D-13

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (lifted as patterns, not bulk-copied per SPEC)
- **JSONL line buffering + 6-event dispatch** (spike-002 `+page.svelte`): pattern is documented in `spike-findings-mneme/references/claude-subprocess.md` §3-§6; execute-phase fresh-writes this in production code
- **Streaming raw monospace → finalized markdown on `result`** (spike-002): pattern doc'd in `spike-findings-mneme/references/tauri-shell-ui.md` §4; fresh-writes in production
- **Tool-use round-trip card pattern** (spike-002): pattern doc'd in `spike-findings-mneme/references/claude-subprocess.md` §5; fresh-writes
- **DOMPurify + KaTeX call sites** (spike-002): patterns doc'd in `spike-findings-mneme/references/tauri-shell-ui.md` §4; **fresh-writes with hardening** per SPEC REQ-5 (explicit `FORBID_TAGS`, `FORBID_ATTR`, KaTeX `trust:false strict:true macros:{} maxExpand:1000`, error-message HTML escape, CSP meta tag)
- **Phase 0 `icon-assets/icon.icns`** (committed at repo root): goes into `src-tauri/icons/` per SPEC and Phase 0 D-10/D-14

### Established Patterns from Phase 0 LEARNINGS
- **BSD sed `-i ''` syntax** (macOS): any sed in scripts uses empty backup-extension as separate arg
- **`pipefail` + `rg --count-matches`**: wrap with `{ rg ... || true; } | awk ...` to preserve no-match-as-zero
- **`git mv` for vendor/skill renames**: preserves history (`R` entry) over `D + A`
- **macOS-CLI version-precision lesson** (`iconutil -V` Sequoia-only): `rust-toolchain.toml` should be tested against actual user macOS Ventura 13.4 — pin granularity is plan-phase concern
- **Concurrent `/gsd-capture` interleaving** (Phase 0 had 9 concurrent commits on main during the phase): `guard-branch.sh` enforcement gap — relevant if Phase 1 work overlaps with another `/gsd-capture` session

### Integration Points
- **Phase 2 (vault + Canvas/Ed sync)**: inherits left-pane file-tree slot (currently placeholder), `--add-dir` target swap from `~/.mneme/scratch` → user-configured vault path, REQ-14 settings UI introduces window-size persistence
- **Phase 3 (multi-session + cmd palette + editor)**: refactors `Mutex<Option<CommandChild>>` → `Mutex<HashMap<SessionId, CommandChild>>`; adds session sidebar; introduces Cmd+P/Cmd+O palette + Cmd+, settings; reconsiders rAF flushing per D-21
- **Phase 4 (document ingestion)**: middle-pane preview slot wires Marker → markdown rendering; Marker subprocess reuses Phase 1 Rust state machine pattern (D-12)
- **Phase 5 (Echo360 webview spike)**: separate Tauri webview window pattern; Phase 1's window chrome decision (D-06) sets the parent window precedent
- **Phase 6 (Echo360 video + bilingual captions)**: middle-pane wires `<video>` + `<track>`; tightly coordinates with D-04 placeholder text retirement
- **Phase 7 (KG + three-tier memory)**: bottom row (D-03) starts hosting live mind-map Cytoscape preview; embedding subprocess reuses Phase 1 Rust state pattern (D-12)
- **Phase 8 (mind-map view + per-course rules)**: bottom row's Phase 1 placeholder is replaced with the actual Cytoscape mind-map render (D-03 — note: position moved from top-bar to bottom-row vs SPEC original)
- **`/gsd-ui-phase 1`** (next visual phase after Phase 1 ships): KP-09 + KD-13 visual aesthetic (Anthropic/Claude family — `#d97757` orange, `#faf9f5` cream, serif body, `cubic-bezier(0.165, 0.85, 0.45, 1)` ease, soft 8% borders) is fully deferred from Phase 1 to here; D-06 window chrome was specifically chosen to align with Claude Desktop's macOS pattern, so the chrome layer is also UI-phase-1's start point

</code_context>

<specifics>
## Specific Ideas

- **Window chrome reference**: Claude Desktop's macOS visual identity (red/yellow/green buttons preserved + hidden title-bar text + content extends under buttons) — verified 2026-05-08 via user-provided screenshot. Implemented in Tauri via `decorations: true` + `titleBarStyle: "Overlay"` + `hiddenTitle: true` (D-06).
- **Initial window size reference**: user requested "参考 Claude Desktop 的初始默认大小". Web search did not surface the exact value (Anthropic Claude Desktop is closed-source; community Linux ports like `aaddrick/claude-desktop-debian` haven't published BrowserWindow constants). User accepted `1280 × 860` as a sensible AI desktop chat starting point (D-05). If actual Claude Desktop value surfaces later, easy adjustment via tauri.conf.json.
- **Layout vision** (user direct quote 2026-05-08): "30/40/30分，左边是文件栏以及文件预览的地方，中间是预留的放视频的地方...右边的是聊天区，我还想在这三个下面加一览，用来预览脑图或者知识图谱的实时变化和动效" — captured as D-02 (column ratios), D-04 (middle pane semantic), D-03 (bottom row introduction). Animation/effect details deferred to Phase 7+8 (see deferred ideas).
- **OSS adoption framework**: user direct quote 2026-05-08: "如果一个项目它真的很热门1k star+并且有多位开源工作者在维护，并且干净活跃，那才有必要直接用，否则的话就和我们之前找到的两个项目一样仅参考代码就不用从头开始思考了" — codified in D-08.
- **License posture**: user re-confirmed姿态 3 维原 (2026-05-08) — AGPL READ-ONLY, mneme retains license selection freedom — explicitly chose this over the more permissive 姿态 1 (AGPL-infect-mneme) after seeing the trade-offs (D-09).
- **Telemetry preference**: user pointed out cost meter was deleted in SPEC Round 4 — corrected my framing of telemetry to exclude cost (D-18). Aligns with Claude Desktop's "no telemetry chrome" UI style (no TTFT / event count / duration shown to user).
- **Chat input UX reference**: user said "和Claude chat当前模式对齐" → adopted Stop button + Enter sends + Shift+Enter newline (D-19, D-20). The `+` and microphone icons in the Claude Desktop screenshot are NOT Phase 1 scope (voice = REQ-19 v1.x; attachments = deferred).

</specifics>

<deferred>
## Deferred Ideas

### Bottom row (D-03) content design + animation
- **Forward-looking**: bottom row is Phase 1 static placeholder ("Mind-map / KG live preview — wired in Phase 7+8"). The user's animation/effect intent ("脑图或者知识图谱的实时变化和动效") is captured for Phase 7 (KG schema design) + Phase 8 (Cytoscape mind-map mounting). Specific animation behaviors (node fade-in cadence, edge pulse on update, etc.) are visual aesthetic / interaction concerns — also pending `/gsd-ui-phase 1` aesthetic system lock.

### `/gsd-ui-phase 1` triggers
- KP-09 + KD-13 Anthropic/Claude visual aesthetic full token system, motion specs, shadow system, library selection (shadcn.io/theme/claude port + brand-guidelines + tweakcn) — Phase 1 implements only D-06 window chrome alignment as a structural anchor; everything else (`#d97757` orange palette, serif body, soft borders, multi-layer shadows, ease curve) is deferred entirely.
- **Triage VoltAgent** (folded into reviewed-for-awareness from `cross_reference_todos`): user surfaced `VoltAgent/awesome-design-md` (generic parent with `design-md/claude/` folder) vs the locked `VoltAgent/awesome-claude-design` (already in `dependencies.md` Group 10). Triage decision deferred to first `/gsd-ui-phase` run — diff both VoltAgent sources, cross-check tokens against KP-09 deep-dive SSOT (`anthropics/skills/brand-guidelines` wins ties), then drop parent / add as Group 10 row / copy chosen DESIGN.md into Group 9. File: `.planning/todos/pending/2026-05-07-triage-awesome-design-md-vs-awesome-claude-design-for-kd-13.md`.

### PROJECT.md amendments to propose at next milestone (NOT in Phase 1 scope)
- Promote D-08 (OSS adoption criteria — ≥1k★ + multiple maintainers + clean + active + permissive) as an explicit KP-02 implementation note. Currently KP-02 only states the 50% rule + "fork-extend before write-from-scratch"; the user's specificity (1k threshold, maintainer count, license whitelist) deserves codification for future Phase 2-10 OSS evaluations. Proposal: `/gsd-progress --do "amend KP-02 with D-08 criteria"` after Phase 1 ships.
- Reconfirm D-09 AGPL READ-ONLY posture in PROJECT.md "License Posture Summary" — the existing posture is already read-only; this discussion verified user remains aligned (姿态 3 chosen explicitly over姿态 1 / 姿态 2). No PROJECT.md edit needed unless wording sharpens.

### Plan-phase HOW concerns NOT discussed (deferred from SPEC's "Next step" list)
- **KaTeX/DOMPurify exact malicious-payload test set**: SPEC L138 lists 2 baseline payloads (`<img src=x onerror=alert(1)>` and `$\href{javascript:alert(2)}{x}$`); a more comprehensive XSS fixture set (OWASP cheat sheet subset, KaTeX trust-mode boundaries, DOMPurify config edge cases) was not discussed. Plan-phase (or `/gsd-secure-phase 1` if invoked) decides fixture coverage depth.

### Reviewed Todos (cross_reference_todos — not folded into Phase 1)
- **Evaluate thea for question generation** (research, 2026-05-07, score 0.6) — Phase 10 work (REQ-09 concept review item generation), not Phase 1 subprocess hardening. Trigger: before `/gsd-discuss-phase 10`. File: `.planning/todos/pending/2026-05-07-evaluate-thea-for-question-generation.md`.
- **Spec Claude (free) mode source display + conflict resolution behavior** (planning, 2026-05-07, score 0.6) — Phase 9 work (REQ-08 anchored mode), not Phase 1. Trigger: before `/gsd-discuss-phase 9`. File: `.planning/todos/pending/2026-05-07-spec-claude-free-mode-source-display-and-conflict-resolution-req-08.md`.

### Items intentionally excluded from this discussion
- Voice input (REQ-19 v1.x — gated by Intel Mac CPU latency spike)
- Attachment paste / drag-drop (no specific phase yet; v1.x candidate)
- macOS Sonoma-specific Tauri behaviors (user is on Ventura 13.4 — platform target locked)
- Windows / Linux build paths (out of scope per SPEC L122)
- Cross-startup chat history persistence (SPEC explicitly puts this in Phase 3)

</deferred>

---

*Phase: 01-tauri-shell-foundation-subprocess-hardening*
*Context gathered: 2026-05-08*
*Next step: `/gsd-plan-phase 1 [--tdd]` — plan-phase researcher will read this CONTEXT.md + 01-SPEC.md + spike-findings + dependencies.md, then produce RESEARCH.md and PLAN.md(s). The SPEC.md amendments listed in `<spec_lock>` (REQ-1 layout, REQ-6 hotkeys) should be applied as a SPEC patch in the same plan-phase output.*
