#!/usr/bin/env bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
UNIT_DIR=$HOME/.config/systemd/user/

mkdir -p $UNIT_DIR

cp $SCRIPT_DIR/../apps/omdash-client/omdash-client.service \
  $SCRIPT_DIR/../apps/omdash-server/omdash-server.service \
  $SCRIPT_DIR/../apps/omdash-frontend/omdash-frontend.service \
  $UNIT_DIR
