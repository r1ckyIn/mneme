// tests/datatransfer-types-discrimination.test.ts
// Per 02-SPIKE-dragdrop.md option-2: discrimination uses payload.paths.length > 0
// (Tauri events), NOT DOM DataTransfer.types. The filename stays for cross-doc
// continuity but the test asserts the Tauri-event contract.

import { describe, test, expect } from "vitest";

// CYCLE-3 iter-1 WARN-4 fix: Tauri 2 `over` events carry NO `paths` field —
// only `{ position: { x, y } }`. enter / drop carry both `paths` and `position`.
// leave carries neither. The MockPayload union mirrors the real wire shape so
// future code that destructures payload.paths on an over event is caught here.
// Reference: 02-SPIKE-dragdrop.md Errata (produced by 02-01 Wave 0).
type MockPayload =
    | { type: "enter"; paths: string[]; position: { x: number; y: number } }
    | { type: "over"; position: { x: number; y: number } }
    | { type: "leave" }
    | { type: "drop"; paths: string[]; position: { x: number; y: number } };

// Replicate DropzoneOverlay's discrimination logic for direct testing.
function shouldShowOverlay(payload: MockPayload, currentlyVisible: boolean): boolean {
    if (payload.type === "enter") {
        return payload.paths.length > 0;
    }
    // CYCLE-3 iter-1 WARN-4: over carries NO paths field. Discrimination is by
    // type alone — visibility is preserved from the preceding enter event.
    if (payload.type === "over") return currentlyVisible;
    if (payload.type === "leave") return false;
    if (payload.type === "drop") return false;
    return currentlyVisible;
}

describe("Tauri onDragDropEvent payload.paths.length discrimination", () => {
    test("enter with non-empty paths shows overlay", () => {
        expect(shouldShowOverlay({ type: "enter", paths: ["/a/b.pdf"], position: { x: 0, y: 0 } }, false)).toBe(true);
    });

    test("enter with empty paths (text drag) does NOT show overlay", () => {
        expect(shouldShowOverlay({ type: "enter", paths: [], position: { x: 0, y: 0 } }, false)).toBe(false);
    });

    test("over event preserves visibility from preceding enter (real Tauri over has no paths field)", () => {
        // CYCLE-3 iter-1 WARN-4: over carries `{ position: { x, y } }` ONLY — no paths.
        // Visibility is preserved from the preceding enter. See 02-SPIKE-dragdrop.md Errata.
        expect(shouldShowOverlay({ type: "over", position: { x: 100, y: 100 } }, true)).toBe(true);
        expect(shouldShowOverlay({ type: "over", position: { x: 100, y: 100 } }, false)).toBe(false);
    });

    test("leave hides overlay (no paths field on real Tauri leave events)", () => {
        // CYCLE-3 iter-1 WARN-4: real leave carries no paths/position payload.
        expect(shouldShowOverlay({ type: "leave" }, true)).toBe(false);
    });

    test("drop hides overlay (parent handles paths separately)", () => {
        expect(shouldShowOverlay({ type: "drop", paths: ["/a/b.pdf"], position: { x: 0, y: 0 } }, true)).toBe(false);
    });

    test("multi-file drag: paths.length > 1 still shows overlay on enter", () => {
        expect(shouldShowOverlay({ type: "enter", paths: ["/a/b.pdf", "/c/d.docx"], position: { x: 0, y: 0 } }, false)).toBe(true);
    });
});
