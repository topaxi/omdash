//! Wire types for everything the dashboard receives.
//!
//! The frontend dispatches each message straight into Redux as an action (see
//! `apps/omdash-frontend/src/store/reducers/`), so `type`, `client` and the
//! payload keys are load-bearing. `clients.reducer.ts` ignores any client
//! message whose `client` field is missing, which is why relaying a message
//! from a socket that has not registered yet is a no-op by design.

use serde::Serialize;
use serde_json::Value;

/// A client message forwarded verbatim, tagged with the hostname it came from.
#[derive(Serialize)]
pub struct Relayed<'a> {
    #[serde(rename = "type")]
    pub kind: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub client: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payload: Option<&'a Value>,
}

/// Messages the server itself originates.
#[derive(Serialize)]
#[serde(tag = "type")]
pub enum ServerMessage<'a> {
    #[serde(rename = "server/env")]
    Env { payload: EnvPayload<'a> },
    #[serde(rename = "server/ping")]
    Ping { payload: PingPayload<'a> },
    /// Replay of an already-connected client, sent to a dashboard when it
    /// connects so it does not have to wait for the next metric push to learn
    /// which hosts are up.
    #[serde(rename = "client/register")]
    Register {
        client: &'a str,
        payload: RegisterPayload<'a>,
    },
}

#[derive(Serialize)]
pub struct EnvPayload<'a> {
    pub unsplash: Unsplash<'a>,
    /// The commit the relay itself was built from. The dashboard compares
    /// each client's reported version against this one to decide which hosts
    /// are running older code.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<omdash_version::Version>,
}

#[derive(Serialize)]
pub struct Unsplash<'a> {
    pub client_id: &'a str,
}

#[derive(Serialize)]
pub struct PingPayload<'a> {
    pub timestamp: u64,
    pub host: &'a str,
    pub ip: &'a str,
    pub time: f64,
}

#[derive(Serialize)]
pub struct RegisterPayload<'a> {
    pub hostname: &'a str,
    pub arch: Option<&'a str>,
    pub platform: Option<&'a str>,
    pub release: Option<&'a str>,
    pub addr: &'a str,
    /// Relayed back exactly as the client sent it, rather than re-typed here:
    /// the relay has no reason to interpret it, and clients that predate the
    /// field simply have none.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<&'a Value>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn relayed_carries_client_and_payload() {
        let payload = json!({ "uptime": 42.0 });
        let json = serde_json::to_value(Relayed {
            kind: "client/metric",
            client: Some("ompi"),
            payload: Some(&payload),
        })
        .unwrap();

        assert_eq!(
            json,
            json!({
                "type": "client/metric",
                "client": "ompi",
                "payload": { "uptime": 42.0 }
            })
        );
    }

    #[test]
    fn relayed_omits_unknown_client() {
        let payload = json!({});
        let json = serde_json::to_value(Relayed {
            kind: "client/metric",
            client: None,
            payload: Some(&payload),
        })
        .unwrap();

        assert!(json.get("client").is_none());
    }

    #[test]
    fn relayed_omits_absent_payload() {
        let json = serde_json::to_value(Relayed {
            kind: "client/unregister",
            client: Some("ompi"),
            payload: None,
        })
        .unwrap();

        assert_eq!(
            json,
            json!({ "type": "client/unregister", "client": "ompi" })
        );
    }

    #[test]
    fn env_matches_node_shape() {
        let json = serde_json::to_value(ServerMessage::Env {
            payload: EnvPayload {
                unsplash: Unsplash { client_id: "abc" },
                version: None,
            },
        })
        .unwrap();

        assert_eq!(
            json,
            json!({
                "type": "server/env",
                "payload": { "unsplash": { "client_id": "abc" } }
            })
        );
    }

    #[test]
    fn env_carries_the_relay_version() {
        let json = serde_json::to_value(ServerMessage::Env {
            payload: EnvPayload {
                unsplash: Unsplash { client_id: "" },
                version: Some(omdash_version::Version {
                    commit: "cf3ea55bf18aa2dbc6985900bc1c5ee983f94085",
                    committed_at: 1_700_000_000,
                }),
            },
        })
        .unwrap();

        assert_eq!(
            json["payload"]["version"],
            json!({
                "commit": "cf3ea55bf18aa2dbc6985900bc1c5ee983f94085",
                "committedAt": 1_700_000_000
            })
        );
    }

    #[test]
    fn ping_matches_node_shape() {
        let json = serde_json::to_value(ServerMessage::Ping {
            payload: PingPayload {
                timestamp: 1_700_000_000,
                host: "topaxi.ch",
                ip: "1.2.3.4",
                time: 12.3,
            },
        })
        .unwrap();

        assert_eq!(
            json,
            json!({
                "type": "server/ping",
                "payload": {
                    "timestamp": 1_700_000_000,
                    "host": "topaxi.ch",
                    "ip": "1.2.3.4",
                    "time": 12.3
                }
            })
        );
    }

    #[test]
    fn register_snapshot_is_tagged_with_the_client() {
        let json = serde_json::to_value(ServerMessage::Register {
            client: "colon",
            payload: RegisterPayload {
                hostname: "colon",
                arch: Some("x86_64"),
                platform: Some("linux"),
                release: Some("6.14.0"),
                addr: "::ffff:10.0.0.5",
                version: None,
            },
        })
        .unwrap();

        assert_eq!(
            json,
            json!({
                "type": "client/register",
                "client": "colon",
                "payload": {
                    "hostname": "colon",
                    "arch": "x86_64",
                    "platform": "linux",
                    "release": "6.14.0",
                    "addr": "::ffff:10.0.0.5"
                }
            })
        );
    }

    #[test]
    fn register_snapshot_replays_the_client_version_verbatim() {
        let version = json!({ "commit": "abc1234", "committedAt": 1_700_000_000 });
        let json = serde_json::to_value(ServerMessage::Register {
            client: "colon",
            payload: RegisterPayload {
                hostname: "colon",
                arch: None,
                platform: None,
                release: None,
                addr: "10.0.0.5",
                version: Some(&version),
            },
        })
        .unwrap();

        assert_eq!(json["payload"]["version"], version);
    }
}
