#!/bin/bash
# Sync, build and deploy DCMS to ZBOX from Mac (or any machine with the project)
# Run from project root: ./deploy/zbox/sync-build-deploy.sh
#
# Prerequisites:
#   - SSH access to ZBOX (ssh zbox@ZBOX_HOST)
#   - ZBOX already has K3s + initial deploy (run deploy.sh once on ZBOX first)
#
# Usage:
#   ZBOX_HOST=192.168.1.5 ZBOX_USER=zbox ./deploy/zbox/sync-build-deploy.sh
#   # Or if ZBOX is on VPN:
#   ZBOX_HOST=10.10.10.1 ./deploy/zbox/sync-build-deploy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DCMS_ROOT="${DCMS_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

# ZBOX connection - override via env
ZBOX_HOST="${ZBOX_HOST:-192.168.1.5}"
ZBOX_USER="${ZBOX_USER:-zbox}"
ZBOX_PATH="${ZBOX_PATH:-~/DCMS}"

API_HOST="${API_HOST:-api.couteret.fr}"
USE_HTTP_API="${USE_HTTP_API:-true}"

echo "==> DCMS Sync + Build + Deploy to ZBOX"
echo "    Host: $ZBOX_USER@$ZBOX_HOST"
echo "    Path: $ZBOX_PATH"
echo "    DCMS: $DCMS_ROOT"
echo ""

# 1. Sync: zip project (exclude node_modules, .git) and scp
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

scp -q "$ZIP_FILE" "$ZBOX_USER@$ZBOX_HOST:/tmp/dcms-sync.zip"
rm -f "$ZIP_FILE"
echo "    Synced."

# 2. On ZBOX: unzip, build, import, restart
echo "==> [2/4] Extracting and building on ZBOX..."
if [ "$USE_HTTP_API" = "true" ]; then
  API_URL="http://${API_HOST}"
else
  API_URL="https://${API_HOST}"
fi

ssh "$ZBOX_USER@$ZBOX_HOST" bash -s << REMOTE
set -e
cd ~
rm -rf DCMS
unzip -oq /tmp/dcms-sync.zip -d DCMS
rm -f /tmp/dcms-sync.zip
cd DCMS

echo "==> [3/4] Building Docker images..."
docker build -t dcms-backend:latest ./backend
docker build -t dcms-admin:latest --build-arg REACT_APP_API_URL="${API_URL}/api" ./frontend
docker build -t dcms-public:latest --build-arg REACT_APP_API_URL="${API_URL}/api" ./public-website

echo "==> [4/4] Importing into K3s and restarting..."
docker save dcms-backend:latest dcms-admin:latest dcms-public:latest | sudo k3s ctr images import -
kubectl rollout restart deployment/backend deployment/admin deployment/public -n dcms
REMOTE

echo ""
echo "==> Done. Wait for pods:"
echo "    ssh $ZBOX_USER@$ZBOX_HOST 'kubectl get pods -n dcms -w'"
echo ""
