<!--
  UsageMeter.svelte — Round 5 A-09 (replaces deleted cost meter per A-04).
  Plan 01-09 polish: tokens swapped to Mneme.html-native (mono 11px,
  --color-warm-dark-mute palette) per L876-902. Visual:

    Ctx 9.1% [bar] · Total · 18.2k · Session · 1h 24m

  Reads dispatchState.totalInputTokens (accumulated by stream-dispatch
  on each `result` event) + sessionStartedAt injected by ChatPanel.

  CSS class `.cost` retained for visual continuity with prototype. The
  semantic shift from "$-cost" to "ctx + session" is unchanged from prior
  amendments; A-04 explicitly removed the daily-usage write file path.

  `.cost.warning` red triggers at ctx ≥ 90% (was: $-cap exceeded).
-->
<script lang="ts">
  import type { DispatchState } from "$lib/stream-dispatch";

  interface Props {
    dispatchState: DispatchState;
    sessionStartedAt: Date | null;
  }
  let { dispatchState, sessionStartedAt }: Props = $props();

  // Default 1_000_000 to match A-13 Opus 4.7 1M pill. Phase 2 (REQ-14)
  // lets the user override per model selection.
  const MODEL_CTX_WINDOW = 1_000_000;

  let ctxPct = $derived(
    Math.min(100, (dispatchState.totalInputTokens / MODEL_CTX_WINDOW) * 100)
  );

  function fmtTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
    return `${n}`;
  }

  let sessionDuration = $state("0m");

  $effect(() => {
    if (!sessionStartedAt) return;
    const start = sessionStartedAt;
    const tick = () => {
      const ms = Date.now() - start.getTime();
      const totalMin = Math.floor(ms / 60_000);
      const hours = Math.floor(totalMin / 60);
      const mins = totalMin % 60;
      sessionDuration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };
    tick();
    const handle = setInterval(tick, 30_000);
    return () => clearInterval(handle);
  });
</script>

<div class="cost" class:warning={ctxPct >= 90}>
  <span>Ctx</span>
  <span class="leaf">{ctxPct.toFixed(1)}%</span>
  <span class="bar" aria-hidden="true" style:--cost-pct="{ctxPct}%"><span></span></span>
  <span class="right">
    <span>Total · {fmtTokens(dispatchState.totalInputTokens)}</span>
    <span style:opacity="0.4">·</span>
    <span>Session · {sessionDuration}</span>
  </span>
</div>

<style>
  /* SSOT: Mneme.html L876-902. */
  .cost {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-warm-dark-mute);
    padding: 4px 2px 8px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  .cost .leaf { color: var(--color-warm-dark); }
  .cost .bar {
    flex: 1 1 auto;
    height: 2px;
    background: rgba(20, 20, 19, 0.06);
    border-radius: 999px;
    overflow: hidden;
    max-width: 140px;
  }
  .cost .bar > span {
    display: block;
    height: 100%;
    width: var(--cost-pct, 4%);
    background: var(--color-orange);
    border-radius: 999px;
    transition:
      width var(--duration-slow) var(--ease-out),
      background var(--duration-slow) var(--ease-out);
  }
  .cost.warning              { color: var(--color-error); }
  .cost.warning .bar > span  { background: var(--color-error); }
  .cost .right {
    margin-left: auto;
    display: flex;
    gap: 6px;
    align-items: center;
  }
</style>
