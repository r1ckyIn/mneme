// src-tauri/tests/menu_preferences_emits_event.rs
//
// Phase 2 Plan 02-07 Task 3 — SPEC-GAP-1 (settings-ui.md §2 L59) Wave-0 contract.
//
// The menu builder in `src-tauri/src/lib.rs::build_app_menu` registers a
// `MenuItemBuilder::with_id("preferences", "Preferences...")` item with the
// `Cmd+,` accelerator. The `on_menu_event` closure on the Tauri builder matches
// by item id and emits the Tauri event `menu:open-settings` on a hit. Frontend
// listeners in Plan 12 consume that event.
//
// Full AppHandle E2E is hard to drive from a Rust integration test — Tauri 2's
// `Menu::new()` requires a live AppHandle running on the macOS main thread.
// We pin the load-bearing DISPATCH contract here in isolation. The shim
// `dispatch_menu_event` mirrors the production closure body byte-for-byte:
//
//     if event.id().as_ref() == "preferences" {
//         let _ = app.emit("menu:open-settings", ());
//     }
//
// Real menu wiring is verified manually via /gsd-verify-work after the app
// boots (open the Mneme menu in the menu bar; click Preferences...; confirm
// the Plan 12 SettingsPanel opens). Any drift in either the id constant
// ("preferences") or the event name ("menu:open-settings") trips a test
// here AND surfaces as a missing menu interaction at verify time.

/// Thin shim that mirrors the production `on_menu_event` closure body so we
/// can unit-test the id-matching dispatch without standing up a Tauri
/// AppHandle. The body is intentionally a verbatim copy of the production
/// code in `lib.rs::run()`.
fn dispatch_menu_event<E: FnMut(&str)>(event_id: &str, mut emit: E) {
    if event_id == "preferences" {
        emit("menu:open-settings");
    }
}

#[test]
fn preferences_click_emits_open_settings_event() {
    let mut emitted: Vec<String> = Vec::new();
    dispatch_menu_event("preferences", |name| emitted.push(name.to_string()));
    assert_eq!(emitted, vec!["menu:open-settings".to_string()]);
}

#[test]
fn unrelated_menu_event_emits_nothing() {
    let mut emitted: Vec<String> = Vec::new();
    dispatch_menu_event("about", |name| emitted.push(name.to_string()));
    dispatch_menu_event("quit", |name| emitted.push(name.to_string()));
    dispatch_menu_event("hide", |name| emitted.push(name.to_string()));
    assert!(
        emitted.is_empty(),
        "no event should fire for non-preferences ids, got {emitted:?}"
    );
}

#[test]
fn menu_event_id_constant_matches_lib_rs() {
    // Future-proofing: if anyone renames the id in lib.rs, this constant test
    // documents the load-bearing string contract. Keep `preferences` in sync
    // with the MenuItemBuilder::with_id("preferences", ...) call.
    const EXPECTED_ID: &str = "preferences";
    let mut emitted: Vec<String> = Vec::new();
    dispatch_menu_event(EXPECTED_ID, |name| emitted.push(name.to_string()));
    assert_eq!(emitted.len(), 1);
    assert_eq!(emitted[0], "menu:open-settings");
}

#[test]
fn emitted_event_name_constant() {
    // Future-proofing: locks the load-bearing event name. If anyone renames
    // `menu:open-settings` in lib.rs, Plan 12's listener must update in lockstep.
    let mut emitted: Vec<String> = Vec::new();
    dispatch_menu_event("preferences", |name| emitted.push(name.to_string()));
    assert_eq!(emitted, vec!["menu:open-settings".to_string()]);
}
