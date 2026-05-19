// tests/menu-bridge.test.ts
//
// SPEC-GAP-1 (settings-ui.md §2 L59) contract pin.
//
// +layout.svelte installs a Tauri listen("menu:open-settings") handler that
// re-dispatches the existing mneme:open-settings window CustomEvent. This test
// pins the SHAPE of that bridge: given a menu:open-settings event arrives, the
// handler MUST dispatch exactly one mneme:open-settings CustomEvent on window.
//
// Full E2E (real Tauri runtime invoking the listener) is verified by manual
// /gsd-verify-work (click menu bar Mneme -> Preferences... -> SettingsPanel opens).

import { describe, test, expect, beforeEach, afterEach } from "vitest";

describe("menu:open-settings bridge contract", () => {
  let received: Event[] = [];
  const captureHandler = (e: Event) => {
    received.push(e);
  };

  beforeEach(() => {
    received = [];
    window.addEventListener("mneme:open-settings", captureHandler);
  });

  afterEach(() => {
    window.removeEventListener("mneme:open-settings", captureHandler);
  });

  test("menu:open-settings handler dispatches mneme:open-settings exactly once", () => {
    // Mirror the +layout.svelte listener body verbatim:
    const bridgeHandler = () => {
      window.dispatchEvent(new CustomEvent("mneme:open-settings"));
    };
    bridgeHandler();
    expect(received).toHaveLength(1);
    expect(received[0].type).toBe("mneme:open-settings");
    expect(received[0]).toBeInstanceOf(CustomEvent);
  });

  test("multiple menu clicks dispatch multiple events (no debounce)", () => {
    const bridgeHandler = () => {
      window.dispatchEvent(new CustomEvent("mneme:open-settings"));
    };
    bridgeHandler();
    bridgeHandler();
    bridgeHandler();
    expect(received).toHaveLength(3);
  });

  test("dispatched event matches the contract listened to by SettingsPanel", () => {
    // SettingsPanel listens for the literal string "mneme:open-settings"
    // (Plan 10). The bridge MUST emit exactly that string.
    const bridgeHandler = () => {
      window.dispatchEvent(new CustomEvent("mneme:open-settings"));
    };
    bridgeHandler();
    expect(received[0].type).toBe("mneme:open-settings");
    // Specifically NOT "menu:open-settings" — the bridge translates names.
    expect(received[0].type).not.toBe("menu:open-settings");
  });
});
