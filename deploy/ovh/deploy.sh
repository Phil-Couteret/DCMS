#!/bin/bash
# Deploy DCMS on OVH VPS (run ON the VPS after sync)
# Usage: ssh ubuntu@OVH_HOST 'cd ~/DCMS/deploy/ovh && ./deploy.sh'
# This runs the same K3s deploy as ZBOX - reuses deploy/zbox/ logic

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DCMS_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
exec "$SCRIPT_DIR/../zbox/deploy.sh"
