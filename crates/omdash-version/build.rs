//! Stamps the commit this crate - and with it the binaries that depend on it -
//! was built from into the compiled artifact.
//!
//! Two sources, in order: the `OMDASH_GIT_COMMIT` / `OMDASH_GIT_COMMITTED_AT`
//! environment variables, then `git` itself. The environment override exists
//! for builds from a source snapshot with no repository attached - Nix hands
//! the flake input's source to the builder as a bare store path, but knows the
//! revision and its timestamp, so it can pass them in (see tpx-home's
//! `pkgs/omdash-client-rs.nix`).

use std::path::PathBuf;
use std::process::Command;

fn main() {
    println!("cargo:rerun-if-env-changed=OMDASH_GIT_COMMIT");
    println!("cargo:rerun-if-env-changed=OMDASH_GIT_COMMITTED_AT");

    watch_git_head();

    let commit = env("OMDASH_GIT_COMMIT").or_else(|| git(&["rev-parse", "HEAD"]));
    let committed_at =
        env("OMDASH_GIT_COMMITTED_AT").or_else(|| git(&["log", "-1", "--format=%ct"]));

    // An empty value is what `version()` reads as "no provenance available",
    // rather than reporting a commit that is not the one being built.
    println!(
        "cargo:rustc-env=OMDASH_VERSION_COMMIT={}",
        commit.unwrap_or_default()
    );
    println!(
        "cargo:rustc-env=OMDASH_VERSION_COMMITTED_AT={}",
        committed_at.unwrap_or_default()
    );
}

/// Re-runs this script when the checked-out commit changes, so a `git pull`
/// followed by a rebuild stamps the new commit even when no source file the
/// crate contains was touched.
fn watch_git_head() {
    let Some(git_dir) = git(&["rev-parse", "--absolute-git-dir"]).map(PathBuf::from) else {
        return;
    };

    for path in ["HEAD", "refs/heads", "packed-refs"] {
        let path = git_dir.join(path);

        if path.exists() {
            println!("cargo:rerun-if-changed={}", path.display());
        }
    }
}

fn env(key: &str) -> Option<String> {
    std::env::var(key).ok().filter(|value| !value.is_empty())
}

fn git(args: &[&str]) -> Option<String> {
    let output = Command::new("git").args(args).output().ok()?;

    if !output.status.success() {
        return None;
    }

    let value = String::from_utf8(output.stdout).ok()?.trim().to_owned();

    (!value.is_empty()).then_some(value)
}
