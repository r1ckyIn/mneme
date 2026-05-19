// src-tauri/tests/cancel_all_nonblocking.rs
//
// WR-003 (Phase 02.1 02.1-REVIEW.md): cancel_all detach-from-event-loop pin.
//
// Regression pin for the `cancel_all` discipline fixed in Phase 02.1 (commit
// c138e94 — `src-tauri/src/lib.rs` lines 913-958). The Tauri lifecycle
// handlers (`WindowEvent::CloseRequested` + `RunEvent::ExitRequested`) now
// spawn `cancel_all()` via `tauri::async_runtime::spawn(async move { ... })`
// instead of `tauri::async_runtime::block_on(...)`. The Tauri event-loop
// dispatch path itself is not testable in isolation (no Tauri AppHandle
// available outside the runtime), so this test pins the LOWER half of the
// contract: `import_controller::cancel_all` is async, observably
// non-blocking, and flips every registered CancellationToken when awaited.
//
// What "non-blocking" means here:
//   `cancel_all().await` completes well within a tight tokio::time::timeout
//   even when N operations are registered, because the implementation only
//   takes the registry Mutex, iterates `op.cancel_token.cancel()` for each
//   entry (CancellationToken::cancel is itself non-blocking — it just flips
//   an AtomicBool that subsequent .is_cancelled() reads observe), and drops
//   the guard. No I/O. No subprocess wait. No yield-to-runtime needed beyond
//   the Mutex acquisition.
//
// Why this pin matters operationally:
//   If a future maintainer adds a slow `.await` inside `cancel_all` (e.g.
//   flushing partial-import progress to disk on shutdown), this test catches
//   the regression by failing the timeout. The WR-003 fix exists precisely
//   because such growth must NOT block the Tauri event loop on Cmd+Q —
//   detaching via async_runtime::spawn in the lifecycle handler shields the
//   event loop, but only if cancel_all itself stays fast OR stays detached.

use std::sync::Arc;
use std::time::Duration;

use mneme_lib::import_controller::{ImportController, ImportOperation};
use tokio::time::timeout;
use tokio_util::sync::CancellationToken;

/// Plant N pending `ImportOperation` entries directly into the controller's
/// registry so we exercise the `cancel_all` loop body without spinning the
/// full `start_import_inner` task pipeline. The cancel tokens are returned
/// so the test can assert each one flipped post-await.
async fn plant_operations(controller: &Arc<ImportController>, n: usize) -> Vec<CancellationToken> {
    let mut tokens = Vec::with_capacity(n);
    let mut reg = controller.registry.lock().await;
    for i in 0..n {
        let token = CancellationToken::new();
        tokens.push(token.clone());
        reg.insert(
            format!("op-{i}"),
            ImportOperation {
                cancel_token: token,
                total: 0,
                started_at_iso: "1970-01-01T00:00:00Z".to_string(),
            },
        );
    }
    tokens
}

#[tokio::test]
async fn cancel_all_completes_within_tight_timeout_with_no_operations() {
    // Empty-registry baseline. The lock-acquire-then-iterate-empty path must
    // be effectively instantaneous; 50ms is a generous CI-tolerant bound that
    // still catches a regression to a synchronous file flush.
    let controller = Arc::new(ImportController::new());
    let result = timeout(Duration::from_millis(50), controller.cancel_all()).await;
    assert!(
        result.is_ok(),
        "cancel_all on empty registry must complete inside 50ms; got timeout — WR-003 contract violated"
    );
}

#[tokio::test]
async fn cancel_all_completes_within_tight_timeout_with_many_pending_operations() {
    // 100 registered operations is far beyond any realistic concurrent import
    // load (single-user desktop app per CLAUDE.md). If cancel_all stays an
    // O(N) flip loop on AtomicBools as designed, 100 entries land in
    // sub-millisecond wall time. 50ms timeout is a deliberately wide guard
    // to soak up CI scheduler jitter without admitting a regression to a
    // blocking I/O path.
    let controller = Arc::new(ImportController::new());
    let tokens = plant_operations(&controller, 100).await;

    let result = timeout(Duration::from_millis(50), controller.cancel_all()).await;
    assert!(
        result.is_ok(),
        "cancel_all on 100 pending operations must complete inside 50ms; got timeout — WR-003 contract violated"
    );

    // Every planted token observably flipped — the contract is BOTH fast
    // AND complete. A future "optimisation" that early-returns without
    // visiting every entry would pass the timeout assertion but fail this.
    for (i, token) in tokens.iter().enumerate() {
        assert!(
            token.is_cancelled(),
            "token #{i} must be cancelled after cancel_all().await"
        );
    }
}

#[tokio::test]
async fn cancel_all_is_idempotent_on_repeated_invocations() {
    // The Tauri lifecycle handlers wire `cancel_all()` into BOTH
    // `WindowEvent::CloseRequested` and `RunEvent::ExitRequested`. On some
    // macOS versions Tauri fires both, so the second call must observably
    // no-op without panicking and without stalling. Pins the surface stays
    // safe-to-double-fire after WR-003 detach.
    let controller = Arc::new(ImportController::new());
    let tokens = plant_operations(&controller, 10).await;

    // First invocation — flips every token.
    timeout(Duration::from_millis(50), controller.cancel_all())
        .await
        .expect("first cancel_all must complete inside 50ms");
    for token in &tokens {
        assert!(token.is_cancelled(), "tokens flipped after first cancel_all");
    }

    // Second invocation — must still complete fast even though tokens are
    // already cancelled. CancellationToken::cancel() is itself idempotent
    // (per tokio_util's contract), so this is a regression pin that the
    // outer iteration also stays non-blocking on already-cancelled entries.
    timeout(Duration::from_millis(50), controller.cancel_all())
        .await
        .expect("second cancel_all must also complete inside 50ms (idempotency)");
}
