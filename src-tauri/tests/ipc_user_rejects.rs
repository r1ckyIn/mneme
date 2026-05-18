// src-tauri/tests/ipc_user_rejects.rs — Phase 2 Plan 02-05 Task 2 GREEN.
//
// The "IPC-level" rejection invariant: any code path that arrives at
// `write_to_vault` with `WriteContext::User` on a `_source/` path is rejected.
// The Tauri command wrapper (Plan 02-07) forwards User-ctx writes into
// `write_to_vault` and surfaces the resulting Err as a string. We assert the
// underlying Err here — Plan 02-07's wrapper is a thin `map_err(|e| e.to_string())`
// shim, so this is the load-bearing invariant.
//
// Maps to: RESEARCH L1098 (IPC-level guard).
// Wave-0 stub: `#[ignore] panic!("Wave 4 implements")`. Plan 02-05 Task 2 lifts
// the rejection invariant up — Wave-4 IPC wrapping (Plan 02-07) just maps the
// returned VaultWriterError::WriteToSourceForbidden through `to_string`.

use std::fs;
use tempfile::tempdir;

use mneme_lib::vault_writer::{write_to_vault, VaultWriterError, WriteContext};

#[test]
fn invoke_write_user_returns_error_value() {
    let td = tempdir().unwrap();
    let root = td.path();
    fs::create_dir_all(root.join("courses/COMP3221/_source/lectures")).unwrap();
    let target = root.join("courses/COMP3221/_source/lectures/x.pdf");
    let err = write_to_vault(&target, b"x", WriteContext::User).unwrap_err();
    assert!(matches!(err, VaultWriterError::WriteToSourceForbidden));
}
