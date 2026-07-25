//! Bookkeeping for the currently connected metric clients.
//!
//! An entry exists for exactly as long as the client's WebSocket is open, so
//! "in the registry" means "connected right now" - which is what `/api/clients`
//! (and therefore the DPMS daemon on the display host) reports.

use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};

use crate::time::unix_seconds;

pub type ClientId = u64;

/// Identity a client reports in its `client/register` message. All optional:
/// a socket is in the registry from the moment it connects, which is before
/// the first message arrives.
#[derive(Clone, Default)]
pub struct ClientInfo {
    pub hostname: Option<String>,
    pub arch: Option<String>,
    pub platform: Option<String>,
    pub release: Option<String>,
}

#[derive(Clone)]
pub struct ClientEntry {
    pub addr: String,
    pub info: ClientInfo,
    pub connected_at: u64,
    pub last_message_at: u64,
}

#[derive(Clone, Default)]
pub struct Registry {
    inner: Arc<Inner>,
}

#[derive(Default)]
struct Inner {
    next_id: AtomicU64,
    clients: Mutex<HashMap<ClientId, ClientEntry>>,
}

impl Registry {
    pub fn insert(&self, addr: String) -> ClientId {
        let id = self.inner.next_id.fetch_add(1, Ordering::Relaxed);
        let now = unix_seconds();

        self.lock().insert(
            id,
            ClientEntry {
                addr,
                info: ClientInfo::default(),
                connected_at: now,
                last_message_at: now,
            },
        );

        id
    }

    pub fn remove(&self, id: ClientId) {
        self.lock().remove(&id);
    }

    pub fn register(&self, id: ClientId, info: ClientInfo) {
        if let Some(entry) = self.lock().get_mut(&id) {
            entry.info = info;
        }
    }

    /// Records that a message arrived and returns the client's hostname, which
    /// every relayed message has to be tagged with. Combined into one call so
    /// the hot path takes the lock once per message rather than twice.
    pub fn touch(&self, id: ClientId) -> Option<String> {
        let mut clients = self.lock();
        let entry = clients.get_mut(&id)?;

        entry.last_message_at = unix_seconds();

        entry.info.hostname.clone()
    }

    pub fn snapshot(&self) -> Vec<ClientEntry> {
        let mut entries: Vec<_> = self.lock().values().cloned().collect();

        entries.sort_by(|a, b| {
            a.info
                .hostname
                .cmp(&b.info.hostname)
                .then_with(|| a.addr.cmp(&b.addr))
        });

        entries
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, HashMap<ClientId, ClientEntry>> {
        // Nothing awaits while holding this lock, so a poisoned mutex can only
        // mean a panic in one of the tiny critical sections below; the map is
        // still structurally sound, so keep serving rather than cascading.
        self.inner
            .clients
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}
