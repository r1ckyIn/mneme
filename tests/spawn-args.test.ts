import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildClaudeArgs,
  MAX_TURNS,
  SCRATCH_DIR_REGEX,
  SESSION_ID_REGEX,
  CHAT_RENDERING_HINTS,
  SYSTEM_PROMPT_MAX_LEN,
} from "../src/lib/spawn-args.shared";
import { SCRATCH_DIR } from "../src/lib/spawn-args.node";

const SAMPLE_SCRATCH = "/Users/qinyuan/.mneme/scratch";
const VALID_SESSION_ID = "a1b2c3d4-e5f6-4a8b-9c0d-e1f2a3b4c5d6";

describe("buildClaudeArgs SSOT (shared, browser-safe)", () => {
  it("returns exactly 13 elements", () => {
    expect(buildClaudeArgs("hello", SAMPLE_SCRATCH).length).toBe(13);
  });

  it("places --print as the first positional", () => {
    expect(buildClaudeArgs("hello", SAMPLE_SCRATCH)[0]).toBe("--print");
  });

  it("locks --permission-mode bypassPermissions at index 1-2", () => {
    const args = buildClaudeArgs("hello", SAMPLE_SCRATCH);
    expect(args[1]).toBe("--permission-mode");
    expect(args[2]).toBe("bypassPermissions");
  });

  it("locks --output-format stream-json at index 3-4", () => {
    const args = buildClaudeArgs("hello", SAMPLE_SCRATCH);
    expect(args[3]).toBe("--output-format");
    expect(args[4]).toBe("stream-json");
  });

  it("places --max-turns immediately before its value '30'", () => {
    const args = buildClaudeArgs("hello", SAMPLE_SCRATCH);
    const idx = args.indexOf("--max-turns");
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(args[idx + 1]).toBe("30");
    expect(MAX_TURNS).toBe("30");
  });

  it("places --add-dir immediately before the scratchDir parameter (which must match SCRATCH_DIR_REGEX)", () => {
    const args = buildClaudeArgs("hello", SAMPLE_SCRATCH);
    const idx = args.indexOf("--add-dir");
    expect(idx).toBeGreaterThanOrEqual(0);
    const pathArg = args[idx + 1];
    expect(new RegExp(SCRATCH_DIR_REGEX).test(pathArg)).toBe(true);
    expect(pathArg).toBe(SAMPLE_SCRATCH);
  });

  it("includes --exclude-dynamic-system-prompt-sections", () => {
    expect(buildClaudeArgs("hello", SAMPLE_SCRATCH)).toContain("--exclude-dynamic-system-prompt-sections");
  });

  it("FORBIDS --bare (and any string containing 'bare')", () => {
    const args = buildClaudeArgs("hello", SAMPLE_SCRATCH);
    expect(args).not.toContain("--bare");
    expect(args.filter((a) => a.includes("bare"))).toHaveLength(0);
  });

  it("FORBIDS --system-prompt with the default opts (full-replacement is Phase 9 REQ-17 scope)", () => {
    // Plan 01-12: --system-prompt remains forbidden at the SSOT layer.
    // --append-system-prompt is now ALLOWED but only when opts.appendSystemPrompt
    // is explicitly passed — the default-opts call still emits neither.
    const args = buildClaudeArgs("hello", SAMPLE_SCRATCH);
    expect(args).not.toContain("--system-prompt");
    expect(args).not.toContain("--append-system-prompt");
  });

  it("FORBIDS --model (Round 5 A-13 — model pill is decorative; CLI uses account default)", () => {
    const args = buildClaudeArgs("hello", SAMPLE_SCRATCH);
    expect(args).not.toContain("--model");
  });

  it("places the prompt as the LAST positional argument", () => {
    const sentinel = "WHAT_IS_2_PLUS_2_SENTINEL";
    const args = buildClaudeArgs(sentinel, SAMPLE_SCRATCH);
    expect(args[args.length - 1]).toBe(sentinel);
  });

  it("preserves whitespace and special chars in the prompt argument verbatim", () => {
    const tricky = "hello world\n  with  $shell-meta\\backslash";
    const args = buildClaudeArgs(tricky, SAMPLE_SCRATCH);
    expect(args[args.length - 1]).toBe(tricky);
  });

  it("SCRATCH_DIR_REGEX rejects out-of-scope paths", () => {
    const re = new RegExp(SCRATCH_DIR_REGEX);
    expect(re.test("/etc/hosts")).toBe(false);
    expect(re.test("/Users/qinyuan/.ssh/id_rsa")).toBe(false);
    expect(re.test("/Users/qinyuan/.mneme/scratch/../etc")).toBe(false);
    expect(re.test("/Users/qinyuan/.mneme/scratch")).toBe(true);
  });

  it("SCRATCH_DIR_REGEX rejects non-portable username shapes (WR-04)", () => {
    // The tightened regex uses [A-Za-z0-9_.\-]+ — POSIX portable-name class.
    const re = new RegExp(SCRATCH_DIR_REGEX);
    // Space-only username is rejected (was admitted by the prior [^/]+ body).
    expect(re.test("/Users/ /.mneme/scratch")).toBe(false);
    // Username containing a space is rejected.
    expect(re.test("/Users/qin yuan/.mneme/scratch")).toBe(false);
    // Common valid macOS usernames pass.
    expect(re.test("/Users/qinyuan/.mneme/scratch")).toBe(true);
    expect(re.test("/Users/test.user/.mneme/scratch")).toBe(true);
    expect(re.test("/Users/test-user/.mneme/scratch")).toBe(true);
    expect(re.test("/Users/test_user/.mneme/scratch")).toBe(true);
  });

  it("REJECTS scratchDir that does not match SCRATCH_DIR_REGEX (defense-in-depth)", () => {
    expect(() => buildClaudeArgs("hello", "/etc/hosts")).toThrow(/scratchDir/i);
    expect(() => buildClaudeArgs("hello", "/Users/qinyuan/.ssh")).toThrow(/scratchDir/i);
    expect(() => buildClaudeArgs("hello", "")).toThrow(/scratchDir/i);
  });
});

