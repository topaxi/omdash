mod battery;
mod cpu;
mod disk;
mod gpu;
mod memory;
mod processes;
mod protocol;
mod temperature;

use std::time::Duration;

use futures_util::{SinkExt, StreamExt};
use tokio::signal::unix::{Signal, SignalKind, signal};
use tokio::sync::{mpsc, watch};
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream};
use tpx_sysmon::battery::BatteryState;
use tpx_sysmon::memory::MemoryState;

use protocol::{ClientMessage, MetricPayload, RegisterPayload};

const HEARTBEAT_TIMEOUT: Duration = Duration::from_secs(11);
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const INITIAL_RECONNECT_DELAY: Duration = Duration::from_secs(1);
const MAX_RECONNECT_DELAY: Duration = Duration::from_secs(32);

type WsSink = futures_util::stream::SplitSink<
    WebSocketStream<MaybeTlsStream<tokio::net::TcpStream>>,
    Message,
>;

#[tokio::main(flavor = "current_thread")]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    let server_host =
        std::env::var("OMDASH_SERVER_HOST").unwrap_or_else(|_| "localhost:3200".to_string());
    let url = format!("ws://{server_host}");

    // Installed once for the whole process rather than per-connection: the
    // reconnect backoff below sleeps between attempts, and a SIGTERM arriving
    // during that sleep (or during connect_async) must still stop the process
    // promptly - otherwise `systemctl stop` hangs until it times out and
    // SIGKILLs us.
    let mut sigint = signal(SignalKind::interrupt()).expect("failed to install SIGINT handler");
    let mut sigterm = signal(SignalKind::terminate()).expect("failed to install SIGTERM handler");

    cpu::init_model().await;

    let mut reconnect_delay = INITIAL_RECONNECT_DELAY;
    loop {
        tracing::info!("Connecting to {url}");
        match run_connection(&url, &mut reconnect_delay, &mut sigint, &mut sigterm).await {
            ConnectionOutcome::ShuttingDown => break,
            ConnectionOutcome::Disconnected => {
                tracing::info!("Connection closed, reconnecting in {reconnect_delay:?}");
                tokio::select! {
                    () = tokio::time::sleep(reconnect_delay) => {}
                    _ = sigint.recv() => break,
                    _ = sigterm.recv() => break,
                }
                reconnect_delay = (reconnect_delay * 2).min(MAX_RECONNECT_DELAY);
            }
        }
    }
}

enum ConnectionOutcome {
    Disconnected,
    ShuttingDown,
}

