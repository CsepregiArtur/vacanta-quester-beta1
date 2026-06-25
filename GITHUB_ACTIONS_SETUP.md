# 🚀 Webhook Deploy — GitHub → Proxmox LXC

## Arhitectură

```
Push pe main (GitHub)
     ↓
GitHub Webhook → POST https://vacanta.cs-hub.xyz/webhook
     ↓
Cloudflare Tunnel → localhost:9000
     ↓
Flask (vq-webhook.service) → verifică HMAC
     ↓
server/scripts/webhook-server/deploy.sh
     ├── git fetch origin main + reset --hard
     ├── npm ci
     ├── npm run build
     ├── DB migrate (dacă e cazul)
     ├── Backup DB
     ├── systemctl restart vacanta-api
     ├── Health check
     └── (opțional) Notificare Home Assistant
```

> **Nu ai nevoie de SSH keys, nici de GitHub Actions pentru deploy!**
> GitHub Actions rulează doar testele + build-ul. Deploy-ul e declanșat direct de GitHub Webhook.

---

## Variabile de mediu (`/var/www/vq-webhook/.env`)

După instalare, fișierul `.env` arată astfel:

```env
# Webhook secret (obligatoriu — GitHub îl folosește să semneze payload-ul)
VQ_WEBHOOK_SECRET=secretul-tau-super-secret

# Home Assistant Long-Lived Token (opțional — pentru notificări)
# Creează un token în HA: Profil → Long-Lived Access Tokens
HA_TOKEN=
HA_HOST=http://homeassistant.local:8123
```

➡️ Completează `HA_TOKEN` după instalare dacă vrei notificări în Home Assistant la fiecare deploy.

---

## 1. 🔧 Instalare pe Proxmox LXC

Pe LXC, rulează scriptul de instalare:

```bash
# 1. Intră pe LXC (prin Proxmox Web Console sau SSH)
# 2. Rulează instalatorul (cu un secret personalizat):
bash /root/vq_proiect/vacanta-quester-beta1/server/scripts/webhook-server/install.sh "secretul-tau-super-secret"

# Fără argument, generează automat un secret:
bash /root/vq_proiect/vacanta-quester-beta1/server/scripts/webhook-server/install.sh
```

Scriptul instalator face automat:
- ✅ Creează `/var/www/vq-webhook/` cu toate fișierele
- ✅ Instalează Python 3 + Flask + gunicorn
- ✅ Configurează secretul webhook
- ✅ Creează și pornește serviciul systemd `vq-webhook.service`
- ✅ Verifică starea (localhost:9000/health)

---

## 2. 🔑 Configurare GitHub Webhook

Mergi la repo-ul tău GitHub → **Settings → Webhooks → Add webhook**:

| Câmp | Valoare |
|------|---------|
| **Payload URL** | `https://vacanta.cs-hub.xyz/webhook` |
| **Content type** | `application/json` |
| **Secret** | Cel pe care l-ai setat la instalare (sau cel din `/var/www/vq-webhook/.env`) |
| **Events** | ☑️ Just the push event |
| **Active** | ✅ Bifează |

---

## 3. ☁️ Update Cloudflare Tunnel

Asigură-te că `~/.cloudflared/config.yml` are regula pentru webhook **înainte** de regula generală:

```yaml
ingress:
  # Webhook GitHub → Flask (port 9000)
  - hostname: vacanta.cs-hub.xyz
    path: /webhook*
    service: http://localhost:9000

  # Frontend + API → Express
  - hostname: vacanta.cs-hub.xyz
    service: http://localhost:3000
  
  - hostname: api.cs-hub.xyz
    service: http://localhost:3000
  
  - service: http_status:404
```

După modificare, repornește tunelul:

```bash
systemctl restart vacanta-tunnel
```

---

## 4. 🧪 Testare

### Test 1 — Verifică serverul webhook

```bash
curl http://127.0.0.1:9000/health
# → {"status":"ok","service":"vq-webhook"}
```

### Test 2 — Simulează un webhook

```bash
# Folosește secretul din /var/www/vq-webhook/.env
SECRET="$(grep VQ_WEBHOOK_SECRET /var/www/vq-webhook/.env | cut -d= -f2)"
PAYLOAD='{"ref":"refs/heads/main","repository":{"full_name":"csepregi/vacanta-quester"},"pusher":{"name":"test"},"commits":[{"message":"test deploy"}]}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print "sha256="$2}')

curl -X POST http://127.0.0.1:9000/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: $SIGNATURE" \
  -H "X-GitHub-Event: push" \
  -d "$PAYLOAD"
```

### Test 3 — Verifică log-urile

```bash
# Log-ul deploy-ului
cat /var/log/vacanta-deploy.log

# Log-ul webhook-ului
journalctl -u vq-webhook -n 50 --no-pager
```

---

## 5. 📊 Verificare după deploy

```bash
# Health API
curl https://api.cs-hub.xyz/api/health

# Status servicii
systemctl status vacanta-api
systemctl status vq-webhook

# Log-uri aplicație
journalctl -u vacanta-api -n 50 --no-pager
```

---

## 6. 🛑 Rollback

```bash
cd /root/vq_proiect/vacanta-quester-beta1
git reflog
git reset --hard HEAD@{1}
npm ci && npm run build && systemctl restart vacanta-api
```

---

## 7. 📁 Fișiere implicate

| Fișier | Rol |
|--------|-----|
| `server/scripts/webhook-server/app.py` | Server Flask care ascultă webhook-uri |
| `server/scripts/webhook-server/deploy.sh` | Script de deploy (git pull, build, restart) |
| `server/scripts/webhook-server/install.sh` | Instalator (setup + systemd service) |
| `server/scripts/webhook-server/requirements.txt` | Dependințe Python |
| `/etc/systemd/system/vq-webhook.service` | Serviciu systemd |
| `/var/www/vq-webhook/.env` | Config (secret webhook) |
| `/var/log/vacanta-deploy.log` | Log-ul deploy-urilor |
