# DCMS Deployment for ZBOX Server

Deploy DCMS to a ZBOX CI331 nano running Ubuntu Server 24.04 + K3s.

## Prerequisites

- ZBOX with Ubuntu Server + K3s installed (see zbox-server repo)
- Docker installed on ZBOX
- kubectl configured (`sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config`)

## Quick Deploy

```bash
cd ~/DCMS/deploy/zbox
chmod +x deploy.sh
./deploy.sh
```

When prompted, provide:
- **DB_PASSWORD** – PostgreSQL password for dcms user
- **JWT_SECRET** – JWT signing secret (min 32 characters)

## Network Configuration

See [NETWORK.md](./NETWORK.md) for DNS records, router port forwarding, and TLS setup.

## Components

| Service | Image | Port |
|---------|-------|------|
| PostgreSQL | postgres:15-alpine | 5432 |
| Backend API | dcms-backend:latest | 3003 |
| Admin portal | dcms-admin:latest | 80 |
| Public website | dcms-public:latest | 80 |

## Customization

Override hostnames via environment variables:

```bash
export API_HOST=api.example.com
export ADMIN_HOST=admin.example.com
export PUBLIC_HOST=www.example.com
./deploy.sh
```

Update `k8s/ingress.yaml` to match your hostnames.
