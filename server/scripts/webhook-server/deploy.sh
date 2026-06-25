#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
# VQ Project — Deploy declanșat de GitHub Webhook
# ══════════════════════════════════════════════════════════════════════
# Rulează pe Proxmox LXC, apelat de webhook-server/app.py.
# ══════════════════════════════════════════════════════════════════════

set -euo pipefail

PROJECT_DIR="/root/vq_proiect/vacanta-quester-beta1"
SERVICE_NAME="vacanta-api"
TUNNEL_SERVICE="vacanta-tunnel"
LOG_FILE="/var/log/vacanta-deploy.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# ─── Config extrasă din .env (setată de systemd) ─────────────────
HA_TOKEN="${HA_TOKEN:-}"                                      # Home Assistant Long-Lived Token
HA_HOST="${HA_HOST:-http://192.168.1.2:8123}"                   # Adresa Home Assistant
HA_NOTIFY_DEVICE="${HA_NOTIFY_DEVICE:-mobile_app_arturs_iphone_15_pro}"  # Dispozitiv țintă

log() {
  echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

error() {
  echo "[$TIMESTAMP] ❌ $1" | tee -a "$LOG_FILE"
  exit 1
}

cd "$PROJECT_DIR" || error "Directorul $PROJECT_DIR nu există!"

log "═══════════════════════════════════════════════"
log "🚀 Deploy declanșat de GitHub Webhook"
log "   Commit: $(git rev-parse --short HEAD 2>/dev/null || echo '?')"

# ─── 1. Git pull ────────────────────────────────────────────────────
log "📥 git pull origin main..."
git fetch origin main 2>&1 | tee -a "$LOG_FILE"
git reset --hard origin/main 2>&1 | tee -a "$LOG_FILE"
NEW_COMMIT=$(git rev-parse --short HEAD)
log "✅ Git pull — $NEW_COMMIT"

# ─── 2. Instalare dependințe ────────────────────────────────────────
log "📦 npm ci..."
npm ci 2>&1 | tee -a "$LOG_FILE"
log "✅ Dependințe instalate"

# ─── 3. Build ───────────────────────────────────────────────────────
log "🔨 npm run build..."
npm run build 2>&1 | tee -a "$LOG_FILE"
log "✅ Build completat"

# ─── 4. Migrare DB (doar dacă s-a modificat schema) ────────────────
if git diff HEAD~1 --name-only 2>/dev/null | grep -q "^server/db/schema.ts"; then
  log "🗄️  Migrare DB..."
  npm run db:migrate 2>&1 | tee -a "$LOG_FILE" || log "⚠️  Migrare eșuată (probabil deja aplicată)"
  log "✅ Migrare DB"
fi

# ─── 5. Backup ──────────────────────────────────────────────────────
log "💾 Backup DB..."
bash "$PROJECT_DIR/server/scripts/backup.sh" 2>&1 | tee -a "$LOG_FILE" || log "⚠️  Backup eșuat"

# ─── 6. Restart serviciu principal ──────────────────────────────────
log "🔄 systemctl restart $SERVICE_NAME..."
systemctl restart "$SERVICE_NAME" 2>&1 | tee -a "$LOG_FILE" || error "Restart eșuat"

sleep 3
if systemctl is-active --quiet "$SERVICE_NAME"; then
  log "✅ $SERVICE_NAME pornit"
else
  error "$SERVICE_NAME NU e activ! systemctl status $SERVICE_NAME"
fi

# ─── 7. Health check ────────────────────────────────────────────────
log "🏥 Health check..."
for i in 1 2 3 4 5; do
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    log "✅ Health check OK (încercarea $i)"
    break
  fi
  [ "$i" -eq 5 ] && log "⚠️  Health check eșuat după 5 încercări"
  sleep 2
done

# ─── 8. Restart tunnel (dacă există) ────────────────────────────────
if systemctl is-active --quiet "$TUNNEL_SERVICE" 2>/dev/null; then
  log "🔄 Restart $TUNNEL_SERVICE..."
  systemctl restart "$TUNNEL_SERVICE" 2>&1 | tee -a "$LOG_FILE" || log "⚠️  Tunnel restart eșuat"
fi

# ─── 9. Notificare push pe Artur's iPhone 15 Pro (opțional) ──────
# Folosește HA_TOKEN + HA_NOTIFY_DEVICE din .env
# Necesită: Home Assistant App instalat pe iPhone, logat, notificări permise
if [ -n "$HA_TOKEN" ]; then
  log "🔔 Notificare push pe $HA_NOTIFY_DEVICE..."
  
  HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" -X POST \
    -H "Authorization: Bearer $HA_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$(cat << JSON
{
  "message": "✅ VQ Deploy reușit — commit ${NEW_COMMIT}",
  "title": "🚀 Vacanța Quester",
  "data": {
    "push": {
      "sound": "default",
      "badge": 1,
      "category": "deploy"
    },
    "url": "https://vacanta.cs-hub.xyz",
    "tag": "vq-deploy-${NEW_COMMIT}"
  }
}
JSON
)" \
    "$HA_HOST/api/services/notify/${HA_NOTIFY_DEVICE}" 2>/dev/null || echo "000")
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    log "✅ Notificare trimisă pe $HA_NOTIFY_DEVICE (HTTP $HTTP_CODE)"
  else
    log "⚠️  Notificare push eșuată pe $HA_NOTIFY_DEVICE (HTTP $HTTP_CODE)"
  fi
fi

log "═══════════════════════════════════════════════"
log "✅ Deploy completat cu succes!"
echo ""
echo "  🚀 VQ Deploy — $(date)"
echo "  📦 Commit: $NEW_COMMIT"
echo "  🏠 API:    https://api.cs-hub.xyz/api/health"
echo "  🌐 App:    https://vacanta.cs-hub.xyz"
echo ""
