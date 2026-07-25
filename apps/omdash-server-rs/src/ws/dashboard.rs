//! Dashboard sockets (`/dashboard`).

use std::net::SocketAddr;
use std::sync::Arc;

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{ConnectInfo, State};
use axum::response::Response;
use futures_util::{SinkExt, StreamExt};
use tokio::sync::broadcast::error::RecvError;

use crate::AppState;
use crate::protocol::{EnvPayload, RegisterPayload, ServerMessage, Unsplash};

pub async fn handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
) -> Response {
    ws.on_upgrade(move |socket| handle(socket, state, addr))
}

async fn handle(socket: WebSocket, state: Arc<AppState>, peer: SocketAddr) {
    tracing::info!("Dashboard connected {peer}");

    // Subscribe before sending the snapshot below, so nothing broadcast while
    // the snapshot is in flight is lost.
    let mut messages = state.fanout.subscribe();
    let (mut ws_tx, mut ws_rx) = socket.split();

    if send_initial_state(&state, &mut ws_tx).await.is_err() {
        tracing::info!("Dashboard disconnected {peer}");

        return;
    }

    loop {
        tokio::select! {
            message = messages.recv() => {
                match message {
                    Ok(message) => {
                        if ws_tx.send(super::text(&message)).await.is_err() {
                            break;
                        }
                    }
                    Err(RecvError::Lagged(skipped)) => {
                        tracing::warn!("Dashboard {peer} fell behind, dropped {skipped} messages");
                    }
                    Err(RecvError::Closed) => break,
                }
            }

            // Dashboards never send anything; this is only here to notice the
            // socket going away while no messages are being broadcast.
            incoming = ws_rx.next() => {
                match incoming {
                    Some(Ok(_)) => {}
                    Some(Err(_)) | None => break,
                }
            }
        }
    }

    tracing::info!("Dashboard disconnected {peer}");
}

/// Brings a freshly connected dashboard up to date: the server-side
/// configuration it needs, followed by one `client/register` per connected
/// host so hosts appear immediately instead of only on their next metric push.
async fn send_initial_state(
    state: &AppState,
    ws_tx: &mut futures_util::stream::SplitSink<WebSocket, Message>,
) -> Result<(), axum::Error> {
    if let Some(env) = super::encode(&ServerMessage::Env {
        payload: EnvPayload {
            unsplash: Unsplash {
                client_id: &state.unsplash_client_id,
            },
            version: omdash_version::version(),
        },
    }) {
        ws_tx.send(super::text(&env)).await?;
    }

    for entry in state.registry.snapshot() {
        // Sockets that have not registered yet have no hostname to key the
        // dashboard's client state on, so there is nothing meaningful to
        // replay for them.
        let Some(hostname) = entry.info.hostname.as_deref() else {
            continue;
        };

        if let Some(message) = super::encode(&ServerMessage::Register {
            client: hostname,
            payload: RegisterPayload {
                hostname,
                arch: entry.info.arch.as_deref(),
                platform: entry.info.platform.as_deref(),
                release: entry.info.release.as_deref(),
                addr: &entry.addr,
                version: entry.info.version.as_ref(),
            },
        }) {
            ws_tx.send(super::text(&message)).await?;
        }
    }

    Ok(())
}
