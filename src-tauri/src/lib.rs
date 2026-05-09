// Phase 1 baseline — built up by plan 01-04 with state machine + kill_pgid + hook union.
// This skeleton must already exist so `npm run tauri dev` runs end-to-end after Wave 1.

use std::fs;

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
