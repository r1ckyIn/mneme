# Pitfalls Research

**Domain:** Personal desktop learning app wrapping local Claude Code (Tauri 2 + SvelteKit + agentic vault + FSRS + Echo360 webview + AI knowledge graph)
**Researched:** 2026-05-06
**Confidence:** HIGH for Tauri/Claude/markdown/FSRS pitfalls (verified via official docs, GitHub issues, CVEs); MEDIUM for AI memory pitfalls (community evaluations, fewer postmortems); MEDIUM for solo-dev pitfalls (statistics-backed but generalized)

> **Building on Spike 002 F1-F9 — NOT duplicated here:**
> F1 (Rust ≥ 1.88), F2 (svelte-ts template), F3 (DOMPurify on KaTeX/marked), F4 (`--bare` carried), F5 (JSONL line buffering), F6 (`--bare` ⊥ OAuth), F7 (`--permission-mode bypassPermissions`), F8 (chunky streaming), F9 (encrypted thinking blocks). This document covers what spikes did **not** catch.

---

## Critical Pitfalls

### Pitfall 1: Subprocess zombies on app exit (macOS Cmd+Q)

**Severity:** CRITICAL

**What goes wrong:**
When user quits the Tauri shell via Cmd+Q (the macOS norm) instead of closing the window, the spawned `claude` subprocess survives the parent. Worse — if `claude` itself spawned tool subprocesses (Bash, Edit), those also survive. After a few sessions the user has 5-10 orphaned `claude` processes silently consuming memory and possibly burning OAuth quota.

**Why it happens:**
Tauri 2's `tauri-plugin-shell` documents that on macOS, app quit (Cmd+Q) is not the same code path as window close — children are not auto-killed unless explicitly handled. `Command::new_sidecar` has automatic cleanup, but `Command::create("claude-bin", ...).spawn()` (what we use because `claude` is not a bundled sidecar) does not. Confirmed in tauri-apps/tauri#1896.

**Warning signs:**
- `ps aux | grep claude` shows 2+ `claude` processes after closing the app
- Activity Monitor shows growing memory after multiple session cycles
- Cost dashboard shows API charges with no app open

**Prevention strategy:**
1. Store `Child` handle in a `tauri::State<Mutex<Option<CommandChild>>>` keyed by session
2. Register `tauri::WindowEvent::CloseRequested` AND a macOS-specific `RunEvent::ExitRequested` handler
3. On both events: `child.kill()` BEFORE allowing exit, with a 2-second timeout-and-SIGKILL fallback
4. Add a debug-only `ps aux | grep claude` check at app startup, log warnings
5. Document for future-self: "Cmd+Q must trigger child cleanup or you'll burn quota"

**Phase to address:**
**Phase 1 (Tauri shell foundation)** — fix this BEFORE any other features ship. Cost compounds.

