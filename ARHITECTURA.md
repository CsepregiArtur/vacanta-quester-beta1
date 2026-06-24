# 🏗️ Arhitectura Vacanta Quester

## Stack Tehnic

```
Frontend Web:  Vite + React + TypeScript → vacanta.cs-hub.xyz
Backend API:   Express + TypeScript → api.cs-hub.xyz
Mobile:        Flutter (Android, iOS, Windows, Web)
Database:      PostgreSQL (server) + SQLite (mobile) + IndexedDB (web)
Sync:          Offline-first cu Sync Queue
AI:            Gemini API (cu fallback local)
Monitoring:    Prometheus + Loki + Grafana → monitor.cs-hub.xyz
Tunnel:        Cloudflare Tunnel → vacanta-arcadia
```

---

## 1. PostgreSQL — Tabele

```
families          → Configurări familie, dog walk toggle, SMTP, HA
parents           → Login, PIN hash (bcrypt), legătură cu family
children          → Copii, puncte, streak, avatar
activities        → Task-uri, tip (chore/reading/dog_walk), status, photo_url, version
rewards           → Catalog recompense per familie
point_transactions→ Istoric puncte cu version number
reading_history   → Istoric lecturi
sync_queue        → Coadă sincronizare offline (action, payload, status, version)
```

---

## 2. Servicii Backend (server/services/)

```
auth.service.ts     → Login, register, JWT, refresh tokens
family.service.ts   → CRUD familii, părinți, copii, configurare
activity.service.ts → Task-uri, activități, reading history
rewards.service.ts  → Recompense, puncte, tranzacții cu version number
notification.service.ts → Email SMTP, notificări
sync.service.ts     → Procesare coadă sincronizare, conflict resolution
```

### Version Number — Conflict Resolution

Fiecare `activity` și `point_transaction` are un câmp `version`.
La fiecare update, `version = version + 1`.

**Strategie: Last Write Wins**
- Când serverul primește un update, verifică `version`
- Dacă `version` local ≥ `version` server → acceptă
- Altfel → serverul e autoritar (server version câștigă)

---

## 3. Offline-First — Sync Engine

### Flux:

```
Utilizator acțiune
       ↓
  [SQLite Local] ← salvează INSTANT
       ↓
  [Sync Queue] ← adaugă acțiunea
       ↓
  La revenire internet:
  [Sync Queue] → server API → confirm → remove
```

### Coada de sincronizare (sync_queue):

| Câmp | Descriere |
|------|-----------|
| `id` | UUID |
| `family_id` | Familie |
| `action` | Tip operație (create_activity, award_points, etc.) |
| `payload` | JSON cu datele |
| `status` | pending → processing → completed / failed |
| `version` | Version number |
| `device_id` | Dispozitivul sursă |

### Tipuri de acțiuni suportate:
- `award_points` — adaugă puncte copil
- `complete_activity` — finalizează task
- `create_activity` — creează task nou
- `update_child` — actualizează copil (points, streak)

---

## 4. Flutter Mobile (mobile/vq_app/)

```
lib/
├── main.dart                    ← Entry point
├── models/
│   ├── child.dart               ← Model copil
│   ├── activity.dart            ← Model activitate
│   └── sync_action.dart         ← Model acțiune sync
├── services/
│   ├── local_db.dart            ← SQLite local (sqflite)
│   ├── api_service.dart         ← HTTP client
│   └── sync_engine.dart         ← Motor sincronizare
├── screens/
│   ├── login_screen.dart        ← Login/Register
│   └── home_screen.dart         ← Dashboard principal
└── widgets/
    └── (componente UI)
```

### Baza de date locală (SQLite):
- `children` — copiii familiei
- `activities` — task-uri (offline)
- `sync_queue` — coadă de sincronizare
- `auth` — token-uri JWT stocate

---

## 5. Eliminare JSON

Pași pentru migrare:

```bash
# 1. Rulează migrarea JSON → PostgreSQL
npm run migrate

# 2. Verifică datele
psql -d vq_proiect -c "SELECT COUNT(*) FROM families; SELECT COUNT(*) FROM parents; SELECT COUNT(*) FROM children;"

# 3. După confirmare, șterge fișierele JSON vechi
rm src/data/*.json
```

---

## 6. Rute API (noi)

| Metodă | Rută | Serviciu |
|--------|------|----------|
| POST | `/api/auth/register` | auth.service |
| POST | `/api/auth/login` | auth.service |
| POST | `/api/auth/refresh` | auth.service |
| GET | `/api/family/state` | family.service |
| POST | `/api/family/children` | family.service |
| POST | `/api/activities` | activity.service |
| POST | `/api/activities/:id/complete` | activity.service |
| GET | `/api/rewards` | rewards.service |
| POST | `/api/rewards/buy` | rewards.service |
| POST | `/api/sync/action` | sync.service |
| POST | `/api/sync/batch` | sync.service |
| GET | `/metrics` | Prometheus |

---

## 7. Comenzi rapide

```bash
# Development (vechi - JSON)
npm run dev

# Development (nou - PostgreSQL)
npm run dev:new

# Migrare JSON → PostgreSQL
npm run migrate

# Build production
npm run build

# Flutter mobile
cd mobile/vq_app && flutter run
```
