//! Wire types matching the JSON shapes `omdash-server` relays verbatim to
//! `omdash-frontend`, which dispatches each message directly as a Redux
//! action (see `apps/omdash-frontend/src/store/reducers/clients.reducer.ts`).
//! Field names and nesting here are load-bearing: they must match what that
//! reducer expects exactly, not just what `systeminformation` happens to shape.

use serde::Serialize;

#[derive(Serialize)]
#[serde(tag = "type", content = "payload")]
pub enum ClientMessage {
    #[serde(rename = "client/register")]
    Register(RegisterPayload),
    #[serde(rename = "client/metric")]
    Metric(MetricPayload),
    #[serde(rename = "client/temperature")]
    Temperature(TemperaturePayload),
    #[serde(rename = "client/battery")]
    Battery(BatteryPayload),
    #[serde(rename = "client/ps")]
    Ps(PsPayload),
    #[serde(rename = "client/unregister")]
    Unregister,
}

#[derive(Serialize)]
pub struct RegisterPayload {
    pub arch: &'static str,
    pub platform: &'static str,
    pub release: String,
    pub hostname: String,
}

/// A single `client/metric` push. Node sends several of these independently,
/// each on its own timer, with only the relevant field(s) set - never all at
/// once. The frontend's `client/metric` reducer flat-merges whichever fields
/// are present, additionally routing `cpus`/`memory`/`gpus` through
/// per-field history reducers when present.
#[derive(Serialize, Default)]
pub struct MetricPayload {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cpus: Option<Vec<CpuInfo>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub load: Option<[f64; 3]>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gpus: Option<Vec<GpuInfo>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uptime: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memory: Option<MemoryInfo>,
    #[serde(rename = "fsSize", skip_serializing_if = "Option::is_none")]
    pub fs_size: Option<Vec<FsSizeEntry>>,
}

#[derive(Serialize)]
pub struct CpuInfo {
    pub model: String,
    pub speed: u32,
    pub times: CpuTimes,
}

#[derive(Serialize)]
pub struct CpuTimes {
    pub user: u64,
    pub nice: u64,
    pub sys: u64,
    pub idle: u64,
    pub irq: u64,
}

#[derive(Serialize, Clone)]
pub struct GpuInfo {
    pub vendor: String,
    pub model: String,
    #[serde(rename = "temperatureGpu")]
    pub temperature_gpu: f64,
    #[serde(rename = "utilizationGpu")]
    pub utilization_gpu: f64,
    /// MiB, matching `systeminformation`'s convention (the frontend multiplies
    /// by 1024*1024 to get bytes for display).
    #[serde(rename = "memoryUsed")]
    pub memory_used: f64,
    #[serde(rename = "memoryTotal")]
    pub memory_total: f64,
}

/// Only the fields `memory.ts` actually reads; the rest of `si.mem()`'s shape
/// (free/used/active/buffcache) is dead weight on the frontend and omitted.
/// The compressed-memory fields (zswap/zram) are Linux-only extras the Node
/// client never sends, so they are all optional and omitted when absent.
#[derive(Serialize)]
pub struct MemoryInfo {
    pub total: u64,
    pub available: u64,
    pub swaptotal: u64,
    pub swapfree: u64,
    /// zswap compressed-pool RAM cost, in bytes.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub zswap: Option<u64>,
    /// Uncompressed size of the pages held in zswap, in bytes.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub zswapped: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub zram: Option<ZramInfo>,
}

/// Aggregated zram device stats, all in bytes. Mirrors the frontend's
/// `MemoryInfo['zram']` shape.
#[derive(Serialize)]
pub struct ZramInfo {
    #[serde(rename = "memUsed")]
    pub mem_used: u64,
    #[serde(rename = "comprData")]
    pub compr_data: u64,
    #[serde(rename = "origData")]
    pub orig_data: u64,
    #[serde(rename = "diskSize")]
    pub disk_size: u64,
}

#[derive(Serialize)]
pub struct FsSizeEntry {
    pub mount: String,
    pub size: u64,
    pub used: u64,
}

