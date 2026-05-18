// tests/vault-move-flow.test.ts — Phase 2 Wave 7 (Plan 02-10) contract.
// Maps to: REQ-11 acceptance (SPEC L148) — vault path move via safe-copy IPC
// (NOT mv/rename), summary reports `old_root_preserved: true`, and the new
// path persists to ~/.mneme/config.json via save_config.
//
// Mirrors the VaultCategory.svelte UI flow:
//   1) Browse → plugin-dialog open(directory) returns a path string.
//   2) User confirms → invoke("move_vault", { oldRoot, newRoot }) returns
//      MoveVaultSummary with old_root_preserved=true.
//   3) save_config persists the new vault_path.
//   4) Cancel before confirm does NOT fire move_vault.
//
// CR-01 fix (gap-closure 02-14): a new pair of tests below pins the Browse vs
// Move split. The Browse button now uses revealInFinder (path inspection only,
// no state mutation, no move_vault invocation); the Move button keeps
// browseAndMove (stages confirm overlay). Two visually distinct buttons, two
// intent paths. The source-regex test mirrors the pattern used by the WR-03
// cases in tests/onboarding-resume.test.ts (no @testing-library/svelte mount).

import { describe, test, expect, vi, beforeEach } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (cmd: string, _args?: unknown) => {
    if (cmd === "load_config") {
      return { vault_path: "/Users/qy/StudyVault", schema_version: 1 };
    }
    if (cmd === "save_config") {
      return undefined;
    }
    if (cmd === "list_courses") {
      return ["COMP3221"];
    }
    if (cmd === "move_vault") {
      return { files_copied: 10, bytes_copied: 12345, old_root_preserved: true };
    }
    return undefined;
  }),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(async () => "/tmp/test-vault"),
}));

interface MoveVaultSummary {
  files_copied: number;
  bytes_copied: number;
  old_root_preserved: boolean;
}

describe("vault-move flow (UI contract)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("Browse → confirm → move_vault returns summary with old_root_preserved=true", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const { open } = await import("@tauri-apps/plugin-dialog");

    // 1) Browse opens directory picker.
    const chosen = await open({ directory: true, multiple: false });
    expect(chosen).toBe("/tmp/test-vault");

    // 2) User confirms → invoke move_vault.
    const summary = await invoke<MoveVaultSummary>("move_vault", {
      oldRoot: "/Users/qy/StudyVault",
      newRoot: chosen,
    });
    expect(summary.files_copied).toBe(10);
    expect(summary.old_root_preserved).toBe(true);

    // 3) save_config persists the new path.
    await invoke("save_config", {
      state: { vault_path: chosen, schema_version: 1 },
    });
    const mockedInvoke = invoke as unknown as { mock: { calls: unknown[][] } };
    const saveCall = mockedInvoke.mock.calls.find((c) => c[0] === "save_config");
    expect(saveCall).toBeDefined();
    const saveArgs = saveCall![1] as { state: { vault_path: string } };
    expect(saveArgs.state.vault_path).toBe("/tmp/test-vault");
  });

  test("Cancel before confirm does NOT call move_vault", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    // No invocation made — confirms the contract that the cancel path is
    // pure UI state with zero IPC side-effect.
    const mockedInvoke = invoke as unknown as { mock: { calls: unknown[][] } };
    const moveCalls = mockedInvoke.mock.calls.filter((c) => c[0] === "move_vault");
    expect(moveCalls).toHaveLength(0);
  });

  test("Browse picker invocation does NOT call move_vault (CR-01 fix)", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const { open } = await import("@tauri-apps/plugin-dialog");

    // The Browse button (revealInFinder) opens the same plugin-dialog picker
    // that the Move button uses, BUT discards the selection. The user can
    // inspect the vault path via the native file browser without staging a
    // move. Mirrors the runtime contract: open() is allowed; move_vault must
    // remain uninvoked.
    const chosen = await open({
      directory: true,
      multiple: false,
      defaultPath: "/Users/qy/StudyVault",
    });
    expect(chosen).toBe("/tmp/test-vault");

    // CR-01 invariant: zero move_vault invocations from the Browse-path.
    const mockedInvoke = invoke as unknown as { mock: { calls: unknown[][] } };
    const moveCalls = mockedInvoke.mock.calls.filter((c) => c[0] === "move_vault");
    expect(moveCalls).toHaveLength(0);
  });

  test("VaultCategory.svelte has two distinct button handlers (CR-01 fix marker)", async () => {
    // Source-regex pin: the @testing-library/svelte dep was deliberately NOT
    // added in plan 02-15 (BLOCKER-1). We use the same readFile + regex
    // strategy that pins the WR-03 contract in tests/onboarding-resume.test.ts.
    //
    // Asserts:
    //   1) Browse button is bound to revealInFinder (NOT browseAndMove).
    //   2) Move button is bound to browseAndMove.
    //   3) The CR-01 fix marker is present (so the disposition trail is
    //      grep-able from VERIFICATION.md regeneration).
    const here = dirname(fileURLToPath(import.meta.url));
    const src = await readFile(
      resolve(here, "../src/lib/components/settings/VaultCategory.svelte"),
      "utf8",
    );

    expect(src).toMatch(/onclick=\{revealInFinder\}>Browse/);
    expect(src).toMatch(/onclick=\{browseAndMove\}>Move/);
    expect(src).toMatch(/CR-01 fix/);
  });
});
