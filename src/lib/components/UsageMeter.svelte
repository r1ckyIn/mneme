<!--
  UsageMeter.svelte — Round 5 A-09 (replaces deleted cost meter per A-04).

  Reads state.totalInputTokens (accumulated by stream-dispatch dispatchEvent
  on each `result` event) and a session-start Date injected by ChatPanel.
  Renders three pieces of info:
    1. Ctx N.N% — current ctx utilization vs MODEL_CTX_WINDOW (default 1M for
       Opus 4.7 1M per A-13).
    2. Horizontal progress bar — width tracks Ctx %; turns red at >= 90%.
    3. Total · Nk + Session · Hh Mm — cumulative tokens + rolling timer.

  CSS class `.cost` retained for visual continuity with prototype (Mneme.html
  L876-902); semantic meaning shifted from "$-cost" to "ctx + session"
  per A-09 + A-04. `.cost.warning` red triggers at ctx >= 90% (was: $-cap
  exceeded).

  Cycle-1 LOW carry-forward (REVIEWS.md): "Total" semantics clarified —
  the rendered label uses `Total · {tokens}` with the explicit qualifier
  (not bare "Total"), matching Mneme.html L1399-1402 prototype framing
  ("cumulative tokens this session, NOT a budget cap"). The `.cost.warning`
  threshold key is ctx % vs MODEL_CTX_WINDOW (Used/Total framing) so the
  meter is unambiguous: Ctx % is the budget-pressure signal; Total is the
  cumulative volume signal.
-->
<script lang="ts">
  import type { DispatchState } from "$lib/stream-dispatch";

  interface Props {
    dispatchState: DispatchState;
    sessionStartedAt: Date | null;
  }
  // Note: prop is named `dispatchState` (not `state`) to avoid the Svelte 5
  // auto-store-subscribe collision that svelte-check flags when a prop named
  // `state` coexists with the `$state` rune in the same module.
  let { dispatchState, sessionStartedAt }: Props = $props();

  // model_context_window — default 1_000_000 to match A-13 Opus 4.7 1M pill.
  // Phase 2 (REQ-14 settings) lets the user override per model selection.
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

  // Update timer every 30s — keep DOM mutation cheap. $effect re-runs when
  // sessionStartedAt becomes non-null on the first prompt.
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
    <span class="sep">·</span>
    <span>Session · {sessionDuration}</span>
  </span>
</div>

<style>
  .cost {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--ink-mute);
    padding: 4px 2px 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .cost .leaf { color: var(--ink-soft); }
  .cost .bar {
    flex: 1 1 auto;
    height: 2px;
    background: rgba(20, 20, 19, 0.06);
    border-radius: var(--r-pill);
    overflow: hidden;
    max-width: 140px;
  }
  .cost .bar > span {
    display: block;
    height: 100%;
    width: var(--cost-pct, 4%);
    background: var(--orange);
    border-radius: var(--r-pill);
    transition: width var(--d-slow) var(--ease), background var(--d-slow) var(--ease);
  }
  .cost.warning              { color: var(--error); }
  .cost.warning .bar > span  { background: var(--error); }
  .cost .right { margin-left: auto; display: flex; gap: 6px; align-items: center; }
  .cost .sep { opacity: 0.4; }
</style>
