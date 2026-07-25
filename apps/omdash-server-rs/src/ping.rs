//! Round-trip times to a handful of hosts, broadcast to the dashboards.
//!
//! Shells out to `ping(1)` rather than opening raw sockets, which would need
//! `CAP_NET_RAW`; the relay runs as a plain user service.

use std::process::Stdio;
use std::sync::Arc;
use std::time::Duration;

use anyhow::{Context, bail};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

use crate::fanout::Fanout;
use crate::protocol::{PingPayload, ServerMessage};
use crate::time::unix_seconds;
use crate::ws::encode;

const DEFAULT_HOSTS: &str = "cerberus,topaxi.ch,meet.google.com";

/// Echo requests per `ping` invocation, and the seconds between them. The
/// process is restarted after every `COUNT` replies so a host that goes away
/// and comes back does not need the relay restarted.
const COUNT: u32 = 10;
const INTERVAL: Duration = Duration::from_secs(2);

/// Backoff after `ping` fails outright (unresolvable host, no route), so an
/// unreachable target does not spin.
const RETRY_DELAY: Duration = Duration::from_secs(8);

pub fn hosts() -> Vec<String> {
    std::env::var("OMDASH_PING_HOSTS")
        .unwrap_or_else(|_| DEFAULT_HOSTS.to_owned())
        .split(',')
        .map(str::trim)
        .filter(|host| !host.is_empty())
        .map(str::to_owned)
        .collect()
}

pub async fn run(host: String, fanout: Arc<Fanout>) {
    loop {
        if let Err(err) = ping_once(&host, &fanout).await {
            tracing::warn!("ping {host}: {err:#}");
            tokio::time::sleep(RETRY_DELAY).await;
        }

        tokio::time::sleep(INTERVAL).await;
    }
}

async fn ping_once(host: &str, fanout: &Fanout) -> anyhow::Result<()> {
    let mut child = Command::new("ping")
        .args([
            "-n",
            "-c",
            &COUNT.to_string(),
            "-i",
            &INTERVAL.as_secs().to_string(),
            host,
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .context("failed to spawn ping")?;

    let stdout = child
        .stdout
        .take()
        .context("ping stdout was not captured")?;
    let mut lines = BufReader::new(stdout).lines();

    while let Some(line) = lines.next_line().await? {
        // The trailing summary block; the replies are done.
        if line.starts_with("---") {
            break;
        }

        if line.is_empty() || line.starts_with("PING") {
            continue;
        }

        let Some(reply) = parse_reply(&line) else {
            // Error lines ("Destination Host Unreachable", "no answer yet")
            // land here. They are expected whenever a host is down, so they
            // stay out of the default log level.
            tracing::debug!("ping {host}: unparsed output: {line}");

            continue;
        };

        if let Some(message) = encode(&ServerMessage::Ping {
            payload: PingPayload {
                timestamp: unix_seconds(),
                host,
                ip: reply.ip,
                time: reply.time,
            },
        }) {
            fanout.send(message);
        }
    }

    let status = child.wait().await.context("failed to wait for ping")?;

    if !status.success() {
        bail!("ping exited with {status}");
    }

    Ok(())
}

struct Reply<'a> {
    ip: &'a str,
    time: f64,
}

/// Parses a single echo reply, e.g.
/// `64 bytes from 1.2.3.4: icmp_seq=1 ttl=64 time=0.462 ms`, or with a
/// resolved name `64 bytes from host.example (1.2.3.4): icmp_seq=1 ...`.
fn parse_reply(line: &str) -> Option<Reply<'_>> {
    let (_, rest) = line.split_once("from ")?;

    let ip = match rest.split_once('(') {
        Some((_, named)) => named.split_once(')')?.0,
        // Split on colon-space rather than colon so an IPv6 peer address stays
        // in one piece.
        None => rest.split_once(": ")?.0,
    };

    let (_, after) = line.split_once("time=")?;
    let digits = after
        .find(|c: char| !c.is_ascii_digit() && c != '.')
        .map_or(after, |end| &after[..end]);

    Some(Reply {
        ip,
        time: digits.parse().ok()?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_numeric_reply() {
        let reply = parse_reply("64 bytes from 1.2.3.4: icmp_seq=1 ttl=64 time=0.462 ms").unwrap();

        assert_eq!(reply.ip, "1.2.3.4");
        assert_eq!(reply.time, 0.462);
    }

    #[test]
    fn parses_named_reply() {
        let reply =
            parse_reply("64 bytes from host.example (1.2.3.4): icmp_seq=2 ttl=52 time=12 ms")
                .unwrap();

        assert_eq!(reply.ip, "1.2.3.4");
        assert_eq!(reply.time, 12.0);
    }

    #[test]
    fn keeps_ipv6_addresses_intact() {
        let reply =
            parse_reply("64 bytes from 2606:4700::1111: icmp_seq=1 ttl=57 time=8.10 ms").unwrap();

        assert_eq!(reply.ip, "2606:4700::1111");
        assert_eq!(reply.time, 8.10);
    }

    #[test]
    fn rejects_non_reply_lines() {
        assert!(parse_reply("From 1.2.3.4 icmp_seq=1 Destination Host Unreachable").is_none());
        assert!(parse_reply("PING topaxi.ch (1.2.3.4) 56(84) bytes of data.").is_none());
        assert!(parse_reply("rtt min/avg/max/mdev = 8.1/8.4/8.9/0.3 ms").is_none());
    }
}
