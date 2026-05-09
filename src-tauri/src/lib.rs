// Phase 1 baseline — built up by plan 01-04 with state machine + kill_pgid + hook union.
// This skeleton must already exist so `npm run tauri dev` runs end-to-end after Wave 1.

mod session;

pub use session::{ChildHandle, SessionId, SessionRegistry};

use std::fs;

// Stub — Task 2 replaces with the real nix::killpg implementation.
// SessionRegistry::kill_all() calls this; keeping the symbol satisfies the cargo check
// after Task 1 lands the module wiring without yet implementing the kill path.
pub fn kill_pgid(_pid_u32: u32) {
    // Intentionally empty in Task 1; Task 2 implements with nix::killpg.
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|_app| {
            // Auto-create ~/.mneme/scratch/ on first launch — REQ-10 --add-dir target;
            // create_dir_all is idempotent (silent no-op if path already exists).
            if let Some(home) = home::home_dir() {
                let _ = fs::create_dir_all(home.join(".mneme/scratch"));
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
