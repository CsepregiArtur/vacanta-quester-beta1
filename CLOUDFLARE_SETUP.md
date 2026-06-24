# ☁️ Cloudflare Setup — VQ Project

> **Obiectiv:** 
> - `api.cs-hub.xyz` → backend (Express :3000)
> - `vacanta.cs-hub.xyz` → frontend (Vite :5173 / production build)

---

## Situația curentă

| Componentă | Valoare |
|------------|---------|
| **Mediu** | MacBook local (dezvoltare) |
| **IP Public** | `86.126.246.21` (dinamic — se poate schimba) |
| **IP Local** | `192.168.1.110` |
| **Server** | Express pe portul `:3000` |
| **Frontend** | Vite dev pe `:5173` / build static |
| **DNS** | Nu există încă pe `cs-hub.xyz` |
| **Tools** | Nu ai nginx, caddy, cloudflared instalate |

> ⚠️ **Problemă:** IP-ul tău public e **dinamic** (se schimbă).
> Soluția e **Cloudflare Tunnel** (recomandat) sau **DDNS** + **reverse proxy**.

---

## Opțiunea A — Cloudflare Tunnel (RECOMANDAT ⭐)

Folosește `cloudflared` — creează un tunel securizat fără IP public static.

### Pasul 1 — Instalează cloudflared

```bash
# macOS
brew install cloudflared

# Verifică
cloudflared --version
```

### Pasul 2 — Autentifică-te în Cloudflare

```bash
cloudflared tunnel login
# → Se deschide browserul. Autentifică-te și selectează domeniul cs-hub.xyz
```

### Pasul 3 — Creează tunelul

```bash
cloudflared tunnel create vacanta-arcadia
# → Creează un ID de tunel (ex: abc123...)
```

### Pasul 4 — Configurare tunel

Crează `~/.cloudflared/config.yml`:

```yaml
tunnel: abc123...  # ID-ul de la pasul 3
credentials-file: /Users/artur/.cloudflared/abc123....json

ingress:
  # Frontend → Vite dev server
  - hostname: vacanta.cs-hub.xyz
    service: http://localhost:5173
  
  # Backend API → Express
  - hostname: api.cs-hub.xyz
    service: http://localhost:3000
  
  # Fallback
  - service: http_status:404
```

### Pasul 5 — Configurează DNS în Cloudflare Dashboard

1. Mergi la [dash.cloudflare.com](https://dash.cloudflare.com)
2. Selectează **cs-hub.xyz**
3. Mergi la **DNS → Records**
4. Adaugă:

| Tip | Nume | Conținut |
|-----|------|----------|
| `CNAME` | `api` | `abc123....cfargotunnel.com` |
| `CNAME` | `vacanta` | `abc123....cfargotunnel.com` |

> ID-ul tunelului se vede cu `cloudflared tunnel list`

### Pasul 6 — Rulează tunelul

```bash
# Ca serviciu (rulează în background)
cloudflared tunnel install vacanta-arcadia

# Sau manual:
cloudflared tunnel run vacanta-arcadia
```

### Pasul 7 — Verifică

```bash
curl https://api.cs-hub.xyz/api/state
curl https://vacanta.cs-hub.xyz
```

---

## Opțiunea B — Reverse Proxy local (fără Cloudflare Tunnel)

Dacă ai IP static sau folosești DDNS.

### Instalează Caddy (mai simplu ca nginx)

```bash
brew install caddy
```

### Crează `Caddyfile` în rădăcina proiectului

```
api.cs-hub.xyz {
    reverse_proxy localhost:3000
}

vacanta.cs-hub.xyz {
    reverse_proxy localhost:5173
}
```

### Rulează

```bash
caddy run
```

### DNS în Cloudflare Dashboard

| Tip | Nume | Conținut |
|-----|------|----------|
| `A` | `api` | `86.126.246.21` |
| `A` | `vacanta` | `86.126.246.21` |

> ⚠️ **Atentie:** Dacă IP-ul public se schimbă, trebuie actualizat manual.
> Poți folosi un script DDNS sau seta **Cloudflare Proxy (orange cloud)** să cache-uiască.

---

## Opțiunea C — Production Build + VPS

Pentru adevărat "live", ai nevoie de un VPS (DigitalOcean, Hetzner, etc.).

### Build frontend

```bash
cd /Users/artur/PyProg/vacanta-quester-beta1
npm run build
# → Creează dist/ cu frontendul compilat
```

### Configurare nginx pe VPS

```nginx
# /etc/nginx/sites-available/vacanta

server {
    listen 80;
    server_name vacanta.cs-hub.xyz;

    root /var/www/vacanta/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name api.cs-hub.xyz;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Deploy cu PM2

```bash
npm install -g pm2
pm2 start server.ts --name vacanta-api --interpreter npx -- tsx
pm2 save
pm2 startup
```

---

## Recomandarea mea

| Opțiune | Cost | Complexitate | Stabilitate |
|---------|------|-------------|-------------|
| **A. Cloudflare Tunnel** ⭐ | Gratis | Medie | Excelentă |
| **B. Caddy local** | Gratis | Simplă | Depinde de IP |
| **C. VPS + nginx** | ~5€/lună | Avansată | Maximă |

**Pentru development acum:** Opțiunea A (Cloudflare Tunnel) — nu ai nevoie de IP static,
e securizat automat, și poți dezvolta local în timp ce site-ul e live.

---

## Verificare finală

```bash
# 1. Tunelul rulează?
cloudflared tunnel list

# 2. DNS e configurat?
dig api.cs-hub.xyz +short
dig vacanta.cs-hub.xyz +short

# 3. API-ul răspunde?
curl -s https://api.cs-hub.xyz/api/ai/status

# 4. Frontendul e accesibil?
curl -s https://vacanta.cs-hub.xyz | head -5
```
