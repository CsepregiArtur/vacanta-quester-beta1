# 📱 VQ Mobile — Arhitectură & Roadmap (3-4 săptămâni)

> **Țintă:** Aplicație Flutter cross-platform (Android + iOS + Web)
> cu drift (SQLite local), sync offline-first și UI copil refăcut
> în stil **Duolingo × Nintendo × Pokémon**

---

## Pasul 10 — Structura Proiectului Flutter

```
vacanta-quester-beta1/
├── mobile/                           # ← APLICAȚIA FLUTTER
│   ├── lib/
│   │   ├── main.dart
│   │   ├── app.dart                  # MaterialApp + routing
│   │   │
│   │   ├── core/
│   │   │   ├── theme/
│   │   │   │   ├── app_theme.dart        # Teme: Duolingo / Nintendo / Pokémon
│   │   │   │   ├── duolingo_theme.dart   # Paleta Duolingo
│   │   │   │   ├── nintendo_theme.dart   # Paleta Nintendo
│   │   │   │   └── pokemon_theme.dart    # Paleta Pokémon
│   │   │   ├── constants/
│   │   │   │   ├── app_colors.dart
│   │   │   │   ├── app_strings.dart      # Toate textele în română
│   │   │   │   └── app_dimensions.dart
│   │   │   └── utils/
│   │   │       ├── date_helpers.dart
│   │   │       └── point_calculator.dart
│   │   │
│   │   ├── data/
│   │   │   ├── local/
│   │   │   │   ├── database.dart         # drift (SQLite) — schema locală
│   │   │   │   ├── database.g.dart       # Generat de drift
│   │   │   │   ├── tables/
│   │   │   │   │   ├── children_table.dart
│   │   │   │   │   ├── tasks_table.dart
│   │   │   │   │   ├── rewards_table.dart
│   │   │   │   │   ├── transactions_table.dart
│   │   │   │   │   └── sync_queue_table.dart  # ← OFFLINE-FIRST
│   │   │   │   └── dao/
│   │   │   │       ├── child_dao.dart
│   │   │   │       ├── task_dao.dart
│   │   │   │       ├── reward_dao.dart
│   │   │   │       └── sync_queue_dao.dart    # ← OFFLINE-FIRST
│   │   │   ├── remote/
│   │   │   │   ├── api_client.dart        # HTTP client cu JWT
│   │   │   │   ├── auth_api.dart          # Login / Register / Refresh
│   │   │   │   ├── task_api.dart          # CRUD task-uri
│   │   │   │   └── sync_api.dart          # Push/Pull sync
│   │   │   └── repositories/
│   │   │       ├── child_repository.dart  # Scrie local → sync remote
│   │   │       ├── task_repository.dart
│   │   │       ├── reward_repository.dart
│   │   │       └── sync_repository.dart   # Gestionare coadă
│   │   │
│   │   ├── domain/
│   │   │   ├── models/
│   │   │   │   ├── child_model.dart
│   │   │   │   ├── task_model.dart
│   │   │   │   ├── reward_model.dart
│   │   │   │   ├── transaction_model.dart
│   │   │   │   └── sync_action_model.dart  # ← OFFLINE-FIRST
│   │   │   └── enums/
│   │   │       ├── task_status.dart
│   │   │       ├── avatar_type.dart        # Explorer / Scientist / etc.
│   │   │       └── sync_status.dart
│   │   │
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── login_screen.dart
│   │   │   │   ├── register_screen.dart
│   │   │   │   └── pin_screen.dart
│   │   │   │
│   │   │   ├── kid/                        # ← REFĂCUT COMPLET
│   │   │   │   ├── kid_home_screen.dart    # Ecran principal copil
│   │   │   │   ├── widgets/
│   │   │   │   │   ├── character_card.dart     # Avatar + streak
│   │   │   │   │   ├── quest_list.dart         # Listă misiuni (gamified)
│   │   │   │   │   ├── quest_tile.dart         # Un card de misiune
│   │   │   │   │   ├── daily_streak_bar.dart   # Bara de streak zilnic
│   │   │   │   │   ├── point_badge.dart        # Insigna de puncte
│   │   │   │   │   ├── level_progress.dart     # Bara progres nivel
│   │   │   │   │   ├── reward_shop.dart        # Magazin recompense
│   │   │   │   │   ├── timer_widget.dart       # Cronometru ecran
│   │   │   │   │   └── reading_card.dart       # Card lectură
│   │   │   │   └── screens/
│   │   │   │       ├── tasks_screen.dart
│   │   │   │       ├── rewards_screen.dart
│   │   │   │       ├── reading_screen.dart
│   │   │   │       └── profile_screen.dart     # Avatar + stats
│   │   │   │
│   │   │   ├── parent/
│   │   │   │   ├── parent_dashboard_screen.dart
│   │   │   │   └── widgets/
│   │   │   │       ├── child_overview_card.dart
│   │   │   │       ├── approve_task_card.dart
│   │   │   │       └── stats_chart.dart
│   │   │   │
│   │   │   └── sync/
│   │   │       └── sync_status_indicator.dart  # Widget sync queue status
│   │   │
│   │   └── shared/
│   │       └── widgets/
│   │           ├── animated_button.dart      # Stil Nintendo/Duolingo
│   │           ├── avatar_widget.dart        # Afișare avatar
│   │           ├── confetti_overlay.dart     # Efecte la完成任务
│   │           └── loading_screen.dart
│   │
│   ├── assets/
│   │   ├── images/
│   │   │   ├── avatars/
│   │   │   │   ├── explorer_default.png
│   │   │   │   ├── scientist_default.png
│   │   │   │   ├── builder_default.png
│   │   │   │   └── inventor_default.png
│   │   │   ├── badges/
│   │   │   └── backgrounds/
│   │   ├── fonts/
│   │   │   ├── FredokaOne.ttf            # Font Disney/Nintendo
│   │   │   └── Nunito.ttf                # Font secundar
│   │   └── animations/                   # Lottie JSON
│   │       ├── star_burst.json
│   │       ├── level_up.json
│   │       └── confetti.json
│   │
│   ├── test/
│   │   ├── unit/
│   │   ├── widget/
│   │   └── integration/
│   │
│   ├── pubspec.yaml
│   └── analysis_options.yaml
│
├── mobile/web/                       # Web build config
│   └── index.html
│
└── mobile/backend/                   # Config backend pentru mobile
    └── backend_config.dart
```

