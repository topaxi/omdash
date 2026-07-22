//! Merges tpx-sysmon's per-vendor GPU services (mirroring the merge pattern
//! tpx-shell's main.rs uses) and translates the result to the wire format.
//!
//! Unlike AMD (which auto-discovers via sysfs inside `tpx_sysmon::gpu::amd`),
//! the Intel and NVIDIA services require an explicit `GpuConfig` per device -
//! there is no host-specific config file here (omdash-client has none), so
//! this module does its own PCI sysfs scan to build one, matching the same
//! `dddd:bb:dd.f` id format tpx-shell's config-driven setups use.

use std::collections::HashMap;
use tokio::sync::watch;
use tpx_sysmon::gpu::{GpuConfig, GpuInfo as SysmonGpuInfo, GpuProvider, GpuState};

use crate::protocol::GpuInfo;

const GPU_POLL_MS: u64 = 2000;
const INTEL_VENDOR_ID: &str = "0x8086";
const NVIDIA_VENDOR_ID: &str = "0x10de";
/// PCI display controller class prefix (0x03xxxx): VGA/3D/display controllers.
const DISPLAY_CONTROLLER_CLASS_PREFIX: &str = "0x03";

pub fn spawn() -> watch::Receiver<Vec<GpuInfo>> {
    let (out_tx, out_rx) = watch::channel(Vec::new());

    tokio::spawn(async move {
        let (amd_tx, mut amd_rx) = watch::channel(GpuState::default());
        let (intel_tx, mut intel_rx) = watch::channel(GpuState::default());
        let (nvidia_tx, mut nvidia_rx) = watch::channel(GpuState::default());

        let intel_configs = discover_pci_gpus(INTEL_VENDOR_ID, GpuProvider::Intel);
        let nvidia_configs = discover_pci_gpus(NVIDIA_VENDOR_ID, GpuProvider::Nvidia);

        tokio::spawn(async move {
            // AMD auto-discovers on its own when passed an empty config list.
            if let Err(e) =
                tpx_sysmon::gpu::amd::run(amd_tx, vec![], GPU_POLL_MS, HashMap::new()).await
            {
                tracing::warn!("AMD GPU service: {e}");
            }
        });
        tokio::spawn(async move {
            if let Err(e) = tpx_sysmon::gpu::intel::run(intel_tx, intel_configs, GPU_POLL_MS).await
            {
                tracing::warn!("Intel GPU service: {e}");
            }
        });
        tokio::spawn(async move {
            if let Err(e) =
                tpx_sysmon::gpu::nvidia::run(nvidia_tx, nvidia_configs, GPU_POLL_MS).await
            {
                tracing::warn!("NVIDIA GPU service: {e}");
            }
        });

        loop {
            let mut gpus = amd_rx.borrow().gpus.clone();
            gpus.extend(intel_rx.borrow().gpus.clone());
            gpus.extend(nvidia_rx.borrow().gpus.clone());

            let _ = out_tx.send(gpus.iter().map(to_wire).collect());

            tokio::select! {
                _ = amd_rx.changed() => {}
                _ = intel_rx.changed() => {}
                _ = nvidia_rx.changed() => {}
            }
        }
    });

    out_rx
}

fn to_wire(info: &SysmonGpuInfo) -> GpuInfo {
    GpuInfo {
        vendor: match info.provider {
            GpuProvider::Amd => "AMD".to_string(),
            GpuProvider::Nvidia => "NVIDIA".to_string(),
            GpuProvider::Intel => "Intel".to_string(),
        },
        // tpx-sysmon resolves a friendly marketing name (e.g. "Radeon RX 7800
        // XT") from the PCI databases, falling back to the PCI address when it
        // can't. The frontend renders this as text next to the vendor.
        model: info.model.clone(),
        temperature_gpu: info.temperature,
        utilization_gpu: info.gpu_usage,
        memory_used: bytes_to_mib(info.mem_used),
        memory_total: bytes_to_mib(info.mem_total),
    }
}

fn bytes_to_mib(bytes: u64) -> f64 {
    bytes as f64 / 1024.0 / 1024.0
}

fn discover_pci_gpus(vendor_id: &str, provider: GpuProvider) -> Vec<GpuConfig> {
    let Ok(entries) = std::fs::read_dir("/sys/bus/pci/devices") else {
        return vec![];
    };

    entries
        .flatten()
        .filter_map(|entry| {
            let path = entry.path();
            if read_trimmed(path.join("vendor")).as_deref() != Some(vendor_id) {
                return None;
            }
            let class = read_trimmed(path.join("class"))?;
            if !class.starts_with(DISPLAY_CONTROLLER_CLASS_PREFIX) {
                return None;
            }
            Some(GpuConfig {
                id: entry.file_name().to_string_lossy().into_owned(),
                provider,
                gpu_temp_sensors: vec![],
                bar: true,
            })
        })
        .collect()
}

fn read_trimmed(path: impl AsRef<std::path::Path>) -> Option<String> {
    std::fs::read_to_string(path).ok().map(|s| s.trim().to_string())
}
