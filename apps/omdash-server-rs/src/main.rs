//! Relay between the omdash metric clients and the dashboards.
//!
//! Clients connect to `/` (or `/client`) and push metrics; dashboards connect
//! to `/dashboard` and receive every client message tagged with the host it
//! came from, plus the server's own `server/env` and `server/ping` messages.
//! `/api/clients` reports who is currently connected.

mod api;
mod fanout;
mod ping;
mod protocol;
mod registry;
mod time;
mod ws;

use std::net::SocketAddr;
use std::sync::Arc;

use axum::Router;
use axum::routing::get;
use tokio::net::TcpListener;
use tokio::signal::unix::{SignalKind, signal};

use fanout::Fanout;
use registry::Registry;

const DEFAULT_PORT: u16 = 3200;

pub struct AppState {
    registry: Registry,
    fanout: Arc<Fanout>,
    unsplash_client_id: String,
}

// Single-threaded, like the client: this relay forwards a few small JSON
// messages per second and spends the rest of its life parked in epoll.
#[tokio::main(flavor = "current_thread")]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    let fanout = Arc::new(Fanout::default());
    let state = Arc::new(AppState {
        registry: Registry::default(),
        fanout: fanout.clone(),
        unsplash_client_id: std::env::var("OMDASH_UNSPLASH_CLIENT_ID").unwrap_or_default(),
    });

    tokio::spawn(fanout.clone().run());

    for host in ping::hosts() {
        tokio::spawn(ping::run(host, fanout.clone()));
    }

    let app = Router::new()
        .route("/", get(ws::client::handler))
        .route("/client", get(ws::client::handler))
        .route("/dashboard", get(ws::dashboard::handler))
        .route("/api/clients", get(api::clients))
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port()));
    let listener = TcpListener::bind(addr).await?;

    tracing::info!("Listening on {}", listener.local_addr()?);

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await?;

    Ok(())
}

fn port() -> u16 {
    std::env::var("PORT")
        .ok()
        .and_then(|port| port.parse().ok())
        .unwrap_or(DEFAULT_PORT)
}

async fn shutdown_signal() {
    let mut sigint = signal(SignalKind::interrupt()).expect("failed to install SIGINT handler");
    let mut sigterm = signal(SignalKind::terminate()).expect("failed to install SIGTERM handler");

    tokio::select! {
        _ = sigint.recv() => {}
        _ = sigterm.recv() => {}
    }

    tracing::info!("Shutting down");
}
