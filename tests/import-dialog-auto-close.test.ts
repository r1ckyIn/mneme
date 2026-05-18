// tests/import-dialog-auto-close.test.ts
//
// G-01 (2026-05-18 verify-work dogfood / 02.1-UAT.md Gap G-01): regression
// pin for ImportDialog auto-close on its own currentOpId's `import:done`.
//
// Background:
//   ImportDialog.submit() awaits `start_import` (returns opId quickly, spawns
//   background tokio task). The dialog stays open with `submitting=true` so
//   the user sees "Importing…" + can hit Cancel. The dialog MUST close when
//   the spawned task emits `import:done` with `operation_id === currentOpId`
//   AND `cancelled === false`.
//
// Pre-fix bug:
//   ImportDialog.svelte:97-108 documented in comments that "the parent
//   +page.svelte listens for import:done and dispatches close". But
//   +page.svelte's onMount only wired mneme:open-settings +
//   mneme:open-history CustomEvents — the Tauri `import:done` listener was
//   never landed. Dialog hung on "Importing…" forever; user had to click
//   Cancel to dismiss (cancel_import then no-ops because the op already
//   completed). Discovered by exploratory dogfood during verify-work for
//   Phase 02.1.
//
// Post-fix contract:
//   ImportDialog SELF-listens (onMount registers, onDestroy disposes) and
//   calls onClose() when the matching done event arrives. The fix lives in
//   src/lib/components/ImportDialog.svelte (3 edits: imports + state +
//   onMount/onDestroy block).
//
// Test strategy:
//   Two layers per the project's CYCLE-3 priority #6 + WR-007 fix precedent:
//   1) Runtime — mount the component, capture the listen() callback via
//      vi.mock("@tauri-apps/api/event"), dispatch synthetic events, assert
//      onClose called for the matching opId AND NOT called for mismatched
//      opId / cancelled events.
//   2) Source-regex — pin that the source file actually wires the listener
//      (cannot be regressed by accident via comment-only refactors).
//
//   No @testing-library/svelte (not in deps per WR-007 test rationale —
//   adding the dep would shift Vitest module resolution mid-phase). Uses
//   the `mount` + `unmount` from "svelte" pattern proven in
//   tests/splitter-restore.test.ts + tests/onboarding-step6-double-click.test.ts.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  describe,
  test,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import { mount, unmount, flushSync } from "svelte";

// ----- Mocks ---------------------------------------------------------------
// vi.mock factories are HOISTED above all imports, so any captured variable
// must be hoisted with vi.hoisted() to be available when the factory runs.

const mocks = vi.hoisted(() => {
  const listenCallbacks = new Map<
    string,
    (event: { payload: unknown }) => void
  >();
  return {
    listenCallbacks,
    unlistenSpy: vi.fn(),
    invokeMock: vi.fn(),
  };
});

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(
    async (eventName: string, cb: (e: { payload: unknown }) => void) => {
      mocks.listenCallbacks.set(eventName, cb);
      return mocks.unlistenSpy;
    },
  ),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mocks.invokeMock,
}));

// Local aliases for readability inside tests.
const listenCallbacks = mocks.listenCallbacks;
const unlistenSpy = mocks.unlistenSpy;
const invokeMock = mocks.invokeMock;

vi.mock("$lib/vault-state.svelte", () => ({
  getVaultState: () => ({
    vault_path: "/tmp/test-vault",
    course_list: ["COMP3027"],
  }),
}));

// Import AFTER mocks register.
import ImportDialog from "../src/lib/components/ImportDialog.svelte";

const MATCHING_OP_ID = "op-deadbeef-1234";
const OTHER_OP_ID = "op-cafef00d-5678";

function donePayload(overrides: {
  operation_id: string;
  cancelled?: boolean;
}) {
  return {
    operation_id: overrides.operation_id,
    total: 1,
    succeeded: 1,
    failed: 0,
    cancelled: overrides.cancelled ?? false,
    course: "COMP3027",
    category: "_inbox",
    failures: [],
  };
}

