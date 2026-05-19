import { describe, test, expect } from "vitest";
import {
    classifyImportError,
    isDestClashShape,
    isPermissionDeniedShape,
    DEST_CLASH_MESSAGE,
    DUPLICATE_PERMISSION_DENIED_MESSAGE,
    GENERIC_IMPORT_ERROR_MESSAGE,
} from "../src/lib/import-error";

describe("isPermissionDeniedShape", () => {
    test.each([
        ["Permission denied (os error 13)", true],
        ["permission denied", true],
        ["EACCES", true],
        ["Read-only file system", true],
        ["readonly", true],
        ["io error: permission denied (os error 13)", true],
        ["some other failure", false],
        ["disk full", false],
        ["", false],
    ])("matches %s -> %s", (raw, expected) => {
        expect(isPermissionDeniedShape(raw)).toBe(expected);
    });

    test("handles Error instance", () => {
        expect(isPermissionDeniedShape(new Error("Permission denied (os error 13)"))).toBe(true);
        expect(isPermissionDeniedShape(new Error("disk full"))).toBe(false);
    });

    test("handles object payload (Tauri IPC failure shape)", () => {
        expect(isPermissionDeniedShape({ message: "Permission denied" })).toBe(true);
        expect(isPermissionDeniedShape({ message: "something else" })).toBe(false);
    });

    test("handles null/undefined safely", () => {
        expect(isPermissionDeniedShape(null)).toBe(false);
        expect(isPermissionDeniedShape(undefined)).toBe(false);
    });
});

describe("classifyImportError (REVIEW-1 Gemini MEDIUM resolution)", () => {
    test("PermissionDenied raw error returns friendly duplicate message", () => {
        expect(classifyImportError("Permission denied (os error 13)")).toBe(DUPLICATE_PERMISSION_DENIED_MESSAGE);
    });

    test("friendly message mentions delete-old-file affordance", () => {
        // Lock the load-bearing copy: the message MUST give the user an exit path.
        expect(DUPLICATE_PERMISSION_DENIED_MESSAGE).toMatch(/delete the old file/i);
        expect(DUPLICATE_PERMISSION_DENIED_MESSAGE).toMatch(/coming in a future update/i);
    });

    test("non-permission error returns generic fallback", () => {
        expect(classifyImportError("some io error")).toBe(GENERIC_IMPORT_ERROR_MESSAGE);
        expect(classifyImportError(new Error("disk full"))).toBe(GENERIC_IMPORT_ERROR_MESSAGE);
    });

    test("never returns null/undefined (Phase 2 surfaces ALL errors)", () => {
        expect(classifyImportError(null)).toBeTruthy();
        expect(classifyImportError(undefined)).toBeTruthy();
        expect(classifyImportError("")).toBeTruthy();
    });
});

// CR-02 fix (gap-closure 02-13) — `dest-clash:` is the new prefix emitted by
// import_controller for the `_inbox/` clash path (D-11 default destination).
// Distinct from `source-clash:` (which stays in the PermissionDenied bucket
// because `_source/` files are 0o444-locked at the OS layer too).
describe("isDestClashShape (CR-02 fix gap-closure 02-13)", () => {
    test.each([
        ["dest-clash:/vault/_inbox/notes.pdf", true],
        ["DEST-CLASH:/path", true],
        ["dest-clash:", true],
        ["source-clash:/vault/_source/lec.pdf", false],
        ["permission denied", false],
        ["", false],
    ])("matches %s -> %s", (raw, expected) => {
        expect(isDestClashShape(raw)).toBe(expected);
    });

    test("handles Error instance with dest-clash prefix", () => {
        expect(isDestClashShape(new Error("dest-clash:/vault/_inbox/notes.pdf"))).toBe(true);
    });

    test("handles null/undefined safely", () => {
        expect(isDestClashShape(null)).toBe(false);
        expect(isDestClashShape(undefined)).toBe(false);
    });
});

describe("classifyImportError dest-clash branch (CR-02)", () => {
    test("dest-clash: prefix returns DEST_CLASH_MESSAGE", () => {
        expect(classifyImportError("dest-clash:/vault/_inbox/notes.pdf")).toBe(DEST_CLASH_MESSAGE);
    });

    test("DEST_CLASH_MESSAGE locks user-facing copy invariants", () => {
        // Load-bearing assertions: the message MUST tell the user a file already
        // lives in the destination AND give them an actionable exit path
        // (rename source or remove the existing one).
        expect(DEST_CLASH_MESSAGE).toMatch(/already.*destination|overwrite/i);
        expect(DEST_CLASH_MESSAGE).toMatch(/rename|remove/i);
    });

    test("REGRESSION: PermissionDenied still routes to DUPLICATE_PERMISSION_DENIED_MESSAGE", () => {
        // CR-02 fix inserted a new branch ABOVE PermissionDenied in
        // classifyImportError. This assertion pins that inserting the
        // dest-clash branch did NOT swallow the existing PermissionDenied
        // path. The chmod 0o444 lock surfaces (re-importing a file that
        // landed under `_source/`) MUST still classify as PermissionDenied,
        // not as DEST_CLASH.
        expect(classifyImportError("permission denied (os error 13)")).toBe(
            DUPLICATE_PERMISSION_DENIED_MESSAGE,
        );
        expect(classifyImportError("Read-only file system")).toBe(DUPLICATE_PERMISSION_DENIED_MESSAGE);
        expect(classifyImportError("EACCES")).toBe(DUPLICATE_PERMISSION_DENIED_MESSAGE);
    });

    test("REGRESSION: source-clash: still falls through to generic fallback (W5-enriched after 02.1-05)", () => {
        // `source-clash:` is the existing prefix for `_source/` collisions —
        // those land in the PermissionDenied path naturally when the user
        // attempts the write (chmod 0o444). The classifier itself doesn't
        // special-case the `source-clash:` prefix; the live failure becomes
        // EACCES at OS layer. We pin that here to make the contract explicit
        // (no silent claim that source-clash: routes anywhere specific).
        //
        // After W5 fix (02.1-05): the fallback branch ENRICHES the GENERIC
        // headline with the raw last-colon tail. For "source-clash:/vault/_source/lec.pdf"
        // the tail is "/vault/_source/lec.pdf" so the user sees the path in
        // "(details: ...)" form. Original contract preserved: source-clash:
        // is NOT a classifier branch (no special-case routing) — it just
        // happens to flow through the now-enriched fallback like any other
        // colon-containing unmatched input.
        const result = classifyImportError("source-clash:/vault/_source/lec.pdf");
        // Friendly headline still starts the message.
        expect(result).toMatch(/^Something went wrong while importing\./);
        // Tail surfaced via W5 enrichment.
        expect(result).toMatch(/\(details: \/vault\/_source\/lec\.pdf\)$/);
        // Confirm no special-case branch consumed it (dest-clash / permission-denied
        // copies would NOT contain the GENERIC headline).
        expect(result).not.toBe(DEST_CLASH_MESSAGE);
        expect(result).not.toBe(DUPLICATE_PERMISSION_DENIED_MESSAGE);
    });
});
