// src/lib/import-error.ts — pure classifier for IPC errors raised by start_import.
// Used by ImportDialog to convert raw vault_writer error strings into a
// user-friendly inline message. Per REVIEW-1 (Gemini MEDIUM, 2026-05-16):
// DuplicateResolutionDialog is deferred to Phase 3; this catch-path replacement
// avoids surfacing raw "PermissionDenied" / "EACCES" / "read-only" strings to
// the user when they attempt to re-import an already-imported file (which is
// write-protected by chmod 0o444 per Plan 02 vault_writer::import_handle).
//
// CR-02 fix (gap-closure 02-13): the Rust import_controller now emits a
// `dest-clash:` prefix when an `_inbox/`-bound import would clobber an existing
// file (the D-11 default destination; previously bypassed the clash check).
// `dest-clash:` and `source-clash:` BOTH represent "would overwrite", but
// dest-clash files are NOT chmod 0o444-locked (the lock only fires for files
// under `_source/`). The user-facing copy is friendlier than the
// PermissionDenied flow because the user has direct write permission and can
// rename or delete the source without escalation.
//
// NO Svelte runes, NO IPC — testable without jsdom.

/**
 * Friendly inline message shown when the IPC error indicates the destination
 * file already exists and is write-protected by the 0o444 lock.
 *
 * The exact copy is locked to UI-SPEC §8.3 spec divergence note for REVIEW-1.
 */
export const DUPLICATE_PERMISSION_DENIED_MESSAGE =
    "One or more files already exist in this destination and are write-protected. " +
    "Re-importing existing files is coming in a future update — for now, delete the old file in your vault first.";

/**
 * Friendly inline message shown when the IPC error indicates a basename clash
 * in the import destination (the `dest-clash:` prefix from the Rust import
 * controller). Distinct from DUPLICATE_PERMISSION_DENIED_MESSAGE because the
 * destination is NOT 0o444-locked — the user can rename or delete without
 * escalation, so the copy is shorter and more direct.
 *
 * CR-02 fix (gap-closure 02-13): closes the data-loss path where an `_inbox/`
 * re-import silently overwrote the prior file. The clash check now covers
 * ALL Import-context writes; this message surfaces the failure.
 */
export const DEST_CLASH_MESSAGE =
    "This file would overwrite an existing one in the destination. " +
    "Rename your source file or remove the existing one first.";

/**
 * Fallback message for any other classifiable error. Phase 2 keeps this generic;
 * Phase 3+ may add specific cases (disk full, path too long, etc.) as the
 * vault_writer error taxonomy grows.
 */
export const GENERIC_IMPORT_ERROR_MESSAGE =
    "Something went wrong while importing. Check the console for details, or try again.";

/**
 * Detects whether a raw error value looks like the Rust controller's
 * `dest-clash:<path>` prefix. The prefix is emitted unconditionally by
 * `import_controller::start_import_inner` when a non-_source/ destination is
 * already occupied (the D-11 `_inbox/` catch-all path); see CR-02 fix.
 *
 * Case-insensitive so wording shifts upstream don't break the classifier.
 */
export function isDestClashShape(raw: unknown): boolean {
    const text = errorToString(raw).toLowerCase();
    return text.includes("dest-clash:");
}

/**
 * Detects whether a raw error value (string, Error, or arbitrary IPC payload)
 * looks like a PermissionDenied / read-only / EACCES shape.
 *
 * vault_writer::import_handle() returns one of these shapes on the chmod 0o444
 * re-write attempt (string varies by OS):
 *   - macOS:   "Permission denied (os error 13)"
 *   - Linux:   "Permission denied (os error 13)" / "EACCES"
 *   - Tauri-side serde error message may wrap with "io error: ..." prefix.
 *
 * The matcher is intentionally loose (case-insensitive) so the same classifier
 * survives small wording shifts from upstream nix / tokio / std::io.
 */
export function isPermissionDeniedShape(raw: unknown): boolean {
    const text = errorToString(raw).toLowerCase();
    if (text.includes("permission denied")) return true;
    if (text.includes("eacces")) return true;
    if (text.includes("read-only file system")) return true;
    if (text.includes("readonly")) return true;
    if (text.includes("(os error 13)")) return true;
    return false;
}

/**
 * Returns the user-facing friendly message for an IPC error, or null when the
 * error should NOT be surfaced to the user (currently never returns null —
 * Phase 2 surfaces ALL errors, either as one of the structured messages or
 * the generic fallback).
 *
 * Branch order matters: `dest-clash:` is checked BEFORE permission-denied
 * because a `dest-clash:<path>` reason from the Rust controller would not
 * trigger the permission-denied shape (the controller never writes to a
 * locked file in this branch — the existence check short-circuits earlier),
 * but defending order-of-evaluation makes the contract explicit and makes
 * the test for PermissionDenied regression easy to write.
 *
 * - Fallback branch (W5 fix 02.1-05): when no classifier matches, the GENERIC
 *   headline is appended with "(details: <last colon segment>)" extracted from
 *   the raw input. Empty / colon-free raw inputs yield the bare GENERIC string
 *   (no empty-tail artifact).
 */
export function classifyImportError(raw: unknown): string {
    if (isDestClashShape(raw)) {
        return DEST_CLASH_MESSAGE;
    }
    if (isPermissionDeniedShape(raw)) {
        return DUPLICATE_PERMISSION_DENIED_MESSAGE;
    }
    // W5 fix (Phase 02.1 02.1-05): surface raw error tail when no structured
    // classifier matched. Dogfood #8 found that "invalid course code: 'DOGFOOD101'"
    // was hidden behind devtools — users had to open devtools to understand
    // why imports failed. The enrichment puts the technical detail inline
    // without sacrificing the friendly headline.
    const tail = extractRawTail(raw);
    if (tail.length === 0) {
        return GENERIC_IMPORT_ERROR_MESSAGE;
    }
    return `${GENERIC_IMPORT_ERROR_MESSAGE} (details: ${tail})`;
}

function errorToString(raw: unknown): string {
    if (raw === null || raw === undefined) return "";
    if (typeof raw === "string") return raw;
    if (raw instanceof Error) return raw.message ?? "";
    // Tauri IPC failures often arrive as `{ message: string }` or raw strings.
    if (typeof raw === "object") {
        try {
            return JSON.stringify(raw);
        } catch {
            return String(raw);
        }
    }
    return String(raw);
}

/**
 * W5 fix (Phase 02.1 02.1-05) — extracts the last colon-segment of a raw error
 * string. Used by classifyImportError's fallback branch to append technical
 * detail to the user-friendly generic copy without bloating the surface with
 * multi-level wrapper noise.
 *
 * Pattern rationale: errors are often wrapped (`io error: vault error: ...`).
 * lastIndexOf(":") returns the most specific signal, e.g. for
 * `"io error: vault writer error: validation failed: course code 'X' rejected"`
 * the tail is `"course code 'X' rejected"`.
 *
 * Returns empty string when raw is empty / null / undefined / has no colon.
 * The fallback caller treats empty as "no enrichment" and returns the bare
 * generic message — no "(details: )" empty-tail artifact.
 */
export function extractRawTail(raw: unknown): string {
    const text = errorToString(raw);
    if (!text) return "";
    const lastColon = text.lastIndexOf(":");
    if (lastColon === -1) return "";
    const tail = text.slice(lastColon + 1).trim();
    return tail;
}
