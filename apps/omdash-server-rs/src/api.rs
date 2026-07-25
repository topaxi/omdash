//! HTTP API for querying the relay's state.
//!
//! Exists so that things which used to be decided inside the relay - display
//! power management, most notably - can live where they belong instead. See
//! `apps/omdash-dpms`.

use std::sync::Arc;

use axum::Json;
use axum::extract::State;
use serde::Serialize;

use crate::AppState;
use crate::registry::ClientEntry;

#[derive(Serialize)]
pub struct ClientsResponse {
    clients: Vec<Client>,
}

/// A connected client. Everything but `addr` and the timestamps is `null`
/// until the client has sent its `client/register` message.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Client {
    hostname: Option<String>,
    addr: String,
    arch: Option<String>,
    platform: Option<String>,
    release: Option<String>,
    /// The commit the client was built from, as it reported it. `null` for
    /// clients that predate the field.
    version: Option<serde_json::Value>,
    /// Unix seconds.
    connected_at: u64,
    /// Unix seconds. Stale by at most one heartbeat interval for a live client.
    last_message_at: u64,
}

impl From<ClientEntry> for Client {
    fn from(entry: ClientEntry) -> Self {
        Self {
            hostname: entry.info.hostname,
            addr: entry.addr,
            arch: entry.info.arch,
            platform: entry.info.platform,
            release: entry.info.release,
            version: entry.info.version,
            connected_at: entry.connected_at,
            last_message_at: entry.last_message_at,
        }
    }
}

pub async fn clients(State(state): State<Arc<AppState>>) -> Json<ClientsResponse> {
    Json(ClientsResponse {
        clients: state
            .registry
            .snapshot()
            .into_iter()
            .map(Client::from)
            .collect(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::registry::ClientInfo;
    use serde_json::json;

    #[test]
    fn response_uses_camel_case_keys() {
        let response = ClientsResponse {
            clients: vec![
                ClientEntry {
                    addr: "::ffff:10.0.0.5".to_owned(),
                    info: ClientInfo {
                        hostname: Some("colon".to_owned()),
                        arch: Some("x86_64".to_owned()),
                        platform: Some("linux".to_owned()),
                        release: Some("6.14.0".to_owned()),
                        version: Some(json!({ "commit": "abc1234", "committedAt": 1_700_000_000 })),
                    },
                    connected_at: 1_700_000_000,
                    last_message_at: 1_700_000_042,
                }
                .into(),
            ],
        };

        assert_eq!(
            serde_json::to_value(response).unwrap(),
            json!({
                "clients": [{
                    "hostname": "colon",
                    "addr": "::ffff:10.0.0.5",
                    "arch": "x86_64",
                    "platform": "linux",
                    "release": "6.14.0",
                    "version": { "commit": "abc1234", "committedAt": 1_700_000_000 },
                    "connectedAt": 1_700_000_000,
                    "lastMessageAt": 1_700_000_042
                }]
            })
        );
    }

    #[test]
    fn unregistered_clients_are_reported_with_null_identity() {
        let response = ClientsResponse {
            clients: vec![
                ClientEntry {
                    addr: "10.0.0.9".to_owned(),
                    info: ClientInfo::default(),
                    connected_at: 1,
                    last_message_at: 1,
                }
                .into(),
            ],
        };

        assert_eq!(
            serde_json::to_value(response).unwrap()["clients"][0]["hostname"],
            json!(null)
        );
    }
}
