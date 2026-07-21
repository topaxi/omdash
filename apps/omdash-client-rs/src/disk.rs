//! Disk/filesystem usage. Not present anywhere in tpx-sysmon (tpx-shell has
//! no disk widget), so this reads `/proc/mounts` + `statvfs` directly,
//! filtered to real block devices the way the Node client filters
//! `si.fsSize()` to `fs.startsWith('/dev/')`.

use nix::sys::statvfs::statvfs;

use crate::protocol::FsSizeEntry;

pub fn read_fs_sizes() -> Vec<FsSizeEntry> {
    let Ok(content) = std::fs::read_to_string("/proc/mounts") else {
        return vec![];
    };

    content
        .lines()
        .filter_map(|line| {
            let mut fields = line.split_whitespace();
            let device = fields.next()?;
            let mount_point = fields.next()?;

            if !device.starts_with("/dev/") {
                return None;
            }
            let mount_point = unescape_mount_field(mount_point);

            let stat = statvfs(mount_point.as_str()).ok()?;
            let frsize = stat.fragment_size();
            let size = stat.blocks() as u64 * frsize;
            let available = stat.blocks_available() as u64 * frsize;
            let used = size.saturating_sub(available);

            Some(FsSizeEntry {
                mount: mount_point,
                size,
                used,
            })
        })
        .collect()
}

/// `/proc/mounts` escapes space, tab, newline and backslash as octal
/// (e.g. a mount point containing a space becomes `\040`). Unescaping works
/// on raw bytes (not chars) so multi-byte UTF-8 sequences outside of escape
/// runs pass through untouched.
fn unescape_mount_field(field: &str) -> String {
    let bytes = field.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'\\' && i + 3 < bytes.len()
            && let Ok(code) = u8::from_str_radix(&field[i + 1..i + 4], 8) {
                out.push(code);
                i += 4;
                continue;
            }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}
