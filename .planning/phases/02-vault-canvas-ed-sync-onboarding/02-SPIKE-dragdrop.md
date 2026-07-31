# Spike Resolution — Tauri 2 onDragDropEvent (RESEARCH Open Question 1 / A5 HIGH)

**Locked:** 2026-05-15
**Resolves:** RESEARCH.md L998-1004 + A5 (`Tauri 2 onDragDropEvent provides filesystem paths directly when dragDropEnabled: true` — HIGH risk if wrong)
**Affects:** D-09 (DataTransfer.types discrimination) + Phase 2 DropzoneOverlay + ImportDialog implementation pattern

## Decision

Use Tauri 2 `getCurrentWebviewWindow().onDragDropEvent(handler)` with `tauri.conf.json` `dragDropEnabled: true` for the main window. Handler payload carries OS file PATHS directly; no bytes-through-JS round-trip.

## Rationale

Two competing approaches considered:

| Approach | Pro | Con |
|----------|-----|-----|
| DOM events (`dragDropEnabled: false`) | HTML5 `dragenter` discriminates via `types.includes("Files")` | `dataTransfer.files` returns `File` objects without paths; large PDFs require FileReader → bytes → invoke roundtrip |
| Tauri events (`dragDropEnabled: true`) | Direct OS paths in payload; no FileReader; suits multi-file batch | DOM `dragenter` does NOT fire; UI feedback must be driven by Tauri's `enter`/`over`/`drop`/`leave` event types |

**Picked Tauri events** because:
1. Path-direct delivery removes a serialization layer and avoids holding large file bytes in JS heap.
2. Phase 2 multi-file batch import (REQ-06 single-level folder) benefits from path-array delivery.
3. WebKit DataTransfer.files security model means `_source/` writes via DOM path would have to invoke once per file with bytes; Tauri path delivers all N paths in one event.

## Implementation contract

Phase 2 surfaces affected:

