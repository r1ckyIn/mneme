import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  // We want comparison at the same viewport that the actual app would run at.
  // The prototype's outer .stage wraps the window with 24px padding; the inner
  // window is 1280x860 (Tauri initial). To compare apples-to-apples, screenshot
  // the inner .window element specifically for the prototype baseline.
  const context = await browser.newContext({
    viewport: { width: 1340, height: 920 },   // bigger so the window fits inside .stage
    deviceScaleFactor: 1,
    bypassCSP: true,
  });
  const page = await context.newPage();
  page.on('pageerror', err => console.log('[PAGE ERROR]', err.message));

  // === Implementation (live dev server) ===
  console.log("Loading localhost:5173...");
  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 20000 });
  } catch (e) {
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  }
  await page.waitForTimeout(3500);
  // Re-resize to 1280x860 for the actual screenshot (Tauri initial size)
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.waitForTimeout(500);

  const titleEl = await page.locator('.titlebar-meta').count();
  const dragHandles = await page.locator('.drag-handle').count();
  const fileArea = await page.locator('.file-area').count();
  const grid = await page.locator('.grid').count();
  const middleStack = await page.locator('.middle-stack').count();
  const bottomRow = await page.locator('.bottom-row').count();
  const settings = await page.locator('button[aria-label="Settings"]').count();
  console.log("counts:", { titleEl, dragHandles, fileArea, grid, middleStack, bottomRow, settings });

  await page.screenshot({
    path: '.planning/phases/01-tauri-shell-foundation-subprocess-hardening/design/screenshots/01-05-implementation.png',
    fullPage: false,
  });
  console.log("Implementation screenshot saved (1280x860 viewport)");

  // === Prototype baseline — screenshot the inner .window element only ===
  await page.setViewportSize({ width: 1340, height: 920 });
  const protoPath = `file://${process.cwd()}/.planning/handoff/2026-05-09-mneme-prototype/mneme/project/Mneme.html`;
  console.log("Loading prototype:", protoPath);
  await page.goto(protoPath, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2500);

  // Use locator screenshot to capture .window only, not the .stage wrapper
  const windowEl = await page.locator('.window').first();
  const exists = await windowEl.count();
  console.log("prototype .window count:", exists);
  if (exists > 0) {
    await windowEl.screenshot({
      path: '.planning/phases/01-tauri-shell-foundation-subprocess-hardening/design/screenshots/prototype-baseline.png',
    });
    console.log("Prototype .window-only screenshot saved (1280x860 box)");
  } else {
    // Fallback to full-page if .window not found
    await page.screenshot({
      path: '.planning/phases/01-tauri-shell-foundation-subprocess-hardening/design/screenshots/prototype-baseline.png',
      fullPage: false,
    });
  }

  await browser.close();
})().catch(err => {
  console.error("ERROR:", err);
  process.exit(1);
});
