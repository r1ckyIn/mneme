// tests/splitter-restore.test.ts — REQ-1 "split positions restored within 1px"
// (SPEC L130) localStorage round-trip pin. Mounts Splitter.svelte with a seeded
// `mneme.layout.split` entry, lets onMount run, and reads the CSS grid template
// to assert the restored ratios match (within 1px on a 1280px viewport, which
// corresponds to a ratio tolerance of 1 / 1280 ≈ 0.00078).
//
// Why this file exists: Phase 1 iter-2 fixer narrative flagged that
// Splitter.onMount uses `clamp(value, RATIO_MIN, RATIO_MAX=0.50)` to restore,
// but the post-WR-05 `clampAndNormalize` (the drag-time path) admits left
// ratios up to `1 - 2*RATIO_MIN = 0.60`. Saved values in [0.50, 0.60] are
// silently clamped down on restore — violating SPEC REQ-1 acceptance:
// "Drag any column divider, Cmd+Q, relaunch → split positions restored
//  within 1 px (localStorage round-trip)".
//
// This test pins the contract that any value previously persistable by the
// drag path must round-trip through restore.

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mount, unmount } from "svelte";
import Splitter from "../src/lib/components/Splitter.svelte";

function clearBody(): void {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
}

function parseGridTemplate(tpl: string): { left: number; middle: number; right: number } {
  // Format: "{L*100}fr {HANDLE}px {M*100}fr {HANDLE}px {R*100}fr"
  const frTokens = tpl.split(/\s+/).filter((t) => t.endsWith("fr"));
  if (frTokens.length !== 3) {
    throw new Error(`expected 3 fr tokens, got ${frTokens.length}: ${tpl}`);
  }
  const nums = frTokens.map((t) => parseFloat(t.replace("fr", "")));
  return { left: nums[0] / 100, middle: nums[1] / 100, right: nums[2] / 100 };
}

async function mountAndRead(): Promise<{ left: number; middle: number; right: number }> {
  const target = document.body;
  const app = mount(Splitter as unknown as Parameters<typeof mount>[0], {
    target,
    props: {}
  });
  // Wait for onMount + reactive scheduling to flush.
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
  const grid = target.querySelector(".grid") as HTMLElement | null;
  if (!grid) {
    unmount(app as Parameters<typeof unmount>[0]);
    throw new Error("[test] .grid not found after mount");
  }
  const ratios = parseGridTemplate(grid.style.gridTemplateColumns);
  unmount(app as Parameters<typeof unmount>[0]);
  return ratios;
}

describe("Splitter onMount restore (REQ-1 SPEC L130)", () => {
  beforeEach(() => {
    localStorage.clear();
    clearBody();
  });

  afterEach(() => {
    localStorage.clear();
    clearBody();
  });

  it("restores default 30/40/30 when localStorage is empty", async () => {
    const ratios = await mountAndRead();
    // Default ratios from Splitter.svelte L45-46.
    expect(ratios.left).toBeCloseTo(0.30, 5);
    expect(ratios.middle).toBeCloseTo(0.40, 5);
    expect(ratios.right).toBeCloseTo(0.30, 5);
  });

  it("restores a valid saved layout exactly (30/40/30 round-trip)", async () => {
    localStorage.setItem(
      "mneme.layout.split",
      JSON.stringify({ leftRatio: 0.30, middleRatio: 0.40 })
    );
    const ratios = await mountAndRead();
    expect(ratios.left).toBeCloseTo(0.30, 5);
    expect(ratios.middle).toBeCloseTo(0.40, 5);
  });

  it("restores a saved layout near the lower floor (0.20/0.20/0.60)", async () => {
    localStorage.setItem(
      "mneme.layout.split",
      JSON.stringify({ leftRatio: 0.20, middleRatio: 0.20 })
    );
    const ratios = await mountAndRead();
    expect(ratios.left).toBeCloseTo(0.20, 5);
    expect(ratios.middle).toBeCloseTo(0.20, 5);
  });

  // WR-05-pin RESOLVED 2026-05-14 — the Splitter onMount restore arm now
  // routes through clampAndNormalize so DRAG and RESTORE paths share identical
  // bounds. Saved leftRatio in (0.50, 0.60] now restores faithfully within 1px
  // (was: silently clamped down to 0.50, up to 64px UX drift on 1280px
  // viewport). This test was previously a `it.fails` regression pin during the
  // 2026-05-14 validate-phase audit; flipped to an enforced pass once the
  // orchestrator fixed Splitter.svelte onMount per the recipe.
  it("restores a saved leftRatio=0.55 within 1px (post-fix; bounded by 1-2*RATIO_MIN=0.60)", async () => {
    localStorage.setItem(
      "mneme.layout.split",
      JSON.stringify({ leftRatio: 0.55, middleRatio: 0.20 })
    );
    const ratios = await mountAndRead();
    // Within 1px on a 1280px viewport.
    expect(Math.abs(ratios.left - 0.55)).toBeLessThan(1 / 1280);
    expect(Math.abs(ratios.middle - 0.20)).toBeLessThan(1 / 1280);
  });

  it("restores a saved middleRatio=0.45 within 1px (post-WR-05 drag can reach this; capped only by 1 - left - RATIO_MIN)", async () => {
    // With leftRatio = 0.30, middle's effective ceiling under clampAndNormalize
    // is min(RATIO_MAX, 1 - 0.30 - 0.20) = min(0.50, 0.50) = 0.50 — so 0.45 is
    // well within the persistable surface.
    localStorage.setItem(
      "mneme.layout.split",
      JSON.stringify({ leftRatio: 0.30, middleRatio: 0.45 })
    );
    const ratios = await mountAndRead();
    expect(Math.abs(ratios.left - 0.30)).toBeLessThan(1 / 1280);
    expect(Math.abs(ratios.middle - 0.45)).toBeLessThan(1 / 1280);
  });
});
