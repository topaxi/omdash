# omdash build recipes
# Run `just` or `just --list` to see available recipes.

# Show available recipes
default:
    @just --list

# Build everything: all JS/TS workspaces (via turbo) and the Rust client
build: build-js build-rust

# Build all JS/TS workspaces through the turbo pipeline
build-js:
    npm run build

# Build all JS/TS workspaces without turbo caching
build-js-noturbo:
    npm run build:noturbo

# Build the standalone gauge web component
build-gauge:
    npm run build --workspace=omdash-gauge

# Build the Lit + Vite frontend (depends on omdash-gauge)
build-frontend:
    npm run build --workspace=omdash-frontend

# Build the Node client daemon
build-client:
    npm run build --workspace=omdash-client

# Build the Node relay server
build-server:
    npm run build --workspace=omdash-server

# Build the Rust client (release)
build-rust:
    cargo build --release --manifest-path apps/omdash-client-rs/Cargo.toml

# Run the dev stack (turbo) plus the Rust client, excluding the Node client
dev:
    #!/usr/bin/env bash
    set -euo pipefail
    trap 'kill 0' EXIT
    npm run dev -- --filter='!omdash-client' &
    OMDASH_SERVER_HOST=localhost:3200 cargo run --manifest-path apps/omdash-client-rs/Cargo.toml &
    wait

# Lint all workspaces
lint:
    npm run lint

# Remove build artifacts
clean:
    rm -rf apps/*/build packages/*/build .turbo
    cargo clean --manifest-path apps/omdash-client-rs/Cargo.toml