**Source:** [tauri-apps/tauri#1896](https://github.com/tauri-apps/tauri/issues/1896), [Discussion #3273](https://github.com/tauri-apps/tauri/discussions/3273), [Medium: How to Start/Stop a sidecar](https://medium.com/@samuelint/tauri-how-to-start-stop-a-sidecar-and-pipe-sidecar-stdout-stderr-to-app-logs-from-rust-8f81a92111ad)

---

### Pitfall 2: Tauri capability wildcard window grants (asset/shell scope amplification)

**Severity:** CRITICAL

**What goes wrong:**
Capabilities written with `"windows": ["*"]` or asset-protocol scope `"/**/*"` give EVERY current and future window full access to spawn `claude`, read arbitrary files, etc. If a future feature embeds Echo360 in an iframe and a malicious lecture page (or a hijacked CDN) injects script, it inherits all of this. CVE-2024-35222 (improper access control via `dangerousRemoteDomainIpcAccess` and capabilities) is the documented form of this class.

**Why it happens:**
Wildcard is the path of least resistance during development. The default capability template uses `"main"` for windows but the asset/shell scopes are easy to overscope. On Linux/Android, Tauri cannot distinguish iframe requests from window requests — broadens the attack surface.

**Warning signs:**
- `capabilities/*.json` contains `"*"` in `windows` array
- Asset protocol `scope` uses `/**/*`
- Shell allow-list has `"args": true` (we currently do — see Spike F-series)
- Any call site that injects HTML from third-party (Echo360 captions, AI tool output) without per-window capability isolation

**Prevention strategy:**
1. Name every window explicitly: `windows: ["main", "video-pane"]`
2. Asset-protocol scope must be the vault root only, not `/`: e.g. `"$HOME/StudyVault/**"` (or whatever path is locked in REQ-06)
3. Echo360 iframe MUST live in a separate webview (Tauri 2 supports multi-webview windows) with its own zero-capability ACL — no `shell:*`, no `fs:*`, no IPC
4. Lock Tauri version ≥ 2.0.0 (CVE-2024-35222 fix); add Renovate/Dependabot for Rust deps
5. Add a self-audit script: parse `capabilities/*.json`, fail CI if any `"*"` appears in windows arrays

**Phase to address:**
**Phase 1 (Tauri shell foundation)** for default capabilities; **Phase X (Echo360 video integration)** for iframe isolation. Plan-checker should verify both phases address this.

**Source:** [CVE-2024-35222](https://security.snyk.io/vuln/SNYK-RUST-TAURI-7026338), [Tauri Capabilities docs](https://v2.tauri.app/security/capabilities/), [Filesystem scope bypass GHSA-q9wv-22m9-vhqh](https://github.com/tauri-apps/tauri/security/advisories/GHSA-q9wv-22m9-vhqh)

---

### Pitfall 3: API cost run-away from cache miss + agent loops

**Severity:** CRITICAL

**What goes wrong:**
Spike F6 said "first call ~$0.55-0.67 from cache_creation, subsequent ~10%". That's true *within a single session*, but the app's actual usage patterns will violate this assumption:
- Each new app launch = new session = full cache_creation again
- Long-running agentic search (REQ-10) can fire 5-15 round-trips × $0.60 each = $5+ per question
- Tool-use round-trips with `--permission-mode bypassPermissions` can loop on file errors (Edit fails → retry → Edit fails → ...) until the model gives up, easily 20+ turns
- Anchored mode (REQ-08) passes large vault subsets as documents — can balloon to 100k+ input tokens per query

Real users on $100/mo Max plan have reported $500+ in 7 days when wrappers don't cap loops. With API key billing (which `--bare` requires; spike F6 noted OAuth-only is the alternative), there's NO upper bound — a runaway agentic search overnight could be $1000+.

**Why it happens:**
- Personal-project optimism: "I'll only use it 30 min a day"
- No instrumentation built in early — costs only become visible when the bill arrives
- LLM agents have no native cost-budget awareness; they keep trying until success or context exhaustion
- Cache misses on every new session compound (107k tokens × $0.0030/1k = $0.32 just to load CLAUDE.md)

**Warning signs:**
- `result.total_cost_usd` > $1.00 for a single user prompt
- Tool-use turns > 10 for a non-research prompt
- Daily cumulative cost > $5 for personal use
- No visible "current session cost" in UI

**Prevention strategy:**
1. **Cost meter in chat header from day 1** (Phase 1) — show current session $ + cumulative today $
2. **Hard daily cap** — config value (default $10/day), refuse to spawn new subprocess once exceeded
3. **Per-prompt turn cap** — pass `--max-turns` to `claude` CLI (e.g. 30) to bound agentic loops
4. **Cache discipline**:
   - Use `--exclude-dynamic-system-prompt-sections` (spike notes flagged this as production research)
   - Use `--add-dir <vault>` instead of letting Claude wander filesystem (saves cache + security)
   - Pre-load common context once, prefer `--continue` to reuse session cache where possible
5. **Anchored mode chunking** — when REQ-08 ships, never pass > 50k tokens of documents per query; chunk + summarize
6. **Long-running session warning** — UI prompt "this conversation is at $X. Continue?" at $5 thresholds
7. Log every `result.total_cost_usd` to a local SQLite for reflection

**Phase to address:**
**Phase 1 (Tauri shell foundation)** — cost meter + hard cap + turn cap before any non-trivial conversation feature. **Phase X (Anchored mode / REQ-08)** — chunking strategy.

**Source:** [Anthropic Rate Limits Guide 2026](https://findskill.ai/blog/anthropic-rate-limits-api-3-step-audit/), [SitePoint Claude Code Rate Limits Explained](https://www.sitepoint.com/claude-code-rate-limits-explained/), [Spike 002 F6 cost finding (cache_creation 107k tokens)]

---

### Pitfall 4: Markdown XSS via streaming sanitization gap

**Severity:** CRITICAL

**What goes wrong:**
Spike F3 (DOMPurify on every HTML injection site) is the right defense, but it's necessary-not-sufficient for the streaming case. During streaming, you can't run DOMPurify on every chunk because dangerous payloads can split across chunks (`<scr` + `ipt>...</scr` + `ipt>`). If you sanitize chunk-by-chunk, the boundary attack passes through because no single chunk contains a complete tag. If you wait for `result` to sanitize, you're rendering raw text live — but spike already chose this safe path (raw monospace during stream → sanitized markdown on `result`). The pitfall is forgetting this is intentional and "fixing" the chunky UX by enabling live markdown rendering.

Plus KaTeX-specific CVEs add a second axis: `\htmlData`, `\edef`, `\gdef`, `\def` macros can bypass sanitizer if KaTeX < 0.16.21 (CVE-2025-23207). And Anthropic's model can output adversarial math intentionally if user-supplied content is part of the prompt (e.g. lecture transcript with `\href{javascript:...}` injected).

**Why it happens:**
- Future contributor sees chunky text during streaming, "improves" by rendering markdown live
- Forgets DOMPurify can't catch boundary-split tags
- Doesn't update KaTeX past 0.16.21
- Allows `\trust` or `\htmlData` macros without realizing they bypass sanitization
- Renders markdown error messages from KaTeX without escaping (XSS via error)

**Warning signs:**
- Live markdown rendering during streaming (not just on `result` event)
- KaTeX version < 0.16.21 in package.json
- DOMPurify config allows `<script>`, `<iframe>`, or `on*` attributes
- KaTeX `trust: true` or unrestricted `macros` config
- Error rendering uses `innerHTML = err.message`

**Prevention strategy:**
1. **Lock the spike pattern** — raw monospace during stream, sanitize+render only on `result`. Add code comment and integration test: "render-during-stream is FORBIDDEN — see PITFALLS.md #4"
2. **KaTeX ≥ 0.16.21**, pin in package.json, add Renovate alert
3. **KaTeX safe config**: `trust: false`, `strict: true`, explicit macro allow-list (no user-defined `\def` permitted via lecture transcripts)
4. **DOMPurify config**: explicit allow-list of tags/attrs (math, mrow, mi, mo, mn, msup, msub, mfrac, msqrt — no script, iframe, embed, object; no `on*`, `srcdoc`, `formaction`)
5. **Escape KaTeX errors**: `katex.renderToString(...).catch(e => DOMPurify.sanitize(escapeHtml(e.message)))`
6. **CSP at WebView level**: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'` (no `unsafe-inline`)
7. Integration test: feed malicious markdown (`<img src=x onerror=alert(1)>`, `\htmlData{...}`) to renderer, assert no script execution

**Phase to address:**
**Phase 1 (Tauri shell foundation)** — locked stream-then-finalize pattern + DOMPurify config + KaTeX safe mode. **Phase X (Echo360 captions / REQ-05)** — escape lecture transcript content before model ingest because the model can echo it back.

**Source:** [CVE-2025-23207 KaTeX XSS](https://www.sentinelone.com/vulnerability-database/cve-2025-23207/), [KaTeX maxExpand bypass advisory](https://github.com/KaTeX/KaTeX/security/advisories/GHSA-cvr6-37gx-v8wc), [Chrome Streaming LLM best practices](https://developer.chrome.com/docs/ai/render-llm-responses), [VibeDoctor: XSS in React/Next AI code](https://vibedoctor.io/blog/sec-003-xss-vulnerabilities-react-nextjs)

---

### Pitfall 5: Embedding model lock-in / re-embed cost bomb

**Severity:** HIGH

**What goes wrong:**
KP-03 commits to embeddings as first-class. KD-07 says "no vector DB by default; vector reserved for hot paths". The hot paths will arrive (concept-graph edge maintenance, real-time relevance, FSRS prioritization). Once you've embedded ~5000 concepts × 1536-dim vectors with `text-embedding-3-small`, switching to a better model (e.g. Voyage 3.5, Cohere Embed v4) requires re-embedding everything — a full corpus regen — because vectors only have meaning within the model that produced them. For a personal vault this won't bankrupt you, but it WILL cause 2-3 days of stop-the-world migration, and during that time the knowledge graph degrades.

Worse: if OpenAI deprecates `text-embedding-3-small` (they have form for this; ada-002 was deprecated in 2024), you migrate on their schedule, not yours.

**Why it happens:**
- Path of least resistance: pick `text-embedding-3-small`, ship
- No abstraction layer between "I want to embed this concept" and the actual model call
- Vectors stored alongside concepts in markdown frontmatter (no model version metadata)

**Warning signs:**
- `embedding_model` field absent from concept frontmatter
- No abstraction wrapping the embedding call (direct OpenAI/Anthropic SDK in 5+ files)
- `concepts/*.md` have raw vectors but no version stamp

**Prevention strategy:**
1. **Every embedding has a model version stamp**: frontmatter contains `embedding: { model: "text-embedding-3-small", dim: 1536, version: 2024-01, vector_path: "..." }`
2. **Abstraction in one place**: a single `src/lib/embed.ts` does the actual model call; everything else imports from it
3. **Lazy re-embed strategy**: when model changes, query-time embeds with new model, lazily re-embed concepts on first read; never batch-migrate unless infrequent
4. **Dual-index window** (only if upgrading): keep both old + new for 30 days, gradually re-encode top-touched concepts first
5. **Don't enable vector DB until the hot path is proven** (KD-07 already gates this — DON'T relax)

**Phase to address:**
**Phase X (knowledge graph / REQ-07 implementation)** — design the embedding abstraction + version stamping BEFORE any concept gets embedded. The cost of retrofitting is the entire corpus.

**Source:** [Mixpeek: Embedding Portability and Versioning](https://mixpeek.com/guides/embedding-portability-versioning), [Weaviate: When Good Models Go Bad](https://weaviate.io/blog/when-good-models-go-bad), [Medium: Hidden Cost of Embeddings](https://medium.com/@datascientist.lakshmi/the-hidden-cost-of-embeddings-storage-drift-and-model-staleness-in-vector-dbs-d586a39b969c)

---

### Pitfall 6: Vault corruption via concurrent writes (Claude + user simultaneously editing)

**Severity:** HIGH

**What goes wrong:**
Claude is editing `concepts/eigenvalue.md` (via its Edit tool, in subprocess) AT THE SAME TIME the user is editing the file in the Tiptap editor (KD-09). The editor saves to the same path. One of two things happens:
1. Last writer wins → user's typed paragraph silently gone
2. File ends up half-Claude-half-user-content, syntactically broken markdown, bad YAML frontmatter, `[[wiki-link]]` corruption
3. Worse case (Obsidian's documented mode): file becomes encoded incorrectly and needs restore from backup

This is the markdown-vault analog of git merge conflicts but without git's conflict markers.

**Why it happens:**
- Plain markdown files have no built-in locking
- Claude subprocess doesn't know the user has the file open in the Tiptap editor
- File watchers (Tauri fs::watch) often debounce reads; a "burst" of writes is invisible
- macOS APFS, like most filesystems, allows concurrent open-write-close — last writer wins

**Warning signs:**
- User reports "I wrote a paragraph and it disappeared"
- Markdown files contain duplicated headings or wikilinks
- YAML frontmatter has trailing artifacts (`---\n---\n` or unclosed `:`)
- `git diff` after a session shows unexpected reverts

**Prevention strategy:**
1. **Soft lock per file**: when user opens a file in Tiptap, acquire `.<filename>.lock` (PID + timestamp); Claude tools must check this before Edit (via a small wrapper hook). Lock auto-expires after 5 min idle.
2. **Read-modify-write merge instead of Edit**: when both edit, generate `<file>.user.md` and `<file>.claude.md`, prompt user to merge (UI dialog, not silent loss)
3. **Save user content first**: Tiptap autosave to disk every 2 seconds; Claude tools refuse Edit if file `mtime` is < 5s ago
4. **Force atomic writes**: Tiptap saves via temp file + rename (POSIX guarantees atomic on same filesystem)
5. **Auto git-snapshot before Claude edits**: project git repo; pre-Edit hook commits "snapshot before claude edit @ $(date)"
6. **Restrict Claude write scope**: `--add-dir <vault>` whitelist explicitly, deny user-active files via skill/hook

**Phase to address:**
**Phase X (vault + Tiptap integration)** — design the lock + merge strategy BEFORE shipping. **Phase Y (any phase that gives Claude write access)** — pre-Edit hook.

**Source:** [Obsidian Forum: All Markdown Files Corrupted](https://forum.obsidian.md/t/all-markdown-files-corrupted/17552), [Obsidian Forum: File Corruption discussion](https://forum.obsidian.md/t/some-questions-about-file-corruption/103871), [Tiptap data loss issue #7147](https://github.com/ueberdosis/tiptap/issues/7147)

---

### Pitfall 7: Echo360 cookie/iframe + USYD SSO failure modes

**Severity:** HIGH

**What goes wrong:**
REQ-04 banks on "Tauri webview persists USYD SSO cookie → Echo360 video plays". Three failure modes Echo360's own troubleshooting docs and Tauri's WebKit issue tracker confirm:
1. **Third-party cookie blocking on macOS WKWebView** — WKWebView follows Safari's ITP (Intelligent Tracking Prevention) which by default blocks third-party cookies. Echo360 inside a USYD Canvas iframe IS third-party. Symptom: SSO loop, "session expired" on every load. ([wry#848](https://github.com/tauri-apps/wry/issues/848))
2. **Cookie persistence across Tauri app restarts** — WKWebView's data store is per-process by default; need explicit persistent data store config or cookies vanish. ([tauri#6330](https://github.com/tauri-apps/tauri/issues/6330))
3. **iframe X-Frame-Options / CSP from USYD** — USYD's SSO page may set `X-Frame-Options: DENY` or `frame-ancestors 'none'`. Tauri webview can't override these from the embed side. Result: blank pane.

Plus the spike-flagged risk: Anthropic 2026.02 ToS restricts third-party tools that route through subscription; F6 noted `--bare` is needed for API-key isolation. If you DON'T use `--bare` (recommended for OAuth), then Echo360 captions (REQ-05) being fed to Claude API uses YOUR subscription. Anthropic recently revised terms specifically targeting "thin wrapper" use of subscriptions for arbitrary content. Lecture caption translation is borderline. ([Anthropic ToS update Feb 2026](https://www.theregister.com/2026/02/20/anthropic_clarifies_ban_third_party_claude_access/))

**Why it happens:**
- Spike 002 was Tauri+Claude+streaming only; didn't exercise webview/cookies/iframes
- Echo360 docs are Chrome/Safari-focused, not WKWebView-focused
- Anthropic ToS evolves — what was OK in Jan may be marginal in May

**Warning signs:**
- First Echo360 video play fails with "session expired" loop
- Quitting and relaunching app forces re-login every time
- USYD Canvas page renders but Echo360 iframe is blank
- Claude API responses reject prompts containing translated lecture captions citing "third-party content not authorized"

**Prevention strategy:**
1. **Spike Echo360 BEFORE Phase X commits** — small Tauri app + WKWebView + USYD SSO, document what works. This is a `/gsd-spike` candidate. (No need to pre-build the full UI.)
2. **Persistent data store config**: in Tauri, configure `WKWebView.configuration.websiteDataStore = .default` (persistent), not `.nonPersistent`
3. **Cookie debugging plugin** (community: huakunshen/tauri-plugin-keyring or equivalent) to read/inspect cookies for first-bug diagnosis
4. **Fallback path**: open Echo360 in default browser via `tauri-plugin-shell::open` if iframe fails — degrades feature but ships product
5. **Anthropic ToS check**: caption translation should use API-key billing not OAuth subscription, OR get explicit confirmation from Anthropic that personal-use lecture translation is OK
6. **Don't promise "instant subsequent loads"** in user-facing copy until proven on real WKWebView

**Phase to address:**
**Pre-Phase spike** (`/gsd-spike echo360-webview`) BEFORE planning Phase X (Echo360 video integration). **Phase Y (caption translation REQ-05)** — locked auth path (API key, not subscription).

**Source:** [tauri-apps/wry#848 third-party cookies blocked macOS](https://github.com/tauri-apps/wry/issues/848), [tauri#6330 cookies and local storage preservation](https://github.com/tauri-apps/tauri/issues/6330), [Echo360 Browser Configuration docs](https://support.echo360.com/hc/en-us/articles/11062443109517-EchoVideo-Chrome-Recommended-Browser-Configuration), [Anthropic ToS update Feb 2026](https://www.theregister.com/2026/02/20/anthropic_clarifies_ban_third_party_claude_access/)

---

### Pitfall 8: Knowledge graph hallucinated edges + cross-session leakage

**Severity:** HIGH

**What goes wrong:**
REQ-07 has Claude auto-maintain the knowledge graph: extract concepts → embed → link via similarity → write edges. Three documented failure modes:
1. **Hallucinated edges** — Claude links "eigenvalue" to "Eulerian path" because both contain "Euler" embeddings. The edge is plausibly-worded ("both relate to graph theory") but logically wrong. With no human review, these compound: Course A wrong edge → Course B inherits the wrongness via shared concepts.
2. **Provenance loss** — graph builds incrementally but doesn't record WHICH session/turn added each edge. When wrong, you can't trace back to fix the upstream extraction prompt.
3. **Cross-session/course leakage** — Course COMP3027 talks about "graphs" (data structure), Course MATH2069 talks about "graphs" (functions). Without strict course-scoping, embeddings collapse them: the AI starts answering COMP3027 questions citing MATH2069 examples. This is the classic cross-tenant leak in AI memory systems.

Mem0 specifically has documented "fails to recall right info > 50% of time" in benchmarks. Zep is more accurate but uses 340x more memory per conversation. Cognee + Graphiti improve graph integrity but require more inference per write. Translation: pick wrong, get garbage; pick right, pay more.

**Why it happens:**
- Embedding similarity is fuzzy by design; Claude's link extraction has no ground truth feedback loop
- Personal projects don't bother with provenance because "I'll remember"
- Course-as-namespace not enforced; concepts merge into one global graph

**Warning signs:**
- Mind-map shows edge between concepts from different courses with no semantic justification
- Claude answers a course question citing a concept from a different course
- "Where did this edge come from?" — no audit trail
- Concept count grows unbounded without consolidation

**Prevention strategy:**
1. **Course namespace enforcement** — concept ID format `<COURSE_CODE>::<concept_slug>`, edges across courses require explicit `cross_course: true` flag
2. **Provenance metadata mandatory**: every edge has `{added_by_session, added_at, source_message_id, confidence_score, evidence_excerpt}`
3. **Confidence threshold for auto-add** — edge only auto-written if Claude's confidence > 0.85; below = "candidate" requiring human review (or 2nd model verification)
4. **Edge audit panel in UI** — periodically (weekly?) show new edges, let user thumbs-up/down; corrections feed back into prompt examples
5. **Semantic alignment check** — before adding edge, second LLM call: "given these two concepts and this edge, is the relationship factually accurate? Cite source from `[file.md:line]`"; rejected edges go to `_inbox/edges-rejected.md`
6. **Test for cross-course leakage** — eval suite: ask "what is X in COMP3027?" — assert no MATH2069 concepts cited
7. **Graph diff tracking** — git the graph file, diff weekly to spot anomalies

**Phase to address:**
**Phase X (knowledge graph / REQ-07)** — design provenance schema + course-scoping + confidence gating BEFORE first auto-extracted edge.

**Source:** [arXiv: Detecting Hallucinations in Graph RAG](https://arxiv.org/html/2512.09148), [DigitalOcean: AI Hallucinations with RAG and KGs](https://www.digitalocean.com/community/conceptual-articles/ai-hallucinations-with-rag-and-knowledge-graphs), [Cognee AI Memory Tools Evaluation: Mem0 / Zep / Cognee](https://medium.com/@cognee/cognee-ai-memory-tools-evaluation-cognee-mem0-zep-graphiti-87425abecbb2), [n1n.ai Memory Comparison 2026](https://explore.n1n.ai/blog/ai-agent-memory-comparison-2026-mem0-zep-letta-cognee-2026-04-23)

---

### Pitfall 9: FSRS "Hard" misuse + custom-card-as-concept calibration drift

**Severity:** HIGH

**What goes wrong:**
REQ-09 reviews concept pages, not flashcards, and AI generates a fresh test question per due date (no fixed front/back). Two FSRS-specific pathologies:
1. **"Hard" button misuse** — FSRS interprets `Hard` as "you recalled correctly but with hesitation". If user actually FAILED to recall and presses `Hard` (because "Again feels too harsh"), FSRS schedules unreasonably long intervals. Documented community concern. The AI-generated question makes this WORSE: user can't tell "did I really get this?" because the question is novel — they might over-rate themselves.
2. **Calibration drift on concept-objects** — FSRS-6 weights are trained on flashcard-style atomic facts. A "concept page" is a fuzzy multi-faceted object. If today's question tests one facet and tomorrow's tests another, the binary right/wrong rating doesn't map cleanly onto the FSRS DSR (Difficulty/Stability/Retrievability) model. Result: stability estimates wander, scheduling becomes erratic, user loses trust.

Plus: ts-fsrs is well-tested for cards but less for concept-objects. Issue #300 in ts-fsrs notes "maintaining stable count of daily reviews" is non-trivial — if you tune for daily count cap, you violate FSRS optimality. Without tuning, queue can pile up to 50+ items.

**Why it happens:**
- Custom-card-like objects deviate from FSRS's training distribution
- AI question variability adds noise FSRS can't model
- User self-rating in 4-button is noisy by nature; concept-context amplifies it
- ts-fsrs library focuses on canonical Anki use case

**Warning signs:**
- Same concept reviewed daily for 2+ weeks (stability never grows)
- Or: concept gets a 30-day interval after one "Good" rating (calibration too aggressive)
- Daily review queue varies wildly (3 one day, 40 the next)
- User expresses "the spaced repetition feels wrong"

**Prevention strategy:**
1. **AI question quality gate** — before scoring, AI estimates "could a student answering this question know X but not Y?"; if question is too narrow, pick a different facet for next review
2. **Conservative initial weights** — start with FSRS-6 default weights; only retrain personally after 100+ reviews (not 20). Pin weights as `fsrs_weights_v1` in vault config.
3. **Two-pass rating UI** — after user picks 1-4, show "are you sure? You said the answer was X. Was that right?" with the actual model answer for sanity check
4. **Multi-facet tracking** — concept page has `facets: [eigenvalue_definition, eigenvalue_computation, eigenvalue_application]` in frontmatter; FSRS scheduled per-facet, not per-concept; concept "due" = any facet due
5. **Queue cap with prioritization** — show max 20 reviews/day; spillover deferred 1 day, marked. Use REQ-09's `(graph weakness × FSRS due-ness)` to rank within queue.
6. **Don't claim Anki parity** — FSRS-on-concepts is novel; UX should set this expectation

**Phase to address:**
**Phase X (FSRS implementation / REQ-09)** — facet schema + AI-question quality gate + two-pass rating BEFORE shipping. Calibrate over first 4 weeks with self-tracking.

**Source:** [Anki Forums: Does FSRS solve "ease hell"?](https://forums.ankiweb.net/t/does-fsrs-solve-ease-hell/38275), [FSRS4Anki tutorial — Hard button misuse](https://github.com/open-spaced-repetition/fsrs4anki/blob/main/docs/tutorial.md), [ts-fsrs#300 maintaining stable counts](https://github.com/open-spaced-repetition/ts-fsrs/issues/300)

---

### Pitfall 10: Solo-dev abandonment at 30% (the dead-zone)

**Severity:** HIGH (project-existential)

**What goes wrong:**
Failory's post-mortem repository, multiple academic studies, and dev.to abandonment essays converge on a pattern: solo personal projects most commonly die at the 25-40% completion mark. Past initial-rush enthusiasm, before any real user-validation feedback. Specifically:
- Phase 1-2 (foundation) completes — feels productive, fast wins
- Phase 3-4 starts (getting harder, more design tradeoffs surface)
- Scope creep adds Phase 5/6/7 (the AI-native graph! whiteboard! FSRS! Echo360!)
- Energy drops, dedicated hours decline, project enters "I'll come back next weekend" mode
- 6 months later, repo last touched 5 months ago, mneme never used in real coursework

This is amplified for THIS project because:
- 10 active requirements (REQ-01 to REQ-10) is 5x what most successful solo projects ship in v1
- "Personal use" reduces external accountability (no users complaining)
- USYD CS coursework is the deadline pressure (S1 2026 = May-Nov 2026), but it's also the user — same person
- 50% open-source rule (KP-02) is a discipline anchor, but searching ecosystems is a procrastination magnet

**Why it happens:**
- Optimism bias: REQ-list looks like 3 months, is realistically 12+
- No external accountability (personal-use only, OOS-01)
- AI features feel "magical" so they get prioritized over boring-but-essential vault sync
- Open-source-rule (KP-06) cuts both ways: searching for "best memory framework" can eat a week
- Each new spike opens a research rabbit hole

**Warning signs:**
- Phase 3 plans have grown 2x bigger than Phase 1
- Backlog of "I should also add..." items > 20
- Multiple spikes opened without wrap-up
- More time in `/gsd-explore` and `/gsd-spike` than `/gsd-execute-phase`
- Last commit > 2 weeks ago (with no PR / no parking note)
- "I'll do it after exams" thoughts

**Prevention strategy:**
1. **Ship-by date** — set explicit "v1 must work in real Week 5 of S1 2026 study" deadline; everything else cuts
2. **Defer-don't-add policy** — every new "I should also..." goes to `/gsd-capture --seed`, NOT into current milestone scope
3. **MVP definition lock** — write down v1 = Phase 1+2+3 (Tauri shell + vault + Canvas sync). Phases 4-N are explicitly v2+.
4. **Use it daily during build** — start using whatever's done in real coursework as soon as Phase 2 completes; the dogfooding is its own accountability
5. **Public commit cadence** — even if private repo, push daily for 5-min commits to avoid "I'll batch tomorrow"
6. **Time-boxed spikes** — 2-day max per `/gsd-spike`, then `/gsd-spike-wrap-up` or kill. Don't let RQ-01/02/03/04 explore for weeks.
7. **Honest "is it worth it" check at each phase transition** — `/gsd-extract-learnings` already gives you this; ACT on the signal if you've stopped dogfooding the prior phase
8. **Cap GSD overhead** — `/gsd-plan-review-convergence` is for relational architecture; don't run it on every CRUD plan
9. **Choose 1 differentiator + 3 table-stakes** — see FEATURES.md anti-features. Knowledge graph is THE differentiator; everything else can be lo-fi v1

**Phase to address:**
**Roadmap structure itself** — phase ordering must front-load shipping, defer differentiators, set "stop and use it" gates between phases. The plan-checker should flag any phase with > 5 plans as scope creep risk.

**Source:** [Failory post-mortem repository (general findings)](https://www.failory.com/), [DEV: Why Your Side Project Remains Unfinished](https://dev.to/rubenoalvarado/why-your-side-project-remains-unfinished-burnout-explained-ape), [stopscopecreep.com: Scope Creep Statistics 2026 — 52% of projects](https://stopscopecreep.com/blog/scope-creep-statistics), [1000.software: Why Solo Developers Burn Out](https://www.1000.software/post/why-solo-developers-burn-out-and-how-even-a-little-help-changes-everything)

---

## Moderate Pitfalls

### Pitfall 11: Tauri webview cross-platform rendering drift (CSS / fonts)

**Severity:** MEDIUM (the spec says macOS only, but future you might want Windows)

**What goes wrong:** Tauri uses WKWebView on macOS, WebView2 (Chromium) on Windows. CSS and fonts render slightly differently. KaTeX layouts that look perfect on macOS may have super/subscript baseline shifts on Windows. Transparent windows have known macOS bugs.

**Prevention:** Test on macOS only since OOS-02 excludes mobile and the spec is macOS Ventura. If/when Windows happens, dedicate a phase for cross-platform polish, not assume "it'll just work."

**Phase to address:** Out of scope for v1; document as v2 risk in roadmap.

**Source:** [Tauri Webview Versions docs](https://v2.tauri.app/reference/webview-versions/), [Playwright Engine Pitfall](https://takazudomodular.com/pj/zudo-tauri/docs/frontend/playwright-engine-pitfall/)

### Pitfall 12: Tiptap markdown round-trip data loss

**Severity:** MEDIUM

**What goes wrong:** [Tiptap issue #7147](https://github.com/ueberdosis/tiptap/issues/7147) documents that markdown extracted → re-parsed → re-extracted is NOT lossless. Empty paragraphs, certain list nesting, raw HTML inline — all can mutate. KD-09 says "Tiptap UI, markdown storage" — round-trip happens on every save+reopen.

**Prevention:**
- Round-trip integration test on representative concept page (with frontmatter, math, wikilinks, code blocks, lists)
- Use `parseBlockChildren()` not `parseChildren()` per Tiptap docs
- Save raw markdown alongside Tiptap state for first 30 days; diff to catch regressions
- Document any custom node types' parse/serialize symmetry

**Phase to address:** Phase X (vault + Tiptap integration); add test in initial CI.

**Source:** [Tiptap #7147](https://github.com/ueberdosis/tiptap/issues/7147), [Tiptap Markdown utilities](https://tiptap.dev/docs/editor/markdown/api/utilities)

### Pitfall 13: Large vault performance cliff at ~5k files

**Severity:** MEDIUM

**What goes wrong:** Obsidian forum data: vaults > 2700 markdown files report "unusably slow" first-load. Index times balloon, file-watcher CPU spikes. We start small but Canvas import + Echo360 captions + per-message episodic notes can push a single course to 1k files; 4 courses + concepts = 5k+ in semester 1.

**Warning signs:**
- App startup > 3s
- File tree panel jank when expanding folders
- File search (CMD+O) > 500ms typing latency
- Memory usage > 500MB at idle

**Prevention:**
- Use SQLite for index (concept metadata, embeddings, frontmatter) — not "scan all files every time"
- Watch only writable subdirs; `_source/` (Canvas mirror) excluded from watcher
- Lazy-load file tree (load children on expand, not all at once)
- Pagination on file lists > 100
- Background indexing thread, not blocking startup

**Phase to address:** Phase X (vault foundation) — design SQLite schema before file count grows.

**Source:** [Obsidian Forum: Slow performance with large Vaults](https://forum.obsidian.md/t/slow-performance-with-large-vaults/16633), [Obsidian Forum: Indexing Large Number of Files](https://forum.obsidian.md/t/indexing-large-number-of-files/47397)

### Pitfall 14: macOS code signing / notarization stuck for distribution

**Severity:** MEDIUM (only matters if app is distributed; OOS-01 says no)

**What goes wrong:** Even though OOS-01 says "no distribution," running unsigned binaries on Ventura 13.4 throws "developer cannot be verified" Gatekeeper warnings on every launch — annoying for daily personal use. If you decide to distribute later: notarization can stall 15-20 min, ExternalBin/sidecar combos break notarization, free Apple developer accounts can't notarize.

**Prevention (personal-use):**
- For personal use: `xattr -d com.apple.quarantine /path/to/app` after each build (silences Gatekeeper)
- OR pay $99/yr for Apple Developer account, sign with `Developer ID Application` cert + notarize — overkill for personal-only

**Phase to address:** Decide at Phase 1 whether to live with `xattr` workaround or pay $99/yr. Document choice.

**Source:** [Tauri macOS Code Signing](https://v2.tauri.app/distribute/sign/macos/), [tauri#11992 ExternalBin notarization](https://github.com/tauri-apps/tauri/issues/11992), [Loewald: Signing and Notarizing Tauri](https://loewald.com/blog/2024/12/18/signing-and-notarizing-tauri-apps)

### Pitfall 15: Anthropic ToS drift mid-project

**Severity:** MEDIUM (regulatory, not technical)

**What goes wrong:** Anthropic's "third-party tool" policy evolved twice in 2026 (Feb clarification, April enforcement of OpenClaw ban). Future updates could:
- Restrict subprocess wrapping further (specifically targeting "thin wrapper" personal apps)
- Require separate terms acceptance for non-interactive automation
- Cap subscription-based subprocess invocations per day

**Prevention:**
- Subscribe to Anthropic blog / changelog
- Keep architecture purely "user runs `claude` CLI as subprocess" (KP-04 already locked) — DON'T cache OAuth tokens, DON'T proxy. This stays in the explicitly-allowed bucket.
- For caption translation (REQ-05): use API-key billing, not OAuth subscription, so it's pay-per-use not "extending subscription scope"
- Have a "if subprocess wrapping becomes restricted, what's plan B?" sketch — likely API-key fallback

**Phase to address:** Document at every milestone; verify at `/gsd-audit-milestone`.

**Source:** [Anthropic ToS update Feb 2026](https://www.theregister.com/2026/02/20/anthropic_clarifies_ban_third_party_claude_access/), [autonomee.ai: Claude Code ToS Explained](https://autonomee.ai/blog/claude-code-terms-of-service-explained/), [HN: OpenClaw ban](https://news.ycombinator.com/item?id=47633396)

---

## Minor Pitfalls

### Pitfall 16: KaTeX macro persistence across renders

`\gdef` and `\global\def` persist between `katex.render` calls in the same `macros` object. If you render lecture A's transcript and it sets `\gdef\x{evil}`, lecture B's transcript inherits it. **Prevention:** fresh `macros: {}` for every render call; lock with code comment.

### Pitfall 17: Tauri shell scope `args: true` is wide-open

Spike's capability sets `"args": true` for `claude` command — meaning ANY argument string is allowed. A future feature that builds the command string from user input (e.g. `--add-dir <user-typed-path>`) is shell-injection vulnerable. **Prevention:** replace `args: true` with explicit allowlist + regex validators per arg position. **Phase to address:** Phase 1 hardening pass before any user-input flows to subprocess args.

### Pitfall 18: Caption translation cost balloons

REQ-05 translates every caption cue. A 50-min lecture has ~600 cues. 4 courses × 12 lectures × 600 cues = 28,800 model calls per semester just for captions. Even at $0.0005/call (Sonnet), that's $14/semester just for captions. Feasible but document.
**Prevention:** Batch translate (50 cues per call), cache per-cue (re-rendering doesn't re-translate), use the cheapest viable model (Haiku-equivalent), test value-vs-cost on 1 lecture first.

### Pitfall 19: Streaming UI typewriter throttle vs. user perception

Spike F8 noted chunky updates and recommended typewriter throttling. Risk: throttle so smooth you mask actual streaming latency — user thinks app is faster than it is. If a model error happens mid-stream, throttle buffer means user sees "still typing" for 2s longer than reality. **Prevention:** make throttle flush-on-error visible; don't claim instant response when actual TTFT was 3s.

### Pitfall 20: Vault `_source/` Canvas mirror sync conflicts

REQ-03 mirrors Canvas to `_source/`. If user renames a `_source/` file (intending to edit), next sync overwrites or duplicates. **Prevention:** `_source/` is read-only (chmod 444 or filesystem ACL), edits force a copy to `notes/` with explicit rename and inverse-link.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `args: true` in shell capability | Spike works without arg-list churn | Shell injection if user input ever flows to args | Spike only — production must replace before Phase 1 ship |
| No cost meter in chat UI | Faster Phase 1 | Cost surprise at $X/day; forces emergency refactor | Never acceptable past Phase 1 |
| Skip embedding model versioning | One less frontmatter field | Stop-the-world re-embed when model changes | Never acceptable for vector hot path |
| In-place markdown edits without git snapshot | Cleaner diff for personal use | One bad Claude tool-use → unrecoverable data loss | Never — always git-snapshot before Claude write |
| Wildcard window in capabilities | "It just works" during dev | One iframe-injected XSS = full app capability | Dev only; CI must reject for production builds |
| Single-process subprocess for both vault tools and chat | Less code | One bad tool call corrupts whole session | Acceptable in v1 if `--add-dir` whitelist is tight |
| Skip `_source/` watcher exclusion | "It'll work fine, only 1k files" | Performance cliff at 5k+ files; expensive to retrofit | Never — exclusion is one config line |
| Trust LLM-extracted graph edges without confidence threshold | Auto-built graph from day 1 | Compounding wrongness, edges no human reviews | Never — confidence + audit panel mandatory |
| No timeouts on agentic search | "Let it think" feels respectful | One stuck agent = $X/hour silent burn | Acceptable to start with `--max-turns 30`, never unbounded |
| Cmd+Q without subprocess cleanup | Phase 1 ships faster | Quota burn from zombie children, gross UX | Acceptable for first day of dev only — fix in Phase 1 ship gate |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Claude Code subprocess | Allowing `args: true` and treating it as safe because subprocess | Per-arg validators; never interpolate user input directly into args |
| Echo360 webview | Assuming WKWebView cookies persist by default | Configure persistent `WKWebsiteDataStore`; spike before phase commit |
| USYD SSO iframe | Trusting Echo360 docs (Chrome-focused) | Test on actual WKWebView before phase planning |
| Anthropic API caption translation | Routing through OAuth subscription | Use API-key billing for non-Claude-Code automation; saves ToS uncertainty |
| Canvas/Ed MCP sync | Treating `_source/` as writable | chmod 444 or filesystem ACL; copy-on-edit pattern |
| Tiptap markdown | Round-trip without test | Integration test on representative concepts; pin parser version |
| ts-fsrs on concept-objects | Using Anki defaults expecting same accuracy | Multi-facet schema; conservative weights; calibrate over 4+ weeks |
| Knowledge graph auto-edges | Auto-write any edge Claude proposes | Confidence threshold (≥0.85) + audit panel + provenance |
| Embedding API | Single model hardcoded | Abstraction layer + version stamp + lazy-migrate strategy |
| Markdown XSS | `marked.parse(content)` direct to innerHTML | DOMPurify with explicit allowlist; sanitize on `result`, never per-chunk |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Scan-all-files vault index | Startup 3-30s, file tree jank | SQLite index, lazy-load tree, exclude `_source/` from watcher | ~5k files (1 semester worth) |
| File-watcher on writable + readonly | CPU spikes when Canvas sync runs | Watch only writable subdirs | ~1k files in `_source/` |
| Re-embed entire vault on model change | 2-3 day stop-the-world migration | Lazy re-embed on access + version stamp | Whenever embedding model is upgraded (~yearly) |
| Render-on-every-stream-chunk | Chunky UI, sanitizer races, KaTeX flicker | Defer markdown/KaTeX render until `result` event | First long streaming response |
| Per-cue caption translation in serial | 30s lag per minute of lecture | Batch (50 cues/call), parallel where possible | First time translating a long lecture |
| No turn cap on agentic loops | Cost runs $5+ per question | `--max-turns 30`; warn at $1/turn | Any error-loop scenario |
| Cmd+Q zombie processes | Memory growth, quota burn | RunEvent::ExitRequested + child.kill() with timeout | Day 2 of normal use (multiple session cycles) |
| Background sync blocking UI | App freezes during Canvas pull | Sync in worker; UI shows progress, never blocks | First semester sync with 4 courses |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `windows: ["*"]` in capabilities | One compromised iframe → full IPC access | Explicit window names; per-window scope |
| `args: true` in shell allow-list | Shell injection if user input flows to args | Per-arg validators with regex |
| Render LLM markdown without DOMPurify | XSS via `<script>` or `\htmlData` | DOMPurify after `marked.parse`, after `katex.renderToString` |
| KaTeX < 0.16.21 | CVE-2025-23207 RCE-equivalent in browser | Pin ≥ 0.16.21; Renovate alert |
| OAuth token caching anywhere | Anthropic ToS violation, ban risk | Never read `~/.claude/.credentials.json`; always invoke `claude` CLI |
| Asset protocol scope `/**/*` | Any window reads `~/.ssh/*` | Scope to vault root only |
| Trusting lecture transcripts as "user data" | Adversarial caption (e.g. SQL keywords) injected to model | Sanitize transcripts before model ingest; bound model output rendering |
| Storing API key in plain config file | Filesystem read = key compromise | macOS Keychain via `tauri-plugin-keyring` |
| Embedded webview shares cookies with main app | Echo360 page can attack main IPC | Multi-webview, per-window capability ACL |
| No CSP in WebView | Inline script from any source executes | `default-src 'self'` strict CSP; meta tag fallback if Tauri config not enough |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No cost feedback during streaming | "Why is this so expensive?" surprise at end of month | Show cumulative-today cost in header; warn at $5 threshold |
| Tool-use card walls without visual diff | "What did the AI just do to my files?" panic | Show tool name + abbreviated args; click to expand; explicit revert-this-action button |
| Review queue shows 50+ items | User skips review entirely (Anki abandonment pattern) | Cap at 20/day; defer overflow; explain "you'll get to these tomorrow" |
| Chunky streaming text without typewriter | Looks broken/slow even when fast | Client-side typewriter throttle at 30-50 tokens/sec |
| Code blocks render mid-stream | Users see broken code that completes later | Buffer code-fence; render only when closing ``` arrives |
| KaTeX errors as raw error text | Visual chaos in chat | Render error as small grey "(LaTeX error: ...)" inline; escape carefully |
| Mind-map updates jarring | Concepts pop in/out without transition | Animate concept add/remove; debounce updates |
| Anchored mode UI same as free mode | User confusion about which mode they're in | Visual mode chip + different chat bubble color; explicit mode-switch animation |
| Vault edits silently overwritten by Claude | "Where did my paragraph go?" loss of trust | Two-way merge dialog when conflict detected; auto-snapshot before Claude write |
| Echo360 SSO loop without explanation | Frustration; "the app is broken" | Detect cookie failure, surface "USYD session expired, re-login?" clearly |

## "Looks Done But Isn't" Checklist

- [ ] **Subprocess spawning:** Often missing Cmd+Q cleanup — verify `ps aux | grep claude` shows zero orphans after 5 quit cycles
- [ ] **Capability config:** Often has `"windows": ["*"]` — verify per-window names + per-window scopes
- [ ] **Cost meter:** Often missing or shows session-only — verify cumulative-today + hard cap actually blocks past threshold
- [ ] **DOMPurify allowlist:** Often default config — verify allowlist explicitly excludes `<iframe>`, `<embed>`, `on*` attrs
- [ ] **KaTeX config:** Often `trust: true` — verify `trust: false`, `strict: true`, version ≥ 0.16.21
- [ ] **Tiptap markdown round-trip:** Often untested — verify integration test exists with frontmatter + math + wikilinks + code
- [ ] **Echo360 cookie persistence:** Often relies on default — verify explicit persistent data store config
- [ ] **Canvas `_source/` write protection:** Often relies on convention — verify chmod 444 or filesystem ACL enforced
- [ ] **Knowledge graph confidence threshold:** Often "auto-add anything" — verify threshold + audit panel for low-confidence
- [ ] **Embedding model version stamp:** Often missing — verify every `concepts/*.md` frontmatter has `embedding.model` + `embedding.version`
- [ ] **FSRS facet schema:** Often per-concept (not per-facet) — verify multi-facet design before first review session
- [ ] **Vault SQLite index:** Often "scan-all-files" — verify SQLite index exists; benchmark startup time at 1k+ files
- [ ] **Subprocess turn cap:** Often unbounded — verify `--max-turns` flag passed to every `claude` invocation
- [ ] **API key handling:** Often in env vars or config file — verify Keychain via tauri-plugin-keyring
- [ ] **CSP:** Often default permissive — verify `default-src 'self'` and strict script-src in `tauri.conf.json`
- [ ] **Vault git snapshots:** Often manual — verify auto-commit before any Claude write tool fires

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Zombie subprocess | LOW | `pkill -f claude` once + add cleanup handler |
| Wildcard window capability shipped | MEDIUM | Find all capability files; rewrite per-window; test all flows; deploy patch |
| Cost run-away | LOW (one-time) → HIGH (recurring) | Add meter + cap immediately; investigate which prompt patterns cause loops; refine system prompt |
| XSS via streaming sanitization | HIGH | Audit all render paths; pin KaTeX version; integration test with malicious payloads; potentially recall if shipped |
| Embedding model lock-in | HIGH (3-5 days) | Lazy migrate strategy; preserve old vectors; gradual re-encode; tag concepts as "v1 embed" |
| Vault corruption (Claude + user simultaneously) | MEDIUM | Restore from auto-snapshot git; add lock + merge-on-conflict; user re-enters lost paragraph |
| Echo360 cookie failure | LOW (per session) → HIGH (architectural) | Force re-login UI flow; if persistent: spike WKWebView config; fallback to system browser |
| KG hallucinated edges discovered | MEDIUM | Audit panel surfaces low-confidence edges; user batch-rejects; retrain extraction prompt |
| FSRS calibration drift | MEDIUM | Reset to default weights; restart calibration period; preserve review history |
| Solo-dev abandonment | HIGH (or terminal) | Honest "is this still worth it" check; ruthless scope cut; ship the smallest useful thing this week |
| Anthropic ToS change banning subprocess wrap | HIGH (architectural) | Switch to API-key auth; user pays per-use; document migration; possibly drop personal-use single-binary distro plan |
| Canvas `_source/` accidental edits | LOW | Restore from MCP re-sync; copy edits to `notes/`; tighten permissions |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| #1 Subprocess zombies | Phase 1 (Tauri shell) | `ps aux | grep claude` after 5 quit cycles = 0 |
| #2 Capability wildcard | Phase 1 (Tauri shell) + Phase X (Echo360) | CI script rejects `"*"` in windows; iframe runs in zero-IPC webview |
| #3 Cost run-away | Phase 1 (Tauri shell) | Cost meter visible; hard daily cap blocks at threshold; `--max-turns` always set |
| #4 Markdown XSS streaming | Phase 1 (Tauri shell) + Phase Y (caption REQ-05) | Integration test: malicious markdown → no script exec; KaTeX ≥ 0.16.21 pinned |
| #5 Embedding lock-in | Phase X (knowledge graph REQ-07) | All embeddings have `model+version` frontmatter; abstraction layer in `lib/embed.ts` |
| #6 Vault corruption | Phase X (vault foundation) + Phase Y (Tiptap) | Pre-Edit hook commits git snapshot; lock file mechanism tested |
| #7 Echo360 cookie/iframe | Pre-Phase spike + Phase X (Echo360 video) | Spike validated WKWebView persists cookies; fallback to system browser if iframe fails |
| #8 KG hallucinated edges | Phase X (knowledge graph REQ-07) | Confidence ≥ 0.85 gate; provenance metadata; audit panel UI |
| #9 FSRS calibration | Phase X (FSRS REQ-09) | Multi-facet schema; conservative initial weights; 4-week calibration period |
| #10 Solo-dev abandonment | Roadmap structure + every phase | Phase ≤ 5 plans; v1 scope locked = Phase 1+2+3; daily dogfood gate between phases |
| #11 Cross-platform drift | Out of scope for v1 | Document in v2 risk register only |
| #12 Tiptap round-trip | Phase X (vault + Tiptap) | Round-trip test on representative concept; CI fails on regression |
| #13 Vault performance cliff | Phase X (vault foundation) | SQLite index; benchmark < 1s startup at 1k files |
| #14 Code signing | Phase 1 (decision logged in CLAUDE.md or PROJECT.md) | xattr workaround documented OR Apple Developer cert in place |
| #15 Anthropic ToS drift | Every milestone | `/gsd-audit-milestone` includes ToS check; subprocess-only architecture preserved |
| #16 KaTeX macro persistence | Phase 1 (rendering) | Fresh `macros: {}` per call; verified by code review |
| #17 Shell scope `args: true` | Phase 1 hardening | Per-arg validators; CI fails on `args: true` |
| #18 Caption translation cost | Phase Y (REQ-05) | Batched translation; per-cue cache; cost test on 1 lecture before 4 courses |
| #19 Typewriter throttle masking errors | Phase 1 (streaming UI) | Throttle flushes on error; no false "still typing" |
| #20 `_source/` sync conflicts | Phase X (Canvas REQ-03) | chmod 444; edit-forces-copy-to-notes; tested |

## Sources

### Tauri 2 / Subprocess / Webview
- [tauri-apps/tauri#1896 — Sidecar process still alive when main exits](https://github.com/tauri-apps/tauri/issues/1896)
- [tauri-apps Discussion #3273 — Kill process on exit](https://github.com/tauri-apps/tauri/discussions/3273)
- [Tauri v2 Capabilities](https://v2.tauri.app/security/capabilities/)
- [Tauri v2 Permissions](https://v2.tauri.app/security/permissions/)
- [Tauri v2 Shell Plugin](https://v2.tauri.app/plugin/shell/)
- [Tauri v2 Command Scopes](https://v2.tauri.app/security/scope/)
- [Tauri v2 macOS Code Signing](https://v2.tauri.app/distribute/sign/macos/)
- [Tauri v2 Webview Versions](https://v2.tauri.app/reference/webview-versions/)
- [CVE-2024-35222 — Tauri Improper Access Control](https://security.snyk.io/vuln/SNYK-RUST-TAURI-7026338)
- [GHSA-q9wv-22m9-vhqh — Filesystem Scope Bypass](https://github.com/tauri-apps/tauri/security/advisories/GHSA-q9wv-22m9-vhqh)
- [tauri-apps/wry#848 — Third-party cookies blocked on macOS](https://github.com/tauri-apps/wry/issues/848)
- [tauri#6330 — Cookies and local storage preservation](https://github.com/tauri-apps/tauri/issues/6330)
- [tauri#11992 — Codesigning with ExternalBin issue](https://github.com/tauri-apps/tauri/issues/11992)
- [Tauri Shell Plugin error handling (DeepWiki)](https://deepwiki.com/tauri-apps/tauri-plugin-shell/6.2-error-handling)
- [Loewald: Signing and Notarizing Tauri Apps](https://loewald.com/blog/2024/12/18/signing-and-notarizing-tauri-apps)
- [Playwright/Tauri Engine Pitfall](https://takazudomodular.com/pj/zudo-tauri/docs/frontend/playwright-engine-pitfall/)
- [Medium: Tauri sidecar start/stop pattern](https://medium.com/@samuelint/tauri-how-to-start-stop-a-sidecar-and-pipe-sidecar-stdout-stderr-to-app-logs-from-rust-8f81a92111ad)

### Claude Code / Anthropic ToS / Costs / Security
- [Claude Code Security Docs](https://code.claude.com/docs/en/security)
- [Anthropic Legal and Compliance](https://code.claude.com/docs/en/legal-and-compliance)
- [The Register: Anthropic clarifies third-party tool ban Feb 2026](https://www.theregister.com/2026/02/20/anthropic_clarifies_ban_third_party_claude_access/)
- [autonomee.ai: Claude Code Terms Explained](https://autonomee.ai/blog/claude-code-terms-of-service-explained/)
- [HN: OpenClaw subscription ban](https://news.ycombinator.com/item?id=47633396)
- [Phoenix Security: Claude Code CLI command injection flaws](https://phoenix.security/critical-ci-cd-nightmare-3-command-injection-flaws-in-claude-code-cli-allow-credential-exfiltration/)
- [Cybersecurity News: Prompt Injection via GitHub Comments](https://cybersecuritynews.com/prompt-injection-via-github-comments/)
- [TrueFoundry: Prompt Injection AI Agent Security Risks](https://www.truefoundry.com/blog/claude-code-prompt-injection)
- [Lasso Security: Indirect Prompt Injection in Claude Code](https://www.lasso.security/blog/the-hidden-backdoor-in-claude-coding-assistant)
- [SitePoint: Claude Code Rate Limits Explained 2026](https://www.sitepoint.com/claude-code-rate-limits-explained/)
- [FindSkill.ai: Audit Claude Rate Limits in 90 Min](https://findskill.ai/blog/anthropic-rate-limits-api-3-step-audit/)

### Markdown / XSS / KaTeX
- [CVE-2025-23207 — KaTeX XSS](https://www.sentinelone.com/vulnerability-database/cve-2025-23207/)
- [KaTeX Security Advisory: maxExpand bypass](https://github.com/KaTeX/KaTeX/security/advisories/GHSA-cvr6-37gx-v8wc)
- [KaTeX Security Advisory: \edef bypass](https://github.com/KaTeX/KaTeX/security/advisories/GHSA-64fm-8hw2-v72w)
- [KaTeX Security docs](https://katex.org/docs/security)
- [DOMPurify GitHub](https://github.com/cure53/DOMPurify)
- [Chrome: Best practices to render streamed LLM responses](https://developer.chrome.com/docs/ai/render-llm-responses)
- [Marked.js Documentation](https://marked.js.org/)
- [VibeDoctor: XSS Vulnerabilities in React/Next AI code](https://vibedoctor.io/blog/sec-003-xss-vulnerabilities-react-nextjs)

### Vault / Markdown / Tiptap
- [Obsidian Forum: All Markdown Files Corrupted](https://forum.obsidian.md/t/all-markdown-files-corrupted/17552)
- [Obsidian Forum: File Corruption discussion](https://forum.obsidian.md/t/some-questions-about-file-corruption/103871)
- [Obsidian Forum: Slow performance with large vaults](https://forum.obsidian.md/t/slow-performance-with-large-vaults/16633)
- [Obsidian Forum: Indexing Large Files](https://forum.obsidian.md/t/indexing-large-number-of-files/47397)
- [Tiptap Issue #7147 — Markdown round-trip data loss](https://github.com/ueberdosis/tiptap/issues/7147)
- [Tiptap Markdown Utilities](https://tiptap.dev/docs/editor/markdown/api/utilities)

### AI Memory / Knowledge Graph
- [Cognee: AI Memory Tools Evaluation (Mem0/Zep/Cognee)](https://medium.com/@cognee/cognee-ai-memory-tools-evaluation-cognee-mem0-zep-graphiti-87425abecbb2)
- [n1n.ai: AI Agent Memory Comparison 2026](https://explore.n1n.ai/blog/ai-agent-memory-comparison-2026-mem0-zep-letta-cognee-2026-04-23)
- [Letta Forum: Agent memory comparison](https://forum.letta.com/t/agent-memory-letta-vs-mem0-vs-zep-vs-cognee/88)
- [DEV: Memory is the Unsolved Problem of AI Agents](https://dev.to/jihyunsama/memory-is-the-unsolved-problem-of-ai-agents-heres-why-everyones-getting-it-wrong-4066)
- [arXiv: Detecting Hallucinations in Graph RAG](https://arxiv.org/html/2512.09148)
- [DigitalOcean: AI Hallucinations with RAG/KGs](https://www.digitalocean.com/community/conceptual-articles/ai-hallucinations-with-rag-and-knowledge-graphs)
- [HackerNoon: Why High-Stakes RAG Failed](https://hackernoon.com/why-my-high-stakes-rag-failed-and-how-i-rebuilt-it-with-deterministic-graphs)
- [aminrj: RAG Document Poisoning](https://aminrj.com/posts/rag-document-poisoning/)

### Embeddings
- [Mixpeek: Embedding Portability and Versioning](https://mixpeek.com/guides/embedding-portability-versioning)
- [Weaviate: When Good Models Go Bad](https://weaviate.io/blog/when-good-models-go-bad)
- [Medium: Hidden Cost of Embeddings — Drift, Staleness](https://medium.com/@datascientist.lakshmi/the-hidden-cost-of-embeddings-storage-drift-and-model-staleness-in-vector-dbs-d586a39b969c)

### FSRS / Spaced Repetition
- [GitHub: ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)
- [ts-fsrs#300 — Maintaining stable counts](https://github.com/open-spaced-repetition/ts-fsrs/issues/300)
- [Anki Forums: Does FSRS solve "ease hell"?](https://forums.ankiweb.net/t/does-fsrs-solve-ease-hell/38275)
- [FSRS4Anki Tutorial — Hard button misuse](https://github.com/open-spaced-repetition/fsrs4anki/blob/main/docs/tutorial.md)
- [SlideToAnki: How to use FSRS in Anki 2026](https://slidetoanki.com/blog/how-to-use-fsrs-anki-guide)

### Echo360
- [Echo360: Browser Configuration Chrome](https://support.echo360.com/hc/en-us/articles/11062443109517-EchoVideo-Chrome-Recommended-Browser-Configuration)
- [Echo360: Browser Configuration Safari](https://support.echo360.com/hc/en-us/articles/11062459388813-EchoVideo-Safari-Recommended-Browser-Configuration)
- [Echo360: LTI Advantage and LTI 1.3 Support](https://support.echo360.com/hc/en-us/articles/11074490900621-EchoVideo-LTI-Advantage-and-LTI-1-3-Support)
- [Echo360: LTI 1.3 Configuration](https://support.echo360.com/hc/en-us/articles/13820241973261-EchoVideo-Creating-an-LTI-1-3-Configuration-with-Moodle)

### Solo Dev / Burnout / Scope
- [stopscopecreep.com: Scope Creep Statistics 2026](https://stopscopecreep.com/blog/scope-creep-statistics)
- [Wayline: Scope Creep in Solo Indie Dev](https://www.wayline.io/blog/scope-creep-solo-indie-game-development)
- [DEV: Why Your Side Project Remains Unfinished](https://dev.to/rubenoalvarado/why-your-side-project-remains-unfinished-burnout-explained-ape)
- [1000.software: Why Solo Devs Burn Out](https://www.1000.software/post/why-solo-developers-burn-out-and-how-even-a-little-help-changes-everything)
- [SolidGigs: Build SaaS Solo Without Burning Out](https://solidgigs.com/blog/how-to-build-a-saas-app-as-a-solo-developer-without-burning-out/)

---
*Pitfalls research for: personal desktop learning app wrapping local Claude Code (Tauri 2 + SvelteKit + agentic vault + FSRS + Echo360 + AI knowledge graph)*
*Researched: 2026-05-06*
*Builds on (does NOT duplicate) Spike 002 findings F1-F9*
