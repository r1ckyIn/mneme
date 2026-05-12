## Context

mneme is Tauri 2 + SvelteKit. The same SvelteKit frontend renders in two distinct runtime contexts:

1. **`npm run dev` → http://localhost:1420** — Chromium-accessible Vite dev server. Full CDP available. The surface where most UI work happens (components / layout / state / KD-13 token application).
2. **`cargo tauri dev` → native window** — same Vite served, but rendered inside WRY's native WebKit (WKWebView on macOS Ventura 13.4 Intel). **CDP is not exposed.** Tauri 2 ships a DevTools menu item but no programmatic socket. The surface where Tauri-specific behavior lives (window chrome, IPC to Rust, `claude` CLI subprocess, file dialogs, Echo360 webview cookies).

This change introduces three interlocking shifts:

1. **Tauri-shell observability — solved by forwarding observable signals out of the webview to log files plus dev-only Tauri commands for active screenshot / DOM retrieval.** Claude does not need to operate the webview interactively; it only needs to know what happened.
2. **Verification timing — moved entirely to the `/gsd-verify-work` gate.** Execute-phase stays silent: Claude runs all internal automated checks but does not interrupt the user with verification questions mid-execute. All human-judgment verification batches once at phase end.
3. **Rule layer location — moved to GSD upstream, not mneme-local.** The verify-work workflow itself, the Visual Review HTML template, and the SDK handlers that power the loop all live in `~/.claude/get-shit-done/` so all r1ckyIn projects inherit the discipline. mneme-side contributes only the project-specific capability exposure (Svelte forwarder, Tauri commands, npm-script bridge).

Both MCP servers used by the loop (`chrome-devtools-mcp`, `playwright`) are environment-provided. The locked stack has no dev-loop tooling library; this design adds no new npm/cargo deps in mneme. GSD upstream gets the 8 new SDK handlers + 1 HTML template + 3 workflow patches.

## Goals / Non-Goals

**Goals:**

- Execute-phase runs to completion without ever asking the user to read the console, screenshot, run a terminal command, paste a log, or inspect the DOM. Claude internally captures everything to `.dev-logs/` but does not interrupt.
- `/gsd-verify-work <phase>` becomes the **single batched gate** where: (a) all signals collected during execute are scanned by Claude, (b) automated checks are re-run from clean state, (c) Tauri-shell screenshots and DOM state are captured by Claude, (d) only true 4-bucket questions reach the user, packaged as one Visual Review HTML document.
- Visual Review HTML is **ephemeral**: generated fresh each verify run at `.planning/handoff/<date>-phase-<N>-verify.html`, gitignored, discarded after the user responds. No persistent baseline accumulates.
- Tauri-shell observability is achieved without reverse-engineering CDP: full-spectrum Svelte forwarder + two dev-only Tauri commands (`dev_capture_screenshot`, `dev_query_state`) both reachable via CLI for the GSD SDK bridge.
- The rule layer (verify-work workflow + HTML template + 8 SDK handlers) lives in GSD upstream so all r1ckyIn projects benefit. mneme is the first dogfood; downstream projects each only need to add their own npm-script bridge later.
- A future upstream PR to `gsd-build/get-shit-done` can ship the rule layer changes as a single coherent patch.

**Non-Goals:**

- Replacing human visual review. KP-09 + KD-13 aesthetic family is eye-judged.
- Reverse-engineering CDP into Tauri's native WebKit. The forwarder + dev commands are the canonical workaround; no socket shim.
- Pixel-diff regression baselines (Percy / Chromatic). Visual Review HTML is ephemeral, not a baseline.
- Cross-platform support. Single-user mneme on Intel Mac, macOS Ventura 13.4 only.
- New MCP servers. Reuses existing chrome-devtools-mcp + playwright.
- **Hook-level hard enforcement** of the "do not ask" rule (Tier C). Soft constraint via verify-work workflow rules + SDK `verify.validate-html` is judged sufficient for v1. Re-evaluated after dogfood.
- **Rich in-HTML form submission UX.** v1 accepts free-form user reply; `verify.parse-review-response` does best-effort extraction.

## Decisions

### D1 — Two-surface split, surface routing in verify-work step

**Decision:** `npm run dev` (Chromium target) and `cargo tauri dev` (Tauri shell target) remain *distinct surfaces with different observability ceilings*. The new `verify-work` step (D12 below) selects surface per phase based on what the phase touched: pure component/layout/state/animation phases route to Chromium; window-chrome / IPC / Echo360 webview / `claude`-subprocess phases route to Tauri shell. A phase touching both gets verified against both, sequentially.

**Rationale:** unchanged from prior design. CDP is significantly faster on Chromium; Tauri shell is the only place to validate window chrome and native-rendering edge cases. Both have their place.

### D2 — chrome-devtools-mcp primary, playwright for snapshot gates

