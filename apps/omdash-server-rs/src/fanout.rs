//! Fan-out of messages to every connected dashboard.

use std::sync::{Arc, Mutex};
use std::time::Duration;

use tokio::sync::broadcast;

/// How long relayed client messages are held before being released to the
/// dashboards. Clients push metrics on their own timers, so without this they
/// arrive as a steady dribble of individual sends; batching them into one
/// burst per window keeps the dashboard's render work clustered.
const FLUSH_INTERVAL: Duration = Duration::from_secs(2);

/// Messages buffered per dashboard before it is considered hopelessly behind
/// and gets skipped forward. One flush window's worth of clients times a few
/// metrics each fits comfortably.
const CHANNEL_CAPACITY: usize = 256;

pub struct Fanout {
    tx: broadcast::Sender<Arc<str>>,
    queue: Mutex<Vec<Arc<str>>>,
}

impl Default for Fanout {
    fn default() -> Self {
        let (tx, _) = broadcast::channel(CHANNEL_CAPACITY);

        Self {
            tx,
            queue: Mutex::new(Vec::new()),
        }
    }
}

impl Fanout {
    pub fn subscribe(&self) -> broadcast::Receiver<Arc<str>> {
        self.tx.subscribe()
    }

    /// Queues a message for the next flush.
    pub fn queue(&self, message: Arc<str>) {
        self.lock().push(message);
    }

    /// Sends a message to the dashboards right away, bypassing the queue.
    /// Used for server-originated messages, which are already paced by
    /// whatever produces them.
    pub fn send(&self, message: Arc<str>) {
        // An error here only means no dashboard is connected.
        let _ = self.tx.send(message);
    }

    pub async fn run(self: Arc<Self>) {
        let mut ticker = tokio::time::interval(FLUSH_INTERVAL);

        loop {
            ticker.tick().await;

            let messages = std::mem::take(&mut *self.lock());

            for message in messages {
                let _ = self.tx.send(message);
            }
        }
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, Vec<Arc<str>>> {
        self.queue
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}
