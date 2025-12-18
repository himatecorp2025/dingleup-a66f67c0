# DingleUP! - Architektúra Dokumentáció

## 1. Activity Diagram - Játék Flow

```mermaid
graph TD
    A[Felhasználó bejelentkezik] --> B{Van élete?}
    B -->|Igen| C[Play Now gomb]
    B -->|Nem| D[Vár életregenerációra / Vesz boostert]
    D --> B
    
    C --> E[Intro videó lejátszás]
    E --> F[Backend: reset_game_helps, spendLife, fetch questions]
    F --> G[15 kérdés betöltve]
    
    G --> H[Kérdés megjelenítés + Timer indul]
    H --> I{Felhasználó válaszol}
    
    I -->|Helyes| J[+1 gold azonnal jóváírva]
    I -->|Helytelen| K[Nincs jutalom]
    
    J --> L{Van még kérdés?}
    K --> L
    
    L -->|Igen| H
    L -->|Nem, 15 kérdés kész| M[Eredmény megjelenítés]
    
    M --> N{Swipe up?}
    N -->|Igen| O[Új játék indítás - 1 élet]
    N -->|Nem, exit| P[Gold megőrzés, visszatérés Dashboard]
    
    O --> E
    P --> Q[Dashboard frissítés]
```

## 2. Use Case Diagram - Főbb Funkciók

```mermaid
graph TB
    subgraph Felhasználó
        U[Felhasználó]
    end
    
    subgraph Admin
        A[Admin]
    end
    
    subgraph System
        S[Automatikus Rendszer]
    end
    
    U --> UC1[Regisztráció + Életkor ellenőrzés]
    U --> UC2[Bejelentkezés Username+PIN / Biometria]
    U --> UC3[Játék indítás 15 kérdéssel]
    U --> UC4[Kérdés megválaszolás]
    U --> UC5[Lifeline használat]
    U --> UC6[Daily Gift átvétel]
    U --> UC7[Welcome Bonus átvétel]
    U --> UC8[Booster vásárlás Free/Premium]
    U --> UC9[Ranglista megtekintés országonként]
    U --> UC10[Profil szerkesztés]
    U --> UC11[Nyelv váltás]
    
    A --> UC12[Admin Dashboard megtekintés]
    A --> UC13[Felhasználók kezelése]
    A --> UC14[Kérdés poolok kezelése]
    A --> UC15[Analitika dashboardok]
    A --> UC16[Admin jogosultság kiosztás]
    A --> UC17[Fordítások kezelése]
    
    S --> UC18[Élet regeneráció 12 percenként]
    S --> UC19[Napi ranglista snapshot éjfélkor]
    S --> UC20[Napi nyertesek jutalmak kiosztása]
    S --> UC21[Real-time leaderboard frissítés]
```

## 3. Sequence Diagram - Játék Indítás

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant EF as Edge Function
    participant DB as Database
    participant Cache as Cache Layer
    
    U->>FE: Kattintás "Play Now" gombra
    FE->>FE: Intro videó lejátszás indul
    
    par Backend műveletek párhuzamosan
        FE->>EF: reset_game_helps()
        EF->>DB: UPDATE profiles SET helps = true
        DB-->>EF: OK
        
        FE->>EF: spendLife() - 1 élet levonás
        EF->>DB: UPDATE profiles SET lives = lives - 1
        EF->>DB: INSERT wallet_ledger (delta_lives: -1)
        DB-->>EF: OK
        
        FE->>EF: getQuestionsForGame(poolId, lang)
        EF->>Cache: Check in-memory pool cache
        Cache-->>EF: 15 random questions (cached)
        EF-->>FE: 15 kérdés JSON
    end
    
    FE->>FE: Várás intro videó végére
    FE->>U: Első kérdés megjelenítés + Timer indul
    
    U->>FE: Válasz kiválasztás
    FE->>EF: submitAnswer(questionId, answer, sessionId)
    
    alt Helyes válasz
        EF->>DB: INSERT wallet_ledger (+1 gold, idempotency_key)
        EF->>DB: UPDATE profiles SET coins = coins + 1
        DB-->>EF: OK
        EF-->>FE: {correct: true, reward: +1 gold}
        FE->>U: Coin animáció + számláló frissítés (≤500ms)
    else Helytelen válasz
        EF-->>FE: {correct: false}
        FE->>U: Helytelen válasz jelzés
    end
    
    FE->>U: Következő kérdés (swipe gesture)