**Decision:** for the Chromium surface, the SDK handler `verify.scan-signals` calls `mcp__plugin_chrome-devtools-mcp_chrome-devtools__list_console_messages` + `list_network_requests` + `list_console_messages` as its primary instruments. `mcp__playwright__*` is reserved for accessibility-tree snapshots and before/after screenshot comparison if the phase warrants it.

**Rationale:** unchanged — chrome-devtools-mcp is lighter and dev-debug-oriented, playwright is for snapshot gates.

### D3 — Full-spectrum dev-only Svelte forwarder

**Decision:** `src/lib/dev/console-forwarder.ts` (gated by `import.meta.env.DEV`, stripped from production builds). Intercepts:

| Signal | Method | Log file |
|---|---|---|
| `console.log/info/debug/warn/error` (all 5 levels) | monkey-patch with original-reference closure preservation | `.dev-logs/console.log` |
| `window.onerror` | direct handler | `.dev-logs/console.log` (tag `uncaught`) |
| `window.onunhandledrejection` | direct handler | `.dev-logs/console.log` (tag `unhandled-rejection`) |
| resource load failures (`<img>` / `<script>` / `<link>`) | `window.addEventListener('error', h, true)` | `.dev-logs/console.log` (tag `resource-error`) |
| CSP violations | `document.addEventListener('securitypolicyviolation', h)` | `.dev-logs/console.log` (tag `csp`) |
| `fetch` | global wrap preserving original reference | `.dev-logs/network.log` |
| `XMLHttpRequest` | `prototype.open` + `send` monkey-patch | `.dev-logs/network.log` |
| LCP / FCP / CLS / longtask | `PerformanceObserver` | `.dev-logs/perf.log` |

Rust side debounces writes (100 ms batches), rotates at 10 MB to `.log.1` (single backup).

**Execute-phase silence:** the forwarder writes signals continuously during execute, but **Claude does not surface them to the user during execute**. They sit in the log files until `/gsd-verify-work` invokes `verify.scan-signals` to read them.

**Rationale:** unchanged from prior all-levels design; the key shift is that the forwarder is no longer paired with a per-task Summary block — it is paired with the phase-end `verify.scan-signals` handler.

### D4 — Dev-server lifecycle owned by SDK handlers, not by skill

**Decision:** `verify.start-dev-loop <phase> [--surface chromium|tauri]` and `verify.stop-dev-loop` are the canonical lifecycle handlers. They:

- start `npm run dev` or `cargo tauri dev` in background via the SDK's process supervision
- write PID to `.dev-logs/dev-server.pid`, chosen port to `.dev-logs/dev-server.port` (fallback to 1421 if 1420 occupied)
- on stop, `kill -TERM` the process group and unlink state files

Execute-phase tasks that need a running dev server invoke `verify.start-dev-loop` themselves (and the corresponding stop on completion); verify-work's `automated_ui_verification` step also starts/stops as needed.

**Rationale:** keeping lifecycle in the SDK (Tier A) instead of mneme-local skill (deferred D8) lets all r1ckyIn projects use the same primitive. The hook-based cleanup mentioned in the prior design is **not added** in this change — Tier C is deferred. Worst case: leaked process across SDK runs is rare and `verify.start-dev-loop` probes for existing PID before launching.

**Alternative considered:** in-app process supervision via the running Tauri runtime. Rejected — the verify-work workflow needs to drive dev server lifecycle externally (from outside any running app), so SDK-level supervision is the correct boundary.

### D5 — Fail-loud Summary block produced by verify-work, not per task

**Decision:** the `[Dev Feedback Loop Summary]` block is generated at the end of `/gsd-verify-work` (specifically inside the new `package_manual_review` step, before any HTML is rendered). It is the structured precondition for either declaring the phase verified or routing remaining concerns into the Visual Review HTML.

The Summary block content is unchanged from the prior design: Surface / Dev server / Console (all levels) / Network / Resource errors / CSP violations / Performance / Automated checks / Screenshot / Visual review HTML path or `n/a`.

**Rationale (changed from prior):** producing the Summary per UI task would interrupt execute. Producing it once at verify-work matches the user's intent that execute be silent. The Summary still acts as the visible structure that catches omissions — but the audience is the user reading the verify-work output, not the user reading a mid-execute completion message.

### D6 — Human-judgment bounded to four buckets

**Decision:** unchanged. Visual fidelity / window chrome / animation feel / perceived performance. The skill description / SDK validation / HTML template all enforce that no other category of question appears in the Visual Review HTML.

### D7 — DEFERRED: hook-level hard enforcement of "do not ask"

**Decision:** **deferred to a future phase**, not part of Phase 01.1. The soft-constraint stack is:

