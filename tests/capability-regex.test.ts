import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildClaudeArgs,
  CHAT_RENDERING_HINTS,
  SESSION_ID_REGEX,
} from "../src/lib/spawn-args.shared";
import { SCRATCH_DIR } from "../src/lib/spawn-args.node";

const capabilityPath = resolve(__dirname, "..", "src-tauri", "capabilities", "default.json");
const capability = JSON.parse(readFileSync(capabilityPath, "utf8"));

function findScope(identifier: string) {
  return capability.permissions.find(
    (p: any) => typeof p === "object" && p.identifier === identifier
  );
}

// Local escapeRegex helper for round-trip tests (duplicate of the helper in
// scripts/gen-capabilities.ts — the test is the gate). Escapes the metachar
// set [.*+?^${}()|[\]\\] verbatim.
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("capability default.json — structural shape (Option B per plan 01-12 Task 4a)", () => {
  it("parses as valid JSON", () => {
    expect(capability).toBeTruthy();
    expect(capability.identifier).toBe("default");
  });

  it("has shell:allow-spawn permission with three allow entries (Option B chat pair + B3 version-probe)", () => {
    // Phase 02.1 02.1-02 (B3 fix) added a third entry `claude-version-probe`
    // alongside the Option-B chat-subprocess pair. The probe is the
    // single-arg `claude --version` invocation made by probe_claude_binary()
    // in src-tauri/src/lib.rs at onboarding Step 2 (dogfood blocker fix).
    const scope = findScope("shell:allow-spawn");
    expect(scope).toBeTruthy();
    expect(scope.allow).toHaveLength(3);
    const names = scope.allow.map((a: any) => a.name).sort();
    expect(names).toEqual([
      "claude-bin-fresh",
      "claude-bin-resume",
      "claude-version-probe",
    ]);
    for (const a of scope.allow) {
      expect(a.cmd).toBe("claude");
    }
  });

  it("has shell:allow-execute permission mirroring the spawn topology (three entries)", () => {
    const scope = findScope("shell:allow-execute");
    expect(scope).toBeTruthy();
    expect(scope.allow).toHaveLength(3);
    const names = scope.allow.map((a: any) => a.name).sort();
    expect(names).toEqual([
      "claude-bin-fresh",
      "claude-bin-resume",
      "claude-version-probe",
    ]);
  });

  it("declares windows: ['main'] (no wildcards)", () => {
    expect(capability.windows).toEqual(["main"]);
    expect(capability.windows).not.toContain("*");
  });
});

describe("capability default.json — claude-bin-fresh args validators (15-arg shape)", () => {
  const spawnScope = findScope("shell:allow-spawn");
  const freshEntry = spawnScope.allow.find((a: any) => a.name === "claude-bin-fresh");
  const validators: Array<{ validator: string }> = freshEntry.args;

  it("has exactly 15 validators (matches buildClaudeArgs length with appendSystemPrompt)", () => {
    expect(validators).toHaveLength(15);
    const sample = buildClaudeArgs("any prompt", SCRATCH_DIR, {
      appendSystemPrompt: CHAT_RENDERING_HINTS,
    });
    expect(sample).toHaveLength(15);
  });

  it("every validator entry is a Var object with a string validator field", () => {
    for (const v of validators) {
      expect(v).toHaveProperty("validator");
      expect(typeof v.validator).toBe("string");
      expect(v.validator.length).toBeGreaterThan(0);
    }
  });

  it("every validator regex compiles", () => {
    for (const v of validators) {
      expect(() => new RegExp(v.validator)).not.toThrow();
    }
  });

  it("every validator matches the value buildClaudeArgs(opts={appendSystemPrompt}) emits at the same index", () => {
    const sampleArgs = buildClaudeArgs("FREE_FORM_PROMPT_HERE", SCRATCH_DIR, {
      appendSystemPrompt: CHAT_RENDERING_HINTS,
    });
    for (let i = 0; i < validators.length; i++) {
      const re = new RegExp(validators[i].validator);
      expect(re.test(sampleArgs[i])).toBe(true);
    }
  });

  it("--add-dir validator rejects out-of-scope paths", () => {
    // Position: after --print, --permission-mode, bypassPermissions, --output-format,
    // stream-json, --include-partial-messages, --verbose, --max-turns, 30, --add-dir → index 10
    const re = new RegExp(validators[10].validator);
    expect(re.test(SCRATCH_DIR)).toBe(true);
    expect(re.test("/etc/hosts")).toBe(false);
    expect(re.test("/Users/qinyuan/.ssh/id_rsa")).toBe(false);
    expect(re.test("/Users/qinyuan/.mneme/scratch/../etc")).toBe(false);
    expect(re.test("/")).toBe(false);
    expect(re.test("~")).toBe(false);
  });

  it("--max-turns value validator rejects values other than '30'", () => {
    const re = new RegExp(validators[8].validator);
    expect(re.test("30")).toBe(true);
    expect(re.test("31")).toBe(false);
    expect(re.test("300")).toBe(false);
    expect(re.test("3")).toBe(false);
    expect(re.test("abc")).toBe(false);
    expect(re.test("")).toBe(false);
  });

  it("NO validator contains the string 'bare' (defense vs --bare bypass)", () => {
    for (const v of validators) {
      expect(v.validator.toLowerCase()).not.toContain("bare");
    }
  });

  it("fresh entry does NOT contain --resume validator (plan 01-12 GAP-1 first-prompt path)", () => {
    const literals = validators.map((v) => v.validator);
    expect(literals).not.toContain("^--resume$");
  });

  it("spawn-fresh and execute-fresh validator lists are identical", () => {
    const executeScope = findScope("shell:allow-execute");
    const executeFresh = executeScope.allow.find((a: any) => a.name === "claude-bin-fresh");
    expect(executeFresh.args).toEqual(freshEntry.args);
  });
});