```

## 4. Class Diagram - Főbb Entitások

```mermaid
classDiagram
    class User {
        +UUID id
        +String username
        +String pin_hash
        +String country_code
        +String preferred_language
        +Int coins
        +Int lives
        +Int max_lives
        +Timestamp last_life_regeneration
        +Date birth_date
        +Boolean age_verified
        +login()
        +register()
        +playGame()
        +claimDailyGift()
    }
    
    class GameSession {
        +UUID id
        +UUID user_id
        +String category
        +JSON questions[]
        +Int current_question
        +Int correct_answers
        +Timestamp started_at
        +Timestamp expires_at
        +startGame()
        +submitAnswer()
        +completeGame()
    }
    
    class Question {
        +UUID id
        +Int topic_id
        +String question_text
        +JSON answers[]
        +String correct_answer
        +Int pool_order
        +Int like_count
        +Int dislike_count
        +getTranslation(lang)
        +incrementLike()
    }
    
    class Leaderboard {
        +String country_code
        +Int rank
        +UUID user_id
        +String username
        +Int total_correct_answers
        +Timestamp cached_at
        +refreshCache()
        +getTop100(country)
        +getUserRank(userId)
    }
    
    class Booster {
        +UUID id
        +String code
        +String name
        +Int price_gold
        +Int price_usd_cents
        +Int reward_gold
        +Int reward_lives
        +Int reward_speed_count
        +purchase()
        +validatePayment()
    }
    
    class Admin {
        +UUID user_id
        +String role
        +viewDashboard()
        +manageUsers()
        +managePools()
        +grantAdminRole()
    }
    
    User "1" --> "0..*" GameSession : plays
    GameSession "1" --> "15" Question : contains
    User "1" --> "1" Leaderboard : appears in
    User "1" --> "0..*" Booster : purchases
    Admin "1" --> "1" User : extends
```

## 5. Design Patterns Alkalmazása

### 5.1 Repository Pattern
**Implementáció:** Supabase Edge Functions + Database
- Összes adatelérés központosítva edge function-ökben
- Példák: `get-wallet`, `complete-game`, `get-game-questions`
- Előny: Backend logika elkülönítve, RLS policies érvényesítve

### 5.2 Observer Pattern (Pub/Sub)
**Implementáció:** Supabase Realtime + React Query
- Real-time subscriptions: `profiles`, `wallet_ledger`, `leaderboard_cache`
- Frontend komponensek automatikusan frissülnek adatváltozáskor
- Példa: Wallet polling (5s) + realtime updates

### 5.3 Strategy Pattern
**Implementáció:** Payment módszerek (Free vs Premium Booster)
- `purchase-booster` edge function különböző fizetési stratégiák
- Free booster: gold levonás
- Premium booster: Stripe payment validation

### 5.4 Singleton Pattern
**Implementáció:** Supabase Client
- `src/integrations/supabase/client.ts` egyetlen példány
- Minden komponens ugyanazt a client instance-t használja

### 5.5 Factory Pattern
**Implementáció:** Question Pool Generation
- `regenerate-question-pools` edge function
- Dinamikusan generál 15 poolt 30 topicból
- Minden pool 300 kérdés (30 topic × 10 kérdés)

### 5.6 State Pattern
**Implementáció:** Game State Management
- `useGameState` hook kezeli játék állapotokat
- States: idle → loading → playing → completed → results
- Állapot-specifikus viselkedések és átmenetek

### 5.7 Facade Pattern
**Implementáció:** Game Initialization
- `useGameNavigation` hook egységes interfész
- Elrejti komplexitást: video playback + backend calls + question loading
- Single entry point: `startGameFlow()`

## 6. Communication Diagram - Admin Dashboard

```mermaid
graph LR
    subgraph Frontend
        UI[Admin Dashboard UI]
        Hook[useAdminDashboardData]
    end
    
    subgraph Edge Functions
        EF1[admin-dashboard-data]
        EF2[admin-game-profiles]
        EF3[admin-all-data]
    end
    
    subgraph Database
        DB[(Supabase DB)]
        RT[Realtime Subscriptions]
    end
    
    UI -->|1. Load Dashboard| Hook
    Hook -->|2. Fetch aggregated data| EF1
    EF1 -->|3. Query tables| DB
    DB -->|4. Return metrics| EF1
    EF1 -->|5. JSON response| Hook
    
    Hook -->|6. Real-time subscription| RT
    RT -->|7. Data changes| Hook
    Hook -->|8. Update UI| UI
    
    UI -->|9. View user profiles| EF2
    EF2 -->|10. Query user_topic_stats| DB
    DB -->|11. Aggregated profiles| EF2
    
    UI -->|12. Manage users/purchases| EF3
    EF3 -->|13. Service role queries| DB
    DB -->|14. All data with RLS bypass| EF3
