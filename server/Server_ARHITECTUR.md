# 🏗️ Arhitectura Finală - VQ Project (Virtual Quest)

---

## 1. 🗺️ Arhitectura Generală (High-Level)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser / Mobile)                    │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                 OFFLINE-FIRST LAYER                          │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │  │
│  │  │   LocalStore   │  │   Sync Queue   │  │  UI (Optimist) │ │  │
│  │  │ (localStorage/ │  │  (persisted +  │  │  Update        │ │  │
│  │  │  IndexedDB)    │  │   auto-retry)  │  │  Instant ->    │ │  │
│  │  └────────┬───────┘  └───────┬────────┘  └────────────────┘ │  │
│  │           │                  │                               │  │
│  │           └──── WRITE ───────┘   (offline: queued)           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│              ┌──────────────────┐  ┌──────────────────┐             │
│              │   Frontend App   │  │   Admin Panel    │             │
│              │   (React/Next)   │  │   (React Admin)  │             │
│              └────────┬─────────┘  └────────┬─────────┘             │
│                       │                     │                       │
└───────────────────────┼─────────────────────┼───────────────────────┘
                        │                     │
                        │    HTTPS :443       │
                        ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     API GATEWAY / REVERSE PROXY                     │
│                    (Nginx / Traefik / Caddy)                        │
│                                                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │ Rate Limit │  │   Auth JWT │  │   CORS     │  │   Logger   │   │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BACKEND API (Node.js / Python)                  │
│                                                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │   Auth     │  │  Families  │  │  Children  │  │Activities  │   │
│  │  Module    │  │  Module    │  │  Module    │  │  Module    │   │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │  Rewards   │  │Transactions│  │  Photos    │  │    AI      │   │
│  │  Module    │  │  Module    │  │  Module    │  │ Validation │   │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Middleware Layer                                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │   │
│  │  │ JWT Auth │  │   RBAC   │  │Validator │  │ Error Handler│ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     DATABASE LAYER (PostgreSQL)                     │
│                                                                     │
│                     ┌─────────────────────┐                         │
│                     │    vq_proiect       │                         │
│                     │   (Database)        │                         │
│                     ├─────────────────────┤                         │
│                     │   Schema: public    │                         │
│                     │                     │                         │
│                     │  ┌───────────────┐  │                         │
│                     │  │   families    │  │                         │
│                     │  ├───────────────┤  │                         │
│                     │  │   parents     │  │                         │
│                     │  ├───────────────┤  │                         │
│                     │  │   children    │  │                         │
│                     │  ├───────────────┤  │                         │
│                     │  │  activities   │  │                         │
│                     │  ├───────────────┤  │                         │
│                     │  │   rewards     │  │                         │
│                     │  ├───────────────┤  │                         │
│                     │  │ transactions  │  │                         │
│                     │  ├───────────────┤  │                         │
│                     │  │   photos      │  │                         │
│                     │  └───────────────┘  │                         │
│                     └─────────────────────┘                         │
│                                                                     │
│  ┌───────────────────┐  ┌───────────────────┐                      │
│  │   app_user_vq     │  │    postgres       │                      │
│  │ (Owner - DDL+DML) │  │  (Superuser)      │                      │
│  └───────────────────┘  └───────────────────┘                      │
│  ┌───────────────────┐  ┌───────────────────┐                      │
│  │   read_user       │  │   write_user      │                      │
│  │  (SELECT only)    │  │ (CRUD operations) │                      │
│  └───────────────────┘  └───────────────────┘                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. 👥 Utilizatori PostgreSQL & Permisiuni

| Utilizator | Rol | Parolă | Permisiuni | Folosit de |
|------------|-----|--------|------------|------------|
| **postgres** | Superuser | `AFfgs#@42f3rt5v23bvu8768n566_4` | Orice | Administrare DB |
| **app_user_vq** | Owner DB | `vq_app_AFfgs#@42f3rt5v23bvu8768n566_4` | DDL + DML (full) | API Backend (scriere/citire) |
| **read_user** | Citire | `dhgs5yws54q2h` | SELECT only | Rapoarte, Analytics, Admin Panel |
| **write_user** | Scriere | `nsfgjh57iu67jker67` | SELECT, INSERT, UPDATE, DELETE | API Backend (operatiuni CRUD) |

