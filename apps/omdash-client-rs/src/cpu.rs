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

use crate::protocol::{CpuInfo, CpuTimes};

pub fn read_per_core() -> Vec<CpuInfo> {
    let models = read_cpuinfo();
    let times = read_proc_stat_per_core();

    times
        .into_iter()
        .map(|(idx, times)| {
            let (model, speed) = models.get(&idx).cloned().unwrap_or_default();
            CpuInfo {
                model,
                speed,
                times,
            }
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

/// Reads `model name` and `cpu MHz` per logical processor index from
/// `/proc/cpuinfo`, matching what `os.cpus()[].model`/`.speed` report.
fn read_cpuinfo() -> HashMap<u32, (String, u32)> {
    let Ok(content) = std::fs::read_to_string("/proc/cpuinfo") else {
        return HashMap::new();
    };

    let mut result = HashMap::new();
    let mut current_idx: Option<u32> = None;
    let mut current_model: Option<String> = None;
    let mut current_mhz: Option<f64> = None;

    for line in content.lines() {
        if line.is_empty() {
            if let (Some(idx), Some(model), Some(mhz)) =
                (current_idx.take(), current_model.take(), current_mhz.take())
            {
                result.insert(idx, (model, mhz.round() as u32));
            }
            continue;
        }

        let Some((key, value)) = line.split_once(':') else {
            continue;
        };
        let key = key.trim();
        let value = value.trim();

        match key {
            "processor" => current_idx = value.parse().ok(),
            "model name" => current_model = Some(value.to_string()),
            "cpu MHz" => current_mhz = value.parse().ok(),
            _ => {}
        }
    }
    if let (Some(idx), Some(model), Some(mhz)) = (current_idx, current_model, current_mhz) {
        result.insert(idx, (model, mhz.round() as u32));
    }

    result
}
