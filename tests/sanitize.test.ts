// tests/sanitize.test.ts — REQ-5 XSS battery + KaTeX hardening + escapeHtml + idempotency.
//
// Every assertion uses DOMParser (passive parse — no script execution, no load-handlers
// fire) so the test framework itself never executes any attacker payload.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { escapeHtml, renderKatex, sanitizeMarkdown } from "../src/lib/sanitize";

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
