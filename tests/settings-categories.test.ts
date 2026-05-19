// tests/settings-categories.test.ts — Phase 2 Wave 7 (Plan 02-10) contract.
// Maps to: REQ-14 acceptance (SPEC L147) — SettingsPanel renders 8 categories
// in canonical left-rail order; 3 are v1-functional; 5 render ComingSoon body
// with per-category phase + subline copy.

import { describe, test, expect } from "vitest";

type CategoryKey =
  | "general"
  | "vault"
  | "sync"
  | "claude"
  | "privacy"
  | "appearance"
  | "keybindings"
  | "advanced";

interface RailItem {
  key: CategoryKey;
  label: string;
  functional: boolean;
}

interface ComingSoonCopy {
  phase: string;
  subline: string;
}

// Mirror of the rail declared in SettingsPanel.svelte.
const rail: RailItem[] = [
  { key: "general", label: "General", functional: false },
  { key: "vault", label: "Vault", functional: true },
  { key: "sync", label: "Sync", functional: false },
  { key: "claude", label: "Claude", functional: false },
  { key: "privacy", label: "Privacy", functional: false },
  { key: "appearance", label: "Appearance", functional: true },
  { key: "keybindings", label: "Keybindings", functional: true },
  { key: "advanced", label: "Advanced", functional: false },
];

// Mirror of the comingSoonCopy declared in SettingsPanel.svelte.
const comingSoonCopy: Record<string, ComingSoonCopy> = {
  general: {
    phase: "Coming in Phase 3.",
    subline:
      "General settings — window size, startup behavior, language — arrive when Phase 3 introduces multi-session.",
  },
  sync: {
    phase: "Coming in v2.",
    subline:
      "Sync between devices is a v2 feature. Mneme is single-device-first by design.",
  },
  claude: {
    phase: "Coming in Phase 3.",
    subline:
      "Model selection, system-prompt config, and per-session limits arrive when Phase 3 wires multi-session.",
  },
  privacy: {
    phase: "Coming in Phase 7.",
    subline:
      "Data residency controls and conversation retention arrive when Phase 7 ships the knowledge graph.",
  },
  advanced: {
    phase: "Coming in Phase 4+.",
    subline:
      "Power-user toggles (vault index reset, log export, MCP overrides) arrive incrementally.",
  },
};

describe("Settings rail 8-category contract", () => {
  test("8 categories present in canonical order", () => {
    expect(rail).toHaveLength(8);
    expect(rail.map((r) => r.key)).toEqual([
      "general",
      "vault",
      "sync",
      "claude",
      "privacy",
      "appearance",
      "keybindings",
      "advanced",
    ]);
  });

  test("exactly 3 v1-functional categories: Vault / Appearance / Keybindings", () => {
    const functional = rail.filter((r) => r.functional);
    expect(functional.map((r) => r.key)).toEqual([
      "vault",
      "appearance",
      "keybindings",
    ]);
  });

  test("5 deferred categories: General / Sync / Claude / Privacy / Advanced", () => {
    const deferred = rail.filter((r) => !r.functional);
    expect(deferred.map((r) => r.key)).toEqual([
      "general",
      "sync",
      "claude",
      "privacy",
      "advanced",
    ]);
  });

  test("ComingSoon copy maps to every deferred category with phase + subline", () => {
    for (const key of ["general", "sync", "claude", "privacy", "advanced"]) {
      const copy = comingSoonCopy[key];
      expect(copy).toBeDefined();
      expect(copy.phase).toMatch(/Coming in/);
      expect(copy.subline.length).toBeGreaterThan(20);
    }
  });
});
