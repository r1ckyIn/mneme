// tests/course-code-regex.test.ts — Phase 02.1 02.1-REVIEW CR-001.
//
// Pins the MINIMAL path-safe course-code contract — mirrors the Rust SSOT
// (`vault_writer::validate_course_code`) per:
//   - .planning/phases/02.1-*/02.1-REVIEW.md CR-001 (frontend gates must
//     mirror the W6 Rust relaxation, not enforce the legacy 4-letter+4-digit
//     regex)
//   - src-tauri/tests/course_code_validation.rs (Rust-side parameterized
//     test that this Vitest case mirrors)
//   - vault_writer.rs L102-131 — accept list: alnum + dash + unicode,
//     length 1..=32; reject: empty / >32 chars / `/` / `\` / `\0` / `.` /
//     `..` / no-alphanumeric.
//
// Validators are pure functions in src/lib/onboarding-validation.ts — no
// component mount, no jsdom requirement beyond what vitest already loads.
// The CYCLE-3 cycle-2 MEDIUM path-prefix fix is pinned by an explicit case
// asserting that "/Users/qy2/StudyVault" is rejected when HOME = "/Users/qy".
//
// File name is intentionally kept as `course-code-regex.test.ts` to avoid a
// rename churn in the test runner manifest; the contract is no longer a
// single regex.
import { describe, test, expect } from "vitest";
import { validateCourseCode, validateVaultPath } from "../src/lib/onboarding-validation";

describe("validateCourseCode (minimal path-safe contract — mirrors Rust SSOT)", () => {
  // CR-001 fix: real USYD codes that the legacy `^[A-Z]{4}\d{4}$` regex
  // rejected MUST now pass — this is the dogfood-killer the relaxation
  // targets. Mirrors src-tauri/tests/course_code_validation.rs.
  test.each([
    ["COMP3221"],
    ["MATH1062"],
    ["INFO1110"],
    ["STAT1003"],
    ["COMP3027L"], // lab-suffix variant
    ["BIOL2010S2"], // semester-suffix variant
    ["cs-101"], // lowercase + hyphen
    ["日本語1"], // unicode alphanumeric
    ["XYZ"], // 3-char
    ["a1"], // 2-char minimum
    ["A".repeat(32)], // 32-char boundary OK
  ])("accepts %s", (code) => {
    expect(validateCourseCode(code).kind).toBe("valid");
  });

  // CR-001 fix: path-poison sentinels mirror the Rust reject set.
  test.each([
    ["../etc"], // path traversal sentinel
    ["/abs/path"], // absolute path attempt
    ["a/b"], // forward slash separator
    ["a\\b"], // backslash separator
    ["\0nul"], // embedded NUL byte
    ["."], // single-dot relative
    [".."], // parent-dir traversal
    ["!!!"], // no alphanumeric char
    ["A".repeat(33)], // 33-char overlength boundary
  ])("rejects %s", (code) => {
    expect(validateCourseCode(code).kind).toBe("invalid");
  });

  test("empty input is empty (not invalid)", () => {
    expect(validateCourseCode("").kind).toBe("empty");
    expect(validateCourseCode("   ").kind).toBe("empty");
  });

  test("trims whitespace before validation", () => {
    expect(validateCourseCode("  COMP3221  ").kind).toBe("valid");
    // After trim, the body is a path separator → reject.
    expect(validateCourseCode("  /  ").kind).toBe("invalid");
  });

  test("overlength reason mentions the limit", () => {
    const r = validateCourseCode("A".repeat(33));
    expect(r.kind).toBe("invalid");
    if (r.kind === "invalid") {
      expect(r.reason.toLowerCase()).toContain("32");
    }
  });
});

describe("validateVaultPath", () => {
  const HOME = "/Users/qy";

  test("accepts absolute path under home", () => {
    expect(validateVaultPath(`${HOME}/StudyVault`, HOME).kind).toBe("valid");
  });

  test("rejects empty", () => {
    expect(validateVaultPath("", HOME)).toEqual({
      kind: "invalid",
      reason: "That path can't be used. Try a folder under your home directory.",
    });
  });

  test("rejects relative path", () => {
    expect(validateVaultPath("StudyVault", HOME).kind).toBe("invalid");
  });

  test("rejects path outside home (with homeDir provided)", () => {
    expect(validateVaultPath("/tmp/StudyVault", HOME).kind).toBe("invalid");
  });

  test("CYCLE-3 cycle-2 MEDIUM: rejects sibling user dir that string-prefix-matches", () => {
    // /Users/qy2/StudyVault must NOT pass when HOME = /Users/qy.
    // Cycle-2 used plain startsWith → false positive. Cycle-3 appends "/".
    expect(validateVaultPath("/Users/qy2/StudyVault", HOME).kind).toBe("invalid");
  });

  test("CYCLE-3 cycle-2 MEDIUM: exact-match homeDir is valid", () => {
    // Edge case: vault path EQUALS home (rare but valid).
    expect(validateVaultPath(HOME, HOME).kind).toBe("valid");
  });

  test("accepts any absolute path when homeDir is null (unknown)", () => {
    expect(validateVaultPath("/tmp/StudyVault", null).kind).toBe("valid");
  });
});
