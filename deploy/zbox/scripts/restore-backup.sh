#!/bin/bash
# Restore (or just list) a DCMS Postgres backup created by the
# postgres-backup CronJob (deploy/zbox/k8s/postgres-backup-cronjob.yaml).
#
# Usage (run on the ZBOX, or anywhere kubectl is configured for the cluster):
#   ./restore-backup.sh list
#   ./restore-backup.sh restore dcms-20260810-031500.dump
#
# "restore" runs pg_restore --clean --if-exists --no-owner against the live
# `db` service - it drops and recreates objects as it goes, so this is
# destructive to whatever's currently in the database. It does not drop the
# database itself first, so run this against a fresh/empty DB if you want a
# truly clean restore (e.g. after `kubectl exec -it deploy/postgres -n dcms
# -- psql -U dcms -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'`).
#
# This intentionally asks for confirmation before restoring - there's no
# "oops, undo" once pg_restore starts overwriting live data.

set -eu

NAMESPACE="dcms"
ACTION="${1:-}"
FILE="${2:-}"

if [ -z "$ACTION" ]; then
  echo "Usage: $0 list"
  echo "       $0 restore <backup-filename>"
  exit 1
fi

run_in_backup_volume() {
  # One-shot pod: mounts the backup PVC read-only and the same postgres
  # image as the live DB (keeps pg_dump/pg_restore versions matched).
  kubectl run dcms-backup-tool \
    --namespace "$NAMESPACE" \
    --image=postgres:15-alpine \
    --restart=Never \
    --rm -i --tty \
    --overrides='
    {
      "spec": {
        "containers": [{
          "name": "dcms-backup-tool",
          "image": "postgres:15-alpine",
          "command": ["/bin/sh", "-c", "'"$1"'"],
          "env": [{
            "name": "PGPASSWORD",
            "valueFrom": {"secretKeyRef": {"name": "dcms-secrets", "key": "db-password"}}
          }],
          "volumeMounts": [{"name": "backups", "mountPath": "/backups", "readOnly": true}],
          "stdin": true,
          "tty": true
        }],
        "volumes": [{
          "name": "backups",
          "persistentVolumeClaim": {"claimName": "dcms-postgres-backup-pvc"}
        }]
      }
    }'
}

case "$ACTION" in
  list)
    run_in_backup_volume "ls -lh /backups"
    ;;
  restore)
    if [ -z "$FILE" ]; then
      echo "Usage: $0 restore <backup-filename>"
      echo "Run '$0 list' first to see available backups."
      exit 1
    fi
    echo "About to restore /backups/${FILE} into the live 'dcms' database."
    echo "This is destructive - it will overwrite existing rows/objects."
    read -p "Type the backup filename again to confirm: " CONFIRM
    if [ "$CONFIRM" != "$FILE" ]; then
      echo "Confirmation did not match. Aborting."
      exit 1
    fi
    run_in_backup_volume "pg_restore -h db -U dcms -d dcms --clean --if-exists --no-owner /backups/${FILE}"
    echo "==> Restore complete."
    ;;
  *)
    echo "Unknown action '$ACTION'. Use 'list' or 'restore'."
    exit 1
    ;;
esac