### 📦 Dependențe Flutter (`pubspec.yaml`)

```yaml
dependencies:
  flutter:
    sdk: flutter
  drift: ^2.x                  # SQLite ORM
  sqlite3_flutter_libs: ^0.5.x
  path_provider: ^2.x
  path: ^1.x
  dio: ^5.x                    # HTTP client
  flutter_secure_storage: ^9.x # Token storage
  provider: ^6.x               # State management
  lottie: ^3.x                 # Animații
  fl_chart: ^0.x               # Grafice
  google_sign_in: ^6.x         # Social login
  image_picker: ^1.x           # Foto cameră
  connectivity_plus: ^6.x      # Detectare offline
  intl: ^0.x                   # Localizare RO
  cached_network_image: ^3.x
  flutter_local_notifications: ^17.x
  percent_indicator: ^4.x      # Bare de progres
  confetti_widget: ^1.x        # Confetti efecte

dev_dependencies:
  build_runner: ^2.x
  drift_dev: ^2.x              # Generator drift
  flutter_test:
    sdk: flutter
```

---

## Pasul 11 — UI Copil Refăcut (Stil Duolingo × Nintendo × Pokémon)

### Filosofia designului

> **Nu mai e un dashboard.** E un **joc**.

Diferența dintre cum e ACUM și cum TREBUIE să fie:

| ACUM (dashboard) | DUPĂ (game UI) |
|------------------|----------------|
| Tabele și liste | Carduri gamificate |
| Butoane text | Butoane mari, rotunjite, cu umbre `shadow-[3px_3px_0_0_#1e293b]` |
| Informații dense | Progress bars + streak + levels |
| Fundal alb simplu | Fundal cu gradient moale, ilustrații |
| Animații minimale | Confetti, bounce, scale, particle effects |

### Stilul vizual

