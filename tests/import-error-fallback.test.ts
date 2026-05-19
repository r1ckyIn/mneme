// tests/import-error-fallback.test.ts
//
// Phase 02.1 Plan 02.1-01 Task 3 RED — W5 contract (UI-REVIEW.md L155-158 / CONTEXT W5).
//
// Wave 0 RED, Wave 1 02.1-05 GREEN. Pins the contract: classifyImportError
// fallback branch must surface the raw error TAIL (last colon segment) as a
// second-line surface when no structured classifier (dest-clash /
// permission-denied) matched. Preserves the friendly
// GENERIC_IMPORT_ERROR_MESSAGE headline so the UX stays calm.
//
// Test 5 specifically pins last-colon (NOT first-colon) splitting so
// multi-level wrapped errors stay compact:
//   "vault_writer error: validation failed: course code 'X' rejected"
//   --> tail: "course code 'X' rejected"   (NOT "validation failed: course code 'X' rejected")
//
// RED signal on current main:
//   Test 1 + Test 5 FAIL with assertion errors because classifyImportError
//   returns the bare GENERIC_IMPORT_ERROR_MESSAGE — no enrichment branch yet.
//   Tests 2, 3, 4 PASS today:
//     Test 2 — no colon means no enrichment is expected (passthrough)
//     Test 3 — dest-clash classifier branch fires first (regression check)
//     Test 4 — permission-denied classifier branch fires first (regression check)
//
// Wave 1 02.1-05 changes the fallback branch in classifyImportError to:
//   `${GENERIC_IMPORT_ERROR_MESSAGE} (details: ${rawTail(raw)})`
// where rawTail extracts the last segment after the final ':' (trimmed).
//
// Maps to: W5 in UI-REVIEW.md L155-158; INFO Dogfood #8 ("invalid course code:
// 'DOGFOOD101' was only visible in devtools" — surfacing the tail fixes this).

import { describe, test, expect } from "vitest";
import {
    classifyImportError,
    GENERIC_IMPORT_ERROR_MESSAGE,
    DEST_CLASH_MESSAGE,
    DUPLICATE_PERMISSION_DENIED_MESSAGE,
} from "../src/lib/import-error";

describe("W5 fallback enrichment (raw error tail)", () => {
    test("fallback surfaces raw error tail when input contains a colon and no classifier matches", () => {
        const input =
            "vault_writer error: validation failed: course code 'DOGFOOD101' rejected";
        const result = classifyImportError(input);

        // Friendly headline preserved.
        expect(result).toMatch(/Something went wrong/);
        // Raw tail surfaced as second-line detail (Wave 1 02.1-05 implements
        // this enrichment in the GENERIC fallback branch).
        expect(result).toMatch(/course code 'DOGFOOD101' rejected/);
    });

    test("fallback shows GENERIC alone when input has no colon — preserves the existing 'no further detail' UX", () => {
        const input = "unspecified failure";
        const result = classifyImportError(input);

        // No colon = no tail to extract = no enrichment.
        expect(result).toBe(GENERIC_IMPORT_ERROR_MESSAGE);
    });

    test("fallback does NOT enrich when the raw input matches a classifier (dest-clash)", () => {
        // `dest-clash:` matches isDestClashShape first → returns DEST_CLASH_MESSAGE.
        // The fallback enrichment branch never runs.
        const input = "dest-clash: /vault/_inbox/notes.pdf";
        const result = classifyImportError(input);
        expect(result).toBe(DEST_CLASH_MESSAGE);
    });

    test("fallback handles Error objects with colon-containing messages (regression: permission-denied still wins)", () => {
        // This Error.message has a colon, but it ALSO contains "permission
        // denied" so the permission-denied classifier branch fires FIRST.
        // The fallback enrichment branch never runs. Pins the regression
        // assertion from 02-13 Task 3 that classifier order matters.
        const input = new Error("io error: permission denied");
        const result = classifyImportError(input);
        expect(result).toBe(DUPLICATE_PERMISSION_DENIED_MESSAGE);
    });

    test("tail extraction takes the LAST colon segment when multiple colons present", () => {
        // Multi-level wrapping. W5 fix splits on the LAST colon so the
        // surfaced tail is short and actionable, not a chain of error wrappers.
        const input = "prefix: middle: actual error detail";
        const result = classifyImportError(input);

        // Tail MUST be the last segment ("actual error detail"), NOT the
        // second-to-last segment ("middle: actual error detail").
        expect(result).toMatch(/actual error detail/);
        expect(result).not.toMatch(/middle: actual error detail/);
    });
});
