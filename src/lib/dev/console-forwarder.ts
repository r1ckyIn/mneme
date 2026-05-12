// src/lib/dev/console-forwarder.ts — D-SF-01 dev-only signal forwarder.
//
// CRITICAL: entire function body MUST be a no-op outside `import.meta.env.DEV`.
// Vite tree-shakes the dead branch from prod bundles; the function-body guard
// is defense-in-depth so even if a future caller imports the module from a
// prod-context entry, no monkey-patching occurs. Production-build verification
// (D-SF-05): grep `dist/` for `installConsoleForwarder` / `__mnemeDevSnapshot__`
// / `[FRONTEND_CONSOLE]` / `[FRONTEND_NETWORK]` / `[FRONTEND_PERF]` — all must
// be absent.
//
// Eight signal classes per D-SF-02 + spec.md R1 scenarios:
//   console.{log,info,debug,warn,error}    (5 levels, original-ref closure)
//   window error                            → tag "uncaught" or "resource-error"
//   window unhandledrejection               → tag "unhandled-rejection"
//   window addEventListener("error", h, true) (resource failures — same handler)
//   document securitypolicyviolation        → tag "csp"
//   global fetch wrap                       (preserves original reference)
//   XMLHttpRequest.prototype.open + send    (monkey-patch)
//   PerformanceObserver                     (LCP / FCP / layout-shift / longtask
//                                            — each observe() try/catch-wrapped
//                                            per E6 Safari 16 LCP-unsupported)
//
// Every dispatched signal goes through invoke(...).catch(() => {}) so a
// Tauri-side log-write failure cannot crash the forwarder (D-SF-04).
//
// E6 errata — Safari 16 (macOS 13.4 WKWebView) does NOT support
// `largest-contentful-paint` PerformanceObserver entry type (RESEARCH.md R5).
// Each observe({type:'X'}) call is wrapped in try/catch so an unsupported
// type does NOT abort the forwarder install. Unsupported types log a
// one-time `[forwarder] LCP unavailable …` info line; the corresponding
// __mnemeDevSnapshot__.performance.lcp_ms field remains null.

import { invoke } from "@tauri-apps/api/core";
import { SNAPSHOT_SELECTORS } from "./snapshot-selectors";

type Level = "log" | "info" | "debug" | "warn" | "error";
type ConsoleTag =
  | Level
  | "uncaught"
  | "unhandled-rejection"
  | "resource-error"
  | "csp";

// Marker used by tests to assert the XHR prototype has been patched.
type Patched<F> = F & { __mnemeForwarderPatched?: boolean };

function argsToString(args: unknown[]): string {
  try {
    return args
      .map((a) => {
        if (typeof a === "string") return a;
        if (a instanceof Error) return a.stack ?? a.message;
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      })
      .join(" ");
  } catch {
    return args.map(String).join(" ");
  }
}

function logConsole(
  level: Level,
  tag: ConsoleTag,
  message: string,
  source?: string,
  line?: number,
): void {
  // D-SF-04: every invoke must .catch() so a Tauri-side log-write failure
  // never crashes the forwarder. We swallow silently — log-write errors are
  // ephemeral debug telemetry; surfacing them in dev would just create noise.
  invoke("dev_log_console_entry", {
    level,
    tag,
    message,
    source,
    line,
  }).catch(() => {
    /* D-SF-04 — never crash on log-write failure */
  });
}

function logNetwork(
  method: string,
  url: string,
  status: number,
  durationMs: number,
): void {
  invoke("dev_log_network_entry", { method, url, status, durationMs }).catch(
    () => {
      /* D-SF-04 */
    },
  );
}

function logPerf(metric: string, value: number): void {
  invoke("dev_log_perf_entry", {
    metric,
    value,
    ts: new Date().toISOString(),
  }).catch(() => {
    /* D-SF-04 */
  });
}

