---
title: OSS Dependency Registry
date: 2026-05-07
status: living document — updated per phase ship
governs: KP-08 (OSS dependency tracking + upstream monitoring)
---

# mneme · OSS Dependency Registry

> **Purpose**: Single source of truth for every external open-source library mneme adopts (npm dep / cargo dep / vendored / subprocess CLI / external API / model asset). Registry exists to satisfy **KP-08** — every adopted library is *owned* (tracked, monitored, evaluated for upstream changes), not just imported.
>
> **Maintenance rule (pre-v1)**: any new dependency added in code MUST land in this file in the same PR. Reviewers reject PRs that introduce undeclared deps.
>
> **Maintenance rule (post-v1 ship)**: scheduled GitHub Actions / dependabot run at the cadence per row; security patch / API breaking change / license change → opens a `dep-review` issue.

---

## Field definitions

| Field | Meaning |
|---|---|
| **Library** | Org/repo or package name |
| **Version** | Locked version (or `latest` for tracked-loose, or `TBD` for not-yet-locked) |
| **License** | SPDX identifier (MIT / Apache-2.0 / GPL-3.0 / etc.) |
| **Anchors** | Which PROJECT.md REQ / KD / KP it serves |
| **Integration** | `npm-dep` / `cargo-dep` / `vendored` / `subprocess-cli` / `external-api` / `model-asset` |
| **Mods** | `none` / `forked` (link to fork) / `vendored-modified` (link to local dir) |
| **Health** | `active` / `maintained` / `slow` / `stale` / `archived` (based on last-commit + release cadence + issue activity) |
| **Monitor** | `weekly` (security-critical) / `monthly` (active deps) / `release-only` (slow-moving) / `frozen` (vendored, not tracking upstream) |
| **Last-checked** | YYYY-MM-DD; bumped when monitor cadence completes |

---

## Group 1 — Frontend / UI libraries (npm-dep)

| Library | Version | License | Anchors | Integration | Mods | Health | Monitor | Last-checked |
|---|---|---|---|---|---|---|---|---|
| `@tauri-apps/api` | 2.x | MIT | KD-01 | npm-dep | none | active | monthly | 2026-05-07 |
| `@tauri-apps/plugin-shell` | 2.x | MIT/Apache-2.0 | KD-01 | npm-dep | none | active | monthly | 2026-05-07 |
| SvelteKit (`@sveltejs/kit`) | 2.x | MIT | KD-01 | npm-dep | none | active | monthly | 2026-05-07 |
| `@sveltejs/adapter-static` | 3.x | MIT | KD-01 | npm-dep | none | active | release-only | 2026-05-07 |
| Svelte (with `$state` runes) | 5.x | MIT | KD-02 | npm-dep | none | active | monthly | 2026-05-07 |
| `marked` | latest | MIT | KD-02 | npm-dep | none | active | monthly | 2026-05-07 |
| `katex` | ≥ 0.16.21 (pinned) | MIT | KD-02, Phase 1 hardening | npm-dep | none | active | weekly (security) | 2026-05-07 |
| `dompurify` | latest | MPL-2.0 | KD-02, Phase 1 hardening | npm-dep | none | active | weekly (security) | 2026-05-07 |
| `cmdk` (or kbar) | TBD (Phase 3) | MIT | REQ-11, Phase 3 | npm-dep | TBD | active | release-only | 2026-05-07 |
| `gray-matter` | ^4.0.3 | MIT | REQ-06, Phase 2 | npm-dep | none | maintained | monthly | 2026-05-15 |

## Group 2 — Editor & whiteboard (npm-dep)

| Library | Version | License | Anchors | Integration | Mods | Health | Monitor | Last-checked |
|---|---|---|---|---|---|---|---|---|
| `@tiptap/starter-kit` | 3.22.5 | MIT | KD-09, REQ-11, Phase 3 | npm-dep | none | active | monthly | 2026-05-07 |
| `@tiptap/extension-mention` | 3.x | MIT | REQ-06 wiki-links, Phase 3 | npm-dep | none | active | monthly | 2026-05-07 |
| `@tiptap/extension-suggestion` | 3.x | MIT | Phase 3 slash menu | npm-dep | none | active | monthly | 2026-05-07 |
| `tiptap-markdown` (`aguingand/tiptap-markdown`) | latest | MIT | KD-09 round-trip, Phase 3 | npm-dep | none | maintained | monthly | 2026-05-07 |
| `@excalidraw/excalidraw` | 0.18.1 | MIT | KD-08 whiteboard (deferred v2+) | npm-dep (future) | none | active | release-only | 2026-05-07 |

