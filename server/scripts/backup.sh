#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
# VQ Project — Backup automat PostgreSQL
# ══════════════════════════════════════════════════════════════════════
# Se rulează zilnic via cron: 
#   0 3 * * * /root/vq_proiect/vacanta-quester-beta1/server/scripts/backup.sh
# ══════════════════════════════════════════════════════════════════════

set -euo pipefail

# Config
BACKUP_DIR="/var/backups/vacanta"
DB_NAME="vq_proiect"
DB_USER="app_user_vq"
DB_HOST="127.0.0.1"
RETENTION_DAYS=30
PGPASSWORD="${PGPASSWORD:-vq_secret_2026}"

# Creează directorul de backup dacă nu există
mkdir -p "$BACKUP_DIR"

# Timestamp
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="vq_${DB_NAME}_${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

# Backup
echo "[Backup] Starting backup of ${DB_NAME}..."
PGPASSWORD="$PGPASSWORD" pg_dump \
  -h "$DB_HOST" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  --format=custom \
  --compress=9 \
  --file="$FILEPATH"

# Verificare
if [ -f "$FILEPATH" ]; then
  SIZE=$(du -h "$FILEPATH" | cut -f1)
  echo "[Backup] ✅ Backup saved: ${FILEPATH} (${SIZE})"
else
  echo "[Backup] ❌ Backup failed!"
  exit 1
fi

# Șterge backup-urile mai vechi de RETENTION_DAYS zile
echo "[Backup] Cleaning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "vq_${DB_NAME}_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

# Păstrează ultimele 3 backup-uri indiferent de vârstă
KEEP=3
COUNT=$(ls -1 "${BACKUP_DIR}/vq_${DB_NAME}_"*.sql.gz 2>/dev/null | wc -l)
if [ "$COUNT" -gt "$KEEP" ]; then
  ls -1t "${BACKUP_DIR}/vq_${DB_NAME}_"*.sql.gz | tail -n +$((KEEP+1)) | xargs -r rm
  echo "[Backup] Removed $((COUNT - KEEP)) old backups, keeping last ${KEEP}"
fi

echo "[Backup] ✅ Done"
