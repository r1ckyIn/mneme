// tests/onboarding-step6-double-click.test.ts
//
// WR-001 + WR-005 (Phase 02.1 02.1-REVIEW.md): regression pins for
// Step6DemoImport.svelte.
//
// WR-001 — Browse double-click guard.
//   The component now declares `let importing = $state(false)` and the
//   `browseFile()` handler short-circuits when `importing || saving`. A user
//   double-clicking the dropzone before the OS file picker visually opens
//   must trigger AT MOST one `open()` dialog AND AT MOST one
//   `invoke("start_import", ...)` IPC per round-trip. See
//   `src/lib/components/onboarding/Step6DemoImport.svelte` lines 39-83.
//
// WR-005 — Multi-file count surface.
//   When the user picks multiple files (picker is `multiple: true`), the
//   success line renders the count, not just the first basename. Previously
//   the variable was bound to `paths[0]` so a 5-file pick rendered
//   "Imported: lec1.pdf" — making users think 4/5 PDFs were lost. The fix
//   formats `${paths.length} files (${firstBasename}, …)` so the surface
//   makes the count load-bearing.
//
// Test strategy:
//   The project intentionally has NO `@testing-library/svelte` dep (CYCLE-3
//   priority #6 in `tests/onboarding-resume.test.ts` documents the rationale —
//   adding the dep would have changed Vitest module resolution mid-phase).
//   We use the same `mount` + `unmount` from "svelte" pattern proven in
//   `tests/splitter-restore.test.ts` to drive the actual component.
//
//   The `@tauri-apps/api/core` `invoke` and `@tauri-apps/plugin-dialog`
//   `open` mocks let us:
//     1) make the picker await deterministically so the second click happens
//        WHILE the first is in-flight (the exact race WR-001 guards against);
//     2) count `start_import` invocations to assert the guard fired;
//     3) inspect the rendered `Imported: <text>` to assert the WR-005 multi-
//        file surface.

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, unmount } from "svelte";

import Step6DemoImport from "../src/lib/components/onboarding/Step6DemoImport.svelte";

// ---------------------------------------------------------------------------
// Mocks
//
// We re-`vi.mock` per top-level describe so the mock implementations can be
// swapped between deterministic-deferral (WR-001) and immediate-resolve
// (WR-005). Vitest hoists vi.mock to the top of the file, so the per-test
// implementation lives in `vi.mocked(...).mockImplementation(...)`.
// ---------------------------------------------------------------------------

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async () => undefined),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(async () => null),
}));

function clearBody(): void {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
}

// Component spec for `mount` — Svelte 5's `mount` types are deliberately
// opaque; the project's existing splitter-restore test uses the same
// `as unknown as Parameters<typeof mount>[0]` shape, so we mirror it.
type MountedApp = ReturnType<typeof mount>;

function mountStep6(props: { vaultRoot: string; saving?: boolean }): {
  app: MountedApp;
  button: HTMLButtonElement;
} {
  const target = document.body;
  const app = mount(Step6DemoImport as unknown as Parameters<typeof mount>[0], {
    target,
    props: {
      vaultRoot: props.vaultRoot,
      onFinish: () => {},
      saving: props.saving ?? false,
    },
  });
  const button = target.querySelector(
    "button.dropzone",
  ) as HTMLButtonElement | null;
  if (!button) {
    unmount(app as Parameters<typeof unmount>[0]);
    throw new Error("[test] dropzone button not found after mount");
  }
  return { app, button };
}