## Group 3 — Visualization & FSRS (npm-dep)

| Library | Version | License | Anchors | Integration | Mods | Health | Monitor | Last-checked |
|---|---|---|---|---|---|---|---|---|
| `cytoscape` | 3.33.3 | MIT | KD-08 mind-map, Phase 8 | npm-dep | none | active | monthly | 2026-05-07 |
| `cytoscape-dagre` | latest | MIT | KD-08 layout, Phase 8 | npm-dep | none | maintained | release-only | 2026-05-07 |
| `ts-fsrs` (`open-spaced-repetition/ts-fsrs`) | 5.3.2 | MIT | KD-06, REQ-09, Phase 10 | npm-dep | none | active | monthly | 2026-05-07 |
| `subtitle` | 4.2.2 | MIT | REQ-05 VTT, Phase 6 | npm-dep | none | maintained | release-only | 2026-05-07 |

## Group 4 — Rust / backend (cargo-dep)

| Library | Version | License | Anchors | Integration | Mods | Health | Monitor | Last-checked |
|---|---|---|---|---|---|---|---|---|
| Tauri 2 | 2.x | MIT/Apache-2.0 | KD-01 | cargo-dep | none | active | monthly | 2026-05-07 |
| Rust toolchain | ≥ 1.88 (`rust-toolchain.toml`) | MIT/Apache-2.0 | KD-03 | cargo-dep | n/a | active | release-only | 2026-05-07 |
| `rusqlite` | 0.39 | MIT | REQ-06 SQLite index, Phase 2 | cargo-dep | none | maintained | monthly | 2026-05-15 |
| `sqlite-vec` | 0.1.9 | Apache-2.0 OR MIT (dual) | future v2 vector path | cargo-dep (future) | none | active | release-only | 2026-05-07 |

## Group 5 — Subprocess CLIs (external Python / Node tools)

| Library | Version | License | Anchors | Integration | Mods | Health | Monitor | Last-checked |
|---|---|---|---|---|---|---|---|---|
| Marker (`datalab-to/marker`) | 1.10.2 | GPL-3.0 (code) + AI Pubs Open Rail-M (model weights) | REQ-18, Phase 4 | subprocess-cli | none | active | monthly | 2026-05-07 |
| markitdown (Microsoft) | latest | MIT | REQ-18, Phase 4 | subprocess-cli | none | active | monthly | 2026-05-07 |
| Claude Code CLI (`claude`) | latest stable | proprietary (Anthropic) | KD-01 + KP-04 (foundation), every phase | subprocess-cli | n/a | active (Anthropic-maintained) | weekly (track Claude Code releases) | 2026-05-07 |
| `graphify` (`safishamsi/graphify`) | TBD (eval Phase 7) | MIT | RQ-04, Phase 7 (option) | subprocess-cli (option) | TBD | active | monthly | 2026-05-07 |

## Group 6 — Vendored (copied into repo, NOT npm/cargo dep)

| Library | Version | License | Anchors | Local path | Mods | Upstream tracking |
|---|---|---|---|---|---|---|
| `claude-code-parser` (`udhaykumarbala/claude-code-parser`) | (frozen at vendor time) | MIT | KD-12, REQ-02 | `vendor/claude-code-parser/` | adapt-as-needed | **frozen** (upstream effectively unmaintained per KD-12); no auto-bump; manual review only when Claude Code event schema changes |

## Group 7 — External APIs (over network)