describe("capability default.json — claude-bin-resume args validators (17-arg shape)", () => {
  const spawnScope = findScope("shell:allow-spawn");
  const resumeEntry = spawnScope.allow.find((a: any) => a.name === "claude-bin-resume");
  const validators: Array<{ validator: string }> = resumeEntry.args;
  const VALID_SESSION_ID = "a1b2c3d4-e5f6-4a8b-9c0d-e1f2a3b4c5d6";

  it("has exactly 17 validators (matches buildClaudeArgs length with both opts)", () => {
    expect(validators).toHaveLength(17);
    const sample = buildClaudeArgs("any prompt", SCRATCH_DIR, {
      resumeSessionId: VALID_SESSION_ID,
      appendSystemPrompt: CHAT_RENDERING_HINTS,
    });
    expect(sample).toHaveLength(17);
  });

  it("every validator regex compiles", () => {
    for (const v of validators) {
      expect(() => new RegExp(v.validator)).not.toThrow();
    }
  });

  it("every validator matches the value buildClaudeArgs(opts={resume, append}) emits at the same index", () => {
    const sampleArgs = buildClaudeArgs("PROMPT", SCRATCH_DIR, {
      resumeSessionId: VALID_SESSION_ID,
      appendSystemPrompt: CHAT_RENDERING_HINTS,
    });
    for (let i = 0; i < validators.length; i++) {
      const re = new RegExp(validators[i].validator);
      expect(re.test(sampleArgs[i])).toBe(true);
    }
  });

  it("--resume validator (index 1) is followed by a SESSION_ID_REGEX validator (index 2)", () => {
    expect(validators[1].validator).toBe("^--resume$");
    expect(validators[2].validator).toBe(SESSION_ID_REGEX);
  });

  it("SESSION_ID_REGEX (the resume validator) accepts UUID-format ids only", () => {
    const re = new RegExp(validators[2].validator);
    expect(re.test(VALID_SESSION_ID)).toBe(true);
    expect(re.test("00000000-0000-0000-0000-000000000000")).toBe(true);
    expect(re.test("not-a-uuid")).toBe(false);
    expect(re.test('"injected"')).toBe(false);
    expect(re.test("a1b2c3d4-e5f6-4a8b-9c0d-e1f2a3b4c5d6 extra")).toBe(false);
  });

  it("NO validator contains the string 'bare' (defense vs --bare bypass)", () => {
    for (const v of validators) {
      expect(v.validator.toLowerCase()).not.toContain("bare");
    }
  });
});

// === Phase 02.1 02.1-02 (B3 fix) — claude-version-probe entry shape ===

