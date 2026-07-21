use tpx_sysmon::battery::BatteryState;

use crate::protocol::BatteryPayload;

/// Returns `None` when no battery is present, matching the Node client's
/// `if ((await si.battery()).hasBattery)` gate around the whole battery timer.
///
/// `is_charging` is approximated from `on_ac` (AC adapter online) rather than
/// true charging state - tpx-sysmon doesn't distinguish "on AC, still
/// charging" from "on AC, battery full", so a fully charged battery on AC
/// will show as charging here where the Node/`systeminformation` client
/// would report false. The frontend only uses this for a charging-icon
/// toggle, so this is a cosmetic gap, not a functional one.
pub fn to_wire(state: &BatteryState) -> Option<BatteryPayload> {
    if !state.present {
        return None;
    }
    Some(BatteryPayload {
        is_charging: state.on_ac,
        percent: state.percent * 100.0,
    })
}
