// src/lib/onboarding-validation.ts — pure validators for the onboarding step forms.
//
// NO Svelte runes, NO IPC, NO Node imports — testable without jsdom. Mirrors
// the "shared module" discipline established by spawn-args.shared.ts in
// Phase 1: a pure-function predicate layer that can be exercised in Vitest
// without spinning up any framework runtime.
//
// Contract:
//   - validateCourseCode(code) :: CodeValidation — minimal path-safe validator
//     mirroring vault_writer::validate_course_code (Rust SSOT). Accepts
//     alphanumeric + dash + unicode (length 1..=32). Real USYD codes:
//     BIOL2010S2 / COMP3027L / MATH1062 / cs-101 / 日本語1 all pass.
//   - validateVaultPath(path, homeDir) :: PathValidation — path-shape only
//     (non-empty, absolute, descendant of homeDir). Writability is verified
//     by the downstream invoke('vault_create_scaffold', { root }) call on
//     the Rust side (lib.rs L189-192 → vault_writer::create_vault_scaffold).
//
// CYCLE-3 cycle-2 MEDIUM fix is preserved in validateVaultPath: the home
// prefix check appends "/" so a string-level startsWith does NOT falsely
// accept a sibling user directory (e.g., "/Users/qy2/StudyVault" when
// homeDir = "/Users/qy"). Without the trailing separator, plain string
// startsWith is a substring check, not a path-segment check.
//
// CR-001 fix (Phase 02.1 02.1-REVIEW): swapped the legacy `^[A-Z]{4}\d{4}$`
// regex for the same minimal path-safe validator the Rust side adopted in
// W6 (02.1-04). The Rust contract lives in vault_writer::validate_course_code
// — both sides must mirror length 1..=32, reject path separators / null /
// "." / "..", and require at least one alphanumeric character. The original
// dogfood-killer was that real USYD codes like BIOL2010S2 / COMP3027L /
// cs-101 / MATH1062 were rejected by the strict 4-letter+4-digit gate while
// the Rust side already accepted them. See UI-REVIEW.md L150 + 02.1-REVIEW.md
// CR-001.

// Maximum course-code length (chars after trim). Mirrors vault_writer.rs.
const MAX_LEN = 32;

export type CodeValidation =
  | { kind: "empty" }
  | { kind: "valid" }
  | { kind: "invalid"; reason: string };

export function validateCourseCode(code: string): CodeValidation {
  const trimmed = code.trim();
  if (trimmed.length === 0) return { kind: "empty" };
  if (trimmed.length > MAX_LEN) {
    return { kind: "invalid", reason: `Too long (max ${MAX_LEN} characters).` };
  }
  // Path-poison sentinels — must match the Rust validator's reject set.
  if (
    trimmed.includes("/") ||
    trimmed.includes("\\") ||
    trimmed.includes("\0")
  ) {
    return { kind: "invalid", reason: "Must not contain path separators." };
  }
  if (trimmed === "." || trimmed === "..") {
    return { kind: "invalid", reason: "Can't be `.` or `..`." };
  }
  // Unicode-aware alphanumeric check via the `Letter` + `Number` Unicode
  // property classes. Mirrors Rust's `is_alphanumeric()` for unicode chars.
  if (!/[\p{L}\p{N}]/u.test(trimmed)) {
    return { kind: "invalid", reason: "Needs at least one alphanumeric character." };
  }
  return { kind: "valid" };
}

export type PathValidation =
  | { kind: "valid"; willCreate: boolean }
  | { kind: "invalid"; reason: string };

// Path-shape only — actual writability is verified by a downstream invoke()
// on the Rust side. This function checks: non-empty, absolute, under user home.
export function validateVaultPath(path: string, homeDir: string | null): PathValidation {
  const trimmed = path.trim();
  if (!trimmed) {
    return {
      kind: "invalid",
      reason: "That path can't be used. Try a folder under your home directory.",
    };
  }
  if (!trimmed.startsWith("/")) {
    return { kind: "invalid", reason: "Path must be absolute." };
  }
  if (homeDir) {
    // CYCLE-3 cycle-2 MEDIUM fix: append "/" so the prefix check is path-aware.
    // Without this, homeDir "/Users/qy" would falsely accept "/Users/qy2/StudyVault"
    // because plain startsWith treats it as a string prefix, not a path segment.
    const homeWithSep = homeDir.endsWith("/") ? homeDir : homeDir + "/";
    if (!trimmed.startsWith(homeWithSep) && trimmed !== homeDir) {
      return {
        kind: "invalid",
        reason: "That path can't be used. Try a folder under your home directory.",
      };
    }
  }
  return { kind: "valid", willCreate: true };
}
