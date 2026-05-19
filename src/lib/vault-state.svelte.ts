// src/lib/vault-state.svelte.ts — Phase 2 reactive singleton for vault metadata.
//
// .svelte.ts SUFFIX IS MANDATORY for module-scope $state (see import-state.svelte.ts
// header comment). Plain `.ts` would silently make $state a non-reactive plain object.
//
// Maps to:
//   - SPEC REQ-06 (persisted vault path + course list)
//   - SPEC REQ-13 (course list drives picker adaptive UI)
//   - 02-CONTEXT.md D-15 (reactive singleton pattern — Phase 1 connection-state shape)
//
// Architecture:
//   - One module-scope `$state` object owned by this file.
//   - course_list is stored sorted alphabetically (setter enforces).
//   - Onboarding flow (Wave 5+) and SettingsPanel (Wave 7+) hydrate via setters
//     after backend IPC reads. The TitlebarMeta and ImportDialog read via
//     `getVaultState()`.

interface VaultStateShape {
  vault_path: string;
  course_list: string[]; // always alphabetical (setters enforce sort)
}

const state = $state<VaultStateShape>({
  vault_path: "",
  course_list: [],
});

export function getVaultState(): VaultStateShape {
  return state;
}

export function setVaultPath(path: string): void {
  state.vault_path = path;
}

/** Replaces `course_list` with the input sorted alphabetically (non-destructive — input is not mutated). */
export function setCourseList(courses: string[]): void {
  state.course_list = [...courses].sort();
}

export function courseCount(): number {
  return state.course_list.length;
}

/** Adds `code` to course_list if not already present; result stays sorted. */
export function addCourse(code: string): void {
  if (state.course_list.includes(code)) return;
  state.course_list = [...state.course_list, code].sort();
}

/** Removes `code` from course_list; no-op if not present. */
export function removeCourse(code: string): void {
  state.course_list = state.course_list.filter((c) => c !== code);
}

/** Test-only — resets state. See import-state.svelte.ts for the pattern rationale. */
export function resetVaultStateForTest(): void {
  state.vault_path = "";
  state.course_list = [];
}