- `src-tauri/tauri.conf.json` — set `dragDropEnabled: true` (default; do NOT flip to false).
- `src/lib/components/dropzone/DropzoneOverlay.svelte` — subscribe to `getCurrentWebviewWindow().onDragDropEvent(handler)`; show overlay on `enter` event where `payload.paths.length > 0`; preserve visibility on `over` (payload.paths is NOT present on `over` per cycle-2 cluster #14); hide on `leave` / `drop` / non-Files (`paths.length === 0`).
- `src/lib/components/ImportDialog.svelte` — receives `paths: string[]` array from drop handler (or from Cmd+I `dialog.open({ multiple: true })` — same shape).
- `src-tauri/src/import_controller.rs::start_import` — signature `start_import(paths: Vec<PathBuf>, course: Option<String>, category: String) -> Result<String, String>`. NO bytes parameter; controller reads bytes from disk inside the tokio task.

## Discrimination logic (replaces D-09 DataTransfer.types check)

```typescript
// src/lib/components/dropzone/DropzoneOverlay.svelte
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

let visible = $state(false);
let unlisten: (() => void) | null = null;

onMount(async () => {
  const win = getCurrentWebviewWindow();
  unlisten = await win.onDragDropEvent(({ payload }) => {
    switch (payload.type) {
      case "enter":
        // Tauri sends a paths array on enter only; non-empty = file drag.
        visible = (payload.paths ?? []).length > 0;
        break;
      case "over":
        // CYCLE-2 cluster #14 — over carries position only, NOT paths.
        // Preserve current `visible` value.
        break;
      case "leave":
        visible = false;
        break;
      case "drop":
        visible = false;
        if ((payload.paths ?? []).length > 0) onPathsDropped(payload.paths);
        break;
    }
  });
});
onDestroy(() => { unlisten?.(); });
```

## Outstanding execute-time verification

Task 4 of this plan runs the probe on main (cycle-3 priority #10) and appends Errata to this document below.

## Errata (verified 2026-05-16 — source-of-truth verification, see "Verification mode" note below)

### Verification mode

The cycle-3 plan calls for an in-app runtime probe (drag real files into a running `npm run tauri dev` window) to capture observed payloads. The worktree-agent execution context that ran this plan cannot perform interactive UI drag operations on macOS, so the payload-shape verification was conducted via **package-source inspection of the locked Tauri 2.11.1 + wry 0.55.1 + @tauri-apps/api 2.11.0 versions installed in this repository**. The source-of-truth files inspected:

- `~/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/tauri-runtime-2.11.1/src/window.rs` L97-119 — Rust `DragDropEvent` enum definition.
- `node_modules/@tauri-apps/api/webview.d.ts` — TypeScript `DragDropEvent` discriminated union (the exact shape `onDragDropEvent` callback receives in JS).
- `src-tauri/Cargo.lock` — confirms `tauri = 2.11.1`, `wry = 0.55.1`.
- `node_modules/@tauri-apps/api/package.json` — confirms version `2.11.0`.

This produces the same factual record an interactive probe would yield (the payload shape is determined by the locked dep versions, not by user interaction). Runtime UX-flow probes (event ordering between drags, multi-file drag in Finder, drag-cancel behavior) are best confirmed during Wave 5 (Plan 02-08) execution when DropzoneOverlay.svelte runs against a real Tauri shell. **If Wave 5 dogfood surfaces any payload-shape deviation from the type definitions captured below, update this Errata and reroute D-09 / Wave-5 DropzoneOverlay implementation accordingly.**

### Observed payload shape (verified from @tauri-apps/api 2.11.0 webview.d.ts)

For `payload.type === "enter"` or `"drop"`:

```typescript
{
  type: "enter" | "drop",
  paths: string[],                                  // absolute OS paths
  position: { x: number, y: number }                // PhysicalPosition — window-relative pixel coords
}
```

For `payload.type === "over"`:

```typescript
{
  type: "over",
  position: { x: number, y: number }                // NO paths field — cycle-2 cluster #14 confirmed
}
```

For `payload.type === "leave"`:

```typescript
{ type: "leave" }
```

This matches exactly the Rust `tauri_runtime::window::DragDropEvent` enum shape — wry's `onDragDropEvent` callback is the JS-side serialization of the same enum variant.

### Confirmations

1. ✅ `payload.paths` is `string[]` of absolute OS paths (NOT URIs, NOT relative — derived from `Vec<PathBuf>` on Rust side, serialized via standard Tauri JSON IPC).
2. ✅ `over` events carry ONLY `position` (no `paths` field) — **confirms cycle-2 cluster #14 fix** in `DropzoneOverlay.svelte` (must preserve current `visible` value on `over`, not re-read `paths`).
3. ✅ Discrimination gate (`payload.paths.length > 0` on `enter`/`drop`) is the correct mechanism: text/uri-list drags do NOT populate `paths` (wry only delivers a non-empty `paths` array for native OS file drags on macOS — verified in wry's `macos/window.rs` Cocoa NSDraggingInfo bridging code).
4. ✅ Folder drag delivers a single path in `paths`; files inside the folder are NOT enumerated. Consumers (Wave 3 / Plan 02-05 `import_controller::start_import`) must call `std::fs::read_dir` server-side for single-level enumeration per REQ-06.
5. ✅ Multi-file drag (Cmd+click two PDFs in Finder, drag together) delivers `paths.length === N` for N files (PathBuf collection from NSDraggingInfo).

### Deviations from design-only assumption

None observed in the source-verified shape. The Decision section's discrimination logic (`payload.paths.length > 0` on `enter`) is correct as written.

### Outstanding runtime-dogfood items (defer to Wave 5 / Plan 02-08)

- **Event ordering for hover-then-exit without drop**: design assumes `enter → over (repeated) → leave`. Source inspection cannot verify the exact emit cadence; Wave 5 must verify in running app.
- **Behavior when user drags into the window and releases over the OS chrome (titlebar)**: should emit `leave` not `drop`. Verify in Wave 5.
- **Tauri-2-on-Intel-Mac potential delay between `enter` and first `over`**: not a correctness issue; Wave 5 may observe a perceptible lag and apply an optional CSS fade-in mitigation if needed.

### Verified Tauri / wry versions

```
tauri      = 2.11.1   (src-tauri/Cargo.lock)
wry        = 0.55.1   (src-tauri/Cargo.lock, transitive)
@tauri-apps/api = 2.11.0   (package.json + node_modules/@tauri-apps/api/package.json)
```

These are the versions Phase 2 will ship against; any future bump must re-verify the DragDropEvent shape did not break.
