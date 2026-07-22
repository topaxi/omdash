use tpx_sysmon::memory::MemoryState;

use crate::protocol::{MemoryInfo, ZramInfo};

pub fn to_wire(state: &MemoryState) -> MemoryInfo {
    MemoryInfo {
        total: state.total_bytes,
        available: state.total_bytes.saturating_sub(state.used_bytes),
        swaptotal: state.swap_total_bytes,
        swapfree: state
            .swap_total_bytes
            .saturating_sub(state.swap_used_bytes),
        zswap: state.zswap_bytes,
        zswapped: state.zswapped_bytes,
        zram: state.zram.as_ref().map(|z| ZramInfo {
            mem_used: z.mem_used_bytes,
            compr_data: z.compr_data_bytes,
            orig_data: z.orig_data_bytes,
            disk_size: z.disk_size_bytes,
        }),
    }
}