### 🔐 Configurare conexiuni în aplicație

#### Variabile de mediu (`.env`)

```env
# === SUPERUSER (doar pentru migrări/setup) ===
DATABASE_SUPER_URL=postgresql://postgres:AFfgs%23%40%2042f3rt5v23bvu8768n566_4@localhost:5432/vq_proiect

# === OWNER (full access - pentru API principal) ===
DATABASE_OWNER_URL=postgresql://app_user_vq:vq_app_AFfgs%23%40%2042f3rt5v23bvu8768n566_4@localhost:5432/vq_proiect

# === READ USER (doar citire - pentru rapoarte) ===
DATABASE_READ_URL=postgresql://read_user:dhgs5yws54q2h@localhost:5432/vq_proiect

# === WRITE USER (CRUD - pentru scriere dedicată) ===
DATABASE_WRITE_URL=postgresql://write_user:nsfgjh57iu67jker67@localhost:5432/vq_proiect

# === JWT ===
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# === Server ===
PORT=3000
NODE_ENV=development

# === AI Validation (pentru photos) ===
AI_VALIDATION_API_URL=https://api.openai.com/v1
AI_API_KEY=sk-your-key-here
```

> **⚠️ Important:** URL-urile conexiunii trebuie să aibă caractere speciale URL-encoded (`#` → `%23`, `@` → `%40`).

---

## 3. 🔌 Puncte de Acces API (Endpoints)

### 3.1 Autentificare `/api/auth`

| Method | Endpoint | Descriere | Access |
|--------|----------|-----------|--------|
| POST | `/api/auth/register` | Înregistrare familie + părinte | Public |
| POST | `/api/auth/login` | Login părinte → JWT Token | Public |
| POST | `/api/auth/refresh` | Reîmprospătare token | Authenticated |
| POST | `/api/auth/logout` | Logout | Authenticated |

### 3.2 Familii `/api/families`

| Method | Endpoint | Descriere | Access |
|--------|----------|-----------|--------|
| GET | `/api/families` | Lista familii | Admin |
| GET | `/api/families/:id` | Detalii familie | Parent (own) / Admin |
| PATCH | `/api/families/:id` | Actualizare familie | Parent (own) / Admin |
| DELETE | `/api/families/:id` | Ștergere familie | Parent (own) / Admin |

### 3.3 Părinți `/api/parents`

| Method | Endpoint | Descriere | Access |
|--------|----------|-----------|--------|
| GET | `/api/parents` | Lista părinți (familie) | Parent (own) / Admin |
| GET | `/api/parents/:id` | Detalii părinte | Parent (own) / Admin |
| PATCH | `/api/parents/:id` | Actualizare profil | Parent (own) |
| DELETE | `/api/parents/:id` | Ștergere cont | Parent (own) / Admin |

### 3.4 Copii `/api/children`

| Method | Endpoint | Descriere | Access |
|--------|----------|-----------|--------|
| GET | `/api/children` | Lista copii (familie) | Parent (own) |
| GET | `/api/children/:id` | Detalii copil | Parent (own) |
| POST | `/api/children` | Adăugare copil | Parent (own) |
| PATCH | `/api/children/:id` | Actualizare copil | Parent (own) |
| DELETE | `/api/children/:id` | Ștergere copil | Parent (own) |

### 3.5 Activități `/api/activities`

| Method | Endpoint | Descriere | Access |
|--------|----------|-----------|--------|
| GET | `/api/activities` | Lista activități (copil/familie) | Parent / Child |
| GET | `/api/activities/:id` | Detalii activitate | Parent / Child |
| POST | `/api/activities` | Creare activitate | Parent |
| PATCH | `/api/activities/:id` | Actualizare activitate | Parent |
| PATCH | `/api/activities/:id/complete` | Marcare completă | Parent / Child |
| DELETE | `/api/activities/:id` | Ștergere activitate | Parent |