```
┌─────────────────────────────────────────────┐
│            🌟 TABLA DE MISIUNI 🌟           │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │  🐶 Dominic           ⭐ 80 Puncte    │  │
│  │  [████████░░░░] Nivel 3 Cercetaș     │  │
│  │  🔥 Streak: 3 zile                     │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ 📖 Citit │  │ 🧹 Acasă │  │ 🐕 Câine │  │
│  │  3/5     │  │  2/4     │  │  1/1     │  │
│  │  săpt.   │  │  azi     │  │  azi ✅  │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                             │
│  ════════════ Misiunile tale ════════════    │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ 📖 Lectură: Dinozauri         60 pct  │  │
│  │ 🆕 Citește și răspunde la 3 întrebări │  │
│  │ [        ▶️ Începe        ]           │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ 🧹 Aspirat în Cameră           70 pct  │  │
│  │ 🔄 În așteptare                       │  │
│  │ [        📸 Trimite dovada     ]      │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ 🎮 Magazin Recompense                 │  │
│  │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │  │
│  │ │ 📺   │ │ 🎮   │ │ 🛜   │ │ 🎯   │  │  │
│  │ │ 1hTV │ │ Xbox │ │ Tik  │ │ 30m  │  │  │
│  │ │100pct│ │150pct│ │50pct│ │40pct│  │  │
│  │ └──────┘ └──────┘ └──────┘ └──────┘  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Componente UI specifice stilului

#### 1. Character Card (header copil)
- Avatar mare (emoji sau ilustrație) cu fundal colorat
- Numele + streak-ul cu efect de flacără
- Punctele animate cu `CountUp`
- Bara de progres pentru nivel

#### 2. Quest Card (o sarcină)
- Border-uri groase (3-4px) cu umbră tip Nintendo
- Fundal colorat după categorie (albastru-lectură, verde-acasă, portocaliu-sport)
- Buton mare, rotund, cu hover effect
- Badge de puncte colț dreapta sus

#### 3. Streak Bar
- Iconițe de foc pentru zile consecutive
- Animale/cărți pentru milestone-uri
- Efect de puls la streak > 3

#### 4. Level Up Animation
- Confetti la atingerea unui nou nivel
- Ecran "Level Up!" cu noul rang

#### 5. Point Badge
- Fundal galben (`#ffc000`) cu border negru
- Număr animat
- Efect de "bounce" la adăugare puncte

### Paleta de culori

| Rol | Culoare | Hex |
|-----|---------|-----|
| Fundal principal | Crem deschis | `#fafafb` |
| Primary (Duolingo) | Verde | `#58cc02` |
| Secondary | Albastru | `#1cb0f6` |
| Accent | Galben | `#ffc000` |
| Danger | Roșu | `#ff4b4b` |
| Text | Gri închis | `#3c3c3c` |
| Border | Negru | `#1e293b` |
| Shadow | Negru | `#1e293b` |

### Tranziții între teme

```dart
enum AppTheme {
  duolingo,  // Default — verde, prietenos
  nintendo,  // Alb-roșu, bold
  pokemon,   // Galben-albastru, adventure
}
// Fiecare temă suprascrie:
// - Paleta de culori
// - Font (Fredoka / Nunito)
// - Stil border (groasime, umbră)
// - Animații
```

---

## Pasul 12 — Avataruri & Identitate Vizuală

### Avatarurile default

Fiecare copil primește un avatar default **bazat pe personalitate** (selectabil de părinte la creare):

| Avatar | Emoji | Stil vizual | Personalitate | Culoare asociată |
|--------|-------|-------------|---------------|------------------|
| 🧭 **Explorer** | `🧭` | Busolă + hartă, verde | Curios, activ, sportiv | `#58cc02` (verde) |
| 🔬 **Scientist** | `🔬` | Microscop + eprubete, mov | Analitic, citesc, întrebări | `#6366f1` (indigo) |
| 🏗️ **Builder** | `🏗️` | Cască + cărămidă, portocaliu | Practic, construiește, LEGO | `#f97316` (portocaliu) |
| 💡 **Inventor** | `💡` | Bec + roți dințate, albastru | Creativ, desenează, inventează | `#1cb0f6` (albastru) |

### Cum se afișează

```
┌──────────────────┐
│   Stil vizual    │
│                  │
│   ┌──────────┐   │
│   │  🧭 / 🔬 │   │
│   │  🏗️ / 💡 │   │
│   └──────────┘   │
│                  │
│  Nume copil      │
│  ⭐ 80 Puncte    │
│  [████░░] Lv.3   │
│  🔥 Streak 5     │
└──────────────────┘
```

