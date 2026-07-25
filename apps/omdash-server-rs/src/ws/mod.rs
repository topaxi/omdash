pub mod client;
pub mod dashboard;

use std::sync::Arc;

use axum::extract::ws::Message;

/// Serializes a message for the dashboards, or logs and drops it. Serialization
/// only fails on data that cannot be represented as JSON, which no message here
/// contains - the fallible path exists so a bug cannot take the relay down.
pub fn encode<T: serde::Serialize>(message: &T) -> Option<Arc<str>> {
    match serde_json::to_string(message) {
        Ok(json) => Some(Arc::from(json)),
        Err(err) => {
            tracing::error!("Failed to serialize outgoing message: {err}");

            None
        }
    }
}

pub fn text(message: &str) -> Message {
    Message::Text(message.into())
}
