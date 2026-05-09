// src/lib/sanitize.ts — REQ-5 hardened sanitize pipeline.
//
// CRITICAL invariants (T-1-02 closure — streaming markdown XSS):
// - DOMPurify ALWAYS runs AFTER marked.parse, never before (spike landmine #4).
// - DOMPurify FORBID_ATTR contains STRINGS only — regex entries are silently ignored
//   by DOMPurify v3.x (RESEARCH §4.6 cross-spec correction). For event-handler
//   stripping we install an `uponSanitizeAttribute` hook (Option A — preserves
//   the broad permissive default attr surface so unanticipated safe attrs still
//   pass).
// - KaTeX called with trust:false strict:true macros:{} maxExpand:1000 throwOnError:false.
//   Error messages MUST be passed through escapeHtml() before display — KaTeX errors
//   quote the offending source verbatim and themselves can carry HTML.
// - escapeHtml is the standard 5-char replacement; reused for subprocess error text
//   in the system error bubble (UI-SPEC §"System bubble — error variant").

import DOMPurify from "dompurify";
import { marked } from "marked";
import katex from "katex";

// Install the on* attribute stripper hook ONCE at module load. Module-scope
// guarantees a single registration per page lifetime (idempotent across HMR
// reloads is enforced by DOMPurify's internal hook list — duplicate hooks are
// rare in production but cheap if they happen).
DOMPurify.addHook("uponSanitizeAttribute", (_node, hookEvent) => {
  if (/^on/i.test(hookEvent.attrName)) {
    hookEvent.keepAttr = false;
  }
});

const FORBID_TAGS = ["script", "iframe", "object", "embed", "form", "input", "style"];
// Strings only — regex entries are silently ignored by DOMPurify v3.x.
const FORBID_ATTR = ["srcdoc", "formaction"];

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizeMarkdown(text: string): string {
  // marked.parse can return Promise<string> under async highlighters — we don't
  // use one in Phase 1, so the sync return path is correct. Cast for TS.
  const html = marked.parse(text, { gfm: true, breaks: true }) as string;
  return DOMPurify.sanitize(html, { FORBID_TAGS, FORBID_ATTR });
}

export function renderKatex(src: string, displayMode = false): string {
  let html: string;
  try {
    html = katex.renderToString(src, {
      trust: false,        // BLOCKS \href{javascript:...}; default since v0.16.0
      strict: true,        // rejects non-strict commands
      macros: {},          // empty — denies user-supplied macros that bypass trust
      maxExpand: 1000,     // expansion-bomb guard
      throwOnError: false, // never throw mid-render — surface error inline + escapeHtml
      displayMode,
    });
  } catch (e: any) {
    // throwOnError:false should already prevent throws; defense-in-depth.
    const escapedMsg = escapeHtml(typeof e?.message === "string" ? e.message : String(e));
    return `<span class="katex-error">[KaTeX error: ${escapedMsg}]</span>`;
  }
  // KaTeX HTML output goes through DOMPurify with the SAME FORBID set + the hook —
  // KaTeX produces MathML/SVG which the default DOMPurify ALLOWED list mostly
  // covers; FORBID_TAGS just adds defense.
  return DOMPurify.sanitize(html, { FORBID_TAGS, FORBID_ATTR });
}

/**
 * Walks `root` for text nodes containing `$...$` (inline) or `$$...$$` (display)
 * math, replacing each match with rendered KaTeX HTML (which is itself
 * DOMPurify-sanitized at the source via renderKatex()).
 *
 * SECURITY NOTE: We use Range#createContextualFragment to construct DOM nodes
 * from the sanitized HTML string. The HTML being inserted comes from
 * renderKatex() above, which already routes its output through
 * DOMPurify.sanitize() — so the bytes reaching the DOM here are guaranteed
 * to have passed the sanitize gate. We never insert raw KaTeX output, raw
 * marked output, or raw subprocess text into the live DOM.
 *
 * Phase 1 prompts are short; this minimal walker matches the spike-002 pattern.
 */
export function renderKatexInDom(root: HTMLElement): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) textNodes.push(n as Text);

  for (const tn of textNodes) {
    const txt = tn.nodeValue ?? "";
    if (!/\$.+?\$/.test(txt)) continue;

    // Split the text into a sequence of plain text + KaTeX math segments.
    const parts: Array<{ kind: "text" | "inline" | "display"; src: string }> = [];
    let rest = txt;
    while (rest.length > 0) {
      const dispMatch = rest.match(/^([\s\S]*?)\$\$([\s\S]+?)\$\$([\s\S]*)$/);
      const inlineMatch = rest.match(/^([\s\S]*?)\$([^$]+?)\$([\s\S]*)$/);
      if (dispMatch && (!inlineMatch || dispMatch[1].length <= inlineMatch[1].length)) {
        if (dispMatch[1]) parts.push({ kind: "text", src: dispMatch[1] });
        parts.push({ kind: "display", src: dispMatch[2] });
        rest = dispMatch[3];
      } else if (inlineMatch) {
        if (inlineMatch[1]) parts.push({ kind: "text", src: inlineMatch[1] });
        parts.push({ kind: "inline", src: inlineMatch[2] });
        rest = inlineMatch[3];
      } else {
        parts.push({ kind: "text", src: rest });
        rest = "";
      }
    }

    const replacement = document.createDocumentFragment();
    for (const p of parts) {
      if (p.kind === "text") {
        replacement.appendChild(document.createTextNode(p.src));
      } else {
        // renderKatex() output is already DOMPurify-sanitized at the source —
        // the bytes inserted here have passed the sanitize gate.
        const sanitizedKatexHtml = renderKatex(p.src, p.kind === "display");
        const range = document.createRange();
        range.selectNodeContents(document.body);
        const frag = range.createContextualFragment(sanitizedKatexHtml);
        const span = document.createElement("span");
        span.appendChild(frag);
        replacement.appendChild(span);
      }
    }
    tn.parentNode?.replaceChild(replacement, tn);
  }
}
