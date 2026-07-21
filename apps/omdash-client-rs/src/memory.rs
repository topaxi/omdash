use tpx_sysmon::memory::MemoryState;

use crate::protocol::MemoryInfo;

pub fn to_wire(state: &MemoryState) -> MemoryInfo {
    MemoryInfo {
        total: state.total_bytes,
        available: state.total_bytes.saturating_sub(state.used_bytes),
        swaptotal: state.swap_total_bytes,
        swapfree: state
            .swap_total_bytes
            .saturating_sub(state.swap_used_bytes),
    }
}