### Reguli avatar

1. **Default:** `Explorer` — dacă nu e selectat altceva
2. **Neschimbabil de copil** — doar părintele poate schimba
3. **Asociat cu streak:** La streak > 7, avatarul capătă un efect glow
4. **Asociat cu nivel:** La nivel 10, avatarul primește o coroană 👑
5. **Ilustrații vectoriale** — nu doar emoji, ci desene personalizate

### Implementare în Drift (SQLite)

```dart
// În baza locală drift
class Children extends Table {
  TextColumn get id => text()();           // UUID
  TextColumn get familyId => text()();
  TextColumn get name => text()();
  IntColumn get age => integer()();
  IntColumn get points => integer().withDefault(const Constant(0))();
  TextColumn get avatarType => text()();   // "explorer" | "scientist" | "builder" | "inventor"
  TextColumn get avatarEmoji => text()();  // "🧭" | "🔬" | "🏗️" | "💡"
  IntColumn get level => integer().withDefault(const Constant(1))();
  IntColumn get readingStreak => integer().withDefault(const Constant(0))();
  TextColumn get activeTimerJson => text().nullable()();
  
  @override
  Set<Column> get primaryKey => {id};
}
```

### Definire avatar în cod

```dart
enum AvatarType {
  explorer("🧭", "Explorer", AppColors.explorerGreen),
  scientist("🔬", "Scientist", AppColors.scientistIndigo),
  builder("🏗️", "Builder", AppColors.builderOrange),
  inventor("💡", "Inventor", AppColors.inventorBlue);

  final String emoji;
  final String displayName;
  final Color themeColor;
  const AvatarType(this.emoji, this.displayName, this.themeColor);
}

class AvatarWidget extends StatelessWidget {
  final AvatarType type;
  final double size;
  final bool showGlow; // true când streak > 7
  final bool showCrown; // true când level >= 10
  
  // Randare:
  // - Cerc cu fundal în culoarea temei
  // - Emoji mare în centru
  // - Opțional: glow effect sau coroană
}
```

---

## 📋 Ordinea implementării (3-4 săptămâni)

### Săptămâna 1: Setup + Baza
- [ ] `flutter create` proiectul
- [ ] Structură dosare + drift setup
- [ ] Tabele SQLite (children, tasks, rewards, transactions, sync_queue)
- [ ] API Client cu JWT
- [ ] Login/Register screens

### Săptămâna 2: UI Copil
- [ ] Tema Duolingo + Nintendo
- [ ] Character Card + avatar
- [ ] Quest List + Quest Tile
- [ ] Streak Bar + Level Progress
- [ ] Point Badge animat

### Săptămâna 3: Funcționalități
- [ ] Reading flow cu quiz
- [ ] Dog walk flow cu camera
- [ ] Chore submit cu poză
- [ ] Reward Shop + Timer
- [ ] Sync queue + offline-first

### Săptămâna 4: Părinte + Rafinare
- [ ] Parent Dashboard (aprobări, statistici)
- [ ] Avatar personalizare
- [ ] Animații (confetti, level-up, streak)
- [ ] Testare + bug fixing

---

## 🔗 Conexiunea cu backend-ul existent

```
Flutter App
    ↓
drift (SQLite local) ← TOATE OPERAȚIILE SCRIU AICI ÎNTÂI
    ↓
Sync Queue (tabelă drift) ← COADĂ DE ACȚIUNI
    ↓
API Client (Dio + JWT) ← TRIMITE CĂND E ONLINE
    ↓
Express Server (server.ts) ← PROCESEAZĂ
    ↓
PostgreSQL / JSON ← PERSISTENȚĂ FINALĂ
```

### Sync Queue în drift

```dart
class SyncQueue extends Table {
  TextColumn get id => text()();
  TextColumn get action => text()();      // "complete_activity" | "buy_reward" | etc.
  TextColumn get payloadJson => text()(); // JSON cu datele
  TextColumn get status => text()();      // "pending" | "in_flight" | "failed"
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  TextColumn get createdAt => text()();   // ISO timestamp
  TextColumn get lastError => text().nullable()();
  
  @override
  Set<Column> get primaryKey => {id};
}
```