```

## 7. System Architecture Áttekintés

```mermaid
graph TB
    subgraph Frontend
        PWA[PWA Mobile/Tablet]
        React[React + TypeScript]
        TanStack[TanStack Query]
        Zustand[Zustand Stores]
    end
    
    subgraph Backend - Lovable Cloud
        EdgeFn[Edge Functions Deno]
        DB[(PostgreSQL RLS)]
        Auth[Supabase Auth]
        Storage[File Storage]
        Realtime[Realtime Engine]
    end
    
    subgraph External Services
        Stripe[Stripe Payments]
        AI[Lovable AI Translation]
    end
    
    subgraph Caching Layer
        MemCache[In-Memory Pool Cache]
        LeaderCache[Leaderboard Cache Table]
    end
    
    PWA --> React
    React --> TanStack
    React --> Zustand
    
    TanStack --> EdgeFn
    EdgeFn --> DB
    EdgeFn --> Auth
    EdgeFn --> Storage
    EdgeFn --> MemCache
    
    DB --> Realtime
    Realtime --> React
    
    EdgeFn --> Stripe
    EdgeFn --> AI
    
    DB --> LeaderCache
    LeaderCache --> EdgeFn
```

## Főbb Architektúra Jellemzők

### Layered Architecture
- **Presentation Layer:** React komponensek + Tailwind CSS
- **Business Logic Layer:** Custom hooks + Zustand stores
- **Data Access Layer:** TanStack Query + Edge Functions
- **Persistence Layer:** PostgreSQL + RLS policies

### Microservices-like Edge Functions
- Független, skálázható serverless functions
- Rate limiting + idempotency
- Transaction safety + error handling

### Real-time Data Sync
- Postgres changes → Realtime subscriptions
- Optimistic UI updates
- Zero-lag leaderboard frissítések

### Security-First Design
- RLS policies minden táblán (kivéve public leaderboards)
- PIN hashing (SHA-256)
- Admin role backend validation (`has_role()`)
- Rate limiting (login attempts, API calls)

### Performance Optimizations
- In-memory question pool cache (15 pools × 300 questions)
- Leaderboard pre-computed cache
- Database indexing (composite indexes)
- Service Worker cache strategies
- Image optimization (WebP, lazy loading)

### Scalability Features
- Stateless edge functions
- Connection pooling (max 100)
- Batch processing (translations, analytics)
- Horizontal scaling capability (Supabase infrastructure)

---

## 8. Adatbázis Statisztikák (2025-12-14)

| Metrika | Érték |
|---------|-------|
| Táblák száma | 100 |
| Edge Functions | 97+ |
| Kérdések | 6,000 (30 téma × 200 kérdés) |
| Kérdésfordítások | 18,000 (HU + EN, 3 válasz/kérdés) |
| Témakörök | 30 |
| Nyelvek | Magyar (HU), Angol (EN) |
| RLS Policies | Minden user-specifikus táblán |
| Indexek | 100+ |

---

**Verzió:** 2.0  
**Utolsó frissítés:** 2025-12-14  
**Projekt:** DingleUP! Trivia Game Platform
