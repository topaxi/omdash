//! Process listing and aggregation. This is a faithful port of
//! `omdash-client/src/processes/index.ts`'s merge logic - not present in
//! tpx-sysmon at all, and the one place in this port with real display
//! logic rather than pure data gathering. Changing it changes what the
//! process panel shows, so field names and thresholds are kept identical.

use std::collections::HashMap;
use sysinfo::System;

use crate::protocol::{ProcessEntry, PsPayload};

const PROCESS_NAME_FILTERS: &[&str] = &["ps"];
const HIGHEST_COUNT: usize = 5;
const MIN_SHOWN: f64 = 0.05;

/// (prefix to match via `starts_with`, normalized name)
const NORMALIZATION_MAP: &[(&str, &str)] = &[
    ("Isolated Web Co", "firefox"),
    ("Isolated Servic", "firefox"),
    ("firefox", "firefox"),
    ("WebExtensions", "firefox"),
    ("Web Content", "firefox"),
    ("RDD Process", "firefox"),
    ("Socket Process", "firefox"),
    ("telegram-deskt", "telegram"),
    ("wezterm", "wezterm"),
];

pub struct ProcessWatcher {
    system: System,
}

impl ProcessWatcher {
    pub fn new() -> Self {
        Self {
            system: System::new(),
        }
    }

    /// Must be called on the same cadence the caller wants readings at
    /// (`sysinfo` computes CPU usage as a delta since the previous refresh).
    ///
    /// `total_memory_bytes` comes from `tpx_sysmon::memory` rather than
    /// `sysinfo`'s own `System::total_memory()`, which stays 0 (and silently
    /// turns every process's raw byte count into its own "percentage")
    /// unless `refresh_memory()` is also called - reusing the value we
    /// already read elsewhere avoids that footgun entirely.
    ///
    /// The scan itself runs on `spawn_blocking`'s dedicated thread pool
    /// rather than inline: on the `current_thread` runtime this process uses,
    /// a synchronous walk of every `/proc/<pid>/*` entry would otherwise
    /// stall the WebSocket heartbeat and every other metric timer for its
    /// duration - the same reasoning tpx-sysmon's `gpu::intel` module applies
    /// to its own full-process `/proc/*/fdinfo` scan.
    pub async fn refresh_and_snapshot(&mut self, total_memory_bytes: u64) -> PsPayload {
        let mut system = std::mem::replace(&mut self.system, System::new());

        let (system, payload) = tokio::task::spawn_blocking(move || {
            system.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

            let total_memory = (total_memory_bytes.max(1)) as f64;
            // `sysinfo` enumerates Linux tasks under /proc/[pid]/task, not
            // just top-level processes - on a multi-threaded process each
            // thread shows up as its own entry reporting that same process's
            // whole RSS, which silently multiplies both the process count and
            // every merged memory sum by however many threads a process
            // happens to have. Real processes report `thread_kind() ==
            // None`; anything else is a task.
            let raw: Vec<(String, f64, f64)> = system
                .processes()
                .values()
                .filter(|p| p.thread_kind().is_none())
                .map(|p| {
                    let name = p.name().to_string_lossy().into_owned();
                    let cpu = p.cpu_usage() as f64;
                    let memory = (p.memory() as f64 / total_memory) * 100.0;
                    (name, cpu, memory)
                })
                .collect();

            (system, build_payload(raw))
        })
        .await
        .expect("process refresh task panicked");

        self.system = system;
        payload
    }
}

