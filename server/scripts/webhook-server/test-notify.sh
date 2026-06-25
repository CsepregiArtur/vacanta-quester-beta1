#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
# VQ Project — Test notificare push Home Assistant
# ══════════════════════════════════════════════════════════════════════
# Rulează pe Proxmox LXC pentru a testa notificarea pe iPhone.
# ══════════════════════════════════════════════════════════════════════

set -euo pipefail

ENV_FILE="/var/www/vq-webhook/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Nu există $ENV_FILE"
  echo "   Rulează întâi install.sh"
  exit 1
fi

# Încarcă variabilele
source "$ENV_FILE"

if [ -z "${HA_TOKEN:-}" ]; then
  echo "❌ HA_TOKEN nu e setat în $ENV_FILE"
  echo "   Creează un token în HA: Profil → Long-Lived Access Tokens"
  echo "   Apoi editează $ENV_FILE și adaugă:"
  echo "   HA_TOKEN=tokenul_tau"
  exit 1
fi

DEVICE="${HA_NOTIFY_DEVICE:-mobile_app_arturs_iphone_15_pro}"
HOST="${HA_HOST:-http://homeassistant.local:8123}"

echo "═══════════════════════════════════════════════"
echo "  🔔 Test notificare push Home Assistant"
echo "═══════════════════════════════════════════════"
echo ""
echo "  📡 HA_HOST:     $HOST"
echo "  📱 Dispozitiv:  $DEVICE"
echo "  🔑 Token:       ${HA_TOKEN:0:8}...${HA_TOKEN: -4}"
echo ""

# JSON payload pentru notificare
read -r -d '' PAYLOAD << JSON || true
{
  "message": "🧪 Test notificare de la VQ Webhook",
  "title": "🚀 Vacanța Quester — Test",
  "data": {
    "push": {
      "sound": "default",
      "badge": 1
    },
    "url": "https://vacanta.cs-hub.xyz"
  }
}
JSON

echo "📤 Trimit notificare..."
HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$HOST/api/services/notify/$DEVICE" 2>&1)

HTTP_CODE=$(echo "$HTTP_RESPONSE" | tail -1)
HTTP_BODY=$(echo "$HTTP_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "  ✅ Notificare trimisă cu succes! (HTTP $HTTP_CODE)"
  echo ""
  echo "  📱 Verifică telefonul Artur — ar trebui să vezi notificarea."
else
  echo "  ❌ Eșuat (HTTP $HTTP_CODE)"
  echo ""
  echo "  Răspuns: $HTTP_BODY"
  echo ""
  echo "  🔍 Posibile cauze:"
  echo "    1. Token-ul e greșit → verifică HA_TOKEN în $ENV_FILE"
  echo "    2. Numele device-ului e greșit → verifică în HA:"
  echo "       Settings → Devices & Services → Mobile App"
  echo "    3. Home Assistant nu e accesibil → verifică $HOST"
  echo "    4. App-ul HA nu e instalat pe iPhone sau notificările sunt blocate"
fi

echo ""
echo "═══════════════════════════════════════════════"
echo "  📋 Pentru a găsi numele corect al device-ului:"
echo "     http://$HOST/api/services"
echo "     Caută 'notify.mobile_app_' în listă"
echo "═══════════════════════════════════════════════"