describe("capability default.json — claude-version-probe entry shape (B3 fix 02.1-02)", () => {
  it("has exactly one arg validator, anchored to ^--version$", () => {
    const spawnScope = findScope("shell:allow-spawn");
    const probeEntry = spawnScope.allow.find(
      (a: any) => a.name === "claude-version-probe",
    );
    expect(probeEntry).toBeTruthy();
    expect(probeEntry.cmd).toBe("claude");
    expect(probeEntry.args).toHaveLength(1);
    expect(probeEntry.args[0].validator).toBe("^--version$");
  });

  it("spawn-probe and execute-probe validator lists are identical (mirroring claude-bin-* invariant)", () => {
    const spawnScope = findScope("shell:allow-spawn");
    const executeScope = findScope("shell:allow-execute");
    const spawnProbe = spawnScope.allow.find(
      (a: any) => a.name === "claude-version-probe",
    );
    const executeProbe = executeScope.allow.find(
      (a: any) => a.name === "claude-version-probe",
    );
    expect(executeProbe).toBeTruthy();
    expect(executeProbe.args).toEqual(spawnProbe.args);
  });

  it("--version validator rejects any other argv (no wildcard slip)", () => {
    const spawnScope = findScope("shell:allow-spawn");
    const probeEntry = spawnScope.allow.find(
      (a: any) => a.name === "claude-version-probe",
    );
    const re = new RegExp(probeEntry.args[0].validator);
    expect(re.test("--version")).toBe(true);
    expect(re.test("--bare")).toBe(false);
    expect(re.test("--version --bare")).toBe(false);
    expect(re.test("--version ; rm -rf /")).toBe(false);
    expect(re.test("")).toBe(false);
    expect(re.test("-V")).toBe(false);
  });

  it("NO validator contains the string 'bare' (defense vs --bare bypass)", () => {
    const spawnScope = findScope("shell:allow-spawn");
    const probeEntry = spawnScope.allow.find(
      (a: any) => a.name === "claude-version-probe",
    );
    for (const v of probeEntry.args) {
      expect(v.validator.toLowerCase()).not.toContain("bare");
    }
  });
});

// === Plan 01-12 H-1 — escapeRegex helper round-trip ===

describe("escapeRegex helper round-trip (plan 01-12 H-1)", () => {
  it("escapes regex metachars in CHAT_RENDERING_HINTS such that anchored `^${escapeRegex(...)}$` matches the literal", () => {
    const re = new RegExp(`^${escapeRegex(CHAT_RENDERING_HINTS)}$`);
    expect(re.test(CHAT_RENDERING_HINTS)).toBe(true);
  });

  it("rejects CHAT_RENDERING_HINTS + ' extra' (anchored match — no trailing slack)", () => {
    const re = new RegExp(`^${escapeRegex(CHAT_RENDERING_HINTS)}$`);
    expect(re.test(CHAT_RENDERING_HINTS + " extra")).toBe(false);
    expect(re.test("prefix " + CHAT_RENDERING_HINTS)).toBe(false);
  });

  it("escapes the full regex metachar set", () => {
    // Sentinel for every metachar plus a literal backslash.
    const sample = ".*+?^${}()|[]\\";
    const escaped = escapeRegex(sample);
    const re = new RegExp(`^${escaped}$`);
    expect(re.test(sample)).toBe(true);
  });
});

// === Plan 01-12 — capability JSON anchors --append-system-prompt to CHAT_RENDERING_HINTS literal ===

describe("capability validator anchors --append-system-prompt value (plan 01-12 GAP-2)", () => {
  const spawnScope = findScope("shell:allow-spawn");
  const freshEntry = spawnScope.allow.find((a: any) => a.name === "claude-bin-fresh");
  const validators: Array<{ validator: string }> = freshEntry.args;

  it("--append-system-prompt validator is immediately followed by an anchored CHAT_RENDERING_HINTS validator (escapeRegex round-trip)", () => {
    // The append flag itself is the validator at position N; its value
    // validator is at N+1. Find the literal index dynamically rather than
    // hard-coding (Option-B-fresh has 15 args).
    const flagIdx = validators.findIndex((v) => v.validator === "^--append-system-prompt$");
    expect(flagIdx).toBeGreaterThanOrEqual(0);
    const valueValidator = validators[flagIdx + 1].validator;
    const re = new RegExp(valueValidator);
    expect(re.test(CHAT_RENDERING_HINTS)).toBe(true);
    expect(re.test(CHAT_RENDERING_HINTS + " hijack")).toBe(false);
    expect(re.test("prefix " + CHAT_RENDERING_HINTS)).toBe(false);
    expect(re.test("")).toBe(false);
  });

  it("NO standalone --system-prompt validator (full replacement is Phase 9 REQ-17 scope)", () => {
    for (const v of validators) {
      // Match `--system-prompt` NOT preceded by `append-`. The append validator
      // looks like `^--append-system-prompt$` and is allowed.
      expect(v.validator).not.toMatch(/(^|[^-])--system-prompt/);
    }
  });
});
