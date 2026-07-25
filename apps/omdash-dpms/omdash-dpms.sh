#!/usr/bin/env bash
#
# Turns the dashboard display on while any host is connected to the omdash
# relay, and off when none is. Runs on the machine the display is attached to,
# which is why it polls the relay's /api/clients instead of living inside it.

set -uo pipefail

OMDASH_SERVER_URL=${OMDASH_SERVER_URL:-http://localhost:3200}
OMDASH_DPMS_OUTPUT=${OMDASH_DPMS_OUTPUT:-HDMI-A-1}
OMDASH_DPMS_INTERVAL=${OMDASH_DPMS_INTERVAL:-10}
# Hosts that are up around the clock. They tell us nothing about whether anyone
# is around, so they must not keep the display awake.
OMDASH_DPMS_ALWAYS_ON=${OMDASH_DPMS_ALWAYS_ON:-ompi,colon,liva}

log() {
  echo "omdash-dpms: $*" >&2
}

for cmd in curl jq swaymsg; do
  if ! command -v "$cmd" >/dev/null; then
    log "$cmd is required but not installed"
    exit 1
  fi
done

# Resolved on every call rather than cached for the process lifetime: the
# socket filename embeds sway's pid, so a cached path goes stale (and every
# subsequent swaymsg silently fails) if sway restarts after this daemon.
sway_socket() {
  if [[ -n ${SWAYSOCK:-} ]]; then
    echo "$SWAYSOCK"
    return 0
  fi

  local socket
  socket=$(find "/run/user/$(id -u)" -maxdepth 1 -name 'sway-ipc*' -print -quit 2>/dev/null)

  [[ -n $socket ]] && echo "$socket"
}

# Any connected client that is not in the always-on list means someone is
# using a machine, so the display should be on.
has_active_clients() {
  local response
  response=$(curl -sf --max-time 5 "$OMDASH_SERVER_URL/api/clients") || return 2

  jq -e --arg always_on "$OMDASH_DPMS_ALWAYS_ON" '
    ($always_on | split(",") | map(select(length > 0))) as $ignored
    | [.clients[] | select((.hostname // "") as $h | $ignored | index($h) | not)]
    | length > 0
  ' <<<"$response" >/dev/null
}

set_dpms() {
  local state=$1 socket
  socket=$(sway_socket)

  if [[ -z $socket ]]; then
    log 'no sway IPC socket found'
    return 1
  fi

  SWAYSOCK=$socket swaymsg output "$OMDASH_DPMS_OUTPUT" dpms "$state" >/dev/null
}

# The desired state is reasserted on every tick rather than only when the
# connected-client set flips. Transition-only control cannot recover once the
# display and our belief about it diverge - a failed swaymsg, sway restarting,
# or the output coming back powered off would leave the screen stuck off with
# no further transition to correct it. `dpms on` when already on (and `dpms
# off` when already off) is a harmless no-op, so reasserting is self-healing.
while true; do
  has_active_clients
  case $? in
    0) set_dpms on ;;
    1) set_dpms off ;;
    # The relay is unreachable. Leave the display as it is rather than blanking
    # it because of a restart or a network blip.
    *) log "could not reach $OMDASH_SERVER_URL" ;;
  esac

  sleep "$OMDASH_DPMS_INTERVAL"
done
