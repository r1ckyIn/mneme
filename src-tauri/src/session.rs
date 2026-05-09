// src-tauri/src/session.rs — extension-friendly subprocess registry per RESEARCH §8 Risk 1.
//
// Phase 1 ships the HashMap shape so Phase 3 (multi-session) can insert more
// entries with no rip-out. Phase 1 always has 0 or 1 entry; SessionId is
// hard-coded as 1 in the lib.rs invoke handlers.
//
// kill_all() is the load-bearing method — both WindowEvent::CloseRequested
// and RunEvent::ExitRequested hooks call it. drain_all() empties the map on
// first call, so the second hook invocation is a safe no-op (idempotent).

use std::collections::HashMap;
use std::sync::Mutex;

pub type SessionId = u32;

pub struct ChildHandle {
    pub pid: u32,
    // Phase 3 will add: resume_token: Option<String>, spawned_at: Instant, ...
    // DO NOT add fields in Phase 1 — Phase 3 plan-phase decides the schema.
}

pub struct SessionRegistry {
    inner: Mutex<HashMap<SessionId, ChildHandle>>,
}

impl SessionRegistry {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(HashMap::new()),
        }
    }

    pub fn register(&self, id: SessionId, handle: ChildHandle) {
        self.inner.lock().unwrap().insert(id, handle);
    }

    pub fn drain_one(&self, id: SessionId) -> Option<ChildHandle> {
        self.inner.lock().unwrap().remove(&id)
    }

    pub fn drain_all(&self) -> Vec<ChildHandle> {
        std::mem::take(&mut *self.inner.lock().unwrap())
            .into_values()
            .collect()
    }

    pub fn kill_all(&self) {
        for h in self.drain_all() {
            crate::kill_pgid(h.pid);
        }
    }
}

impl Default for SessionRegistry {
    fn default() -> Self {
        Self::new()
    }
}
