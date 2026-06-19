#!/usr/bin/env bash
# Daily compressed Postgres dump with 14-day retention. Run on the Proxmox host.
# Cron:  17 3 * * * /opt/saldo/ops/backup.sh >> /var/log/saldo-backup.log 2>&1
set -euo pipefail

STACK_DIR="${STACK_DIR:-/opt/saldo}"
cd "$STACK_DIR"

mkdir -p ops/backups
TS="$(date +%Y%m%d-%H%M%S)"
OUT="ops/backups/saldo-${TS}.dump"

# -Fc = custom format (compressed, supports selective restore via pg_restore)
docker compose exec -T db sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$OUT"

find ops/backups -name 'saldo-*.dump' -mtime +14 -delete

echo "Backup complete: $OUT"
# NOTE: copy ops/backups off-host (rsync/NAS/Proxmox snapshot) — on-host dumps die with the host.