describe("spawn-args.shared.ts — browser safety (Cycle-2 Codex HIGH-1)", () => {
  const sharedPath = resolve(__dirname, "..", "src/lib/spawn-args.shared.ts");
  const sharedSource = readFileSync(sharedPath, "utf8");

  it("contains ZERO Node imports (os / fs / path / node: variants)", () => {
    expect(sharedSource).not.toMatch(/from\s+["']os["']/);
    expect(sharedSource).not.toMatch(/from\s+["']node:os["']/);
    expect(sharedSource).not.toMatch(/from\s+["']fs["']/);
    expect(sharedSource).not.toMatch(/from\s+["']node:fs["']/);
    expect(sharedSource).not.toMatch(/from\s+["']path["']/);
    expect(sharedSource).not.toMatch(/from\s+["']node:path["']/);
  });

  it("does not call homedir() or process.env (browser-bundle hostile)", () => {
    expect(sharedSource).not.toMatch(/\bhomedir\s*\(/);
    expect(sharedSource).not.toMatch(/\bprocess\.env\b/);
  });
});

describe("spawn-args.node.ts — Node consumer contract (gen-capabilities.ts only)", () => {
  const nodePath = resolve(__dirname, "..", "src/lib/spawn-args.node.ts");
  const nodeSource = readFileSync(nodePath, "utf8");

  it("imports homedir from node:os (Node-only)", () => {
    expect(nodeSource).toMatch(/import\s*\{\s*homedir\s*\}\s*from\s+["']node:os["']/);
  });

  it("exports SCRATCH_DIR derived from homedir()", () => {
    expect(nodeSource).toMatch(/export\s+const\s+SCRATCH_DIR\s*=\s*`\$\{homedir\(\)\}\/\.mneme\/scratch`/);
  });

  it("exported SCRATCH_DIR matches SCRATCH_DIR_REGEX (path discipline)", () => {
    expect(new RegExp(SCRATCH_DIR_REGEX).test(SCRATCH_DIR)).toBe(true);
  });
});

// === Plan 01-12 — buildClaudeArgs resume + hints opts ===

describe("buildClaudeArgs resume + hints opts (plan 01-12)", () => {
  it("default opts undefined → 13 args (existing baseline preserved)", () => {
    const args = buildClaudeArgs("hello", SAMPLE_SCRATCH);
    expect(args).toHaveLength(13);
    expect(args).not.toContain("--resume");
    expect(args).not.toContain("--append-system-prompt");
  });

  it("appendSystemPrompt only → 15 args; --append-system-prompt + value appear AFTER --exclude-dynamic-system-prompt-sections and BEFORE the prompt", () => {
    const args = buildClaudeArgs("hello", SAMPLE_SCRATCH, {
      appendSystemPrompt: CHAT_RENDERING_HINTS,
    });
    expect(args).toHaveLength(15);
    const excludeIdx = args.indexOf("--exclude-dynamic-system-prompt-sections");
    const appendIdx = args.indexOf("--append-system-prompt");
    expect(appendIdx).toBe(excludeIdx + 1);
    expect(args[appendIdx + 1]).toBe(CHAT_RENDERING_HINTS);
    expect(args[args.length - 1]).toBe("hello"); // prompt remains last
  });

  it("resumeSessionId only → 15 args; --resume + id appear at positions 1-2 (after --print)", () => {
    const args = buildClaudeArgs("hello", SAMPLE_SCRATCH, {
      resumeSessionId: VALID_SESSION_ID,
    });
    expect(args).toHaveLength(15);
    expect(args[0]).toBe("--print");
    expect(args[1]).toBe("--resume");
    expect(args[2]).toBe(VALID_SESSION_ID);
  });

  it("both opts → 17 args; order: --print --resume <id> --permission-mode ... --exclude-dynamic-system-prompt-sections --append-system-prompt <hints> <prompt>", () => {
    const args = buildClaudeArgs("hello", SAMPLE_SCRATCH, {
      resumeSessionId: VALID_SESSION_ID,
      appendSystemPrompt: CHAT_RENDERING_HINTS,
    });
    expect(args).toHaveLength(17);
    expect(args[0]).toBe("--print");
    expect(args[1]).toBe("--resume");
    expect(args[2]).toBe(VALID_SESSION_ID);
    expect(args[3]).toBe("--permission-mode");
    expect(args[4]).toBe("bypassPermissions");
    // Tail layout
    const excludeIdx = args.indexOf("--exclude-dynamic-system-prompt-sections");
    expect(args[excludeIdx + 1]).toBe("--append-system-prompt");
    expect(args[excludeIdx + 2]).toBe(CHAT_RENDERING_HINTS);
    expect(args[args.length - 1]).toBe("hello");
  });

  it("rejects malformed resumeSessionId (not SESSION_ID_REGEX-shaped) by throwing", () => {
    expect(() =>
      buildClaudeArgs("hello", SAMPLE_SCRATCH, {
        resumeSessionId: "not-a-uuid",
      }),
    ).toThrow(/resumeSessionId/i);
    expect(() =>
      buildClaudeArgs("hello", SAMPLE_SCRATCH, {
        resumeSessionId: 'has "quotes"',
      }),
    ).toThrow(/resumeSessionId/i);
    expect(() =>
      buildClaudeArgs("hello", SAMPLE_SCRATCH, {
        resumeSessionId: "../escape",
      }),
    ).toThrow(/resumeSessionId/i);
    // Empty string is also rejected by the regex (no zero-length match)
    expect(() =>
      buildClaudeArgs("hello", SAMPLE_SCRATCH, {
        resumeSessionId: "",
      }),
    ).toThrow(/resumeSessionId/i);
  });

  it("CHAT_RENDERING_HINTS string is non-empty AND length ≤ SYSTEM_PROMPT_MAX_LEN AND length ≤ 500", () => {
    expect(CHAT_RENDERING_HINTS.length).toBeGreaterThan(0);
    expect(CHAT_RENDERING_HINTS.length).toBeLessThanOrEqual(SYSTEM_PROMPT_MAX_LEN);
    expect(CHAT_RENDERING_HINTS.length).toBeLessThanOrEqual(500);
  });

  it("SESSION_ID_REGEX accepts Claude CLI session id format but rejects whitespace / quotes / slashes / non-hex", () => {
    const re = new RegExp(SESSION_ID_REGEX);
    expect(re.test(VALID_SESSION_ID)).toBe(true);
    // All-zero UUID is valid format-wise (also serves as the Option-C sentinel
    // value if a future plan promotes to sentinel emission semantics).
    expect(re.test("00000000-0000-0000-0000-000000000000")).toBe(true);
    // Reject malformed shapes
    expect(re.test("not-a-uuid")).toBe(false);
    expect(re.test(" a1b2c3d4-e5f6-4a8b-9c0d-e1f2a3b4c5d6")).toBe(false); // leading space
    expect(re.test('"a1b2c3d4-e5f6-4a8b-9c0d-e1f2a3b4c5d6"')).toBe(false); // wrapping quotes
    expect(re.test("a1b2c3d4/e5f6/4a8b/9c0d/e1f2a3b4c5d6")).toBe(false); // slashes
    expect(re.test("a1b2c3d4-e5f6-4a8b-9c0d-e1f2a3b4XXXX")).toBe(false); // non-hex
    expect(re.test("a1b2c3d4-e5f6-4a8b-9c0d-e1f2a3b4c5")).toBe(false);   // too short
    expect(re.test("a1b2c3d4e5f64a8b9c0de1f2a3b4c5d6")).toBe(false);     // no hyphens
  });

  it("rejects appendSystemPrompt that exceeds SYSTEM_PROMPT_MAX_LEN", () => {
    const tooLong = "x".repeat(SYSTEM_PROMPT_MAX_LEN + 1);
    expect(() =>
      buildClaudeArgs("hello", SAMPLE_SCRATCH, {
        appendSystemPrompt: tooLong,
      }),
    ).toThrow(/appendSystemPrompt/i);
  });

  it("preserves whitespace and special chars in the prompt argument verbatim (with opts)", () => {
    const tricky = "hello world\n  with  $shell-meta\\backslash";
    const args = buildClaudeArgs(tricky, SAMPLE_SCRATCH, {
      resumeSessionId: VALID_SESSION_ID,
      appendSystemPrompt: CHAT_RENDERING_HINTS,
    });
    expect(args[args.length - 1]).toBe(tricky);
  });

  it("still rejects out-of-scope scratchDir even with opts present (defense-in-depth retained)", () => {
    expect(() =>
      buildClaudeArgs("hello", "/etc/hosts", {
        resumeSessionId: VALID_SESSION_ID,
      }),
    ).toThrow(/scratchDir/i);
  });
});

// === Plan 01-12 — KP-04 SSOT defense extension (--system-prompt full-replacement) ===

describe("spawn-args.shared.ts — Phase 9 promotion guard (plan 01-12)", () => {
  const sharedPath = resolve(__dirname, "..", "src/lib/spawn-args.shared.ts");
  const sharedSource = readFileSync(sharedPath, "utf8");

  it("does NOT contain the literal '\"--system-prompt\"' (full-replacement is Phase 9 REQ-17 scope)", () => {
    // The literal --append-system-prompt MAY appear because it differs by the
    // preceding `append-`. The check here is for the standalone full-replacement
    // flag literal only.
    expect(sharedSource).not.toMatch(/"\-\-system-prompt"/);
  });

  it("DOES contain the literal '\"--append-system-prompt\"' (plan 01-12 GAP-2 closure)", () => {
    expect(sharedSource).toMatch(/"\-\-append-system-prompt"/);
  });
});
