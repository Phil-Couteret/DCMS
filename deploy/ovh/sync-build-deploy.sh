#!/bin/bash
# Sync, build and deploy DCMS to OVH VPS
# Run from project root: OVH_HOST=your-ovh-vps-ip ./deploy/ovh/sync-build-deploy.sh
#
# Prerequisites:
#   - OVH VPS bootstrapped (run bootstrap-vps.sh once on the VPS)
#   - SSH key access: ssh ubuntu@OVH_HOST
#   - DNS A records for api, admin, dcms.couteret.fr pointing to OVH VPS IP
#
# Usage:
#   OVH_HOST=84.79.202.126 ./deploy/ovh/sync-build-deploy.sh
#   OVH_HOST=your-vps.ovh.net OVH_USER=root ./deploy/ovh/sync-build-deploy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DCMS_ROOT="${DCMS_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

# OVH VPS connection
OVH_HOST="${OVH_HOST:?Set OVH_HOST to your OVH VPS IP or hostname}"
OVH_USER="${OVH_USER:-ubuntu}"
OVH_PATH="${OVH_PATH:-~/DCMS}"

API_HOST="${API_HOST:-api.couteret.fr}"
USE_HTTP_API="${USE_HTTP_API:-true}"

echo "==> DCMS Sync + Build + Deploy to OVH"
echo "    Host: $OVH_USER@$OVH_HOST"
echo "    Path: $OVH_PATH"
echo "    DCMS: $DCMS_ROOT"
echo ""

# 1. Sync: zip project and scp
echo "==> [1/4] Syncing project to OVH VPS..."
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

scp -q "$ZIP_FILE" "$OVH_USER@$OVH_HOST:/tmp/dcms-sync.zip"
rm -f "$ZIP_FILE"
echo "    Synced."

# 2. Build API URL
if [ "$USE_HTTP_API" = "true" ]; then
  API_URL="http://${API_HOST}"
else
  API_URL="https://${API_HOST}"
fi

# 3. On OVH: unzip, build, import, restart
echo "==> [2/4] Extracting and building on OVH VPS..."
ssh "$OVH_USER@$OVH_HOST" bash -s << REMOTE
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
kubectl rollout restart deployment/backend deployment/admin deployment/public -n dcms 2>/dev/null || echo "    (First deploy: run deploy.sh on VPS first)"
REMOTE

echo ""
echo "==> Done."
echo ""
echo "If this is the first deploy, run on the VPS:"
echo "  ssh $OVH_USER@$OVH_HOST 'cd ~/DCMS/deploy/zbox && ./deploy.sh'"
echo ""
echo "Check pods:"
echo "  ssh $OVH_USER@$OVH_HOST 'kubectl get pods -n dcms -w'"
echo ""
