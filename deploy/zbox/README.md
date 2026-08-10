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

## Database backups

`deploy.sh` installs a `postgres-backup` CronJob (`k8s/postgres-backup-cronjob.yaml`) that runs `pg_dump` daily at 03:15 into a separate PVC (`k8s/postgres-backup-pv.yaml`, `/data/dcms/postgres-backups` on the host - a different directory than the live DB's `/data/dcms/postgres`), pruning dumps older than 14 days.

Check it's running:

```bash
kubectl get cronjob postgres-backup -n dcms
kubectl get jobs -n dcms --selector=job-name  # recent runs
```

List or restore a backup:

```bash
cd ~/DCMS/deploy/zbox/scripts
./restore-backup.sh list
./restore-backup.sh restore dcms-20260810-031500.dump
```

`restore-backup.sh restore` is destructive (it overwrites the live database) and asks for confirmation before running. See the comments at the top of the script for how to wipe the schema first if you want a truly clean restore rather than an overlay.

**Not covered yet:** backups live on the same physical disk as the live database (different directory, but same disk) - a hardware failure takes out both. Copying backups off the ZBOX (rsync/rclone to another machine or object storage) is a known gap, not yet automated.