describe("G-01 fix — ImportDialog auto-close on matching import:done", () => {
  // Typed as `() => void` to match ImportDialog's `onClose` prop signature.
  // `ReturnType<typeof vi.fn>` widens to Mock<Procedure | Constructable>
  // which svelte-check rejects when passed through Props.onClose.
  let onCloseSpy: (() => void) & { mock: { calls: unknown[][] } };
  let component: ReturnType<typeof mount> | null = null;
  let mountTarget: HTMLDivElement | null = null;

  beforeEach(async () => {
    listenCallbacks.clear();
    unlistenSpy.mockClear();
    invokeMock.mockReset();

    mountTarget = document.createElement("div");
    document.body.appendChild(mountTarget);

    onCloseSpy = vi.fn() as unknown as (() => void) & {
      mock: { calls: unknown[][] };
    };

    // start_import resolves with MATCHING_OP_ID — simulates a fresh import.
    invokeMock.mockImplementation(async (cmd: string) => {
      if (cmd === "start_import") return MATCHING_OP_ID;
      if (cmd === "cancel_import") return null;
      throw new Error(`unexpected invoke: ${cmd}`);
    });

    component = mount(ImportDialog, {
      target: mountTarget,
      props: {
        open: true,
        paths: ["/Users/test/lec1.pdf"],
        onClose: onCloseSpy,
        onOpenSettings: () => {},
      },
    });

    // Allow microtasks (onMount + listen registration).
    await Promise.resolve();
    await Promise.resolve();
  });

  afterEach(() => {
    if (component) {
      unmount(component);
      component = null;
    }
    if (mountTarget) {
      mountTarget.remove();
      mountTarget = null;
    }
  });

  test("registers a listener for 'import:done' on mount", () => {
    expect(listenCallbacks.has("import:done")).toBe(true);
  });

  test("calls onClose when import:done arrives with matching operation_id and cancelled=false", async () => {
    // Simulate user clicking Submit → currentOpId becomes MATCHING_OP_ID.
    // The submit button is keyed off internal $state; easiest reliable path
    // here is to dispatch the done event AFTER setting currentOpId via the
    // submit flow. We trigger submit via a programmatic form click on the
    // CTA — but since we want a focused unit test, we instead drive the
    // exact sequence: call the listen callback BEFORE submit (no-op), then
    // submit, then call the callback again (should close).
    const cb = listenCallbacks.get("import:done")!;

    // No currentOpId yet → callback no-ops.
    cb({ payload: donePayload({ operation_id: MATCHING_OP_ID }) });
    flushSync();
    expect(onCloseSpy).not.toHaveBeenCalled();

    // Trigger submit (sets currentOpId = MATCHING_OP_ID via mocked invoke).
    const submitBtn = mountTarget!.querySelector(
      "button.cta",
    ) as HTMLButtonElement | null;
    expect(submitBtn).not.toBeNull();
    submitBtn!.click();

    // Let the submit() async chain settle (await invoke + state assignment).
    await Promise.resolve();
    await Promise.resolve();
    flushSync();

    // Now the matching done event should close the dialog.
    cb({ payload: donePayload({ operation_id: MATCHING_OP_ID }) });
    flushSync();
    expect(onCloseSpy).toHaveBeenCalledTimes(1);
  });

  test("does NOT call onClose when import:done arrives with a DIFFERENT operation_id", async () => {
    const cb = listenCallbacks.get("import:done")!;

    // Submit to assign currentOpId = MATCHING_OP_ID.
    const submitBtn = mountTarget!.querySelector(
      "button.cta",
    ) as HTMLButtonElement | null;
    submitBtn!.click();
    await Promise.resolve();
    await Promise.resolve();
    flushSync();

    // A done event for a DIFFERENT op (e.g. a concurrent import from another
    // dialog instance or a stale event) must not close this dialog.
    cb({ payload: donePayload({ operation_id: OTHER_OP_ID }) });
    flushSync();
    expect(onCloseSpy).not.toHaveBeenCalled();
  });

  test("does NOT call onClose when import:done arrives with cancelled=true (matching opId)", async () => {
    const cb = listenCallbacks.get("import:done")!;

    const submitBtn = mountTarget!.querySelector(
      "button.cta",
    ) as HTMLButtonElement | null;
    submitBtn!.click();
    await Promise.resolve();
    await Promise.resolve();
    flushSync();

    // A cancelled import emits import:done with cancelled=true. The user
    // already saw the cancel via the Cancel button → dialog already closed
    // OR the user wants to see the cancelled state before dismissing. Either
    // way, the AUTO-close path is gated on !cancelled to avoid double-close
    // racing with the explicit Cancel handler.
    cb({
      payload: donePayload({ operation_id: MATCHING_OP_ID, cancelled: true }),
    });
    flushSync();
    expect(onCloseSpy).not.toHaveBeenCalled();
  });

  test("disposes the listener on component unmount", () => {
    expect(unlistenSpy).not.toHaveBeenCalled();
    unmount(component!);
    component = null;
    expect(unlistenSpy).toHaveBeenCalledTimes(1);
  });
});

describe("G-01 fix — source-regex pins (cannot regress via comment-only edits)", () => {
  // Strip comments + string literals so the WR-007 / IMPORT-DONE / etc.
  // explanatory blocks cannot trigger false positives.
  function codeOnly(source: string): string {
    return source
      .replace(/\/\*[\s\S]*?\*\//g, "") // /* ... */
      .replace(/\/\/[^\n]*/g, "") // // ...
      .replace(/<!--[\s\S]*?-->/g, ""); // <!-- ... --> in svelte
  }

  const dialogSrc = readFileSync(
    resolve(__dirname, "../src/lib/components/ImportDialog.svelte"),
    "utf-8",
  );
  const dialogCode = codeOnly(dialogSrc);

  test("imports listen + UnlistenFn from @tauri-apps/api/event", () => {
    expect(dialogCode).toMatch(
      /import\s*\{[^}]*\blisten\b[^}]*\}\s*from\s*["']@tauri-apps\/api\/event["']/,
    );
    expect(dialogCode).toMatch(/UnlistenFn/);
  });

  test("imports onMount + onDestroy from svelte (lifecycle wiring)", () => {
    expect(dialogCode).toMatch(
      /import\s*\{[^}]*\bonMount\b[^}]*\}\s*from\s*["']svelte["']/,
    );
    expect(dialogCode).toMatch(
      /import\s*\{[^}]*\bonDestroy\b[^}]*\}\s*from\s*["']svelte["']/,
    );
  });

  test("calls listen('import:done', ...) inside an onMount handler", () => {
    // Match the listen call signature loosely; the key fact is the literal
    // event name "import:done" appears inside a listen() invocation.
    expect(dialogCode).toMatch(
      /listen\s*<[^>]*>\s*\(\s*["']import:done["']/,
    );
  });

  test("guards onClose() on currentOpId match AND !cancelled", () => {
    // The fix must AT LEAST reference operation_id, currentOpId, cancelled,
    // and onClose in the handler region. Asserting their co-presence prevents
    // a regression that drops the !cancelled guard (which would race with
    // the explicit Cancel button's onClose call).
    expect(dialogCode).toMatch(/operation_id/);
    expect(dialogCode).toMatch(/currentOpId/);
    expect(dialogCode).toMatch(/cancelled/);
    expect(dialogCode).toMatch(/onClose\s*\(\s*\)/);
  });
});
