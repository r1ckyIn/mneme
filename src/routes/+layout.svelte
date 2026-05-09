<!--
  +layout.svelte — Phase 1 root layout.
  Imports tokens.css ONCE at the layout root so all child routes/components
  inherit the custom properties on :root. SSR is disabled in +layout.ts;
  prerender=true; this is SPA-mode under Tauri's static-file serve.
-->
<script lang="ts">
  import "$lib/styles/tokens.css";
  let { children } = $props();
</script>

{@render children()}