export function installConsoleForwarder(): void {
  // Defense-in-depth gate. The expected production path is that Vite's
  // tree-shaker removes this entire function body from the bundle when
  // import.meta.env.DEV is statically false. This guard handles edge cases
  // (e.g., dynamic test-time imports without DEV mode).
  if (!import.meta.env.DEV) return;

  // Module singleton — prevent double-patching across HMR / repeated imports.
  // We use a globalThis flag (not a module-scope `let`) so HMR-reloaded
  // module instances still see the prior install.
  const g = globalThis as typeof globalThis & {
    __mnemeForwarderInstalled?: boolean;
    __mnemeDevSnapshot__?: () => string;
  };
  if (g.__mnemeForwarderInstalled) return;
  g.__mnemeForwarderInstalled = true;

  // ----- 1. Console levels (capture original refs BEFORE patching) -----
  // A-09 / spike-findings KP-04 pattern: capture refs first via .bind() so
  // monkey-patching does not lose the original console output chain.
  const origConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  } as const;
  (["log", "info", "debug", "warn", "error"] as const).forEach((level) => {
    console[level] = (...args: unknown[]) => {
      origConsole[level](...args); // chain preservation — never break devtools
      logConsole(level, level, argsToString(args));
    };
  });

  // ----- 2 + 3. Uncaught errors AND resource errors (capture=true) -----
  // The same handler covers both because resource errors only fire in the
  // capture phase on the parent window. ErrorEvent's `target` differentiates:
  // a non-window target with a media-bearing tagName is a resource failure.
  window.addEventListener(
    "error",
    (e: Event) => {
      const target = (e as Event).target as Element | null;
      if (
        target &&
        target !== (window as unknown as Element) &&
        (target.tagName === "IMG" ||
          target.tagName === "SCRIPT" ||
          target.tagName === "LINK" ||
          target.tagName === "SOURCE" ||
          target.tagName === "AUDIO" ||
          target.tagName === "VIDEO")
      ) {
        // Resource load failure (capture=true required for these to bubble).
        const t = target as
          | HTMLImageElement
          | HTMLScriptElement
          | HTMLLinkElement
          | HTMLSourceElement
          | HTMLMediaElement;
        const url =
          (t as HTMLImageElement | HTMLScriptElement).src ??
          (t as HTMLLinkElement).href ??
          "";
        logConsole(
          "error",
          "resource-error",
          `${target.tagName}: ${String(url)}`,
        );
        return;
      }
      const ee = e as ErrorEvent;
      const msg =
        typeof ee.message === "string" && ee.message
          ? ee.message
          : ee.error instanceof Error
            ? ee.error.message
            : "unknown";
      logConsole(
        "error",
        "uncaught",
        String(msg),
        ee.filename || undefined,
        ee.lineno || undefined,
      );
    },
    true,
  );

  // ----- 4. Unhandled rejections -----
  window.addEventListener("unhandledrejection", (e: Event) => {
    const reason = (e as PromiseRejectionEvent & { reason: unknown }).reason;
    let msg: string;
    if (reason instanceof Error) {
      msg = reason.message;
    } else if (typeof reason === "string") {
      msg = reason;
    } else {
      try {
        msg = JSON.stringify(reason);
      } catch {
        msg = String(reason);
      }
    }
    logConsole("error", "unhandled-rejection", msg);
  });

  // ----- 5. CSP violations -----
  document.addEventListener("securitypolicyviolation", (e: Event) => {
    const ev = e as SecurityPolicyViolationEvent & {
      violatedDirective?: string;
      blockedURI?: string;
    };
    const directive = ev.violatedDirective ?? "unknown-directive";
    const blocked = ev.blockedURI ?? "unknown-uri";
    logConsole("warn", "csp", `${directive}: ${blocked}`);
  });

  // ----- 6. fetch wrap -----
  // Capture original ref FIRST so code that already captured globalThis.fetch
  // before this install gets the unwrapped version (chain-of-trust).
  const origFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const start =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    let url: string;
    if (typeof input === "string") url = input;
    else if (input instanceof URL) url = input.toString();
    else url = (input as Request).url;
    const method = (
      init?.method ??
      (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    try {
      const res = await origFetch(input, init);
      const end =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      logNetwork(method, url, res.status, end - start);
      return res;
    } catch (err) {
      const end =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      // status=0 by convention for network failures (request never completed).
      logNetwork(method, url, 0, end - start);
      throw err;
    }
  };

  // ----- 7. XHR monkey-patch -----
  // Track per-XHR start time + request shape; finalize on `loadend`.
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  type XhrTrace = { method: string; url: string; start: number };
  const traces = new WeakMap<XMLHttpRequest, XhrTrace>();
  const patchedOpen = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    traces.set(this, { method: method.toUpperCase(), url: String(url), start: 0 });
    return (origOpen as unknown as (...args: unknown[]) => void).call(
      this,
      method,
      url,
      ...rest,
    );
  } as Patched<typeof origOpen>;
  patchedOpen.__mnemeForwarderPatched = true;
  XMLHttpRequest.prototype.open = patchedOpen;

  const patchedSend = function (this: XMLHttpRequest, ...args: unknown[]) {
    const trace = traces.get(this);
    if (trace) {
      trace.start =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      // WR-02: use { once: true } so the listener self-removes after it fires.
      // Without this, reusing the same XHR instance (open+send again) would
      // accumulate a second listener and produce duplicate network.log entries.
      this.addEventListener("loadend", () => {
        const end =
          typeof performance !== "undefined" ? performance.now() : Date.now();
        logNetwork(trace.method, trace.url, this.status, end - trace.start);
      }, { once: true });
    }
    return (origSend as unknown as (...args: unknown[]) => void).apply(
      this,
      args,
    );
  } as Patched<typeof origSend>;
  patchedSend.__mnemeForwarderPatched = true;
  XMLHttpRequest.prototype.send = patchedSend;

  // ----- 8. PerformanceObserver — E6 try/catch each observe() -----
  // Safari 16 (macOS 13.4 WKWebView) lacks `largest-contentful-paint`.
  // Wrap each observer per type; unsupported types skip silently with
  // a one-time info log. Tracked LCP / FCP / CLS / longtask counts feed
  // into __mnemeDevSnapshot__.performance.
  const perfState = {
    lcp_ms: null as number | null,
    fcp_ms: null as number | null,
    cls: 0,
    longtasks: 0,
  };
  let lcpUnavailableLogged = false;

  if (typeof globalThis.PerformanceObserver !== "undefined") {
    const PERF_TYPES = [
      "largest-contentful-paint",
      "paint",
      "layout-shift",
      "longtask",
    ] as const;
    for (const type of PERF_TYPES) {
      try {
        const po = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === "largest-contentful-paint") {
              // IN-03: LargestContentfulPaint.duration is always 0 per W3C spec;
              // only startTime carries the meaningful render time. Use startTime only.
              perfState.lcp_ms = entry.startTime;
              logPerf("lcp", perfState.lcp_ms);
            } else if (entry.entryType === "paint") {
              if (entry.name === "first-contentful-paint") {
                perfState.fcp_ms = entry.startTime;
                logPerf("fcp", entry.startTime);
              }
            } else if (entry.entryType === "layout-shift") {
              const v = (entry as PerformanceEntry & { value?: number })
                .value;
              if (typeof v === "number") {
                perfState.cls += v;
                logPerf("cls", v);
              }
            } else if (entry.entryType === "longtask") {
              perfState.longtasks += 1;
              logPerf("longtask", entry.duration);
            }
          }
        });
        po.observe({ type, buffered: true });
      } catch {
        // E6 — Safari 16 throws TypeError on unsupported entry types.
        // We swallow silently except for LCP, which gets a one-time info log
        // so a future Safari upgrade is observable without code change.
        if (type === "largest-contentful-paint" && !lcpUnavailableLogged) {
          lcpUnavailableLogged = true;
          origConsole.info(
            "[forwarder] LCP unavailable on this WebKit version, skipped",
          );
        }
      }
    }
  }

  // ----- 9. __mnemeDevSnapshot__ global registration (D10) -----
  g.__mnemeDevSnapshot__ = () => {
    const styles: Record<string, Record<string, string>> = {};
    for (const sel of SNAPSHOT_SELECTORS) {
      try {
        // Pseudo-selectors (e.g. `.x::placeholder`) need to be split — the
        // element selector is the first half, the pseudo-element is the
        // second arg to getComputedStyle.
        let elementSelector: string;
        let pseudo: string | null = null;
        const pseudoIdx = sel.indexOf("::");
        if (pseudoIdx >= 0) {
          elementSelector = sel.slice(0, pseudoIdx);
          pseudo = sel.slice(pseudoIdx);
        } else {
          // For pseudo-classes like `:active` getComputedStyle does not
          // synthesize the state — we just query the element. Acceptable
          // approximation for KD-13 verification; full active-state
          // verification happens at the screenshot layer.
          const colonIdx = sel.indexOf(":");
          if (colonIdx >= 0 && sel[colonIdx + 1] !== ":") {
            elementSelector = sel.slice(0, colonIdx);
          } else {
            elementSelector = sel;
          }
        }
        const el = document.querySelector(elementSelector);
        if (!el) {
          styles[sel] = { __error: "selector_not_matched" };
          continue;
        }
        const cs = window.getComputedStyle(el, pseudo);
        styles[sel] = {
          color: cs.color,
          backgroundColor: cs.backgroundColor,
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          borderRadius: cs.borderRadius,
          padding: cs.padding,
          opacity: cs.opacity,
          transform: cs.transform,
        };
      } catch (e) {
        styles[sel] = { __error: e instanceof Error ? e.message : String(e) };
      }
    }

    // DOM summary — node count + depth + heading + landmark roles.
    const allEls = document.querySelectorAll("*");
    let maxDepth = 0;
    allEls.forEach((el) => {
      let depth = 0;
      let n: Node | null = el;
      while (n && n !== document.body) {
        depth += 1;
        n = n.parentNode;
      }
      if (depth > maxDepth) maxDepth = depth;
    });

    const landmarks = Array.from(document.querySelectorAll("[role]"))
      .map((el) => el.getAttribute("role") ?? "")
      .filter(Boolean);

    const snapshot = {
      url: window.location.href,
      title: document.title,
      viewport: {
        w: window.innerWidth,
        h: window.innerHeight,
        dpr: window.devicePixelRatio,
      },
      performance: {
        lcp_ms: perfState.lcp_ms,
        fcp_ms: perfState.fcp_ms,
        cls: perfState.cls,
        longtasks: perfState.longtasks,
      },
      dom_summary: {
        node_count: allEls.length,
        depth: maxDepth,
        h1_count: document.querySelectorAll("h1").length,
        h2_count: document.querySelectorAll("h2").length,
        landmark_roles: landmarks,
      },
      computed_styles: styles,
      ts: new Date().toISOString(),
    };
    return JSON.stringify(snapshot);
  };
}
