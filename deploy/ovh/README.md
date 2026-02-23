# DCMS Deployment on OVH

## couteret.fr landing page (FTP)

The **public-website** (couteret.fr landing page, pricing, etc.) is deployed to OVH shared hosting via FTP.
API, admin and dcms stay on ZBOX.

```bash
# Add FTP credentials to .env (or use ../job-search-agents/.env):
# FTP_HOST=ftp.cluster0XX.hosting.ovh.net
# FTP_USER=your-user
# FTP_PASSWORD=your-password

python deploy/deploy_landing_to_ovh.py
```

The script builds the public-website and uploads to OVH. API URL is set to `https://api.couteret.fr/api` (ZBOX).

---

## OVH VPS (K8s) — optional

The following sections describe deploying the full stack to an OVH VPS. For the current setup, API/admin/dcms run on ZBOX.

## Prerequisites

- OVH VPS ordered (VPS-2 recommended: 12GB RAM, 6 vCPU, 100GB NVMe)
- SSH key access to the VPS
- Domain (e.g. couteret.fr) with DNS control

## Quick Start

### 1. Bootstrap the VPS (one-time)

On your **local machine**:

```bash
scp deploy/ovh/bootstrap-vps.sh ubuntu@YOUR_OVH_IP:~/
ssh ubuntu@YOUR_OVH_IP 'bash ~/bootstrap-vps.sh'
```

Or if you prefer a single command (from project root):

```bash
ssh ubuntu@YOUR_OVH_IP 'curl -sSf https://raw.githubusercontent.com/.../bootstrap-vps.sh | bash'
# Or copy-paste the script content
```

### 2. Configure DNS

Add A records pointing to your OVH VPS IP:

| Record | Type | Value |
|--------|------|-------|
| api.couteret.fr | A | YOUR_OVH_IP |
| admin.couteret.fr | A | YOUR_OVH_IP |
| dcms.couteret.fr | A | YOUR_OVH_IP |
| *.api.couteret.fr | A | YOUR_OVH_IP |
| *.admin.couteret.fr | A | YOUR_OVH_IP |
| *.dcms.couteret.fr | A | YOUR_OVH_IP |

### 3. First Deploy

From your **local machine** (project root):

```bash
# Step A: Sync code and build images
OVH_HOST=YOUR_OVH_IP ./deploy/ovh/sync-build-deploy.sh
```

Then **on the VPS** (first time only, to create K8s resources and secrets):

```bash
ssh ubuntu@YOUR_OVH_IP
cd ~/DCMS/deploy/ovh
./deploy.sh
```

When prompted, provide:
- **DB_PASSWORD** – PostgreSQL password
- **JWT_SECRET** – JWT signing secret (min 32 characters)

### 4. Subsequent Deploys

```bash
OVH_HOST=YOUR_OVH_IP ./deploy/ovh/sync-build-deploy.sh
```

No need to SSH for updates—images are built on the VPS and rolled out automatically.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| OVH_HOST | (required) | OVH VPS IP or hostname |
| OVH_USER | ubuntu | SSH user |
| API_HOST | api.couteret.fr | API hostname (for frontend build) |
| LETSENCRYPT_EMAIL | admin@couteret.fr | Email for Let's Encrypt |

## Components

Same as ZBOX: PostgreSQL, Backend, Admin UI, Public Website, Traefik, cert-manager (Let's Encrypt).

## Managed PostgreSQL (Optional)

For production, consider OVH Managed PostgreSQL instead of the in-cluster Postgres:

1. Order Managed PostgreSQL in OVH Control Panel
2. Update `dcms-secrets` with the external `DATABASE_URL`
3. Remove or scale down the `db` deployment

## Troubleshooting

- **SSH fails**: Ensure your SSH key is added to the VPS (OVH lets you add it during VPS creation)
- **Pods not ready**: `ssh ubuntu@OVH_IP 'kubectl get pods -n dcms'`
- **Certificate issues**: Check cert-manager: `kubectl get certificates -n dcms`
- **Build fails**: Ensure enough RAM (VPS-2 recommended for Docker builds)
