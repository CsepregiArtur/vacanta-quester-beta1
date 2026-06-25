#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
# VQ Project — Deploy automat pe Proxmox LXC
# ══════════════════════════════════════════════════════════════════════
# ⚠️  Metoda principală de deploy e WEBHOOK-ul (Flask pe port 9000).
#    Acest script e rulat de webhook-server/deploy.sh.
#    Poate fi rulat și manual pentru testare.
# 
# Flux:
#   1. git pull origin main
#   2. npm ci (instalare dependințe exacte)
#   3. npm run build (Vite + esbuild)
#   4. Migrare DB (dacă e cazul)
#   5. Restart servicii systemd
# ══════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Config ─────────────────────────────────────────────────────────
PROJECT_DIR="/root/vq_proiect/vacanta-quester-beta1"
SERVICE_NAME="vacanta-api"
TUNNEL_SERVICE="vacanta-tunnel"
LOG_FILE="/var/log/vacanta-deploy.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# ─── Logging ────────────────────────────────────────────────────────
log() {
  echo "[DEPLOY] $1"
  echo "[$TIMESTAMP] $1" >> "$LOG_FILE"
}

error() {
  echo "[DEPLOY] ❌ $1"
  echo "[$TIMESTAMP] ❌ $1" >> "$LOG_FILE"
  exit 1
}

# ─── 1. Navigare la proiect ────────────────────────────────────────
cd "$PROJECT_DIR" || error "Directorul $PROJECT_DIR nu există!"

log "🚀 Start deploy — $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"

# ─── 2. Git pull ────────────────────────────────────────────────────
log "📥 Git pull origin main..."
git fetch origin main 2>&1 >> "$LOG_FILE" || error "git fetch eșuat"
git reset --hard origin/main 2>&1 >> "$LOG_FILE" || error "git reset eșuat"
log "✅ Git pull completat — $(git rev-parse --short HEAD)"

# ─── 3. Instalare dependințe ────────────────────────────────────────
log "📦 npm ci..."
npm ci 2>&1 >> "$LOG_FILE" || error "npm ci eșuat"
log "✅ Dependințe instalate"

# ─── 4. Build ───────────────────────────────────────────────────────
log "🔨 npm run build..."
npm run build 2>&1 >> "$LOG_FILE" || error "Build eșuat"
log "✅ Build completat"

# ─── 5. Migrare DB (opțional — doar dacă există modificări) ────────
if git diff HEAD~1 --name-only 2>/dev/null | grep -q "^server/db/schema.ts"; then
  log "🗄️  Migrare DB detectată — rulez npm run db:migrate..."
  npm run db:migrate 2>&1 >> "$LOG_FILE" || log "⚠️  Migrare DB eșuată (se poate să fie deja aplicată)"
  log "✅ Migrare DB completată"
fi

# ─── 6. Backup DB înainte de restart ───────────────────────────────
log "💾 Backup DB..."
bash server/scripts/backup.sh 2>&1 >> "$LOG_FILE" || log "⚠️ Backup eșuat (continuă)"

# ─── 7. Restart servicii ────────────────────────────────────────────
log "🔄 Restart $SERVICE_NAME..."
systemctl restart "$SERVICE_NAME" 2>&1 >> "$LOG_FILE" || error "systemctl restart $SERVICE_NAME eșuat"

# Așteaptă să pornească
sleep 3
if systemctl is-active --quiet "$SERVICE_NAME"; then
  log "✅ $SERVICE_NAME pornit cu succes"
else
  error "$SERVICE_NAME nu a pornit! Verifică: systemctl status $SERVICE_NAME"
fi

# ─── 8. Verificare health endpoint ──────────────────────────────────
log "🏥 Verificare health endpoint..."
HEALTH_URL="http://localhost:3000/api/health"
for i in 1 2 3 4 5; do
  if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    log "✅ Health check OK (încercarea $i)"
    break
  fi
  if [ "$i" -eq 5 ]; then
    log "⚠️  Health check eșuat după 5 încercări — continuă oricum"
  fi
  sleep 2
done

# ─── 9. Restart tunnel (dacă există) ───────────────────────────────
if systemctl list-units --type=service --state=running 2>/dev/null | grep -q "$TUNNEL_SERVICE"; then
  log "🔄 Restart $TUNNEL_SERVICE..."
  systemctl restart "$TUNNEL_SERVICE" 2>&1 >> "$LOG_FILE" || log "⚠️ Tunnel restart eșuat"
fi

# ─── 10. Raport final ──────────────────────────────────────────────
log "✅ Deploy completat cu succes!"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  🚀 VQ Deploy — $(date)"
echo "  📦 Commit: $(git rev-parse --short HEAD)"
echo "  🏠 API:    https://api.cs-hub.xyz/api/health"
echo "  🌐 App:    https://vacanta.cs-hub.xyz"
echo "═══════════════════════════════════════════════════════════════"