### 3.6 Recompense `/api/rewards`

| Method | Endpoint | Descriere | Access |
|--------|----------|-----------|--------|
| GET | `/api/rewards` | Lista recompense | Parent / Child |
| GET | `/api/rewards/:id` | Detalii recompensă | Parent / Child |
| POST | `/api/rewards` | Creare recompensă | Parent |
| PATCH | `/api/rewards/:id` | Actualizare recompensă | Parent |
| DELETE | `/api/rewards/:id` | Ștergere recompensă | Parent |

### 3.7 Tranzacții `/api/transactions`

| Method | Endpoint | Descriere | Access |
|--------|----------|-----------|--------|
| GET | `/api/transactions` | Istoric tranzacții (copil) | Parent / Child |
| GET | `/api/transactions/:id` | Detalii tranzacție | Parent / Child |
| POST | `/api/transactions` | Adăugare/scădere puncte | Parent |

### 3.8 Foto `/api/photos`

| Method | Endpoint | Descriere | Access |
|--------|----------|-----------|--------|
| GET | `/api/photos` | Lista fotografii (activitate) | Parent / Child |
| GET | `/api/photos/:id` | Detalii fotografie | Parent / Child |
| POST | `/api/photos/upload` | Încărcare fotografie | Parent / Child |
| POST | `/api/photos/:id/validate` | Validare AI | Backend (AI) |
| DELETE | `/api/photos/:id` | Ștergere fotografie | Parent |

### 3.9 Dashboard / Stats `/api/dashboard`

| Method | Endpoint | Descriere | Access |
|--------|----------|-----------|--------|
| GET | `/api/dashboard/family/:id` | Statistici familie | Parent |
| GET | `/api/dashboard/child/:id` | Statistici copil | Parent / Child |
| GET | `/api/dashboard/leaderboard` | Clasament copii (familie) | Parent / Child |

### 3.10 Admin `/api/admin`

| Method | Endpoint | Descriere | Access |
|--------|----------|-----------|--------|
| GET | `/api/admin/users` | Lista utilizatori | Admin |
| GET | `/api/admin/stats` | Statistici platformă | Admin |
| PATCH | `/api/admin/families/:id` | Modificare abonament | Admin |

---

## 4. 🧱 Middleware & Securitate

```
Cerere HTTP → CORS → Rate Limit → JWT Auth → RBAC → Validare → Handler
```

| Middleware | Rol | Configurare |
|-----------|-----|-------------|
| **CORS** | Permite origini sigure | `origin: process.env.CORS_ORIGIN || 'http://localhost:3000'` |
| **Rate Limit** | Previne abuzuri | `100 req/15min per IP` |
| **JWT Auth** | Verifică token | `Bearer <token>` → decodifică → `req.user` |
| **RBAC** | Verifică roluri | `parent`, `child`, `admin` |
| **Validator** | Validează input | `express-validator` / `Joi` / `Zod` |
| **Error Handler** | Tratează erori globale | `{ error, message, statusCode }` |

---

## 5. 🔐 Flux Autentificare

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Client  │     │  API     │     │  Auth    │     │  DB      │
│         │     │ Gateway  │     │  Service │     │          │
└────┬────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │  POST /login   │                │                │
     │ {email,pass}   │                │                │
     ├───────────────>│                │                │
     │                │  Validare      │                │
     │                ├───────────────>│                │
     │                │                │  SELECT parent │
     │                │                │  WHERE email=  │
     │                │                ├───────────────>│
     │                │                │<───────────────│
     │                │                │                │
     │                │                │  bcrypt.compare│
     │                │                │  + JWT.sign()  │
     │                │                │                │
     │                │<───────────────│                │
     │<───────────────│                │                │
     │                │                │                │
     │ {token,user}   │                │                │
     │                │                │                │
