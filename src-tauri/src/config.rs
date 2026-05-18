// src-tauri/src/config.rs — Phase 2 D-20.
// Atomic JSON persistence for ~/.mneme/config.json.
//
// Maps to: SPEC REQ-16 (settings panel reads vault path), REQ-06 (vault path is
//          the configurable persistent value), REQ-11 (vault move updates this
//          file). Pattern: RESEARCH §Pattern 1 (lines 423-444) atomic temp+rename
//          + `sync_all()` BEFORE rename. Schema versioning reserves a forward-compat
//          path; v1 has only `vault_path` + `schema_version`.
//
// Why path-injected `load_from` / `save_to`: tests must run in a tempdir so they
// never clobber the real `~/.mneme/config.json` of the developer's running mneme.
// Thin `load()` / `save()` wrappers resolve the default path via `home::home_dir()`.
//
// Pattern-duplicated with onboarding.rs::save_to — Phase 3+ may extract a shared
// helper when a third caller (Phase 3 notes write?) lands. Two callers is below
// the YAGNI threshold.

use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

pub const CURRENT_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Config {
    pub vault_path: String,
    pub schema_version: u32,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            vault_path: String::new(),
            schema_version: CURRENT_SCHEMA_VERSION,
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("serde: {0}")]
    Serde(#[from] serde_json::Error),
    #[error("no home directory")]
    NoHome,
    #[error("unsupported schema version: {0}")]
    UnsupportedSchema(u32),
}

/// Default app config path: ~/.mneme/config.json (Pitfall 10 — no `~` literals).
pub fn default_path() -> Result<PathBuf, ConfigError> {
    Ok(home::home_dir()
        .ok_or(ConfigError::NoHome)?
        .join(".mneme")
        .join("config.json"))
}

pub fn load() -> Result<Config, ConfigError> {
    let path = default_path()?;
    load_from(&path)
}

pub fn save(state: &Config) -> Result<(), ConfigError> {
    let path = default_path()?;
    save_to(&path, state)
}

/// Read + parse the config at `path`. On `NotFound`, returns `Config::default()`
/// (first-launch path; the onboarding wizard will create the canonical file on
/// the Finish step). On malformed JSON or unsupported schema, returns `Err`
/// — the caller surfaces this to the user; silent corruption is forbidden.
pub fn load_from(path: &Path) -> Result<Config, ConfigError> {
    let raw = match fs::read_to_string(path) {
        Ok(s) => s,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            return Ok(Config::default());
        }
        Err(e) => return Err(ConfigError::Io(e)),
    };
    let cfg: Config = serde_json::from_str(&raw)?;
    if cfg.schema_version != CURRENT_SCHEMA_VERSION {
        return Err(ConfigError::UnsupportedSchema(cfg.schema_version));
    }
    Ok(cfg)
}

/// Atomic temp+rename write. Creates the parent dir idempotently, writes to
/// `{path}.tmp` with `sync_all()` for durability, then `rename`s into place.
/// SIGKILL between `File::create` and `rename` leaves the canonical file
/// untouched — the tmp may exist as residue (cleaned at startup in Plan 02-07).
pub fn save_to(path: &Path, state: &Config) -> Result<(), ConfigError> {
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

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn load_from_returns_default_when_missing() {
        let td = tempdir().unwrap();
        let path = td.path().join("config.json");
        let cfg = load_from(&path).unwrap();
        assert_eq!(cfg, Config::default());
        assert_eq!(cfg.schema_version, CURRENT_SCHEMA_VERSION);
        assert_eq!(cfg.vault_path, "");
    }

    #[test]
    fn save_then_load_round_trip() {
        let td = tempdir().unwrap();
        let path = td.path().join("config.json");
        let original = Config {
            vault_path: "/Users/qy/StudyVault".to_string(),
            schema_version: 1,
        };
        save_to(&path, &original).unwrap();
        let loaded = load_from(&path).unwrap();
        assert_eq!(loaded, original);
    }

    #[test]
    fn save_writes_atomically_via_tmp_then_rename() {
        let td = tempdir().unwrap();
        let path = td.path().join("config.json");
        let cfg = Config {
            vault_path: "/x".into(),
            schema_version: 1,
        };
        save_to(&path, &cfg).unwrap();
        assert!(path.exists());
        let tmp = path.with_extension("json.tmp");
        assert!(!tmp.exists(), "tmp file must be renamed away");
    }

    #[test]
    fn load_rejects_unsupported_schema() {
        let td = tempdir().unwrap();
        let path = td.path().join("config.json");
        std::fs::write(&path, br#"{"vault_path":"/x","schema_version":99}"#).unwrap();
        let err = load_from(&path).unwrap_err();
        assert!(matches!(err, ConfigError::UnsupportedSchema(99)));
    }

    #[test]
    fn load_rejects_malformed_json() {
        let td = tempdir().unwrap();
        let path = td.path().join("config.json");
        std::fs::write(&path, b"{not json").unwrap();
        let err = load_from(&path).unwrap_err();
        assert!(matches!(err, ConfigError::Serde(_)));
    }
}