#[derive(Serialize)]
pub struct TemperaturePayload {
    pub cpu: CpuTemperature,
}

#[derive(Serialize)]
pub struct CpuTemperature {
    pub max: f64,
}

#[derive(Serialize)]
pub struct BatteryPayload {
    #[serde(rename = "isCharging")]
    pub is_charging: bool,
    /// 0-100, matching `si.battery()`'s convention (tpx-sysmon's BatteryState
    /// uses a 0.0-1.0 fraction internally).
    pub percent: f64,
}

#[derive(Serialize)]
pub struct PsPayload {
    pub count: usize,
    #[serde(rename = "highestCpu")]
    pub highest_cpu: Vec<ProcessEntry>,
    #[serde(rename = "highestMemory")]
    pub highest_memory: Vec<ProcessEntry>,
}

#[derive(Serialize, Clone)]
pub struct ProcessEntry {
    pub name: String,
    pub cpu: f64,
    pub memory: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn register_matches_node_shape() {
        let json = serde_json::to_value(ClientMessage::Register(RegisterPayload {
            arch: "x86_64",
            platform: "linux",
            release: "6.1.0".to_string(),
            hostname: "ompi".to_string(),
        }))
        .unwrap();
        assert_eq!(
            json,
            serde_json::json!({
                "type": "client/register",
                "payload": {
                    "arch": "x86_64",
                    "platform": "linux",
                    "release": "6.1.0",
                    "hostname": "ompi"
                }
            })
        );
    }

    #[test]
    fn metric_omits_absent_fields() {
        let json = serde_json::to_value(ClientMessage::Metric(MetricPayload {
            uptime: Some(123.0),
            ..Default::default()
        }))
        .unwrap();
        assert_eq!(
            json,
            serde_json::json!({
                "type": "client/metric",
                "payload": { "uptime": 123.0 }
            })
        );
    }

    #[test]
    fn metric_fs_size_uses_camel_case_key() {
        let json = serde_json::to_value(ClientMessage::Metric(MetricPayload {
            fs_size: Some(vec![FsSizeEntry {
                mount: "/".to_string(),
                size: 100,
                used: 50,
            }]),
            ..Default::default()
        }))
        .unwrap();
        assert_eq!(
            json,
            serde_json::json!({
                "type": "client/metric",
                "payload": {
                    "fsSize": [{ "mount": "/", "size": 100, "used": 50 }]
                }
            })
        );
    }

    #[test]
    fn battery_matches_node_shape() {
        let json = serde_json::to_value(ClientMessage::Battery(BatteryPayload {
            is_charging: true,
            percent: 87.0,
        }))
        .unwrap();
        assert_eq!(
            json,
            serde_json::json!({
                "type": "client/battery",
                "payload": { "isCharging": true, "percent": 87.0 }
            })
        );
    }

    #[test]
    fn ps_matches_node_shape() {
        let json = serde_json::to_value(ClientMessage::Ps(PsPayload {
            count: 3,
            highest_cpu: vec![ProcessEntry {
                name: "firefox".to_string(),
                cpu: 12.5,
                memory: 4.2,
            }],
            highest_memory: vec![],
        }))
        .unwrap();
        assert_eq!(
            json,
            serde_json::json!({
                "type": "client/ps",
                "payload": {
                    "count": 3,
                    "highestCpu": [{ "name": "firefox", "cpu": 12.5, "memory": 4.2 }],
                    "highestMemory": []
                }
            })
        );
    }

    #[test]
    fn unregister_has_no_payload_or_null_payload_only() {
        let json = serde_json::to_value(ClientMessage::Unregister).unwrap();
        let obj = json.as_object().unwrap();
        assert_eq!(obj.get("type").unwrap(), "client/unregister");
        // The frontend never reads `payload` for this action type, so either
        // an absent key or an explicit null is fine - just must not be some
        // other shape (e.g. accidentally serializing as a bare string).
        if let Some(payload) = obj.get("payload") {
            assert!(payload.is_null());
        }
    }
}
