// tests/sanitize.test.ts — REQ-5 XSS battery + KaTeX hardening + escapeHtml + idempotency.
//
// Every assertion uses DOMParser (passive parse — no script execution, no load-handlers
// fire) so the test framework itself never executes any attacker payload.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { escapeHtml, renderKatex, renderKatexInDom, sanitizeMarkdown } from "../src/lib/sanitize";

describe("sanitize XSS battery (REQ-5)", () => {
  let alertSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    alertSpy = vi.fn();
    (globalThis as any).alert = alertSpy;
  });
  afterEach(() => {
    delete (globalThis as any).alert;
  });

  const xssFixtures: Array<[string, string]> = [
    ["<img src=x onerror=alert(1)>", "img-onerror"],
    ["<script>alert(2)</script>", "script-tag"],
    ["<iframe src=javascript:alert(3)></iframe>", "iframe-javascript"],
    ["<a onclick=alert(4)>x</a>", "a-onclick"],
    ['<a href="data:text/html,<script>alert(5)</script>">x</a>', "a-data-url-script"],
  ];

  it.each(xssFixtures)("renders %s inert (no alert; no script/on* attrs survive)", (payload) => {
    const html = sanitizeMarkdown(payload);
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(alertSpy).not.toHaveBeenCalled();
    expect(doc.querySelector("script")).toBeNull();
    expect(doc.querySelector("[onerror]")).toBeNull();
    expect(doc.querySelector("[onclick]")).toBeNull();
    expect(doc.querySelector("iframe")).toBeNull();
  });

  it("strips on* event-handler attrs (case-insensitive uponSanitizeAttribute hook)", () => {
    const cases = [
      "<img src=x onerror=alert(1)>",
      "<div onmouseover=alert(2)>x</div>",
      "<a onClick=alert(3)>x</a>",
      "<input ONFOCUS=alert(4) />",
    ];
    for (const c of cases) {
      const out = sanitizeMarkdown(c).toLowerCase();
      expect(out).not.toContain("onerror");
      expect(out).not.toContain("onmouseover");
      expect(out).not.toContain("onclick");
      expect(out).not.toContain("onfocus");
    }
  });

  it("blocks KaTeX \\href{javascript:...} via trust:false", () => {
    const html = renderKatex("\\href{javascript:alert(6)}{x}");
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(alertSpy).not.toHaveBeenCalled();
    expect(doc.querySelector("a[href^='javascript:']")).toBeNull();
  });
});

describe("sanitize SAFE rendering", () => {
  it("preserves common markdown tags (h1/ul/li/strong)", () => {
    const html = sanitizeMarkdown("# heading\n\n- item one\n\n**bold**");
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelector("h1")).not.toBeNull();
    expect(doc.querySelector("ul")).not.toBeNull();
    expect(doc.querySelector("li")).not.toBeNull();
    expect(doc.querySelector("strong")).not.toBeNull();
  });

  it("preserves safe link attrs (href + title) — only on* are stripped", () => {
    const html = sanitizeMarkdown('<a href="https://example.com" title="test">x</a>');
    const doc = new DOMParser().parseFromString(html, "text/html");
    const a = doc.querySelector("a");
    expect(a).not.toBeNull();
    expect(a!.getAttribute("href")).toBe("https://example.com");
    expect(a!.getAttribute("title")).toBe("test");
  });

  it("renders standard KaTeX math via \\frac{a}{b}", () => {
    const html = renderKatex("\\frac{a}{b}");
    expect(html).toContain("katex");
    expect(html.length).toBeGreaterThan(20);
  });

  it("HTML-escapes KaTeX error messages (so $<script>$ doesn't smuggle HTML through error text)", () => {
    const tricky = "\\unknownmacro{<script>alert(7)</script>}";
    const html = renderKatex(tricky);
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelector("script")).toBeNull();
  });
});