| Service | Anchors | Integration | Auth model | Monitor focus |
|---|---|---|---|---|
| Anthropic Claude API (Citations API) | KD-05, REQ-08, Phase 9 | external-api (HTTPS) | API key (NOT OAuth subscription) | API surface change, pricing change, citation schema change |
| Anthropic Claude API (translation for VTT) | REQ-05, Phase 6 | external-api (HTTPS) | API key | rate limit, pricing |
| Canvas API (via user's own Canvas/Ed MCP) | REQ-03, Phase 2 | external-api (via MCP) | user OAuth | Canvas API version, MCP server compatibility |
| Ed Discussion API (via user's own Canvas/Ed MCP) | REQ-03, Phase 2 | external-api (via MCP) | user OAuth | Ed API version, MCP server compatibility |
| Echo360 (USYD-scoped, via embedded webview) | REQ-04, Phase 6 | webview (no public API used directly) | USYD SSO cookie | LTI 1.3 changes, cookie policy changes |
| Ollama HTTP API (`localhost:11434`) | future v2 vector path | external-api (local HTTP) | none | API stability |

## Group 8 — Model assets (binary downloads)

| Asset | Source | License | Anchors | Storage | Monitor |
|---|---|---|---|---|---|
| Marker model weights (Chandra) | datalab-to/marker download | AI Pubs Open Rail-M (free for personal/research/<$2M revenue) | REQ-18, Phase 4 | local cache (auto-download on first run) | model release cadence |
| `nomic-embed-text` (Ollama model) | Ollama Library | Apache-2.0 | future v2 vector path | local Ollama (~274MB) | model updates |

---

## Reference-only (NOT direct deps — study patterns, do NOT fork/copy code)

| Project | License | Why studied | Why NOT a dep |
|---|---|---|---|
| `getAsterisk/opcode` (Claudia) | **AGPL-3.0** | Best Claude Code GUI UX reference (Tauri 2 stack matches) | AGPL is poison for binary distribution; READ-ONLY inspiration only |
| `markes76/claude-code-gui` | MIT | JSONL-tail pattern for parsing Claude Code transcript files | Architecture differs (Electron + file-tail vs our subprocess + stream-json); pattern adopted, code not copied |
| `yiliqi78/TOKENICODE` | Apache-2.0 | Closest tech-stack twin (Tauri 2 + React + subprocess + NDJSON streaming) | Single-pane chat UI doesn't match three-pane shell; pattern reference only |
| `Read Frog` (`mengxi-ream/read-frog`) | GPLv3 + commercial | Bilingual subtitle batching pattern (REQ-05) | GPLv3 forbids our license posture; clean-room reimplementation only |
| `siteboon/claudecodeui` | AGPL-3.0 | Web-based Claude Code UI | Web architecture differs; AGPL poison; READ-ONLY |

---

## Pending decisions (libraries NOT yet locked — gated by research)

### Pending: KG memory library (RQ-01 BLOCKING — gates Phase 7)

Phase 5.5 will lock ONE of the following 4 candidates after a 4-project comparison + 1-week dogfood:

| Candidate | License | Health | Architectural fit | Risk |
|---|---|---|---|---|
| **Cognee** (`topoteretes/cognee`) | Apache-2.0 | active (17.1k stars) | GraphRAG, multi-doc, ontology-grounded | Python-only — runtime weight (~Python embedded or subprocess only) |
| **Zep + Graphiti** (`getzep/zep`) | (community deprecated) | shifting cloud-only | best temporal KG | Cloud pivot violates KP-01 |
| **Mem0** (`mem0ai/mem0`) | Apache-2.0 | active (54.9k stars) | 3-tier mature, Docker self-host | Vector-first, weak temporal model |
| **agentmemory** (`rohitg00/agentmemory`) | Apache-2.0 | active (2.2k stars, 800+ tests) | KD-10 architectural alignment | No public benchmark, niche fork — fall-back only |

**Resolution mechanism**: Phase 5.5 plan + dogfood report; locked library moves to Group 5/6 above (depending on integration mode).

### Pending: Voice STT library (REQ-19 v1.x candidate)

Phase TBD (post-v1 ship) will validate latency on Intel Mac CPU and lock ONE of:

| Candidate | License | Approach | Validation needed |
|---|---|---|---|
| `whisper.cpp` (`ggerganov/whisper.cpp`) | MIT | C++ port; small/medium models | Intel Mac CPU latency for ~30s utterance |
| `distil-whisper` | MIT | Faster, smaller distilled Whisper | Latency vs accuracy trade-off |
| Vosk | Apache-2.0 | Lightweight offline; multi-language | Smaller binary, may have accuracy gap |

---

## Group 9 — Design system references (KP-09 + KD-13 SSOT)

These are NOT code dependencies — they are **authoritative reference materials** for the visual aesthetic family. KD-13 explicitly defers all detailed specs (full token palette, motion details, OSS gallery, design philosophy) to these files.

| Reference | Type | Local path / source | Authority |
|---|---|---|---|
| Anthropic / Claude aesthetic deep-dive (zh) | Curated 7-chapter analysis | `.planning/references/design/anthropic-claude-aesthetic-deep-dive_zh.md` | Secondary — research synthesis from public sources, design team interviews, Geist Behance, Anthropic GitHub |
| Claude aesthetic OSS UI libraries gallery | Curated HTML gallery (9 libs across 3 categories) | `.planning/references/design/claude-aesthetic-ui-libraries-gallery.html` | Secondary — community curation; CSS preview tokens are accurate per Anthropic spec |
| `anthropics/skills/brand-guidelines` | Official Anthropic brand skill | https://github.com/anthropics/skills/tree/main/skills/brand-guidelines | **PRIMARY (first-party SSOT)** — when other sources disagree on hex values / typography, this wins |

**Maintenance rule for these references**: bump `Last-checked` if user provides updated reference materials, or if `anthropics/skills/brand-guidelines` releases a new version. Sub-version drift (e.g. `#d97757` vs `#da7756`) is documented in deep-dive Section 1; tolerate within Anthropic's own hue range.

## Group 10 — KD-13 recommended starting libraries (Layer 3 — replaceable)

Recommended OSS implementations of the Claude aesthetic; all replaceable per ROADMAP Layer 3. **mneme is Svelte-based** — favor library integrations that port CSS tokens / patterns rather than pulling React components.

| Library | Version | License | Anchors | Integration mode | Health | Monitor | Last-checked |
|---|---|---|---|---|---|---|---|
| **shadcn.io/theme/claude** | latest | MIT (theme registry) | KD-13 primary recommendation | port-tokens-only (NOT React component import — mneme is Svelte) | active | release-only | 2026-05-07 |
| **assistant-ui Claude Clone** | n/a | (per-project license) | KD-13, REQ-01 (three-pane pattern reference) | study-only (React) | active | release-only | 2026-05-07 |
| **VoltAgent/awesome-claude-design** | latest (68 templates) | (per-template license) | KP-05 + KP-09 composition (DESIGN.md scaffold prompts for Claude Code) | reference-only | active | monthly | 2026-05-07 |
| **tweakcn** | n/a (web tool) | open source | KD-13 (shade variant generation) | external-tool (web UI) | active | release-only | 2026-05-07 |
| **`jnahian/vscode-claude-theme`** | latest | MIT | optional — for `claude` CLI consistency in editor | VS Code extension (user-installed, not bundled) | maintained | release-only | 2026-05-07 |
| **`OpenCoworkAI/open-codesign`** | latest | MIT | future — alternative to KP-05 Claude Design (BYOK + multi-model + local-first) | reference-only (potential alternative) | active | monthly | 2026-05-07 |
| **`Damienchakma/Open-claude`** | latest | (per repo) | reference — minimal Claude UI clone | study-only (React) | maintained | release-only | 2026-05-07 |
| **`chihebnabil/claude-ui`** | latest | (per repo) | reference — Nuxt/Vue Claude UI | study-only (Nuxt) | maintained | release-only | 2026-05-07 |

---

## Group 11 — External dev tools (MCP servers + macOS CLIs)

Introduced by Phase 01.1 (`automate-dev-feedback-loop` OpenSpec change). These
are **environment-provided** tools the verify-work workflow + GSD SDK `verify.*`
handlers depend on during `/gsd-verify-work`. None are runtime dependencies of
the mneme binary itself; all are dev-only. Listed here so that future-self
running on a fresh machine can install / verify presence before exercising the
dev feedback loop. Per CONTEXT D-DEP-01 the group name is canonical and the row
set is fixed at five entries.

| Tool | Source | Required version | License | Anchors | Purpose | Monitor | Last-checked |
|---|---|---|---|---|---|---|---|
| `chrome-devtools-mcp` | MCP server (environment-provided, see `~/.claude/settings.json` MCP block) | latest stable | (per-server license) | Phase 01.1, D-SR-02 | Chromium-surface signals: `list_console_messages`, `list_network_requests`, `take_screenshot`. Consumed by `verify.scan-signals` / `verify.capture-screenshot --surface chromium` per OpenSpec D-UP-03 | release-only | 2026-05-12 |
| `playwright` MCP | MCP server (environment-provided) | latest stable | Apache-2.0 (Microsoft) | Phase 01.1, D-SR-02 | Accessibility-tree snapshots + before/after visual diff when the phase warrants. Consumed by `automated_ui_verification` Playwright branch per OpenSpec D-UP-01 patch 1 | release-only | 2026-05-12 |
| `screencapture` | macOS system tool (`/usr/sbin/screencapture`) | macOS 10.2+ (Ventura 13.4 target) | Apple proprietary (OS-bundled) | Phase 01.1, D-TR-02 | Tauri-shell window capture via `screencapture -l <CGWindowID>` or `-R x,y,w,h`. Primary path per design.md v3.1 errata E1 (Tauri 2 has no `WebviewWindow::capture()`). Consumed by `dev_capture_screenshot` Rust command + `gsd-dev-screenshot` npm bridge | n/a (OS) | 2026-05-12 |
| `lsof` | macOS system tool (`/usr/sbin/lsof`) | Ventura 13.4 built-in | BSD-style (OS-bundled) | Phase 01.1, errata E4 | Port-collision probe in `verify.start-dev-loop` (`lsof -i :5173` per v3.1 errata E4). Vite strict-port fail-loud requires presence check before spawn | n/a (OS) | 2026-05-12 |
| `tee` | POSIX standard (`/usr/bin/tee`) | Ventura 13.4 built-in | (POSIX, OS-bundled) | Phase 01.1, D-LG-02 | `npm run dev 2>&1 \| tee .dev-logs/tauri.log` pattern for surfacing Tauri runtime output to the log scanner. Consumed by `verify.scan-signals` indirectly via the `.dev-logs/tauri.log` artifact | n/a (POSIX) | 2026-05-12 |

**Minimum platform**: macOS Ventura 13.4 Intel (mneme target per PROJECT.md user
profile). Apple Silicon supported by all five tools but **not** the validated
baseline — re-verify when the project migrates to Apple Silicon hardware.

**Cross-reference**: `openspec/changes/automate-dev-feedback-loop/` is the
authoritative spec for tool selection. Key decisions: design.md D-DEP-01
(this group name) + D-DEP-02 (CLAUDE.md pointer) + v3.1 errata E1 (no
`WebviewWindow::capture()`, hence `screencapture -l`) + errata E4 (strict-port
not fallback, hence `lsof` probe). After the OpenSpec change archives via
`/opsx:archive`, the canonical capability spec moves to
`openspec/specs/dev-feedback-loop/spec.md`.

**Maintenance note**: rows in this group have `Monitor: n/a (OS)` because
macOS / POSIX-bundled tools track the OS upgrade cadence, not their own
release stream. `chrome-devtools-mcp` and `playwright` MCP are environment-
provided (`~/.claude/settings.json`) — not in `package.json` — so they update
when Claude Code itself updates. No active mneme-side action required.

---

## Maintenance log

| Date | Action |
|---|---|
| 2026-05-07 | Registry created per KP-08 (added 2026-05-07 in `/gsd-explore` session). Initial population from PROJECT.md KD-01 through KD-12 + STACK research artifacts. Pre-v1 maintenance rule active. |
| 2026-05-07 | Added Group 9 (Design system references — KP-09 + KD-13 SSOT) and Group 10 (KD-13 recommended starting libraries) per user direction "软件 ui 文化, 设计, 美学都按照这两个文件走". Reference files copied into `.planning/references/design/`. |

---

## Related documents

- **PROJECT.md → Key Principles → KP-08**: governance principle behind this registry
- **PROJECT.md → Key Decisions → KD-01 through KD-12**: locked technical choices that anchor most rows
- **research/STACK.md**: deeper rationale for each library choice (license analysis, alternatives considered, rejection reasons)
- **research/questions.md → RQ-01**: KG memory library decision (Phase 5.5 BLOCKING gate)
- **ROADMAP.md → Layer Architecture → Layer 3**: phase-level thinking on which libraries belong to the "replaceable" layer