describe("Step6DemoImport WR-001 — double-click guard prevents duplicate start_import IPC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearBody();
  });

  afterEach(() => {
    clearBody();
  });

  test("two synchronous clicks on the dropzone fire open() at most once (in-flight guard short-circuits the second)", async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { invoke } = await import("@tauri-apps/api/core");

    // Deterministic deferral: `open()` resolves only after we manually
    // release it. While the first click is awaiting, the second click MUST
    // see `importing === true` and bail out before calling `open()` a
    // second time. Without the guard, both clicks would race past the gate
    // and we'd observe 2 open() calls + 2 invoke() calls.
    let releaseOpen: (paths: string[] | null) => void = () => {};
    const openPromise = new Promise<string[] | null>((resolve) => {
      releaseOpen = resolve;
    });
    vi.mocked(open).mockImplementation(async () => {
      return openPromise as unknown as ReturnType<typeof open>;
    });

    const { app, button } = mountStep6({ vaultRoot: "/Users/qy/StudyVault" });

    // First click — kicks off browseFile(), which flips `importing = true`
    // synchronously then awaits open().
    button.click();
    // Microtask flush so the `if (importing || saving) return;` gate gets
    // a chance to set `importing = true` synchronously inside the handler.
    await Promise.resolve();
    await Promise.resolve();

    // Second click — must short-circuit at the guard. open() must NOT be
    // invoked a second time.
    button.click();
    await Promise.resolve();
    await Promise.resolve();

    // Release the deferred open() so the first invocation resolves and
    // proceeds to invoke("start_import", ...).
    releaseOpen(["/tmp/lec1.pdf"]);

    // Drain the promise chain: open() resolution -> Array.isArray check ->
    // invoke() call -> finally block. A few microtasks + a 0-tick macrotask
    // is enough.
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    // WR-001 contract: open() invoked exactly once.
    expect(vi.mocked(open)).toHaveBeenCalledTimes(1);

    // WR-001 contract: invoke("start_import", ...) fired exactly once.
    const startImportCalls = vi
      .mocked(invoke)
      .mock.calls.filter((c) => c[0] === "start_import");
    expect(startImportCalls).toHaveLength(1);

    unmount(app as Parameters<typeof unmount>[0]);
  });

  test("the dropzone button is `disabled` while `saving` prop is true (parent gate consumes the same surface)", () => {
    // saving=true comes from Onboarding.next()/finish() during a save IPC.
    // The component must surface the parent's save discipline by disabling
    // the dropzone click target so even a click that *would* race past the
    // local `importing` guard cannot land on a parent-busy window.
    const { app, button } = mountStep6({
      vaultRoot: "/Users/qy/StudyVault",
      saving: true,
    });
    expect(button.disabled).toBe(true);
    unmount(app as Parameters<typeof unmount>[0]);
  });

  test("invoking browseFile while `saving=true` does not fire open() (saving gate also short-circuits the function body)", async () => {
    // Defense-in-depth: even if the disabled attribute were stripped via
    // some future ARIA refactor, the function body must still short-circuit
    // on saving=true. We click on the button by direct dispatch — jsdom
    // *will* fire the click handler even on disabled <button> elements via
    // dispatchEvent (HTMLElement.click() respects disabled; dispatchEvent
    // bypasses it), so this is the only way to assert the function-level
    // gate independently from the DOM gate.
    const { open } = await import("@tauri-apps/plugin-dialog");
    vi.mocked(open).mockImplementation(async () => "/tmp/x.pdf");

    const { app, button } = mountStep6({
      vaultRoot: "/Users/qy/StudyVault",
      saving: true,
    });

    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));

    expect(vi.mocked(open)).toHaveBeenCalledTimes(0);

    unmount(app as Parameters<typeof unmount>[0]);
  });
});

describe("Step6DemoImport WR-005 — multi-file pick renders count, not just first basename", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearBody();
  });

  afterEach(() => {
    clearBody();
  });

  test("picking 5 files renders 'Imported: 5 files (<first>, …)' (count is load-bearing in the surface)", async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { invoke } = await import("@tauri-apps/api/core");

    const paths = [
      "/tmp/lec1.pdf",
      "/tmp/lec2.pdf",
      "/tmp/lec3.pdf",
      "/tmp/lec4.pdf",
      "/tmp/lec5.pdf",
    ];
    vi.mocked(open).mockImplementation(
      async () => paths as unknown as Awaited<ReturnType<typeof open>>,
    );
    vi.mocked(invoke).mockImplementation(async () => undefined);

    const { app, button } = mountStep6({ vaultRoot: "/Users/qy/StudyVault" });
    button.click();

    // Drain through open() resolve -> invoke() resolve -> imported = ...
    // assignment -> Svelte reactive flush -> DOM update.
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    const successText =
      document.body.querySelector(".success")?.textContent ?? "";

    // WR-005 contract: count is present.
    expect(successText).toMatch(/5/);
    expect(successText).toMatch(/files/);
    // First basename is present as a hint, but it is NOT the only thing
    // shown — the pre-fix shape would have rendered just "lec1.pdf" with
    // no count anywhere on the page.
    expect(successText).toMatch(/lec1\.pdf/);

    unmount(app as Parameters<typeof unmount>[0]);
  });

  test("picking exactly 1 file still renders the single basename (count surface kicks in only for >1)", async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { invoke } = await import("@tauri-apps/api/core");

    // Both "single-string-result" and "single-element-array-result" forms
    // are accepted by plugin-dialog's `open({ multiple: true })`: the
    // browse handler normalises via `Array.isArray(chosen) ? chosen : [chosen]`.
    vi.mocked(open).mockImplementation(
      async () => "/tmp/single.pdf" as unknown as Awaited<ReturnType<typeof open>>,
    );
    vi.mocked(invoke).mockImplementation(async () => undefined);

    const { app, button } = mountStep6({ vaultRoot: "/Users/qy/StudyVault" });
    button.click();

    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    const successText =
      document.body.querySelector(".success")?.textContent ?? "";

    // Single-file path uses the basename only — must NOT contain " files"
    // (the pluralised count surface from WR-005). Asserts the conditional
    // ternary `paths.length === 1 ? firstBasename : <count>` is wired
    // correctly in both directions.
    expect(successText).toMatch(/single\.pdf/);
    expect(successText).not.toMatch(/\bfiles\b/);

    unmount(app as Parameters<typeof unmount>[0]);
  });
});