```

---

## 6. 📂 Structura Proiectului (Backend - Node.js)

```
vq_project/
├── schema.sql                    # Schema bazei de date
├── ARHITECTURA.md                # Acest document
├── .env                          # Variabile de mediu
├── .env.example                  # Template .env
├── package.json
├── src/
│   ├── index.js                  # Entry point (Express / Fastify)
│   ├── config/
│   │   ├── database.js           # Pool-uri conexiune (4 useri)
│   │   ├── auth.js               # Config JWT
│   │   └── env.js                # Validare variabile mediu
│   ├── middleware/
│   │   ├── auth.js               # JWT verificare
│   │   ├── rbac.js               # Role-Based Access Control
│   │   ├── validator.js          # Validare input
│   │   ├── rateLimiter.js        # Rate limiting
│   │   └── errorHandler.js       # Gestionare erori globală
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── families.routes.js
│   │   ├── parents.routes.js
│   │   ├── children.routes.js
│   │   ├── activities.routes.js
│   │   ├── rewards.routes.js
│   │   ├── transactions.routes.js
│   │   ├── photos.routes.js
│   │   ├── dashboard.routes.js
│   │   └── admin.routes.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── families.controller.js
│   │   ├── parents.controller.js
│   │   ├── children.controller.js
│   │   ├── activities.controller.js
│   │   ├── rewards.controller.js
│   │   ├── transactions.controller.js
│   │   ├── photos.controller.js
│   │   ├── dashboard.controller.js
│   │   └── admin.controller.js
│   ├── services/
│   │   ├── auth.service.js       # Hash, JWT, login logic
│   │   ├── families.service.js
│   │   ├── children.service.js
│   │   ├── activities.service.js
│   │   ├── transactions.service.js
│   │   ├── photos.service.js
│   │   └── ai.service.js         # Validare AI foto
│   ├── models/
│   │   ├── family.model.js
│   │   ├── parent.model.js
│   │   ├── child.model.js
│   │   ├── activity.model.js
│   │   ├── reward.model.js
│   │   ├── transaction.model.js
│   │   └── photo.model.js
│   └── utils/
│       ├── ApiError.js           # Clasă erori custom
│       ├── logger.js             # Winston / Pino logger
│       └── helpers.js            # Funcții utilitare
└── uploads/                      # Dosar poze încărcate
```

---

## 7. 📦 Schema SQL Finală (cu toate constrângerile)

Tabelele sunt deja create în `schema.sql`. Rezumat:

| Tabela | PK | FK | Chei unice | Indexuri | Check-uri |
|--------|----|----|-----------|----------|-----------|
| families | `id` UUID | - | - | - | `subscription_type` IN (...) |
| parents | `id` UUID | `family_id` → families | `email` | `idx_parents_family_id` | - |
| children | `id` UUID | `family_id` → families | - | `idx_children_family_id` | `level >= 1`, `points >= 0` |
| activities | `id` UUID | `child_id` → children | - | `idx_activities_child_id`, `idx_activities_status` | `status` IN (...), `points >= 0` |
| rewards | `id` UUID | `family_id` → families | - | `idx_rewards_family_id` | `cost > 0`, `type` IN (...) |
| transactions | `id` UUID | `child_id` → children | - | `idx_transactions_child_id`, `idx_transactions_created_at` | - |
| photos | `id` UUID | `activity_id` → activities | - | `idx_photos_activity_id` | - |

---

## 8. 🚀 Pași de Deployment

```bash
# 1. Creare bază de date și utilizatori (O SINGURĂ DATĂ)
sudo -u postgres psql -c "CREATE DATABASE vq_proiect;"
sudo -u postgres psql -c "CREATE USER app_user_vq WITH PASSWORD 'vq_app_AFfgs#@42f3rt5v23bvu8768n566_4';"
sudo -u postgres psql -c "ALTER DATABASE vq_proiect OWNER TO app_user_vq;"
sudo -u postgres psql -c "CREATE USER read_user WITH PASSWORD 'dhgs5yws54q2h';"
sudo -u postgres psql -c "CREATE USER write_user WITH PASSWORD 'nsfgjh57iu67jker67';"

# 2. Rulare schema (ca owner)
psql -U app_user_vq -d vq_proiect -f /home/user/vq_project/schema.sql

