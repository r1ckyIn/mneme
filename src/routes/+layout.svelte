<!--
  +layout.svelte — Phase 1 root layout + Phase 01.1 dev-feedback-loop install
                   + Phase 2 Plan 02-08 onboarding-state app-startup redirect
                   + Phase 2 Plan 02-12 final integration (vault-state hydration
                                                           + ReconciliationOverlay
                                                           + import-listener install
                                                           + menu:open-settings bridge).

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

  Phase 2 Plan 02-08: on app mount, invoke `load_onboarding_state`. If
  `completed_at` is null AND we are not already on the /onboarding/* route,
  redirect to /onboarding/<current_step>. The `ready` gate suppresses
  `{@render children()}` until we know the routing destination so the
  main UI never flashes on first launch.

  CYCLE-2 cluster #11 + CYCLE-3 cycle-2 H1 PARTIAL fix — set `ready = true`
  BEFORE `goto(...)` so the onboarding child route renders immediately on
  same-root navigation. SvelteKit root layouts do NOT remount on same-root
  navigation; leaving `ready = false` after a `goto` would blank-screen
  first-launch users forever until they hit Cmd+R. The onboarding route
  has its own /onboarding/+layout.svelte (no Splitter / no MindMapBar), so
  showing children "early" is correct — the main UI shell is NOT what we
  want to render under /onboarding/* anyway.

  Why not put the redirect in `+page.ts load()`: the root +layout.svelte
  installs the DEV console forwarder, which MUST run before any onboarding
  child fetches anything. Moving the redirect to `load()` would put the
  forwarder install inside a `load()` function (anti-pattern — `load` is
  for data, not side-effects). The `ready` flag approach is mechanically
  smaller and preserves the proven DEV-forwarder install order from
  Phase 01.1.

  Phase 2 Plan 02-12 — POST-ONBOARDING HYDRATION + RECONCILIATION + MENU
                       BRIDGE (final integration wave):
    - When load_onboarding_state returns `completed_at` set AND we are NOT on
      /onboarding/*, the layout takes ownership of the app-startup hydration:
        1. invoke("load_config") -> setVaultPath into vault-state singleton.
        2. invoke("list_courses") -> setCourseList.
        3. installImportListeners() (HMR-safe — see import-state.svelte.ts).
        4. ReconciliationOverlay mounts (visible by default via `reconciling`
           local state) while invoke("reconcile_vault_index", { root }) runs;
           overlay unmounts once invoke resolves (finally clause).
        5. After reconcile the course list is re-read because index repair
           can detect courses that the load_config snapshot missed.
    - SPEC-GAP-1 (settings-ui.md §2 L59): install a Tauri
      `listen("menu:open-settings", ...)` bridge that re-dispatches the
      existing `mneme:open-settings` window CustomEvent. This makes the macOS
      native menu (Mneme → Preferences..., emitted by Plan 07
      `build_app_menu` / `on_menu_event` in lib.rs) feed the same downstream
      code path as the cog click + Cmd+,. SettingsPanel listens for the
      window CustomEvent — single state machine; no duplicate listeners.
      Unlisten on onDestroy to avoid leak across HMR.
    - All IPC calls wrapped in try/catch so a Tauri runtime hiccup never
      blocks the main-UI mount or strands the spinner.
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
  import { onMount, onDestroy } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { listen, type UnlistenFn } from "@tauri-apps/api/event";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { get } from "svelte/store";
  import ReconciliationOverlay from "$lib/components/ReconciliationOverlay.svelte";
  import { setVaultPath, setCourseList } from "$lib/vault-state.svelte";
  import { installImportListeners } from "$lib/import-state.svelte";

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

  interface MinimalOnboardingState {
    current_step: number;
    completed_at: string | null;
  }

  interface MinimalConfig {
    vault_path: string;
  }

  let { children } = $props();
  let ready = $state(false);
  let reconciling = $state(false);
  let menuUnlisten: UnlistenFn | null = null;

  onMount(async () => {
    // SPEC-GAP-1 (settings-ui.md §2 L59) — bridge the native menu Preferences...
    // click to the existing mneme:open-settings custom event. Single downstream
    // code path for cog / Cmd+, / native menu — all three funnel through the same
    // listener installed by SettingsPanel.
    try {
      menuUnlisten = await listen("menu:open-settings", () => {
        window.dispatchEvent(new CustomEvent("mneme:open-settings"));
      });
    } catch (e) {
      console.error("[+layout:menu-bridge]", e);
      // Fail-open: cog click + Cmd+, still work even if Tauri listen() throws.
    }

    try {
      const state = await invoke<MinimalOnboardingState>("load_onboarding_state");
      const onOnboarding = get(page).url.pathname.startsWith("/onboarding");
      if (!state.completed_at && !onOnboarding) {
        const step =
          state.current_step >= 1 && state.current_step <= 6 ? state.current_step : 1;
        // CYCLE-2 cluster #11 + CYCLE-3 cycle-2 H1 — set ready BEFORE goto
        // so the onboarding child route renders immediately. SvelteKit root
        // layouts do NOT remount on same-root navigation; leaving ready=false
        // here would blank-screen first-launch users.
        ready = true;
        await goto(`/onboarding/${step}`, { replaceState: true });
        return;
      }
      // Phase 2 Plan 02-12 — post-onboarding hydration + reconciliation.
      if (state.completed_at && !onOnboarding) {
        let vaultPath = "";
        try {
          const cfg = await invoke<MinimalConfig>("load_config");
          if (cfg.vault_path) {
            vaultPath = cfg.vault_path;
            setVaultPath(cfg.vault_path);
          }
        } catch (e) {
          console.error("[+layout:load_config]", e);
        }
        // WR-08 fix (gap-closure 02-14): pre-reconcile list_courses removed.
        // On fresh install the DB is empty before reconcile populates it, so
        // the previous pre-reconcile call always returned []. Components
        // reading vault-state.course_list between hydration steps saw a
        // stale empty list. Single source of truth is now the post-reconcile
        // list_courses call site below (inside the if (vaultPath) branch).
        // installImportListeners stays here as a pre-reconcile step so
        // drag-drop events that arrive while reconcile is mid-flight are
        // still observed.
        try {
          await installImportListeners();
        } catch (e) {
          console.error("[+layout:install_import_listeners]", e);
        }
        if (vaultPath) {
          reconciling = true;
          try {
            await invoke("reconcile_vault_index", { root: vaultPath });
            // WR-08 fix (gap-closure 02-14): this is now the SINGLE source
            // of truth for vault-state.course_list on fresh install (the
            // pre-reconcile call was removed). Index repair surfaces any
            // courses created out-of-band between onboarding finish and
            // first reconcile.
            try {
              const refreshed = await invoke<string[]>("list_courses");
              setCourseList(refreshed);
            } catch (e) {
              console.warn("[+layout:list_courses_post_reconcile]", e);
            }
          } catch (e) {
            console.error("[+layout:reconcile]", e);
          } finally {
            reconciling = false;
          }
        }
      }
    } catch (e) {
      console.error("[+layout:load_onboarding]", e);
    }
    ready = true;
  });

  onDestroy(() => {
    // Unlisten the Tauri menu event on HMR / nav teardown to avoid leak.
    menuUnlisten?.();
  });
</script>

{#if reconciling}
  <ReconciliationOverlay onDone={() => { reconciling = false; }} />
{/if}

{#if ready}
  {@render children()}
{/if}
