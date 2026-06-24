# 🔐 TODO: Configurare JWT Authentication (Pas cu Pas)

> **Obiectiv:** Autentificare securizată cu Access Token (15min) + Refresh Token (30 zile)

---

## ✅ Pasul 1 — setează `JWT_SECRET` în `.env`

Fișierul `.env` **nu există încă** în proiect. Trebuie creat.

```bash
# Din rădăcina proiectului:
cp .env.example .env
```

Apoi **adaugă** în `.env`:

```env
# ═══ JWT Authentication ═══
JWT_SECRET="vq_$(openssl rand -hex 32)"
JWT_EXPIRES_IN=24h
```

> 🔐 `openssl rand -hex 32` generează un secret aleator de 64 de caractere hex.
> Dacă nu ai `openssl`, poți pune orice string lung și random: `JWT_SECRET="vq_abcdef123456..."`

---

## ✅ Pasul 2 — instalează pachetele necesare

```bash
npm install jsonwebtoken bcryptjs
npm install --save-dev @types/jsonwebtoken @types/bcryptjs
```

> Deja făcut ✅ — poți verifica cu `npm ls jsonwebtoken bcryptjs`

---

## ✅ Pasul 3 — ce s-a creat deja

| Fișier | Rol |
|--------|-----|
| `server/auth.ts` | Modul JWT: emitere, verificare, refresh, revocare token-uri + hash PIN cu bcrypt |
| `src/modules/auth/index.ts` | Client-side: fetch interceptor cu Bearer token + auto-refresh la 401 |
| `server/refresh_tokens.json` | Stocare persistată a refresh token-urilor (se creează automat) |

---

## ✅ Pasul 4 — endpointuri API funcționale

| Metodă | Endpoint | Ce face |
|--------|----------|---------|
| POST | `/api/auth/register` | Înregistrare + primești `accessToken` + `refreshToken` |
| POST | `/api/auth/login` | Login + primești `accessToken` + `refreshToken` |
| POST | `/api/auth/social-login` | Social Login + primești `accessToken` + `refreshToken` |
| POST | `/api/auth/refresh` | Trimite `refreshToken` → primești `accessToken` nou |
| POST | `/api/auth/logout` | Trimite `refreshToken` → este invalidat pe server |

---

## ✅ Pasul 5 — protejează rutele existente cu JWT

**Nu e făcut încă.** Trebuie să adaugi `authMiddleware` pe rutele care acum sunt publice.

Exemplu — în `server.ts`, găsește rutele existente:

```typescript
// ÎNAINTE (acum — fără autentificare):
app.get("/api/state", (req, res) => { ... });

// DUPĂ (cu autentificare):
import { authMiddleware } from "./server/auth.ts";

app.get("/api/state", authMiddleware, (req, res) => { ... });
```

**Rute de protejat:**

| Rută | Prioritate |
|------|-----------|
| `GET /api/state` | 🔴 Critic |
| `POST /api/state/sync` | 🔴 Critic |
| `POST /api/state/reset` | 🔴 Critic |
| `GET /api/photo/:photoId` | 🟡 Medie |
| `POST /api/task/*` | 🔴 Critic |
| `POST /api/rewards/*` | 🔴 Critic |
| `POST /api/parent/*` | 🔴 Critic |
| `POST /api/sync/*` | 🟡 Medie |
| `GET /api/dashboard/*` | 🟡 Medie |

---

## ✅ Pasul 6 — (opțional) adaugă migrare PIN-uri existente

În `server/auth.ts` funcția `hashPin()` folosește bcrypt cu 10 runde.
În `server.ts`, la login, dacă utilizatorul **nu are** `pinHash`, se face migrare automată:

```typescript
// server.ts — deja implementat în POST /api/auth/login
if (!user.pinHash) {
  pinValid = user.pin === pinToCheck;
  if (pinValid) {
    user.pinHash = await hashPin(user.pin);
    saveUsers(users);
  }
}
```

> ✅ Deja funcțional — utilizatorii existenți sunt migrați la primul login după update.

---

## ✅ Pasul 7 — testează manual

```bash
# Pornește serverul:
npm run dev

# Test 1 — Înregistrare:
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test","pin":"1234"}'

# Răspuns așteptat:
# { "success": true, "accessToken": "...", "refreshToken": "...", "expiresIn": 900, ... }

# Test 2 — Login:
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"1234"}'

# Test 3 — Refresh:
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<TOKEN_DIN_LOGIN>"}'

# Test 4 — Logout:
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<TOKEN>"}'
```

---

## ✅ Pasul 8 — (opțional) adaugă un `.env.example` actualizat

Adaugă în `.env.example` noile variabile:

```env
# ═══ JWT Authentication ═══
JWT_SECRET="schimba-in-productie"
JWT_EXPIRES_IN=24h
```

---

## ✅ Pasul 9 — checklist final

- [ ] `.env` creat cu `JWT_SECRET` setat
- [ ] Serverul pornește fără erori (`npm run dev`)
- [ ] Login funcționează și returnează token-uri
- [ ] Refresh token funcționează
- [ ] Logout invalidează refresh token-ul
- [ ] (opțional) Rute protejate cu `authMiddleware`
- [ ] (opțional) Token-urile expirate redirectează la login

---

## 📦 Structura finală a fișierelor de autentificare

```
vacanta-quester-beta1/
├── .env                            # ← TREBUIE CREAT (cu JWT_SECRET)
├── .env.example
├── server/
│   ├── auth.ts                     # Modul JWT (deja creat ✅)
│   ├── refresh_tokens.json         # Stocare token-uri (se creează automat)
│   └── Server_ARHITECTUR.md
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   └── index.ts            # Client JWT (deja creat ✅)
│   │   └── sync/
│   └── App.tsx                     # Integrat cu JWT (deja modificat ✅)
└── server.ts                       # Endpointuri auth (deja modificate ✅)
```
