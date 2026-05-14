import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildClaudeArgs, MAX_TURNS, SCRATCH_DIR_REGEX } from "../src/lib/spawn-args.shared";
import { SCRATCH_DIR } from "../src/lib/spawn-args.node";

const SAMPLE_SCRATCH = "/Users/qinyuan/.mneme/scratch";

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

  it("FORBIDS --system-prompt and --append-system-prompt (Phase 1 baseline)", () => {
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
