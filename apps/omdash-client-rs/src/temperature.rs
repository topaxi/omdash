//! Direct-sysfs CPU temperature reading, deliberately not routed through
//! `tpx_sysmon::sensors` (which shells out to `lm-sensors`'s `sensors -J`).
//! `lm-sensors` is configured per-host and isn't guaranteed present on every
//! machine this client runs on (e.g. the Pi it reports to), whereas the
//! kernel hwmon/thermal_zone sysfs interfaces used here always exist when a
//! temperature driver is loaded. This also mirrors what `systeminformation`
//! itself does on Linux - reading sysfs directly rather than shelling out.

use std::path::Path;

const CPU_HWMON_CHIPS: &[&str] = &["k10temp", "coretemp", "zenpower"];

/// Returns the highest CPU temperature (°C) found across all matching
/// sensors, or `None` if none could be read. The frontend only consumes a
/// single `max` value, so "highest among CPU sensors" is exactly the shape
/// `systeminformation`'s `cpuTemperature().max` represents.
pub fn read_cpu_temp_max() -> Option<f64> {
    let mut readings = read_hwmon_cpu_temps();
    if readings.is_empty() {
        readings = read_thermal_zone_cpu_temps();
    }
    readings.into_iter().fold(None, |acc, v| match acc {
        Some(a) => Some(f64::max(a, v)),
        None => Some(v),
    })
}

fn read_hwmon_cpu_temps() -> Vec<f64> {
    let Ok(entries) = std::fs::read_dir("/sys/class/hwmon") else {
        return vec![];
    };

    let mut readings = Vec::new();
    for entry in entries.flatten() {
        let dir = entry.path();
        let Some(name) = read_trimmed(dir.join("name")) else {
            continue;
        };
        if !CPU_HWMON_CHIPS.contains(&name.as_str()) {
            continue;
        }
        readings.extend(read_hwmon_temp_inputs(&dir));
    }
    readings
}

fn read_hwmon_temp_inputs(dir: &Path) -> Vec<f64> {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return vec![];
    };

    entries
        .flatten()
        .filter_map(|entry| {
            let name = entry.file_name();
            let name = name.to_str()?;
            if !(name.starts_with("temp") && name.ends_with("_input")) {
                return None;
            }
            read_trimmed(entry.path())
                .and_then(|s| s.parse::<f64>().ok())
                .map(|milli| milli / 1000.0)
        })
        .collect()
}

fn read_thermal_zone_cpu_temps() -> Vec<f64> {
    let Ok(entries) = std::fs::read_dir("/sys/class/thermal") else {
        return vec![];
    };

    entries
        .flatten()
        .filter_map(|entry| {
            let dir = entry.path();
            let zone_type = read_trimmed(dir.join("type"))?.to_lowercase();
            if !(zone_type.contains("cpu") || zone_type == "x86_pkg_temp") {
                return None;
            }
            read_trimmed(dir.join("temp"))
                .and_then(|s| s.parse::<f64>().ok())
                .map(|milli| milli / 1000.0)
        })
        .collect()
}

fn read_trimmed(path: impl AsRef<Path>) -> Option<String> {
    std::fs::read_to_string(path).ok().map(|s| s.trim().to_string())
}
