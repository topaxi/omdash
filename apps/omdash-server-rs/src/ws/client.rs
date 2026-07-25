//! Metric client sockets (`/` and `/client`).

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use axum::body::Bytes;
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{ConnectInfo, State};
use axum::response::Response;
use futures_util::{SinkExt, StreamExt};
use serde_json::Value;

use crate::AppState;
use crate::protocol::Relayed;
use crate::registry::{ClientId, ClientInfo};

/// Clients are pinged this often and must have answered the previous ping by
/// the time the next one is due, mirroring the Rust client's own 11s read
/// timeout. A host that vanishes without closing its TCP connection (power
/// loss, suspend) is dropped within two intervals, which is what keeps
/// `/api/clients` honest.
const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(10);

pub async fn handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
) -> Response {
    ws.on_upgrade(move |socket| handle(socket, state, addr))
}

async fn handle(socket: WebSocket, state: Arc<AppState>, peer: SocketAddr) {
    // Only the address, no port: this is what the dashboard displays, and
    // `formatIp` in the frontend expects Node's `::ffff:10.0.0.5` form for
    // v4-mapped peers, which is exactly how `IpAddr` renders them.
    let addr = peer.ip().to_string();
    let id = state.registry.insert(addr.clone());

    tracing::info!("Client connected {addr}");

    let (mut ws_tx, mut ws_rx) = socket.split();
    let mut heartbeat = tokio::time::interval(HEARTBEAT_INTERVAL);
    let mut is_alive = true;

    // The first tick of a tokio interval completes immediately; skip it so the
    // first ping goes out after a full interval rather than on connect.
    heartbeat.tick().await;

    loop {
        tokio::select! {
            _ = heartbeat.tick() => {
                if !std::mem::replace(&mut is_alive, false) {
                    tracing::warn!("Client {addr} missed a heartbeat, terminating");
                    break;
                }

                if ws_tx.send(Message::Ping(Bytes::new())).await.is_err() {
                    break;
                }
            }

            incoming = ws_rx.next() => {
                match incoming {
                    Some(Ok(Message::Text(text))) => relay(&state, id, &addr, &text),
                    Some(Ok(Message::Pong(_))) => is_alive = true,
                    Some(Ok(Message::Close(_))) | None => break,
                    Some(Ok(_)) => {}
                    Some(Err(err)) => {
                        tracing::warn!("Client {addr} socket error: {err}");
                        break;
                    }
                }
            }
        }
    }

    state.registry.remove(id);

    tracing::info!("Client disconnected {addr}");
}

/// Forwards one client message to the dashboards, tagged with the client's
/// hostname. `client/register` additionally updates the registry and has the
/// peer address folded into its payload - the client cannot know how the
/// server sees it.
fn relay(state: &AppState, id: ClientId, addr: &str, text: &str) {
    let mut message: Value = match serde_json::from_str(text) {
        Ok(message) => message,
        Err(err) => {
            tracing::warn!("Ignoring unparsable message from {addr}: {err}: {text}");

            return;
        }
    };

    let Some(kind) = message
        .get("type")
        .and_then(Value::as_str)
        .map(str::to_owned)
    else {
        tracing::warn!("Ignoring message without a type from {addr}: {text}");

        return;
    };

    if kind == "client/register"
        && let Some(payload) = message.get_mut("payload").and_then(Value::as_object_mut)
    {
        payload.insert("addr".to_owned(), Value::String(addr.to_owned()));

        let field = |key: &str| payload.get(key).and_then(Value::as_str).map(str::to_owned);

        state.registry.register(
            id,
            ClientInfo {
                hostname: field("hostname"),
                arch: field("arch"),
                platform: field("platform"),
                release: field("release"),
            },
        );
    }

    let hostname = state.registry.touch(id);

    if let Some(encoded) = super::encode(&Relayed {
        kind: &kind,
        client: hostname.as_deref(),
        payload: message.get("payload"),
    }) {
        state.fanout.queue(encoded);
    }
}
