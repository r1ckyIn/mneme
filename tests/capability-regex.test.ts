import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildClaudeArgs } from "../src/lib/spawn-args.shared";
import { SCRATCH_DIR } from "../src/lib/spawn-args.node";

const capabilityPath = resolve(__dirname, "..", "src-tauri", "capabilities", "default.json");
const capability = JSON.parse(readFileSync(capabilityPath, "utf8"));

function findScope(identifier: string) {
  return capability.permissions.find(
    (p: any) => typeof p === "object" && p.identifier === identifier
  );
}

describe("capability default.json — structural shape", () => {
  it("parses as valid JSON", () => {
    expect(capability).toBeTruthy();
    expect(capability.identifier).toBe("default");
  });

  it("has shell:allow-spawn permission with exactly one allow entry for claude-bin", () => {
    const scope = findScope("shell:allow-spawn");
    expect(scope).toBeTruthy();
    expect(scope.allow).toHaveLength(1);
    expect(scope.allow[0].name).toBe("claude-bin");
    expect(scope.allow[0].cmd).toBe("claude");
  });

  it("has shell:allow-execute permission with the same single allow entry", () => {
    const scope = findScope("shell:allow-execute");
    expect(scope).toBeTruthy();
    expect(scope.allow).toHaveLength(1);
    expect(scope.allow[0].name).toBe("claude-bin");
    expect(scope.allow[0].cmd).toBe("claude");
  });

  it("declares windows: ['main'] (no wildcards)", () => {
    expect(capability.windows).toEqual(["main"]);
    expect(capability.windows).not.toContain("*");
  });
});

describe("capability default.json — args validators", () => {
  const spawnEntry = capability.permissions.find(
    (p: any) => typeof p === "object" && p.identifier === "shell:allow-spawn"
  ).allow[0];
  const validators: Array<{ validator: string }> = spawnEntry.args;

  it("has exactly 13 validators (matches buildClaudeArgs length)", () => {
    expect(validators).toHaveLength(13);
    expect(buildClaudeArgs("any prompt", SCRATCH_DIR).length).toBe(13);
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

  it("every validator matches the value buildClaudeArgs emits at the same index", () => {
    const sampleArgs = buildClaudeArgs("FREE_FORM_PROMPT_HERE", SCRATCH_DIR);
    for (let i = 0; i < validators.length; i++) {
      const re = new RegExp(validators[i].validator);
      expect(re.test(sampleArgs[i])).toBe(true);
    }
  });

  it("--add-dir validator (index 10) rejects out-of-scope paths", () => {
    const re = new RegExp(validators[10].validator);
    expect(re.test(SCRATCH_DIR)).toBe(true);
    expect(re.test("/etc/hosts")).toBe(false);
    expect(re.test("/Users/qinyuan/.ssh/id_rsa")).toBe(false);
    expect(re.test("/Users/qinyuan/.mneme/scratch/../etc")).toBe(false);
    expect(re.test("/")).toBe(false);
    expect(re.test("~")).toBe(false);
  });

  it("--max-turns value validator (index 8) rejects values other than '30'", () => {
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

  it("spawn-args and execute-args validator lists are identical", () => {
    const executeEntry = capability.permissions.find(
      (p: any) => typeof p === "object" && p.identifier === "shell:allow-execute"
    ).allow[0];
    expect(executeEntry.args).toEqual(spawnEntry.args);
  });
});