fn build_payload(raw: Vec<(String, f64, f64)>) -> PsPayload {
    let count = raw.len();

    let filtered = raw
        .into_iter()
        .filter(|(name, _, _)| !PROCESS_NAME_FILTERS.contains(&name.as_str()));

    let mut merged: HashMap<String, ProcessEntry> = HashMap::new();
    for (name, cpu, memory) in filtered {
        let key = normalize_name(&name);
        merged
            .entry(key.clone())
            .and_modify(|e| {
                e.cpu += cpu;
                e.memory += memory;
            })
            .or_insert(ProcessEntry {
                name: key,
                cpu,
                memory,
            });
    }

    let mut by_cpu: Vec<ProcessEntry> = merged.values().cloned().collect();
    by_cpu.sort_by(|a, b| b.cpu.partial_cmp(&a.cpu).unwrap_or(std::cmp::Ordering::Equal));
    let highest_cpu: Vec<ProcessEntry> = by_cpu
        .into_iter()
        .take(HIGHEST_COUNT)
        .filter(|p| p.cpu >= MIN_SHOWN)
        .collect();

    let mut by_memory: Vec<ProcessEntry> = merged.into_values().collect();
    by_memory.sort_by(|a, b| {
        b.memory
            .partial_cmp(&a.memory)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let highest_memory: Vec<ProcessEntry> = by_memory
        .into_iter()
        .take(HIGHEST_COUNT)
        .filter(|p| p.memory >= MIN_SHOWN)
        .collect();

    PsPayload {
        count,
        highest_cpu,
        highest_memory,
    }
}

fn normalize_name(name: &str) -> String {
    for (prefix, normalized) in NORMALIZATION_MAP {
        if name.starts_with(prefix) {
            return normalized.to_string();
        }
    }

    if let Some(stripped) = strip_trailing_hash_suffix(name) {
        return stripped;
    }

    name.to_string()
}

/// Matches Node's `/#\d+$/` - a literal `#` followed by one or more ASCII
/// digits at the very end of the string.
fn strip_trailing_hash_suffix(name: &str) -> Option<String> {
    let hash_pos = name.rfind('#')?;
    let suffix = &name[hash_pos + 1..];
    if !suffix.is_empty() && suffix.bytes().all(|b| b.is_ascii_digit()) {
        Some(name[..hash_pos].to_string())
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_trailing_numeric_hash_suffix() {
        assert_eq!(normalize_name("chrome#3"), "chrome");
        assert_eq!(normalize_name("chrome"), "chrome");
        assert_eq!(normalize_name("chrome#abc"), "chrome#abc");
        assert_eq!(normalize_name("weird#3#5"), "weird#3");
    }

    #[test]
    fn maps_known_prefixes() {
        assert_eq!(normalize_name("Isolated Web Co (12345)"), "firefox");
        assert_eq!(normalize_name("Web Content"), "firefox");
        assert_eq!(normalize_name("telegram-deskt-bin"), "telegram");
        assert_eq!(normalize_name("unrelated-process"), "unrelated-process");
    }

    #[test]
    fn merges_and_sums_by_normalized_name() {
        let payload = build_payload(vec![
            ("Web Content".to_string(), 1.0, 2.0),
            ("RDD Process".to_string(), 3.0, 4.0),
            ("other".to_string(), 0.5, 0.5),
        ]);
        assert_eq!(payload.count, 3);
        let firefox = payload
            .highest_cpu
            .iter()
            .find(|p| p.name == "firefox")
            .unwrap();
        assert_eq!(firefox.cpu, 4.0);
        assert_eq!(firefox.memory, 6.0);
    }

    #[test]
    fn filters_ps_and_low_values() {
        let payload = build_payload(vec![
            ("ps".to_string(), 50.0, 50.0),
            ("tiny".to_string(), 0.01, 0.01),
            ("real".to_string(), 10.0, 10.0),
        ]);
        // "ps" is filtered before merging but still counts toward the raw count.
        assert_eq!(payload.count, 3);
        assert!(payload.highest_cpu.iter().all(|p| p.name != "ps"));
        assert!(payload.highest_cpu.iter().all(|p| p.name != "tiny"));
        assert_eq!(payload.highest_cpu.len(), 1);
        assert_eq!(payload.highest_cpu[0].name, "real");
    }

    #[test]
    fn caps_at_five_highest() {
        let raw: Vec<_> = (0..10)
            .map(|i| (format!("proc{i}"), i as f64 + 1.0, i as f64 + 1.0))
            .collect();
        let payload = build_payload(raw);
        assert_eq!(payload.highest_cpu.len(), 5);
        assert_eq!(payload.highest_cpu[0].name, "proc9");
    }
}
