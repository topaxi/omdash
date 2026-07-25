use std::time::{SystemTime, UNIX_EPOCH};

/// Seconds since the unix epoch, the timestamp unit both the dashboard's ping
/// reducer and `/api/clients` use.
pub fn unix_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}
