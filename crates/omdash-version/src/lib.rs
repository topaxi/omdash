//! The commit the running binary was built from, shared by the relay and the
//! Rust client so both report provenance in the same shape.
//!
//! The dashboard uses this to tell whether a host is running older code than
//! the relay it reports to - see `apps/omdash-frontend/src/store/reducers/`.
//! The Node client reports the same shape, resolved differently: it runs
//! straight out of the repository checkout, so it can ask git at startup
//! rather than at build time.

use serde::Serialize;

const COMMIT: &str = env!("OMDASH_VERSION_COMMIT");
const COMMITTED_AT: &str = env!("OMDASH_VERSION_COMMITTED_AT");

#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct Version {
    /// Full commit sha; the dashboard abbreviates it for display.
    pub commit: &'static str,
    /// Commit timestamp, unix seconds - the ordering used to decide whether a
    /// host is behind. Commit date rather than build date, so rebuilding the
    /// same commit does not make a host look newer than its peers.
    #[serde(rename = "committedAt")]
    pub committed_at: u64,
}

/// Returns `None` when the build had no repository to read and nothing was
/// passed in, in which case reporting no version at all is better than
/// reporting a wrong one.
pub fn version() -> Option<Version> {
    if COMMIT.is_empty() {
        return None;
    }

    Some(Version {
        commit: COMMIT,
        committed_at: COMMITTED_AT.parse().unwrap_or(0),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_with_the_wire_field_names() {
        let json = serde_json::to_value(Version {
            commit: "cf3ea55bf18aa2dbc6985900bc1c5ee983f94085",
            committed_at: 1_700_000_000,
        })
        .unwrap();

        assert_eq!(
            json,
            serde_json::json!({
                "commit": "cf3ea55bf18aa2dbc6985900bc1c5ee983f94085",
                "committedAt": 1_700_000_000
            })
        );
    }

    /// The build script always stamps something, so in a checkout this is the
    /// real commit; the point is that the constants parse into a usable value.
    #[test]
    fn version_is_available_when_built_in_a_checkout() {
        if let Some(version) = version() {
            assert!(!version.commit.is_empty());
            assert!(version.committed_at > 0);
        }
    }
}