1. verify-work workflow's new `<critical_rules>` block (D12 patch 3) tells Claude explicitly: never ask user to read console / run terminal / paste log / inspect DOM.
2. SDK `verify.validate-html` rejects HTML with non-conforming `data-bucket` values or forbidden tags.
3. Claude's own context discipline (with above two layers visible) self-regulates question phrasing.

If after 3-5 verify cycles Claude is observed bypassing the rules (asking forbidden questions in chat outside the HTML, or smuggling them into the HTML in ways `verify.validate-html` can't catch by structural check), a follow-up phase adds a `PreToolUse` shell guard. The phase id is reserved: `mneme-or-r1ckyin-XX-verify-do-not-ask-hardening`.

**Rationale:** building Tier C now is premature optimization. Soft constraints in upstream workflows are routinely enforced through Claude reading the workflow before each invocation; the structural validation (D13's `verify.validate-html`) catches the most likely failure mode (forbidden HTML buckets).

### D8 — DEFERRED: mneme-local skill removed

**Decision:** the previously planned `.claude/skills/dev-feedback-loop/SKILL.md` is **not created** in this change. All rules live in `~/.claude/get-shit-done/workflows/verify-work.md` (Tier B GSD upstream patch). mneme contributes only the project-specific capability layer (Tier D + E).

**Rationale:** the dev-feedback-loop discipline is universal across r1ckyIn projects, not mneme-specific. Putting it in a mneme-local skill duplicates it per-project and creates drift risk. Putting it in GSD upstream gives all projects the same rule. CLAUDE.md in mneme gets a one-row pointer entry referencing the GSD upstream workflow for discoverability, not a project skill.

**Alternative considered:** mneme-local skill that delegates to GSD upstream. Rejected — adds an indirection layer for no gain; GSD workflows are already auto-loaded during their respective commands.

### D9 — Dev-only Tauri `dev_capture_screenshot` with CLI invocation mode

**Decision:** `dev_capture_screenshot(scope: ScreenshotScope) -> Result<String, String>` in `src-tauri/src/commands/dev.rs`, `#[cfg(debug_assertions)]`-gated. `ScreenshotScope` = `Webview` | `Window`.

- **Primary path:** Tauri 2 `WebviewWindow::capture()` if stable in the pinned version.
- **Fallback:** macOS-native `screencapture -l <window-id>` (for `Webview`) or `screencapture -R<x,y,w,h>` (for `Window`).
- **CLI invocation:** to allow the GSD SDK to call this command from outside the running Tauri app (via the npm-script bridge), the command is also exposed through a small dev-only Rust binary `src-tauri/src/bin/dev_invoke.rs` (or equivalent — final mechanism TBD during task 5). The binary takes the command name and args, invokes it in a minimal Tauri runtime context, and prints the result to stdout.

Output: `.dev-logs/screenshots/<ISO-ts>.png`, full path returned.

**Why CLI invocation:** the new SDK `verify.capture-screenshot` handler (Tier A) calls the project's npm-script bridge (Tier D) which calls this CLI invocation (Tier E). Without CLI mode, the SDK can't reach the Tauri capability without the JS frontend being the one to invoke — which doesn't fit the verify-work-orchestrated model where the SDK drives.

**Alternatives considered:**

1. **In-app invocation only (no CLI).** Rejected — would require verify-work to puppet the frontend to invoke the command, fragile and slow.
2. **`tauri-plugin-screenshots` (third-party).** Rejected — new dep, maintenance unverified; raw `screencapture` is macOS builtin and stable.
3. **Standalone `screencapture` shell out from the SDK directly, no Tauri command at all.** Rejected — we need the Tauri runtime context to resolve window-id correctly, and the dev_query_state companion needs the runtime anyway. Keeping them in one place is cleaner.

### D10 — Dev-only Tauri `dev_query_state` with CLI invocation mode

**Decision:** `globalThis.__mnemeDevSnapshot__()` registered in Svelte dev-only context returns the structured snapshot:

```ts
type DevSnapshot = {
  url: string;
  title: string;
  viewport: { w: number; h: number; dpr: number };
  performance: { lcp_ms: number | null; fcp_ms: number | null; cls: number; longtasks: number };
  dom_summary: { node_count: number; depth: number; h1_count: number; h2_count: number; landmark_roles: string[] };
  computed_styles: Record<string, Record<string, string>>;  // KD-13 selectors from src/lib/dev/snapshot-selectors.ts
  ts: string;
};
```

`dev_query_state()` Rust command invokes the Svelte function via Tauri's script-evaluation API and returns the JSON-stringified result. CLI invocation mode: same dev-only binary as D9.

**Why this matters in verify-work context:** when verify-work needs to confirm e.g. `.chat-input` resolves `background-color` to the locked `var(--surface-warm)`, the SDK calls `verify.query-dom-state --surface tauri`, which calls the npm-script bridge, which calls `dev_query_state` via CLI, and returns the JSON. Claude parses and compares — no DevTools, no human.

### D11 — Visual Review HTML in GSD upstream, ephemeral, validated by SDK

**Decision:** the HTML template lives in `~/.claude/get-shit-done/templates/visual-review.html`, **not** mneme-local. Each verify run:

1. SDK `verify.render-review-html --phase <N> --auto-verified <yaml> --buckets <yaml>` reads the template, fills the header reassurance checklist (auto-verified items) and the four `<section data-bucket=...>` slots (with questions and screenshots), writes to `.planning/handoff/<date>-phase-<N>-verify.html`.
2. SDK `verify.validate-html --path <p>` re-reads the rendered file and rejects if any `data-bucket` is not in `visual|window|motion|perf`, or if any forbidden tag (`hybrid` / `terminal` / `console` / `dom-check` / `log-paste` / `command-run`) appears.
3. Verify-work workflow presents the path to the user and waits for the response.
4. The HTML file is **ephemeral** — `.planning/handoff/` is gitignored at this prefix (or the file specifically is gitignored), no persistent baseline. After the user responds, the file may be left on disk for debugging but is not part of the project record.

**Rationale:** HTML is for humans, ephemeral by design (matches the user's stated preference: HTML 给人看 + 阅后即焚 + 不进 git). The template living upstream means all projects get the same 4-bucket discipline. The structural validation via SDK catches forbidden buckets before the file is even surfaced.

### D12 — NEW: verify-work workflow three patches

**Decision:** three discrete patches to `~/.claude/get-shit-done/workflows/verify-work.md`:

**Patch 1: expand `automated_ui_verification` step (existing, lines 89-123).** Currently the step branches on Playwright-MCP availability and covers Chromium only. New branch: also detect Tauri-shell capability by probing for the npm-script bridge (`npm run gsd-dev-screenshot --dry-run` or equivalent existence check). If present, call `verify.scan-signals` + `verify.capture-screenshot --surface tauri` + `verify.query-dom-state --surface tauri` as additional automated verification before falling back to manual.

**Patch 2: new step `package_manual_review` (inserted between `automated_ui_verification` and `present_test`).** Replaces the default `present_test` path for the manual review portion. Instead of presenting tests one at a time in conversation:

```
1. Collect the "queued for manual review" items from step automated_ui_verification.
2. Group them by 4-bucket (visual / window / motion / perf). Items that don't fit any bucket → return to automated path (this means Claude tried to escalate something it should have handled itself).
3. Call verify.render-review-html with the grouped items and the auto-verified checklist.
4. Call verify.validate-html on the rendered output — if it fails, the workflow halts and Claude must rewrite the items.
5. Present the HTML path to the user, with a one-liner: "Visual review packaged at <path>. Reply when done — free-form ok, structured JSON better. After your response the file may be discarded."
6. Wait for response. On receipt, call verify.parse-review-response to extract structured issues.
```

The pre-existing `present_test` path remains as a fallback for edge cases (e.g., very small phases with one or zero items, no UI surface, MCP-unavailable degradation).

**Patch 3: new `<critical_rules>` block at the top of the workflow.** Five rules:

1. Claude MUST NOT ask the user to open DevTools, read the console, run a terminal command, paste a log file, run `ps aux` / `lsof` / `cargo` / etc., or perform any DOM inspection during verify-work. Those signals MUST be obtained via the SDK `verify.*` handlers.
2. The Visual Review HTML MUST contain only `data-bucket` values in `visual / window / motion / perf`. Forbidden tags: `hybrid`, `terminal`, `console`, `dom-check`, `log-paste`, `command-run`.
3. Questions in the HTML MUST be specifically answerable — no "does this look right?" without a concrete anchor (screenshot / GIF / selector / locked-value comparison).
4. The HTML MUST include the "Claude has auto-verified" reassurance checklist in the header so the user can see what work Claude already did before any manual judgment is requested.
5. Each verify run produces a fresh HTML — never amend a prior file.

**Rationale:** these three patches are the entire rule-layer change. Everything else (8 SDK handlers, the template, the npm-script bridge) is the implementation that makes the rules executable.

### D13 — NEW: GSD SDK eight `verify.*` query handlers

**Decision:** 8 new handlers under `gsd-sdk query verify.*` (Tier A from scope discussion). Each is a self-contained TypeScript / JavaScript module under `~/.claude/get-shit-done/lib/sdk/handlers/`:

| Handler | Signature | Purpose |
|---|---|---|
| `verify.start-dev-loop` | `<phase> [--surface chromium\|tauri]` | start dev server, write PID/port files, return startup state |
| `verify.stop-dev-loop` | `()` | kill PID, unlink files |
| `verify.scan-signals` | `[--since <iso-ts>]` | grep .dev-logs/*.log + tauri.log, return structured issue list |
| `verify.capture-screenshot` | `--surface <s>` | call project npm-script bridge or chrome-devtools-mcp, return PNG path |
| `verify.query-dom-state` | `--surface <s>` | call project bridge or chrome-devtools-mcp, return DOM/perf JSON |
| `verify.render-review-html` | `--phase <N> --auto-verified <yaml> --buckets <yaml>` | render template + write to .planning/handoff/, return path |
| `verify.parse-review-response` | `--path <p>` | best-effort extract structured issues from user's reply |
| `verify.validate-html` | `--path <p>` | enforce data-bucket whitelist + forbidden-tag blacklist |

**Discovery / registration:** depends on how the existing GSD SDK discovers handlers. Two patterns to investigate during task 4: (a) auto-discovery by file naming convention under `lib/sdk/handlers/`, (b) explicit allow-list in `lib/sdk/router.ts` or equivalent. Task 4 starts by reading the SDK source to determine which.

**Rationale:** the workflow patch (D12) is the rule, these handlers are how the rule is actually enforced. Cannot ship D12 without D13.

### D14 — NEW: npm-script bridge as cross-project protocol

**Decision:** each downstream project (mneme first, then UniBoard / Borealis / etc.) exposes its dev capabilities through 3 conventional npm scripts in `package.json`:

```json
{
  "scripts": {
    "gsd-dev-screenshot": "...",      // produces PNG at .dev-logs/screenshots/<ts>.png, prints path to stdout
    "gsd-dev-snapshot": "...",        // produces DOM/perf snapshot JSON, prints JSON to stdout
    "gsd-dev-scan-logs": "..."        // greps .dev-logs/*.log since arg timestamp, prints structured issue list as JSON
  }
}
```

GSD SDK `verify.capture-screenshot` / `verify.query-dom-state` / `verify.scan-signals` shell out to `npm run gsd-dev-screenshot` / `gsd-dev-snapshot` / `gsd-dev-scan-logs` respectively. Each project's implementation is project-specific: mneme's `gsd-dev-screenshot` calls the dev-only Rust binary that invokes `dev_capture_screenshot`; a Next.js project might call a Puppeteer screenshot script instead.

**Rationale:** this is the cross-project portability seam. Without it, the SDK either has to hardcode "if Tauri project, do X; if Next.js, do Y" or each project has to register its capabilities through a complex registration handshake. npm scripts are the lowest-friction protocol that works for every JavaScript / TypeScript project.

**Alternatives considered:**

1. **MCP server per project.** Rejected — too heavy for capability exposure; MCP is for tool surface, not project conventions.
2. **`.gsd/capabilities.yaml` declarative config.** Possible but premature; npm scripts are already discoverable by `npm run` and don't add a new config surface.
3. **Direct call into project's source.** Rejected — projects use different runtimes (Rust+Tauri, Next.js, SvelteKit, etc.); SDK shouldn't know.

### D15 — NEW: execute-phase silence rule

**Decision:** during `/gsd-execute-phase <N>`, Claude:

- Internally runs all automated checks (tsc / svelte-check / cargo check / vitest / lint) as needed for atomic-commit gating.
- Internally writes to `.dev-logs/*.log` and `.dev-logs/screenshots/` through the forwarder and Tauri commands.
- **Does NOT** present a Summary block, Visual Review HTML, or any verification-question to the user.
- **Does NOT** ask the user to run terminal commands, read the console, or perform any verification task.
- Completion messages for each plan / wave are minimal: "Plan N complete, M tasks done, ready for next wave / verify-work".

The verify-work gate (next command after execute) is where all the verification work surfaces. This is the structural enforcement of "execute silent, verify batched".

**Rationale:** this is the user-visible behavioral promise. Without it written as a decision, future work might re-introduce mid-execute verification interruptions.

## Risks / Trade-offs

- **[Risk] Cross-repo coordination.** `~/.claude/get-shit-done/` changes are user-global, not in mneme repo. Mistakes are not reverted by `git revert` in mneme.
  **Mitigation:** task list explicitly marks upstream edits as discrete steps. Each upstream change is preceded by `cp <file> <file>.bak` so it's reversible. The dogfood validation at end of phase verifies both halves coherently.

- **[Risk] SDK handler discovery mechanism not yet known.** D13 lists 8 handlers but registration is unverified.
  **Mitigation:** task 4 starts with reading the SDK source. If discovery is allow-list-based and missing the registration step silently breaks queries, the smoke test in task 4 catches it (each handler is invoked at least once and asserts it returns valid output, not "handler not found").

- **[Risk] CLI invocation mode for Tauri commands is unproven.** D9/D10 specify the path but actual implementation depends on whether Tauri 2 supports `tauri invoke <name>` style from the host shell or requires a custom binary.
  **Mitigation:** task 5 sub-task 5.0 is a spike — try 3 paths (Tauri CLI native, custom `dev_invoke` binary, `node -e` calling Tauri JS API). Whichever works ships in task 5.1+.

- **[Risk] Verify-work workflow patch is self-referential during this phase.** The patched workflow runs against the phase that patches it — order of operations matters.
  **Mitigation:** workflow patches land BEFORE Tauri code in the task order (tasks 7 before tasks 3-6 effectively). Phase 01.1's own `/gsd-verify-work` runs on the patched workflow — bootstrapping done.

- **[Risk] Visual Review HTML response parsing is best-effort.** Users replying free-form ("looks good except the orange feels too saturated") need structured extraction.
  **Mitigation:** `verify.parse-review-response` uses an LLM call inside the SDK to extract structured issues. If parsing is unreliable, fallback prompts the user to confirm the extracted list before committing it as gaps.

- **[Trade-off] Soft enforcement only (Tier C deferred).** Claude could in principle re-introduce console-asking via creative phrasing not caught by `verify.validate-html`'s structural check.
  **Mitigation:** monitor for it in dogfood; if observed in ≥2 phases, escalate to Tier C hook hardening as a new phase.

- **[Trade-off] HTML template lives upstream — mneme can't customize.** All projects use the same template.
  **Mitigation:** the template supports per-project override via `templates/visual-review.local.html` if a project drops one. mneme starts without override; revisits if KD-13 styling needs to extend the header.

- **[Trade-off] npm-script bridge couples GSD SDK to npm.** Projects without `package.json` (pure Rust binary CLIs, etc.) can't use this bridge.
  **Mitigation:** for r1ckyIn projects (all are JavaScript/TypeScript at minimum), this is fine. Pure-Rust projects can implement the bridge as `Makefile` targets and the SDK can `make gsd-dev-screenshot` instead — future extension, not blocking.

## Migration Plan

This is incremental adoption. The patched verify-work workflow ships with backward-compatible fallback: if the SDK handlers are not yet registered, the original `present_test` conversational path remains.

**Adoption order:**

1. **Tasks 7 (GSD upstream patches) land FIRST**, before any mneme-side code. Reason: the patched workflow is self-validating against this phase's verify-work invocation.
2. Tasks 2-6 add mneme-side capability (Svelte forwarder, Tauri commands, npm-script bridge).
3. `/gsd-verify-work 01.1` runs against the patched workflow + mneme-side capability — this is the bootstrapping dogfood.
4. After ship, downstream projects (UniBoard, Borealis, ClaudePulse, etc.) each follow up with their own npm-script bridges in their own phases.

Rollback: if any GSD upstream change breaks the workflow, `cp <file>.bak <file>` restores. mneme code changes are revertable through standard git.

## Open Questions

- **Q1: SDK handler discovery mechanism.** Resolved during task 4 by reading SDK source. Result documented in task 4 SUMMARY.md.
- **Q2: Tauri 2 CLI invocation mode.** Resolved during task 5 spike. Three paths tried; whichever works locked.
- **Q3: Visual Review HTML on multi-display Mac.** mneme single-user on internal display; multi-display deferred.
- **Q4: When to escalate to Tier C hook hardening?** Trigger: ≥2 verify cycles where Claude smuggles a forbidden question past `verify.validate-html`. Document in `.planning/notes/dev-feedback-loop-audit-*.md`.
- **Q5: Echo360 webview (Phase 5+) cookie partitioning.** Tauri-shell-only edge case; deferred to Phase 5 as before. Workflow will route Echo360 phases to Tauri-shell branch automatically.
- **Q6: `verify.parse-review-response` LLM call cost.** Each verify-work run incurs one LLM call for extraction. At Phase 01.1 cadence (one verify per phase ship) this is negligible. If verify is run more often (per-plan iterations) cost climbs; revisit in dogfood notes.

---

## v3.1 Errata (2026-05-12 — plan-phase research + spike)

Plan-phase research (`01.1-RESEARCH.md`) + the user-requested R1+R2 third-path spike surfaced five factual errors in v3. v3 D-* section text is preserved above for proposal history; the corrections below are authoritative for planning and execution. Q1, Q2 in Open Questions section are resolved by E3, E1+E1a.

### E1. D-TR-02 — `WebviewWindow::capture()` does not exist

**v3 claim:** "primary via Tauri 2 `WebviewWindow::capture()`, fallback via macOS `screencapture`".

**Reality:**
- Tauri issue [#12501](https://github.com/tauri-apps/tauri/issues/12501) closed-not-planned — no built-in screenshot method on `WebviewWindow`.
- wry issue [#1358](https://github.com/tauri-apps/wry/issues/1358) confirms no `capture_screenshot()` on the WebView crate either.
- Community plugin `tauri-plugin-screenshots@2.2.0` (uses `xcap`) and direct `xcap` crate both wrap the same macOS `CGWindowListCreateImage` system call that `screencapture -l` already invokes — no functional gain. Plugin path additionally hardcodes save location to `app_data_dir/tauri-plugin-screenshots/window-{id}.png` (violates the `.dev-logs/screenshots/<ISO-ts>.png` contract) and lacks `#[cfg(debug_assertions)]` gating (pollutes release builds).

**Resolution:**
- **Primary path:** macOS-native `screencapture -l <CGWindowID> -x -o <path>.png` for `Webview` scope; `screencapture -R x,y,w,h -x <path>.png` for `Window` scope. Stable since macOS 10.2; `CGWindowListCreateImage` not deprecated until 14.0, not obsoleted until 15.0 — well within mneme's 13.4 target.
- **CGWindowID retrieval:** from inside Tauri, via `objc2-app-kit` or `cocoa` crate using `NSWindow::windowNumber()` on the Tauri window's underlying NSWindow handle. The exact crate gets locked during group 3.0 spike.
- **No Rust plugin / xcap dep added.** Zero new crates beyond what's needed for CGWindowID retrieval.

### E2. D-TR-03 path 1 — `tauri invoke <name>` CLI does not exist

**v3 claim:** "Try in order: (a) `tauri invoke <name>` CLI native, (b) custom dev-only binary `src-tauri/src/bin/dev_invoke.rs`, (c) `node -e` calling Tauri JS API."

**Reality:**
- Tauri 2 CLI documents 17 subcommands (`init`, `dev`, `build`, `bundle`, `android`, `ios`, `migrate`, `info`, `add`, `remove`, `plugin`, `icon`, `signer`, `completions`, `permission`, `capability`, `inspect`). No `invoke` subcommand. `invoke()` is exclusively a frontend JS API requiring `__TAURI_INTERNALS__` global inside the WebView context.

**Resolution:**
- **Primary path:** custom dev-only binary `src-tauri/src/bin/dev_invoke.rs` with Cargo `[[bin]]` entry. Mirrors the same `invoke_handler` registration the main lib uses; argv dispatches to command, prints stdout, exits. `[[bin]]` gated so symbols absent from release.
- **Fallback path:** main binary's CLI mode (env-var branch in `main()`). Slightly simpler Cargo manifest but pollutes the main binary with a CLI-mode branch.
- **Future upgrade (Phase 01.2 candidate):** B2 — Unix Domain Socket IPC at `.dev-logs/dev.sock`. Reuses running Tauri app (~5ms per call vs 500ms-1s cold start of fresh Rust process). `tokio` + `serde_json` already in dep tree; zero new crate. Trigger: if Group 3.0 spike measures cumulative cold-start cost > 1s per `/gsd-verify-work` run.

**Eliminated paths (not retried):**
- B1 (Tauri sidecar): only invokable from inside the app — reverse direction unsupported.
- B3a (`tauri-invoke-http`): pinned to Tauri 1; no stable Tauri 2 release in 19 months.
- B4 (`tauri-plugin-cli`): parses startup args only, can't invoke registered commands.
- B5 (`tauri-driver` / WebDriver): macOS WKWebView not supported.
- v3's path (c) `node -e` via WebView: requires the running app to evaluate Node code inside its WebView — recursive / functionally identical to running the main binary with a CLI-mode branch (covered by fallback path above).

### E3. D-UP-03 — GSD SDK handler structure is NOT file-drop directory

**v3 claim:** "8 new handler modules under `~/.claude/get-shit-done/lib/sdk/handlers/verify-*.{ts,js}`".

**Reality:**
- `~/.claude/get-shit-done/lib/sdk/handlers/` does not exist.
- GSD SDK ships as npm package `@gsd-build/sdk@1.40.0` installed at `~/.npm-global/lib/node_modules/@gsd-build/sdk/` with TypeScript source under `src/query/` (compiled to `dist/`). The CJS shim at `~/.claude/get-shit-done/bin/gsd-tools.cjs` is a parallel surface that mirrors the TS registry through `bin/lib/verify-command-router.cjs` switch + generated alias file `bin/lib/command-aliases.generated.cjs`. **Both must be kept in sync.**

**Resolution:** the 8 new `verify.*` handlers ship as the following concrete files:

| Layer | File | Action |
|---|---|---|
| TS canonical declarations | `@gsd-build/sdk/src/query/command-manifest.verify.ts` | extend with 8 new `CommandManifestEntry` rows |
| TS handler implementations | `@gsd-build/sdk/src/query/verify.ts` (existing file) | export 8 new functions (e.g., `verifyStartDevLoop`, `verifyScanSignals`, etc.) following existing `QueryHandler` type from `utils.ts` |
| TS registration | `@gsd-build/sdk/src/query/index.ts` `createRegistry()` | register 8 new handlers explicitly (allow-list mechanism, not auto-discovery) |
| TS build | `@gsd-build/sdk/dist/` regeneration via the SDK's existing build script | rebuild after manifest + handler + index updates |
| CJS shim — handler logic | `~/.claude/get-shit-done/bin/lib/verify-dev-loop.cjs` (NEW single file) | 8 `cmdVerify*` functions exported, mirroring TS behavior |
| CJS shim — router | `~/.claude/get-shit-done/bin/lib/verify-command-router.cjs` | extend switch with 8 new cases dispatching to the new file |
| CJS shim — alias regeneration | `~/.claude/get-shit-done/bin/lib/command-aliases.generated.cjs` | add 8 new aliases via the existing generation script |

**Why no separate-handler-file pattern:** the SDK's allow-list registration discovery + the CJS shim's central router pattern both reward consolidation into one file with multiple exports. Eight files would each require eight separate router entries; one file with eight exports + eight router cases keeps cross-file coupling minimal.

### E4. D4 — Vite dev port is 5173, not 1420

**v3 claim:** "write PID to `.dev-logs/dev-server.pid`, chosen port to `.dev-logs/dev-server.port` (fallback to 1421 if 1420 occupied)".

**Reality:** mneme's `vite.config.ts` line 7-12 configures `port: 5173, strictPort: true, host: 'localhost', hmr: { port: 5173 }`. `strictPort: true` means Vite exits on port collision rather than falling back.

**Resolution:**
- `verify.start-dev-loop` writes the canonical port `5173` to `.dev-logs/dev-server.port`.
- On `lsof -i :5173` returning an existing process OR a stale PID file detected, handler returns structured error `{ error: 'port 5173 in use', existing_pid: <pid>, hint: 'run verify.stop-dev-loop first' }` — **fail loud, no silent fallback.** Keeps the Phase 1 deliberate `strictPort: true` choice intact (clean port collision diagnostics over silent reallocation).
- The OpenSpec D4 ports `1420 / 1421` were a copy-paste from older Tauri scaffolding default. All v3 references to `1420 / 1421` (D4 + tasks group 6.1 + visible scenarios) should read `5173`.

### E5. D-TR-01 — `src-tauri/src/commands/dev.rs` directory does not exist

**v3 claim:** "Create `src-tauri/src/commands/dev.rs` (entire file `#[cfg(debug_assertions)]`-gated)".

**Reality:** Phase 1 wrote Tauri commands directly in `src-tauri/src/lib.rs` top-level (`#[tauri::command]` functions at L51-71). No `src-tauri/src/commands/` subdirectory exists.

**Resolution:**
- New file at `src-tauri/src/dev.rs`, parallel to `src-tauri/src/session.rs` (existing).
- Entire file `#[cfg(debug_assertions)]`-gated via `#[cfg(debug_assertions)] pub mod dev;` declaration in `lib.rs`.
- Avoids the scope-expansion cost of migrating Phase 1's existing top-level commands into a new `commands/` subdirectory. Aligns with the mneme Rust patterns "organize by domain, not by file type" convention (see `01.1-PATTERNS.md`).

### E6. R5 — Safari 16 (macOS 13.4 WKWebView) `PerformanceObserver` partial support

**Not a v3 spec error — implementation detail surfaced by R5.** Safari 16 (WKWebView on macOS 13.4) does NOT support `PerformanceObserver` entries of type `largest-contentful-paint`. (FCP `paint` / `layout-shift` / `longtask` are supported.)

**Resolution:** Svelte forwarder wraps each `PerformanceObserver.observe({ type: '<entry-type>' })` call in try/catch. On `TypeError: <entry-type> is not a valid entry type`, the observer is skipped silently and the corresponding field in `__mnemeDevSnapshot__().performance` falls back to `null`. The D10 type signature `lcp_ms: number | null` already permits this. The dev-mode console emits a single-line `console.info("[forwarder] LCP unavailable on this WebKit version, skipped")` so engineers know why their LCP probe is empty.

### Summary — net effect on Phase 01.1 PLAN.md

- Group 3 (Tauri Rust dev commands): file path `src-tauri/src/dev.rs` (not `commands/dev.rs`); screenshot is `screencapture` shell-out (not `WebviewWindow::capture()` primary); CLI invocation is `src-tauri/src/bin/dev_invoke.rs` (primary) or main-binary CLI mode (fallback); B2 UDS upgrade deferred to Phase 01.2.
- Group 6 (SDK handlers): edits live across `@gsd-build/sdk` npm package (3 files) AND the CJS shim (3 files) — six concrete files / one new + five edits — not the v3-imagined 8 separate handler files.
- Group 2 (Svelte forwarder): each `PerformanceObserver.observe()` call wrapped in try/catch for Safari 16 compat.
- Group 6.1 (`verify.start-dev-loop`): port `5173` with fail-loud `lsof` probe, not port `1420` with fallback `1421`.
