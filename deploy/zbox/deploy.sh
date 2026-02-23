#!/bin/bash
# Deploy DCMS to K3s on ZBOX server
# Run on the ZBOX: ./deploy.sh
# Or from Mac: scp files to ZBOX, then ssh and run

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DCMS_ROOT="${DCMS_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
K8S="$SCRIPT_DIR/k8s"

# Configuration - override via env
API_HOST="${API_HOST:-api.couteret.fr}"
ADMIN_HOST="${ADMIN_HOST:-admin.couteret.fr}"
PUBLIC_HOST="${PUBLIC_HOST:-dcms.couteret.fr}"
DB_PASSWORD="${DB_PASSWORD:-}"
JWT_SECRET="${JWT_SECRET:-}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-admin@couteret.fr}"

echo "==> DCMS ZBOX Deployment"
echo "    DCMS root: $DCMS_ROOT"
echo "    API:  https://$API_HOST"
echo "    Admin: https://$ADMIN_HOST"
echo "    Public: https://$PUBLIC_HOST"
echo ""

# Check K3s
if ! kubectl cluster-info &>/dev/null 2>&1; then
  echo "kubectl not configured. Run:"
  echo "  sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config"
  echo "  chmod 600 ~/.kube/config"
  exit 1
fi

# Install cert-manager for Let's Encrypt (if not present)
if ! kubectl get namespace cert-manager &>/dev/null 2>&1; then
  echo "==> Installing cert-manager..."
  kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.4/cert-manager.yaml
  echo "    Waiting for cert-manager to be ready..."
  kubectl wait --for=condition=Available deployment/cert-manager -n cert-manager --timeout=120s 2>/dev/null || true
  kubectl wait --for=condition=Available deployment/cert-manager-webhook -n cert-manager --timeout=120s 2>/dev/null || true
  kubectl wait --for=condition=Available deployment/cert-manager-cainjector -n cert-manager --timeout=120s 2>/dev/null || true
  sleep 5
fi

# Create namespace and PV first
echo "==> Creating namespace and storage..."
kubectl apply -f "$K8S/namespace.yaml"
kubectl apply -f "$K8S/postgres-pv.yaml"

# Create /data/dcms/postgres on host if missing
if [ -d /data ]; then
  sudo mkdir -p /data/dcms/postgres
  # postgres:15-alpine runs as UID 70 (Debian postgres uses 999)
  sudo chown -R 70:70 /data/dcms/postgres 2>/dev/null || true
fi

# Secrets
if ! kubectl get secret dcms-secrets -n dcms &>/dev/null; then
  echo "==> Creating secrets..."
  if [ -z "$DB_PASSWORD" ] || [ -z "$JWT_SECRET" ]; then
    echo "Set DB_PASSWORD and JWT_SECRET (min 32 chars for JWT):"
    echo "  export DB_PASSWORD='your-db-password'"
    echo "  export JWT_SECRET='your-jwt-secret-min-32-chars'"
    read -p "DB password: " DB_PASSWORD
    read -p "JWT secret: " JWT_SECRET
  fi
  DATABASE_URL="postgresql://dcms:${DB_PASSWORD}@db:5432/dcms?schema=public"
  kubectl create secret generic dcms-secrets -n dcms \
    --from-literal=db-password="$DB_PASSWORD" \
    --from-literal=jwt-secret="$JWT_SECRET" \
    --from-literal=database-url="$DATABASE_URL"
fi

# Build images
echo "==> Building Docker images..."
# Use HTTP for API until valid TLS certs (cert-manager) - avoids ERR_CERT_AUTHORITY_INVALID
USE_HTTP_API="${USE_HTTP_API:-true}"
if [ "$USE_HTTP_API" = "true" ]; then
  API_URL="http://${API_HOST}"
else
  API_URL="https://${API_HOST}"
fi
cd "$DCMS_ROOT"

docker build -t dcms-backend:latest ./backend
docker build -t dcms-admin:latest --build-arg REACT_APP_API_URL="${API_URL}/api" ./frontend
docker build -t dcms-public:latest --build-arg REACT_APP_API_URL="${API_URL}/api" ./public-website

echo "==> Importing images into K3s..."
docker save dcms-backend:latest | sudo k3s ctr images import -
docker save dcms-admin:latest | sudo k3s ctr images import -
docker save dcms-public:latest | sudo k3s ctr images import -

# Apply cert-manager ClusterIssuer (Let's Encrypt)
echo "==> Applying cert-manager ClusterIssuer..."
sed "s|admin@couteret.fr|$LETSENCRYPT_EMAIL|g" "$K8S/cert-manager-issuer.yaml" | kubectl apply -f -

# Apply manifests
echo "==> Applying deployments..."
kubectl apply -f "$K8S/postgres.yaml"
sleep 5
kubectl apply -f "$K8S/backend.yaml"
kubectl apply -f "$K8S/admin.yaml"
kubectl apply -f "$K8S/public.yaml"
kubectl apply -f "$K8S/traefik-cors-middleware.yaml"
kubectl apply -f "$K8S/ingress.yaml"

echo ""
echo "==> Deployment complete. Wait for pods:"
echo "    kubectl get pods -n dcms -w"
echo ""
echo "Network: Ensure DNS and router are configured (see NETWORK.md)"
