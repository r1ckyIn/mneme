<!--
  Visual: /Users/qinyuan/Downloads/Mneme 3/Mneme Onboarding.html (Step 2 frame)
         + 02-UI-SPEC.md §8.1.2 — Step 2 Claude Code auth check

  Three states per UI-SPEC §8.1.2:
   - checking   — neutral dot + spinner overlay + "Looking for Claude CLI…"
   - found      — --color-success dot + "Claude CLI detected" + "OAuth session active"
   - not-found  — --color-error dot + remediation copy + "Open Claude Code guide" link

  Invokes claude_auth_check on mount (Plan 02-09 Rust body — read-only
  Path::exists() on ~/.claude/.credentials.json; T-2-08 safe: NO bytes from
  the credentials file cross the IPC boundary).

  Continue CTA is disabled unless status === "found". The not-found link
  opens https://docs.claude.com/claude-code in the user's default browser
  via tauri-plugin-shell's open() — already on the capability table via
  shell:default (Phase 1 carryover).

  KD-13 token-only. The --color-success dot ring uses an inline rgba()
  derived from --color-success because tokens.css does not
  define a dedicated success-ring token — same pattern as the dropzone
  hover-ring acceptance carve-out in 02-09-PLAN.md L1023.
-->
<script lang="ts">
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { open as openExternal } from "@tauri-apps/plugin-shell";

  interface Props {
    onContinue: () => void;
    saving?: boolean;
  }
  let { onContinue, saving = false }: Props = $props();

  type Status = "checking" | "found" | "not-found";
  let status = $state<Status>("checking");
  let version = $state<string | null>(null);

  onMount(async () => {
    try {
      const result = await invoke<{ found: boolean; version: string | null }>(
        "claude_auth_check",
      );
      status = result.found ? "found" : "not-found";
      version = result.version;
    } catch (e) {
      console.error("[onboarding:auth-check]", e);
      // Treat IPC failure as not-found so the user sees actionable
      // remediation rather than a stuck spinner.
      status = "not-found";
    }
  });

  async function openGuide() {
    try {
      await openExternal("https://docs.claude.com/claude-code");
    } catch (e) {
      console.error("[onboarding:open-guide]", e);
    }
  }
</script>

<section class="step2" aria-labelledby="step2-heading">
  <h1 id="step2-heading" class="headline">Verifying Claude Code authentication</h1>
  <p class="body">Reading your local Claude CLI session. No network calls.</p>

  <div class="status-block" role="status" aria-live="polite">
    <span class="dot" data-status={status} aria-hidden="true"></span>
    <div class="status-text">
      {#if status === "checking"}
        <div class="status-main">Looking for Claude CLI…</div>
      {:else if status === "found"}
        <div class="status-main">
          Claude CLI detected{version ? ` · ${version}` : ""}
        </div>
        <div class="status-sub">OAuth session active</div>
      {:else}
        <div class="status-main">Claude CLI not detected.</div>
        <div class="status-sub">
          Run <code>claude --version</code> in Terminal first, then return here.
        </div>
      {/if}
    </div>
  </div>

  <!-- svelte-ignore a11y_autofocus —
       UI-SPEC §8.1 shared accessibility contract requires the primary CTA
       to receive autofocus on step entry. Wizard is a single-action surface
       so the usual competing-focus concern does not apply. -->
  <button
    type="button"
    class="cta"
    onclick={onContinue}
    disabled={status !== "found" || saving}
    autofocus
  >
    Continue
  </button>

  {#if status === "not-found"}
    <button type="button" class="ghost-link" onclick={openGuide}>
      Open Claude Code guide
    </button>
  {/if}
</section>

<style>
  .step2 {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-5);
    max-width: 560px;
    text-align: center;
  }
  .headline {
    font-family: var(--font-serif);
    font-size: var(--fs-display);
    font-weight: var(--fw-semibold);
    line-height: var(--lh-heading);
    color: var(--color-warm-dark);
    margin: 0;
  }
  .body {
    font-family: var(--font-serif);
    font-size: var(--fs-body);
    line-height: var(--lh-body);
    color: var(--color-warm-dark-soft);
    margin: 0;
  }
  .status-block {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    max-width: 480px;
    width: 100%;
    padding: var(--space-5);
    background: var(--color-cream-deep);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-lg);
    text-align: left;
    margin-top: var(--space-3);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-warm-dark-mute);
    flex-shrink: 0;
    transition: background var(--duration-base) var(--ease-out);
  }
  .dot[data-status="found"] {
    background: var(--color-success);
    /* Inline rgba ring derived from --color-success — tokens.css
       does not define a success-ring; same carve-out as 02-09-PLAN.md
       L1023 acceptance note. */
    box-shadow: 0 0 0 2px rgba(78, 163, 107, 0.18);
  }
  .dot[data-status="not-found"] {
    background: var(--color-error);
  }
  .status-text {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .status-main {
    font-family: var(--font-serif);
    font-size: var(--fs-body);
    color: var(--color-warm-dark);
  }
  .status-sub {
    font-family: var(--font-sans);
    font-size: var(--fs-meta);
    color: var(--color-warm-dark-mute);
  }
  .status-sub code {
    font-family: var(--font-mono);
    background: var(--color-cream);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }
  .cta {
    margin-top: var(--space-5);
    width: 200px;
    height: 44px;
    background: var(--color-orange);
    color: var(--color-cream);
    border: none;
    border-radius: var(--radius-md);
    font-family: var(--font-serif);
    font-size: var(--fs-body);
    cursor: pointer;
    transition:
      transform var(--duration-fast) var(--ease-out),
      box-shadow var(--duration-base) var(--ease-out);
  }
  .cta:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px var(--orange-ring);
  }
  .cta:active {
    transform: scale(0.96);
  }
  .cta:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .ghost-link {
    background: none;
    border: none;
    color: var(--color-warm-dark-soft);
    font-family: var(--font-serif);
    font-size: var(--fs-body);
    text-decoration: underline;
    cursor: pointer;
    padding: var(--space-1);
  }
  .ghost-link:hover {
    color: var(--color-warm-dark);
  }
</style>
