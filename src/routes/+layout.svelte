<!--
  +layout.svelte — Phase 1 root layout + Phase 01.1 dev-feedback-loop install.

  Imports tokens.css ONCE at the layout root so all child routes/components
  inherit the custom properties on :root. SSR is disabled in +layout.ts;
  prerender=true; this is SPA-mode under Tauri's static-file serve.

  Phase 01.1 (D-SF-01 + D-XP-01): the dev-only forwarder is installed under
  `import.meta.env.DEV` so it tree-shakes out of production builds. D-SF-05
  verification: grep `dist/` for `installConsoleForwarder` post-build returns
  zero matches. The dynamic import keeps the forwarder module itself out of
  the prod chunk graph (Vite analyses the static `import` graph statically,
  so a literal `if (import.meta.env.DEV)` block lets the dead branch — and
  any modules only referenced inside it — be eliminated).
-->
<script lang="ts">
  import "$lib/styles/tokens.css";
  // CR-04a (2026-05-15): without katex.css the .katex-mathml screen-reader
  // span is NOT visually hidden, so KaTeX inline math renders TWICE — once
  // as the MathML fallback (plain text) and once as the styled HTML version,
  // producing visible duplicates like "f(x)f(x)". katex.min.css supplies the
  // `position: absolute; clip: rect(...)` rule that hides .katex-mathml and
  // also loads the KaTeX font faces (relative `url(./fonts/...)` resolved
  // by Vite at build time — no external network).
  import "katex/dist/katex.min.css";

  // Phase 01.1 D-SF-01 — dev-only Svelte forwarder install (R1 spec.md).
  //
  // Vite tree-shakes the dead branch from prod bundle; the
  // `import.meta.env.DEV` guard is the defense-in-depth invariant referenced
  // by D-SF-05 (grep `dist/` for `installConsoleForwarder` MUST return zero
  // matches in prod build). The dynamic import ensures the forwarder module
  // is reachable from the prod-static graph ONLY through the dead branch.
  if (import.meta.env.DEV) {
    void import("$lib/dev/console-forwarder").then(({ installConsoleForwarder }) => {
      installConsoleForwarder();
    });
  }

  let { children } = $props();
</script>

{@render children()}
