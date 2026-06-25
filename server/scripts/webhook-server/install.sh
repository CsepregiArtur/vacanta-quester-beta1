#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
# VQ Webhook — Instalare pe Proxmox LXC
# ══════════════════════════════════════════════════════════════════════
# Rulează o singură dată pe LXC pentru a instala webhook-ul.
# ══════════════════════════════════════════════════════════════════════

set -euo pipefail

WEBHOOK_DIR="/var/www/vq-webhook"
SERVICE_NAME="vq-webhook"
SECRET="${1:-}"  # primul argument = webhook secret (opțional)

echo "═══════════════════════════════════════════════"
echo "  🔧 VQ Webhook — Instalare"
echo "═══════════════════════════════════════════════"

# 1. Creează directorul
mkdir -p "$WEBHOOK_DIR"
cp "$(dirname "$0")/app.py" "$WEBHOOK_DIR/"
cp "$(dirname "$0")/deploy.sh" "$WEBHOOK_DIR/"
cp "$(dirname "$0")/requirements.txt" "$WEBHOOK_DIR/"
chmod +x "$WEBHOOK_DIR/deploy.sh"

# 2. Instalează Python + dependințe
echo "[1/4] 📦 Instalare Python + Flask..."
apt-get update -qq
apt-get install -y -qq python3 python3-pip python3-venv 2>/dev/null

python3 -m venv "$WEBHOOK_DIR/venv"
source "$WEBHOOK_DIR/venv/bin/activate"
pip install -q -r "$WEBHOOK_DIR/requirements.txt"
deactivate

echo "      ✅ Flask + gunicorn instalate"

# 3. Creează fișierul .env pentru secret și HA_TOKEN
echo "[2/4] 🔑 Configurare variabile de mediu..."

# WEBHOOK_SECRET
if [ -n "$SECRET" ]; then
  echo "VQ_WEBHOOK_SECRET=$SECRET" > "$WEBHOOK_DIR/.env"
  echo "      ✅ Webhook secret setat: $SECRET"
else
  if [ ! -f "$WEBHOOK_DIR/.env" ] || ! grep -q "VQ_WEBHOOK_SECRET" "$WEBHOOK_DIR/.env" 2>/dev/null; then
    RANDOM_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    echo "VQ_WEBHOOK_SECRET=$RANDOM_SECRET" >> "$WEBHOOK_DIR/.env"
    echo "      ⚠️  Webhook secret GENERAT: $RANDOM_SECRET"
    echo "      📋 Copiază-l în GitHub → Settings → Webhooks!"
  else
    echo "      ✅ VQ_WEBHOOK_SECRET deja existent"
  fi
fi

# HA_TOKEN (opțional) — pentru notificări push pe iPhone
if ! grep -q "^HA_TOKEN=" "$WEBHOOK_DIR/.env" 2>/dev/null; then
  echo "" >> "$WEBHOOK_DIR/.env"
  echo "# Home Assistant (opțional — notificări push pe iPhone)" >> "$WEBHOOK_DIR/.env"
  echo '# Creează un token în HA: Profil → Long-Lived Access Tokens' >> "$WEBHOOK_DIR/.env"
  echo "HA_TOKEN=" >> "$WEBHOOK_DIR/.env"
  echo "HA_HOST=http://homeassistant.local:8123" >> "$WEBHOOK_DIR/.env"
  echo "# Dispozitivul țintă (numele entity-ului în HA)" >> "$WEBHOOK_DIR/.env"
  echo "HA_NOTIFY_DEVICE=mobile_app_arturs_iphone_15_pro" >> "$WEBHOOK_DIR/.env"
  echo "      ℹ️  HA_TOKEN + HA_NOTIFY_DEVICE adăugate în .env"
  echo "      ✏️  Completează HA_TOKEN manual și verifică numele device-ului în HA"
else
  echo "      ✅ HA_TOKEN deja existent în .env"
  # Adaugă HA_NOTIFY_DEVICE dacă lipsește
  if ! grep -q "^HA_NOTIFY_DEVICE=" "$WEBHOOK_DIR/.env" 2>/dev/null; then
    echo "HA_NOTIFY_DEVICE=mobile_app_arturs_iphone_15_pro" >> "$WEBHOOK_DIR/.env"
    echo "      ℹ️  HA_NOTIFY_DEVICE adăugat în .env"
  fi
fi

# 4. Instalează systemd service
echo "[3/4] ⚙️  Instalare systemd service..."
cat > "/etc/systemd/system/$SERVICE_NAME.service" << 'SERVICE'
[Unit]
Description=VQ Webhook — GitHub auto-deploy receiver
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/vq-webhook
EnvironmentFile=/var/www/vq-webhook/.env
ExecStart=/var/www/vq-webhook/venv/bin/gunicorn \
  --bind 127.0.0.1:9000 \
  --workers 2 \
  --access-logfile /var/log/vq-webhook-access.log \
  --error-logfile /var/log/vq-webhook-error.log \
  app:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

echo "      ✅ $SERVICE_NAME activat"

# 5. Verificare
echo "[4/4] 🏥 Verificare..."
sleep 2
if systemctl is-active --quiet "$SERVICE_NAME"; then
  echo "      ✅ Webhook server pornit pe 127.0.0.1:9000"
  curl -sf http://127.0.0.1:9000/health && echo ""
else
  echo "      ❌ Webhook server NU a pornit!"
  systemctl status "$SERVICE_NAME" --no-pager
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════"
echo "  ✅ Instalare completă!"
echo ""
echo "  🔗 URL webhook: https://vacanta.cs-hub.xyz/webhook"
echo ""
CURRENT_SECRET=$(grep VQ_WEBHOOK_SECRET "$WEBHOOK_DIR/.env" 2>/dev/null | cut -d= -f2)
echo "  🔑 Webhook Secret: $CURRENT_SECRET"
echo ""
echo "  📋 Adaugă în GitHub:"
echo "     Settings → Webhooks → Add webhook"
echo "     URL:    https://vacanta.cs-hub.xyz/webhook"
echo "     Secret: $CURRENT_SECRET"
echo "     Events: Just the push event"
echo ""
echo "  🏠 Home Assistant (opțional):"
echo "     Editează $WEBHOOK_DIR/.env și completează HA_TOKEN"
echo "     Creează token în HA: Profil → Long-Lived Access Tokens"
echo "═══════════════════════════════════════════════"