describe("escapeHtml", () => {
  it("replaces all 5 dangerous chars exactly", () => {
    expect(escapeHtml('&<>"\'')).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("preserves safe characters", () => {
    expect(escapeHtml("hello world 123")).toBe("hello world 123");
  });

  it("handles empty + Unicode strings", () => {
    expect(escapeHtml("")).toBe("");
    expect(escapeHtml("café 中文")).toBe("café 中文");
  });
});

describe("sanitizeMarkdown idempotency", () => {
  it("sanitize(sanitize(x)) === sanitize(x) for diverse inputs", () => {
    const inputs = [
      "<img src=x onerror=alert(1)>",
      "# heading\n\n**bold**",
      '<a href="https://example.com">link</a>',
      "Plain text only.",
    ];
    for (const x of inputs) {
      const once = sanitizeMarkdown(x);
      const twice = sanitizeMarkdown(once);
      expect(twice).toBe(once);
    }
  });
});

// BL-03 regression contract (commit 8f052f6 — 2026-05-14):
// AssistantMessage.svelte's $effect intentionally skips renderKatexInDom while
// `streaming === true`. Rationale: the walker's `$...$` and `$$...$$` regex
// pair are correct on COMPLETE input but ambiguous on partial streaming
// buffers — a half-arrived `$$x = ` plus a later `$a` chunk can be misread as
// inline math `$x = $a` (or worse, an unbalanced `$` is treated as the closer
// of a different opener). These tests pin the corruption surface so any
// future refactor that re-enables streaming KaTeX without first hardening
// the walker will break this file (forcing the author to also revisit the
// AssistantMessage.svelte $effect guard).
//
// If you make the walker safe on partial buffers, update the expectations
// below to assert NO mutation on a half-arrived chunk — then it is safe to
// remove the `if (streaming) return;` guard in AssistantMessage.svelte.
describe("renderKatexInDom — partial streaming buffer hazard (BL-03 contract)", () => {
  it("partial $$math with a single trailing $ is mis-rendered as inline math (proof BL-03 skip is required)", () => {
    // Simulates a streaming buffer where the user wrote `$$incomplete \frac{a}{b}$$` but
    // only the first `$$ ... $` portion has arrived. The walker should NOT
    // declare this complete math, but its regex pair treats the inner span
    // as inline (one `$` opens, the next `$` closes). On a complete `$$..$$`
    // chunk the walk is fine — corruption only emerges mid-stream.
    const sanitized = sanitizeMarkdown("$$incomplete \\frac{a}{b}$ ");
    const host = document.createElement("div");
    host.appendChild(
      document.createRange().createContextualFragment(sanitized)
    );
    const before = host.innerHTML;
    renderKatexInDom(host);
    const after = host.innerHTML;

    // Document the hazard: the walker DID mutate the partial buffer. The
    // resulting DOM contains KaTeX output that the user never intended.
    expect(after).not.toBe(before);
    expect(after).toContain("katex");
  });

  it("mid-stream `\\max` tail after a complete $$..$$ leaves an orphan $$ that the walker leaves alone (flicker hazard)", () => {
    // Multi-chunk scenario: the stream has emitted `$$ r(n)$$ then $$\max`.
    // The first display chunk is complete, the second is half. On the NEXT
    // chunk (`\{p\}$$`) the assistant html is re-sanitized from scratch by
    // ChatPanel.scheduleHtmlRecompute. If the walker runs on this INTERMEDIATE
    // state, the user sees `$$\max` flicker as plaintext, then complete math,
    // then plaintext-again as the buffer resets — distracting UX.
    const sanitized = sanitizeMarkdown("Math: $$ r(n)$$ then $$\\max");
    const host = document.createElement("div");
    host.appendChild(
      document.createRange().createContextualFragment(sanitized)
    );
    const before = host.innerHTML;
    renderKatexInDom(host);
    const after = host.innerHTML;

    // Document the hazard: walker rendered the FIRST $$..$$ (a known
    // mutation) but the orphan `$$\max` tail is left as literal text.
    expect(after).not.toBe(before);
    expect(after).toContain("katex-display");
    // The orphan `$$\max` should be present somewhere in the result as
    // plaintext (the bug surface — what AssistantMessage avoids by
    // gating with `if (streaming) return`).
    expect(after).toContain("\\max");
  });

  it("complete `$$x = 1$$` and `$y$` SHOULD render correctly (positive baseline)", () => {
    // The walker is correct on COMPLETE input. This test pins the safe path
    // so a future "harden the walker" refactor doesn't regress the
    // post-streaming render quality.
    const sanitized = sanitizeMarkdown("Display $$x = 1$$ and inline $y$ here.");
    const host = document.createElement("div");
    host.appendChild(
      document.createRange().createContextualFragment(sanitized)
    );
    renderKatexInDom(host);
    expect(host.innerHTML).toContain("katex-display");
    // Two KaTeX renders (one display, one inline) — second confirms inline path.
    const katexNodes = host.querySelectorAll(".katex");
    expect(katexNodes.length).toBeGreaterThanOrEqual(2);
  });
});