async fn run_connection(
    url: &str,
    reconnect_delay: &mut Duration,
    sigint: &mut Signal,
    sigterm: &mut Signal,
) -> ConnectionOutcome {
    let ws_stream = tokio::select! {
        result = tokio::time::timeout(CONNECT_TIMEOUT, tokio_tungstenite::connect_async(url)) => match result {
            Ok(Ok((stream, _))) => stream,
            Ok(Err(e)) => {
                tracing::warn!("Connect failed: {e}");
                return ConnectionOutcome::Disconnected;
            }
            Err(_) => {
                tracing::warn!("Connect timed out after {CONNECT_TIMEOUT:?}");
                return ConnectionOutcome::Disconnected;
            }
        },
        _ = sigint.recv() => return ConnectionOutcome::ShuttingDown,
        _ = sigterm.recv() => return ConnectionOutcome::ShuttingDown,
    };
    tracing::info!("Connected");

    // Reset the reconnect backoff now that we have a live connection, so the
    // next drop retries in INITIAL_RECONNECT_DELAY rather than staying pinned
    // at MAX_RECONNECT_DELAY after the boot-time "connection refused" attempts.
    *reconnect_delay = INITIAL_RECONNECT_DELAY;

    let (mut ws_tx, mut ws_rx) = ws_stream.split();
    let (out_tx, mut out_rx) = mpsc::unbounded_channel::<Message>();

    send(&out_tx, &ClientMessage::Register(RegisterPayload {
        arch: std::env::consts::ARCH,
        platform: std::env::consts::OS,
        release: os_release(),
        hostname: hostname(),
    }));

    let metrics_handle = tokio::spawn(run_metric_loops(out_tx.clone()));

    let heartbeat_deadline = tokio::time::sleep(HEARTBEAT_TIMEOUT);
    tokio::pin!(heartbeat_deadline);

    let outcome = loop {
        tokio::select! {
            biased;

            _ = sigint.recv() => {
                tracing::info!("Received SIGINT, unregistering");
                break unregister_and_close(&mut ws_tx).await;
            }
            _ = sigterm.recv() => {
                tracing::info!("Received SIGTERM, unregistering");
                break unregister_and_close(&mut ws_tx).await;
            }

            () = &mut heartbeat_deadline => {
                tracing::warn!("No ping from server within {HEARTBEAT_TIMEOUT:?}, reconnecting");
                break ConnectionOutcome::Disconnected;
            }

            outgoing = out_rx.recv() => {
                match outgoing {
                    Some(msg) => {
                        if ws_tx.send(msg).await.is_err() {
                            break ConnectionOutcome::Disconnected;
                        }
                    }
                    None => break ConnectionOutcome::Disconnected,
                }
            }

            incoming = ws_rx.next() => {
                match incoming {
                    Some(Ok(Message::Ping(payload))) => {
                        heartbeat_deadline.as_mut().reset(tokio::time::Instant::now() + HEARTBEAT_TIMEOUT);
                        let _ = ws_tx.send(Message::Pong(payload)).await;
                    }
                    Some(Ok(Message::Close(_))) | None => {
                        break ConnectionOutcome::Disconnected;
                    }
                    Some(Err(e)) => {
                        tracing::warn!("WebSocket error: {e}");
                        break ConnectionOutcome::Disconnected;
                    }
                    _ => {}
                }
            }
        }
    };

    metrics_handle.abort();
    outcome
}

/// Sends `client/unregister` directly over the sink (bypassing the outgoing
/// queue, since the select loop that drains it is about to exit) and closes
/// the connection, matching the Node client's `unregister()` + process exit.
///
/// Bounded by a short timeout: this runs during shutdown, and a stalled
/// socket (e.g. the server is gone but the TCP connection hasn't noticed
/// yet) must not prevent the process from exiting - `systemctl stop` would
/// otherwise hang until a hard kill.
async fn unregister_and_close(ws_tx: &mut WsSink) -> ConnectionOutcome {
    let _ = tokio::time::timeout(Duration::from_secs(2), async {
        if let Ok(json) = serde_json::to_string(&ClientMessage::Unregister) {
            let _ = ws_tx.send(Message::Text(json.into())).await;
        }
        let _ = ws_tx.close().await;
    })
    .await;
    ConnectionOutcome::ShuttingDown
}

fn send(tx: &mpsc::UnboundedSender<Message>, msg: &ClientMessage) {
    match serde_json::to_string(msg) {
        Ok(json) => {
            let _ = tx.send(Message::Text(json.into()));
        }
        Err(e) => tracing::error!("Failed to serialize outgoing message: {e}"),
    }
}

