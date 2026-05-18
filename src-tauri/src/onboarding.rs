// src-tauri/src/onboarding.rs — Phase 2 D-03.
// Atomic JSON persistence for ~/.mneme/onboarding-state.json.
//
// Maps to: SPEC REQ-08 (6-step resumable wizard + Finish completion). After
//          `complete()` returns, `load()` MUST surface `completed_at.is_some()`
//          — that boolean is the gate `+layout.svelte` uses to skip the wizard
//          route on subsequent launches.
//
// Pattern: RESEARCH §Pattern 1 (lines 423-444) — sibling of config.rs (same
//          atomic temp+rename + `sync_all()` before rename). T-2-04 (tmp residue)
//          accepted: load_from handles NotFound; next save overwrites the tmp;
//          startup cleanup planned in Plan 02-07 (lib.rs commands).
// D-03:    state persisted ONLY on Next-click after validation; mid-flight
//          typing not persisted. No exploit window for the T-2-12 race.
//
// Why path-injected `load_from` / `save_to` / `complete_in`: tests must run in a
// tempdir so they never clobber the real `~/.mneme/onboarding-state.json` of the
// developer's running mneme. Thin `load()` / `save()` / `complete()` wrappers
// resolve the default path via `home::home_dir()`.
//
// Pattern-duplicated with config.rs::save_to — Phase 3+ may extract a shared
// helper when a third caller (Phase 3 notes write?) lands. Two callers is below
// the YAGNI threshold (see Plan 02-03 Task 2 REFACTOR decision).

use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};

use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingState {
    pub current_step: u8,
    pub vault_path: String,
    pub courses_added: Vec<String>,
    /// ISO-8601 RFC-3339 timestamp from `chrono::Utc::now().to_rfc3339()`.
    /// `Some(_)` is the skip-wizard gate. Stored as a String (not chrono::DateTime
    /// directly) so the JSON shape is human-inspectable without round-tripping.
    pub completed_at: Option<String>,
}

impl Default for OnboardingState {
    fn default() -> Self {
        Self {
            current_step: 1,
            vault_path: String::new(),
            courses_added: Vec::new(),
            completed_at: None,
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum OnboardingError {
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("serde: {0}")]
    Serde(#[from] serde_json::Error),
    #[error("no home directory")]
    NoHome,
}

/// Default state path: ~/.mneme/onboarding-state.json (Pitfall 10 — no `~` literals).
pub fn default_path() -> Result<PathBuf, OnboardingError> {
    Ok(home::home_dir()
        .ok_or(OnboardingError::NoHome)?
        .join(".mneme")
        .join("onboarding-state.json"))
}

pub fn load() -> Result<OnboardingState, OnboardingError> {
    let path = default_path()?;
    load_from(&path)
}

pub fn save(state: &OnboardingState) -> Result<(), OnboardingError> {
    let path = default_path()?;
    save_to(&path, state)
}

pub fn complete() -> Result<OnboardingState, OnboardingError> {
    let path = default_path()?;
    complete_in(&path)
}

/// Read + parse the state at `path`. On `NotFound`, returns
/// `OnboardingState::default()` (first-launch path → start the wizard at step 1).
/// On malformed JSON or any other IO error, returns `Err` — silent corruption
/// would break the SPEC L143-144 resume invariant.
pub fn load_from(path: &Path) -> Result<OnboardingState, OnboardingError> {
    let raw = match fs::read_to_string(path) {
        Ok(s) => s,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            return Ok(OnboardingState::default());
        }
        Err(e) => return Err(OnboardingError::Io(e)),
    };
    let state: OnboardingState = serde_json::from_str(&raw)?;
    Ok(state)
}

/// Atomic temp+rename write. Creates the parent dir idempotently, writes to
/// `{path}.tmp` with `sync_all()` for durability, then `rename`s into place.
/// SIGKILL between `File::create` and `rename` leaves the canonical file
/// untouched (either pre-write absent OR post-rename valid JSON — never partial).
pub fn save_to(path: &Path, state: &OnboardingState) -> Result<(), OnboardingError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let tmp = path.with_extension("json.tmp");
    let bytes = serde_json::to_vec_pretty(state)?;
    {
        let mut f = File::create(&tmp)?;
        f.write_all(&bytes)?;
        f.sync_all()?; // MANDATORY — RESEARCH Pattern 1 L440: bytes durable before rename.
    }
    fs::rename(&tmp, path)?;
    Ok(())
}

/// One-shot Finish transition: load current state (or default if absent), stamp
/// `completed_at = Some(Utc::now().to_rfc3339())`, save atomically, return the
/// resulting state. After this returns, `load_from(path)` MUST return state with
/// `completed_at.is_some()` — that is the skip-wizard gate.
pub fn complete_in(path: &Path) -> Result<OnboardingState, OnboardingError> {
    let mut state = load_from(path)?;
    state.completed_at = Some(Utc::now().to_rfc3339());
    save_to(path, &state)?;
    Ok(state)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn default_state_is_step1_with_no_completed_at() {
        let s = OnboardingState::default();
        assert_eq!(s.current_step, 1);
        assert!(s.completed_at.is_none());
        assert!(s.courses_added.is_empty());
    }

    #[test]
    fn complete_in_sets_iso_timestamp() {
        let td = tempdir().unwrap();
        let path = td.path().join("onboarding-state.json");
        let state = complete_in(&path).unwrap();
        let iso = state.completed_at.expect("completed_at must be Some");
        assert!(iso.contains('T'));
        let reloaded = load_from(&path).unwrap();
        assert!(reloaded.completed_at.is_some());
    }
}
