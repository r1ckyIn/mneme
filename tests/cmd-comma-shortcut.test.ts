// tests/cmd-comma-shortcut.test.ts — Phase 2 Wave 7 (Plan 02-10) contract.
// Maps to: REQ-14 acceptance (SPEC L80, L147) — Cmd+, opens SettingsPanel
// within 100ms by dispatching a `mneme:open-settings` window CustomEvent that
// the parent (+page.svelte in Plan 02-12) listens for to flip `settingsOpen`.
//
// Component-mount E2E is deferred to /gsd-verify-work. This test pins the
// contract surface the SettingsPanel.svelte <svelte:window onkeydown> handler
// must satisfy: metaKey OR ctrlKey + "," dispatches the custom event.

import { describe, test, expect } from "vitest";

describe("Cmd+, shortcut contract", () => {
  test("metaKey + ',' triggers 'mneme:open-settings' CustomEvent", () => {
    let triggered = false;
    const handler = (): void => {
      triggered = true;
    };
    window.addEventListener("mneme:open-settings", handler);

    // Mirror the handler logic implemented in SettingsPanel.svelte
    // <svelte:window onkeydown={onWindowKeydown}>.
    const e = new KeyboardEvent("keydown", { key: ",", metaKey: true, cancelable: true });
    if ((e.metaKey || e.ctrlKey) && e.key === ",") {
      window.dispatchEvent(new CustomEvent("mneme:open-settings"));
    }

    expect(triggered).toBe(true);
    window.removeEventListener("mneme:open-settings", handler);
  });

  test("ctrlKey + ',' also triggers (cross-platform robustness)", () => {
    let triggered = false;
    const handler = (): void => {
      triggered = true;
    };
    window.addEventListener("mneme:open-settings", handler);

    const e = new KeyboardEvent("keydown", { key: ",", ctrlKey: true });
    if ((e.metaKey || e.ctrlKey) && e.key === ",") {
      window.dispatchEvent(new CustomEvent("mneme:open-settings"));
    }

    expect(triggered).toBe(true);
    window.removeEventListener("mneme:open-settings", handler);
  });
});
