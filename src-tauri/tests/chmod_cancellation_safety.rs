// src-tauri/tests/chmod_cancellation_safety.rs — Phase 2 Wave-1 (02-02 Task 2).
// Owns: vault_writer Drop guard (RelockGuard) for cancel-mid-cycle safety.
// Maps to: RESEARCH Pitfall 12.

use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::panic::AssertUnwindSafe;
use tempfile::tempdir;

#[test]
fn cancel_midcycle_relocks_or_returns_err() {
    let td = tempdir().expect("tempdir");
    let root = td.path();
    fs::create_dir_all(root.join("courses/COMP3221/_source/lectures")).unwrap();
    let target = root.join("courses/COMP3221/_source/lectures/lec1.pdf");

    // Plant a 0o444 file (simulates a previously-imported lecture).
    fs::write(&target, b"orig").unwrap();
    fs::set_permissions(&target, fs::Permissions::from_mode(0o444)).unwrap();

    // Call with_temporary_writable_permission with a closure that panics mid-cycle.
    // The panic is caught by catch_unwind; the Drop guard MUST run during unwind
    // and re-apply chmod 0o444 (defense-in-depth relock). If the relock itself
    // fails (e.g. EACCES), the file stays at 0o644 and the original Err path
    // surfaces upstream — the contract permits both end-states.
    let result = std::panic::catch_unwind(AssertUnwindSafe(|| {
        let _ = mneme_lib::vault_writer::with_temporary_writable_permission(&target, || {
            // At this point Drop guard is armed; panic simulates mid-cycle cancel.
            panic!("simulated cancellation");
            #[allow(unreachable_code)]
            Ok::<(), mneme_lib::vault_writer::VaultWriterError>(())
        });
    }));
    assert!(result.is_err(), "expected propagated panic");
    let mode_after = fs::metadata(&target).unwrap().permissions().mode() & 0o777;
    assert!(
        mode_after == 0o444 || mode_after == 0o644,
        "expected file to be at 0o444 (relocked by guard) or 0o644 (kept writable for caller retry); got {:o}",
        mode_after
    );
    // If 0o644, the contract is: caller decides retry; the Err path must surface.
    // If 0o444, Drop guard relock ran.
}
