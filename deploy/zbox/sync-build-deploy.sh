#!/bin/bash
# Sync, build and deploy DCMS to ZBOX from Mac (or any machine with the project)
# Run from project root: ./deploy/zbox/sync-build-deploy.sh
#
# Prerequisites:
#   - SSH access to ZBOX (ssh zbox@ZBOX_HOST)
#   - ZBOX already has K3s + initial deploy (run deploy.sh once on ZBOX first)
#
# Usage:
#   ./deploy/zbox/sync-build-deploy.sh
#   # (auto-detects: tries VPN 10.10.10.1 then LAN 192.168.1.5)
#   ZBOX_HOST=10.10.10.1 ./deploy/zbox/sync-build-deploy.sh   # force VPN
#   ZBOX_HOST=192.168.1.5 ./deploy/zbox/sync-build-deploy.sh # force LAN

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DCMS_ROOT="${DCMS_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

# ZBOX connection - override via env, or auto-detect VPN vs LAN
ZBOX_USER="${ZBOX_USER:-zbox}"
ZBOX_PATH="${ZBOX_PATH:-~/DCMS}"

if [ -z "${ZBOX_HOST:-}" ]; then
  echo "==> Detecting Zbox (VPN 10.10.10.1 or LAN 192.168.1.5)..."
  for ip in 10.10.10.1 192.168.1.5; do
    if ping -c 1 -t 3 "$ip" &>/dev/null; then
      ZBOX_HOST="$ip"
      echo "    Using $ip (Zbox reachable)"
      break
    fi
  done
  if [ -z "${ZBOX_HOST:-}" ]; then
    echo "    Cannot reach Zbox. Set ZBOX_HOST=10.10.10.1 (VPN) or ZBOX_HOST=192.168.1.5 (LAN)."
    exit 1
  fi
fi

API_HOST="${API_HOST:-api.couteret.fr}"
USE_HTTP_API="${USE_HTTP_API:-true}"

echo "==> DCMS Sync + Build + Deploy to ZBOX"
echo "    Host: $ZBOX_USER@$ZBOX_HOST"
echo "    Path: $ZBOX_PATH"
echo "    DCMS: $DCMS_ROOT"
echo ""

# 1. Zip project (exclude node_modules, .git)
echo "==> [1/4] Syncing project to ZBOX..."
cd "$DCMS_ROOT"
ZIP_FILE="/tmp/dcms-sync-$$.zip"
zip -rq "$ZIP_FILE" . \
  -x "node_modules/*" \
  -x ".git/*" \
  -x "backend/node_modules/*" \
  -x "frontend/node_modules/*" \
  -x "public-website/node_modules/*" \
  -x "*.log" \
  -x ".env.local" \
  -x ".DS_Store"

# One SSH connection so you only type the password once; reuse for scp + remote script
SSH_CTL="/tmp/dcms-ssh-$$"
cleanup_ssh() { [ -S "$SSH_CTL" ] && ssh -o ControlPath="$SSH_CTL" -O exit "$ZBOX_USER@$ZBOX_HOST" 2>/dev/null || true; rm -f "$SSH_CTL"; }
trap cleanup_ssh EXIT
if ssh -o ControlMaster=yes -o ControlPath="$SSH_CTL" -o ControlPersist=300 -o ConnectTimeout=10 -N -f "$ZBOX_USER@$ZBOX_HOST"; then
  scp -o ControlPath="$SSH_CTL" -q "$ZIP_FILE" "$ZBOX_USER@$ZBOX_HOST:/tmp/dcms-sync.zip"
else
  scp -o ConnectTimeout=10 -q "$ZIP_FILE" "$ZBOX_USER@$ZBOX_HOST:/tmp/dcms-sync.zip"
fi
rm -f "$ZIP_FILE"
echo "    Synced."

# 2. On ZBOX: unzip, build, import, restart (single SSH, TTY so output streams)
echo "==> [2/4] Extracting and building on ZBOX..."
if [ "$USE_HTTP_API" = "true" ]; then
  API_URL="http://${API_HOST}"
else
  API_URL="https://${API_HOST}"
fi

# Run remote script (reuse connection if we have the control socket; -tt so output streams)
SSH_CMD=(ssh -tt "$ZBOX_USER@$ZBOX_HOST")
[ -S "$SSH_CTL" ] && SSH_CMD=(ssh -o ControlPath="$SSH_CTL" -tt "$ZBOX_USER@$ZBOX_HOST")
"${SSH_CMD[@]}" bash -s << REMOTE
set -e
cd ~
rm -rf DCMS
unzip -oq /tmp/dcms-sync.zip -d DCMS
rm -f /tmp/dcms-sync.zip
cd DCMS

echo "==> [3/4] Building Docker images..."
docker build -t dcms-backend:latest ./backend
# Admin: no fixed REACT_APP_API_URL so it uses hostname (test.admin → test.api, admin → api)
docker build -t dcms-admin:latest ./frontend
docker build -t dcms-public:latest --build-arg REACT_APP_API_URL="${API_URL}/api" ./public-website

echo "==> [4/4] Importing into K3s and restarting..."
docker save dcms-backend:latest dcms-admin:latest dcms-public:latest | sudo k3s ctr images import -
kubectl rollout restart deployment/backend deployment/admin deployment/public -n dcms
REMOTE

echo ""
echo "==> Done. Wait for pods:"
echo "    ssh $ZBOX_USER@$ZBOX_HOST 'kubectl get pods -n dcms -w'"
echo ""