# 3. Acordare permisiuni implicite pentru viitoare tabele
sudo -u postgres psql -d vq_proiect -c "
  ALTER DEFAULT PRIVILEGES FOR ROLE app_user_vq IN SCHEMA public
  GRANT SELECT ON TABLES TO read_user;
  ALTER DEFAULT PRIVILEGES FOR ROLE app_user_vq IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO write_user;
"

# 4. Instalare backend
cd /home/user/vq_project
npm init -y
npm install express pg bcryptjs jsonwebtoken cors helmet express-rate-limit dotenv

# 5. Pornire
node src/index.js
```

---

## 9. 🔗 Diagrama Relațiilor (ERD Final)

```
┌──────────┐       ┌──────────┐       ┌──────────┐
│ families │1────N│  parents  │       │  photos  │
│          │       │          │       │          │
│ 1        │       │ N         │       │ N        │
│ │        │       └──────────┘       └──────────┘
│ │        │                             │
│ │        │                             │ N
│ │        │       ┌──────────┐       ┌──────────┐
│ └────────┼──N───│ children │1────N│activities│
│          │       │          │       │          │
│ 1        │       │ 1        │       └──────────┘
│ │        │       │ │        │
│ │        │       │ │        │       ┌──────────┐
│ │        │       │ └────────┼──N───│transact. │
│ │        │       │          │       │          │
│ │        │       └──────────┘       └──────────┘
│ │        │
│ └────────┼──N───│ rewards  │
└──────────┘       └──────────┘
```

---

---

## 9b. 🔄 Sync Queue — Offline-First Layer

### 📥 Format Sync Queue

Fiecare acțiune locală generează un item în Sync Queue:

```typescript
interface SyncQueueItem {
  id: string;                    // ID unic client (deduplicare)
  action: SyncActionType;        // Tipul acțiunii
  timestamp: string;             // ISO timestamp
  retryCount: number;            // Nr. reîncercări
  status: "pending" | "in_flight" | "completed" | "failed";
  lastError?: string;            // Eroarea ultimului eșec
  payload: Record<string, unknown>; // Datele acțiunii
}
```

### 🔄 Flux Offline-First

```
User Action
    ↓
1. Write to LocalStore (localStorage) ← IMMEDIAT
    ↓
2. Update React state / UI ← OPTIMISTIC
    ↓
3. Enqueue SyncQueueItem ← DEFERRAT
    ↓
4. SyncEngine procesează coada (când online) ← ASINCRON
    ↓
5. Server confirmă → marcat completat
```

### 📁 Endpointuri Sync

| Method | Endpoint | Descriere |
|--------|----------|-----------|
| POST | `/api/sync/action` | Procesează o singură acțiune |
| POST | `/api/sync/batch` | Procesează acțiuni în lot |

### 📦 Structura Codului

```
src/modules/sync/
├── types.ts           # Tipuri SyncQueue
├── SyncEngine.ts      # Motorul sincronizării
├── useOfflineSync.ts  # Hook React
└── index.ts           # Exporturi
```

### 🔄 Stări Posibile (UI)

- **🟢 Sincronizat** — Coada e goală, totul e up-to-date
- **🔵 N în așteptare** — Acțiuni locale care așteaptă sync
- **🟠 Offline** — Modificări salvate local, nerrimise la server
- **🔴 Eșuat** — Acțiuni care au depășit nr. maxim de reîncercări

---

## 10. ⚙️ Configurare `.env.example`

```env
# === Baza de date ===
DATABASE_SUPER_URL=postgresql://postgres:PASS@localhost:5432/vq_proiect
DATABASE_OWNER_URL=postgresql://app_user_vq:PASS@localhost:5432/vq_proiect
DATABASE_READ_URL=postgresql://read_user:PASS@localhost:5432/vq_proiect
DATABASE_WRITE_URL=postgresql://write_user:PASS@localhost:5432/vq_proiect

# === JWT ===
JWT_SECRET=schimba-in-productie
JWT_EXPIRES_IN=24h

# === Server ===
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# === Rate Limit ===
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# === AI Validation ===
AI_VALIDATION_API_URL=https://api.openai.com/v1
AI_API_KEY=sk-your-key

# === Upload ===
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```