async fn run_metric_loops(out_tx: mpsc::UnboundedSender<Message>) {
    let (memory_tx, memory_rx) = watch::channel(MemoryState::default());
    let (battery_tx, battery_rx) = watch::channel(BatteryState::default());
    tokio::spawn(async move {
        if let Err(e) = tpx_sysmon::memory::run(memory_tx).await {
            tracing::warn!("Memory service: {e}");
        }
    });
    tokio::spawn(async move {
        if let Err(e) = tpx_sysmon::battery::run(battery_tx).await {
            tracing::warn!("Battery service: {e}");
        }
    });
    let gpu_rx = gpu::spawn();

    tokio::join!(
        interval_immediate(Duration::from_secs(2), {
            let out_tx = out_tx.clone();
            move || {
                send(
                    &out_tx,
                    &ClientMessage::Metric(MetricPayload {
                        cpus: Some(cpu::read_per_core()),
                        load: Some(load_average()),
                        ..Default::default()
                    }),
                );
            }
        }),
        interval_immediate(Duration::from_secs(2), {
            let out_tx = out_tx.clone();
            let gpu_rx = gpu_rx.clone();
            move || {
                send(
                    &out_tx,
                    &ClientMessage::Metric(MetricPayload {
                        gpus: Some(gpu_rx.borrow().clone()),
                        ..Default::default()
                    }),
                );
            }
        }),
        interval_immediate(Duration::from_secs(60), {
            let out_tx = out_tx.clone();
            move || {
                send(
                    &out_tx,
                    &ClientMessage::Metric(MetricPayload {
                        uptime: Some(uptime_seconds()),
                        ..Default::default()
                    }),
                );
            }
        }),
        interval_immediate(Duration::from_secs(2), {
            let out_tx = out_tx.clone();
            let memory_rx = memory_rx.clone();
            move || {
                send(
                    &out_tx,
                    &ClientMessage::Metric(MetricPayload {
                        memory: Some(memory::to_wire(&memory_rx.borrow())),
                        ..Default::default()
                    }),
                );
            }
        }),
        interval_immediate(Duration::from_secs(5), {
            let out_tx = out_tx.clone();
            move || {
                send(
                    &out_tx,
                    &ClientMessage::Metric(MetricPayload {
                        fs_size: Some(disk::read_fs_sizes()),
                        ..Default::default()
                    }),
                );
            }
        }),
        interval_immediate(Duration::from_secs(10), {
            let out_tx = out_tx.clone();
            move || {
                if let Some(max) = temperature::read_cpu_temp_max() {
                    send(
                        &out_tx,
                        &ClientMessage::Temperature(protocol::TemperaturePayload {
                            cpu: protocol::CpuTemperature { max },
                        }),
                    );
                }
            }
        }),
        interval_immediate(Duration::from_secs(10), {
            let out_tx = out_tx.clone();
            let battery_rx = battery_rx.clone();
            move || {
                if let Some(payload) = battery::to_wire(&battery_rx.borrow()) {
                    send(&out_tx, &ClientMessage::Battery(payload));
                }
            }
        }),
        async {
            let mut watcher = processes::ProcessWatcher::new();
            let memory_rx = memory_rx.clone();
            let mut ticker = tokio::time::interval(Duration::from_secs(4));
            loop {
                ticker.tick().await;
                let total_memory_bytes = memory_rx.borrow().total_bytes;
                let payload = watcher.refresh_and_snapshot(total_memory_bytes).await;
                send(&out_tx, &ClientMessage::Ps(payload));
            }
        },
    );
}

/// Fires `f` immediately, then again every `interval` - matching the Node
/// client's `setIntervalImmediate` so the first metric push happens on
/// connect rather than after waiting a full interval.
async fn interval_immediate(interval: Duration, mut f: impl FnMut()) {
    let mut ticker = tokio::time::interval(interval);
    loop {
        ticker.tick().await;
        f();
    }
}

fn load_average() -> [f64; 3] {
    let Ok(content) = std::fs::read_to_string("/proc/loadavg") else {
        return [0.0, 0.0, 0.0];
    };
    let mut parts = content.split_whitespace();
    let one = parts.next().and_then(|s| s.parse().ok()).unwrap_or(0.0);
    let five = parts.next().and_then(|s| s.parse().ok()).unwrap_or(0.0);
    let fifteen = parts.next().and_then(|s| s.parse().ok()).unwrap_or(0.0);
    [one, five, fifteen]
}

fn uptime_seconds() -> f64 {
    let Ok(content) = std::fs::read_to_string("/proc/uptime") else {
        return 0.0;
    };
    content
        .split_whitespace()
        .next()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.0)
}

fn hostname() -> String {
    nix::unistd::gethostname()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default()
}

fn os_release() -> String {
    nix::sys::utsname::uname()
        .map(|u| u.release().to_string_lossy().into_owned())
        .unwrap_or_default()
}
