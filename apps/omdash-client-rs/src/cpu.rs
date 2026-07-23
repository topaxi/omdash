//! Per-core CPU reading, matching the shape and semantics of Node's
//! `os.cpus()`: one entry per logical core, with `times` in raw jiffies
//! (not a computed percentage) so the frontend can do its own delta math
//! across samples, exactly as it does today against the Node client.
//!
//! Node's `os.cpus()` on Linux keeps only 5 of `/proc/stat`'s 8 per-core
//! fields - user, nice, system, idle, irq - silently dropping iowait,
//! softirq and steal. That mapping is reproduced here field-for-field so a
//! frontend computing usage from these buckets gets the same numbers it
//! would have from the Node client.

use std::collections::HashMap;
use std::sync::OnceLock;

use crate::protocol::{CpuInfo, CpuTimes};

/// Per-core marketing model name, keyed by logical CPU index, resolved once
/// via `init_model` since it never changes at runtime. Kept per-core (not
/// collapsed into one shared string) because hybrid/heterogeneous SoCs (ARM
/// big.LITTLE, Intel P-core/E-core) genuinely have more than one CPU model in
/// the same box. See `tpx_sysmon::cpu::resolve_models` for the cleanup
/// (trademark markers, core-count marketing suffixes) and the ARM fallback
/// raw `/proc/cpuinfo` lacks.
static MODELS: OnceLock<HashMap<u32, String>> = OnceLock::new();

/// Must be called once before `read_per_core` - see `MODELS`. Async because
/// resolution may shell out (e.g. to `lscpu` on ARM).
pub async fn init_model() {
    let models = tpx_sysmon::cpu::resolve_models()
        .await
        .into_iter()
        .map(|core| (core.cpu, core.model))
        .collect();
    let _ = MODELS.set(models);
}

pub fn read_per_core() -> Vec<CpuInfo> {
    let models = MODELS.get();
    let speeds = tpx_sysmon::cpu::read_speeds();
    let times = read_proc_stat_per_core();

    times
        .into_iter()
        .map(|(idx, times)| CpuInfo {
            model: models
                .and_then(|m| m.get(&idx))
                .cloned()
                .unwrap_or_default(),
            speed: speeds.get(&idx).copied().unwrap_or_default(),
            times,
        })
        .collect()
}

fn read_proc_stat_per_core() -> Vec<(u32, CpuTimes)> {
    let Ok(content) = std::fs::read_to_string("/proc/stat") else {
        return vec![];
    };

    let mut result = Vec::new();
    for line in content.lines() {
        let Some(rest) = line.strip_prefix("cpu") else {
            continue;
        };
        // Skip the aggregate "cpu " line - only numbered per-core lines here.
        let mut split = rest.splitn(2, char::is_whitespace);
        let Some(idx_str) = split.next() else {
            continue;
        };
        let Ok(idx) = idx_str.parse::<u32>() else {
            continue;
        };
        let Some(fields) = split.next() else {
            continue;
        };

        let mut parts = fields.split_whitespace();
        let user = parts.next().and_then(|s| s.parse().ok());
        let nice = parts.next().and_then(|s| s.parse().ok());
        let sys = parts.next().and_then(|s| s.parse().ok());
        let idle = parts.next().and_then(|s| s.parse().ok());
        let _iowait = parts.next();
        let irq = parts.next().and_then(|s| s.parse().ok());

        if let (Some(user), Some(nice), Some(sys), Some(idle), Some(irq)) =
            (user, nice, sys, idle, irq)
        {
            result.push((
                idx,
                CpuTimes {
                    user,
                    nice,
                    sys,
                    idle,
                    irq,
                },
            ));
        }
    }

    result
}
