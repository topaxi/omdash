# omdash build recipes
# Run `just` or `just --list` to see available recipes.

# Show available recipes
default:
    @just --list

# Build everything: all JS/TS workspaces (via turbo) and the Rust workspace
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

# Build the Rust client and relay server (release)
build-rust:
    cargo build --release

# Run the frontend dev server plus the Rust relay and client
dev:
    #!/usr/bin/env bash
    set -euo pipefail
    trap 'kill 0' EXIT
    npm run dev -- --filter='!omdash-client' &
    cargo run -p omdash-server-rs &
    OMDASH_SERVER_HOST=localhost:3200 cargo run -p omdash-client-rs &
    wait

# Lint all workspaces
lint:
    npm run lint

# Run the Rust test suite
test:
    cargo test

# Remove build artifacts
clean:
    rm -rf apps/*/build packages/*/build .turbo
    cargo clean
