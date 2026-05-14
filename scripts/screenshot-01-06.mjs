#!/usr/bin/env node
// Playwright screenshot harness for plan 01-06 visual verification.
// Captures prototype + dev impl at 1280x860 (Tauri initial window size per D-05).

import { chromium } from "playwright";
import { resolve } from "node:path";

const SCREENSHOT_DIR = resolve(
  "/Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.claude/worktrees/agent-aeff29bb776aaf470/.planning/phases/01-tauri-shell-foundation-subprocess-hardening/design/screenshots"
);

const PROTOTYPE_PATH =
  "file:///Users/qinyuan/claude/r1ckyIn_GitHub/mneme/.claude/worktrees/agent-aeff29bb776aaf470/.planning/handoff/2026-05-09-mneme-prototype/mneme/project/Mneme.html";
const DEV_URL = "http://localhost:5173/";
const PREVIEW_URL = "http://localhost:4173/";

async function main() {
  const browser = await chromium.launch({ headless: true });
  // bypassCSP needed for SvelteKit dev's inline bootstrap script under script-src 'self'.
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 860 },
    bypassCSP: true,
  });
  const page = await ctx.newPage();

  // Echo console messages (helps catch Tauri-related runtime errors)
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      console.log(`[browser:${msg.type()}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    console.log(`[browser:pageerror] ${err.message}`);
  });

  // 1) Prototype baseline. The prototype HTML wraps the desktop chrome in a
  // .window element with a fixed pixel-precise width. Locate it and clip to
  // it so we can compare apples-to-apples with the implementation viewport.
  console.log("Capturing prototype...");
  await page.goto(PROTOTYPE_PATH, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const proto = page.locator(".window").first();
  if (await proto.count()) {
    await proto.screenshot({ path: `${SCREENSHOT_DIR}/prototype-chatpanel.png` });
  } else {
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/prototype-chatpanel.png`,
      fullPage: false,
    });
  }

  // 2) Implementation (try preview first; fall back to dev)
  let implUrl = PREVIEW_URL;
  try {
    const r = await page.goto(PREVIEW_URL, { waitUntil: "networkidle", timeout: 5000 });
    if (!r || !r.ok()) throw new Error("preview not ok");
  } catch {
    console.log("Preview unreachable; trying dev URL...");
    implUrl = DEV_URL;
    await page.goto(DEV_URL, { waitUntil: "networkidle", timeout: 10000 });
  }

  // Wait for hydration to populate the DOM
  await page.waitForTimeout(2500);

  // Diagnostic: count rendered elements
  const counts = await page.evaluate(() => ({
    titlebarMeta: document.querySelectorAll(".titlebar-meta").length,
    splitter: document.querySelectorAll(".splitter, .grid, .middle-stack").length,
    chatPanel: document.querySelectorAll(".chat-panel").length,
    composer: document.querySelectorAll(".composer").length,
    inputFoot: document.querySelectorAll(".input-foot").length,
    sendBtn: document.querySelectorAll(".send-btn").length,
    cost: document.querySelectorAll(".cost").length,
    fileArea: document.querySelectorAll(".file-area").length,
    dragHandle: document.querySelectorAll(".drag-handle").length,
    bodyChildrenCount: document.body.children.length,
  }));
  console.log("[diag]", JSON.stringify(counts));

  await page.screenshot({
    path: `${SCREENSHOT_DIR}/01-06-implementation.png`,
    fullPage: false,
  });

  // 3) Bonus: populated-state capture. We inject text directly into the
  // textarea + click vault-context to flip the state on, demonstrating the
  // interactive surface is wired even without Tauri IPC. This catches CSS
  // regressions in the .focus-within / .vault-ctx.active states.
  await page.fill(".chat-panel textarea", "What's dynamic programming?");
  await page.click(".chat-panel .vault-ctx");
  await page.waitForTimeout(400);
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/01-06-implementation-populated.png`,
    fullPage: false,
  });

  console.log("Captured impl from", implUrl);

  await ctx.close();
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
