# 🏖️ Vacanța Quester

> **Aplicație interactivă pentru familii** — copiii câștigă puncte prin activități, lectură și plimbări, iar părinții gestionează recompensele. Construită cu React + TypeScript, Express, PostgreSQL.

---

## 🚀 Stack

```
Frontend:    Vite + React 19 + TypeScript → vacanta.cs-hub.xyz
Backend:     Express + TypeScript          → api.cs-hub.xyz
Mobile:      Flutter (Android, iOS, Web)
Database:    PostgreSQL + SQLite (mobile) + IndexedDB (web)
AI:          Gemini (cu fallback OpenAI / local)
Sync:        Offline-first cu Sync Queue + version number
Monitor:     Prometheus + Loki + Grafana   → monitor.cs-hub.xyz
Tunnel:      Cloudflare Tunnel             → vacanta-arcadia
```

---

## 📁 Structură proiect

```
├── server/                  # Backend Express
│   ├── main.ts              # Punct de intrare (PostgreSQL)
│   ├── auth.ts              # JWT, PIN (bcrypt), refresh tokens
│   ├── services/            # Business logic
│   ├── routes/              # API routes
│   ├── middleware/           # Auth + error handling
│   ├── db/                  # PostgreSQL (Drizzle ORM)
│   ├── ai/                  # AI provider factory (Gemini, OpenAI)
│   └── scripts/             # Backup, deploy, webhook
├── src/                     # Frontend React
│   ├── components/          # KidDashboard, ParentDashboard, ThemeSelector
│   ├── modules/             # Analytics, Auth, HomeAssistant, Offline, Rewards, Sync
│   └── styles/              # Teme (themes.ts)
├── mobile/                  # Flutter app
├── tests/                   # Teste unitare + integrare
│   ├── unit/                # 153+ teste (auth, sync, rewards, github-issues)
│   ├── integration/         # Teste cu PostgreSQL
│   └── e2e/                 # Teste end-to-end
├── .github/workflows/       # CI/CD (GitHub Actions)
└── server/scripts/          # Backup, deploy, webhook server
```

---

## 🛠️ Comenzi rapide

```bash
# Dezvoltare
npm run dev            # Server Express (port 3000)
npm run dev:old        # Server legacy (JSON files)

# Teste
npm test               # Toate testele unitare
npm run test:coverage  # Cu code coverage
npm run test:unit      # Doar unitare
npm run test:integration # Cu PostgreSQL

# Build
npm run build          # Vite + esbuild → dist/
npm run start          # Production (NODE_ENV=production)

# Database
npm run db:migrate     # Rulează migrări PostgreSQL
npm run db:generate    # Generează migrări din schema
npm run migrate        # Migrare JSON → PostgreSQL

# Utilitare
npm run backup         # Backup DB
npm run lint           # TypeScript check
```

---

## 🔐 Autentificare

- Login cu **email + PIN** (hash-uit cu bcrypt)
- **JWT** — Access Token (15min) + Refresh Token (30 zile)
- Rate limiting: 10 req/min pe auth, 100 req/min pe API
- Login social automat pentru utilizatori noi

---

## 🤖 AI Service

| Provider | Status | Descriere |
|----------|--------|-----------|
| **Gemini** | ✅ Principal | Generare lecturi, analiză imagini |
| **OpenAI** | 🔄 Fallback | Dacă Gemini e indisponibil |
| **Local** | 🟡 Backup | Fallback local (offline) |

---

## 📡 Deploy automat

```
Push pe main → GitHub Webhook → Cloudflare Tunnel
                                    ↓
                            Flask (port 9000)
                                    ↓
                            deploy.sh (git pull, build, restart)
                                    ↓
                            Notificare push pe iPhone 📱
```

> Vezi `GITHUB_ACTIONS_SETUP.md` și `CLOUDFLARE_SETUP.md` pentru detalii.

---

## 🐛 Raportare erori

Erorile serverului (5xx) sunt raportate automat ca **GitHub Issues** cu:
- Label-uri: `critical`, `sync`, `ai`, `ha-rewards`, `bug`
- Stack trace complet în body
- Detectare duplicat (nu creează issue-uri duplicate)
- Rate limiting (aceeași eroare max 1/min)

---

## 📱 Mobile (Flutter)

```bash
cd mobile/vq_app && flutter run
```

- SQLite local (sqflite)
- Sync offline-first cu Sync Queue
- Suportă Android, iOS, Windows, Web

---

## 📄 Licență

Apache-2.0 — vezi `LICENSE` pentru detalii.
