# DingleUP! – Teljes Független Környezet Útmutató

**Verzió:** 1.0  
**Frissítve:** 2025-01-29  
**Célja:** A DingleUP! alkalmazás teljes migrálása Lovable-ről saját, független környezetbe

---

## 📋 Tartalomjegyzék

1. [Projekt Áttekintése](#1-projekt-áttekintése)
2. [Korábbi Hibák Feltérképezése](#2-korábbi-hibák-feltérképezése)
3. [Projekt Exportálása Lovable-ből](#3-projekt-exportálása-lovable-ből)
4. [Új Független Környezet Tervezése](#4-új-független-környezet-tervezése)
5. [Adatbázis Migrálás](#5-adatbázis-migrálás)
6. [Auth és PIN Rendszer Beállítása](#6-auth-és-pin-rendszer-beállítása)
7. [End-to-End Checklist](#7-end-to-end-checklist)
8. [Hibaelhárítás](#8-hibaelhárítás)

---

## 1. Projekt Áttekintése

### 1.1 Jelenlegi Technológiai Stack

#### **Frontend (React SPA)**
- **Framework:** React 18.3.1 + Vite 6.0.x
- **Nyelv:** TypeScript
- **UI Library:** shadcn-ui + Radix UI komponensek
- **Styling:** Tailwind CSS
- **Routing:** React Router DOM v6
- **State Management:** TanStack Query (React Query) + Zustand
- **Build Tool:** Vite (optimalizált bundle-lal, 5-7 chunk)

#### **Backend (Serverless Functions)**
- **Runtime:** Deno 1.40+ (Supabase Edge Functions)
- **Nyelv:** TypeScript
- **Functions:** 90+ edge function különböző célokra
  - Auth: `login-with-username-pin`, `register-with-username-pin`
  - Game: `start-game-session`, `complete-game`, `get-game-questions`
  - Payments: `create-payment-intent`, `verify-payment-intent`
  - Admin: `admin-dashboard-data`, `export-full-database`

#### **Adatbázis**
- **Engine:** PostgreSQL 15+
- **Host:** Supabase (jelenlegi)
- **Táblák:** 39 fő tábla + nézetek
- **RLS:** Row Level Security enabled (user-specific data védelme)
- **Kapcsolat:** Supabase Client Library (@supabase/supabase-js@2.75.0)

### 1.2 Environment Változók Jelenlegi Helyzete

#### **Frontend (.env fájl a projekt gyökerében)**
```env
VITE_SUPABASE_PROJECT_ID="wdpxmwsxhckazwxufttk"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_URL="https://wdpxmwsxhckazwxufttk.supabase.co"
```

**Honnan olvassa a frontend?**
- File: `src/integrations/supabase/client.ts`
- Importálás: `import.meta.env.VITE_SUPABASE_URL` (Vite környezeti változó szintaxis)

#### **Backend (Edge Functions környezeti változói)**
```env
SUPABASE_URL=https://wdpxmwsxhckazwxufttk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Honnan olvassa a backend?**
- Deno.env.get('SUPABASE_URL')
- Minden edge function-ben külön-külön inicializálva

### 1.3 Auth Flow (Username + PIN)

**KRITIKUS:** Az alkalmazás NEM email+password auth-ot használ, hanem **username + 6 számjegyű PIN kódot**.

#### **Regisztráció folyamata:**
1. Frontend → `POST /functions/v1/register-with-username-pin`
   - Body: `{ username, pin, invitationCode? }`
2. Backend validálja username és PIN formátumot
3. Backend létrehoz auth.users rekordot:
   - Email: `${username.toLowerCase()}@dingleup.auto` (auto-generált)
   - Password: `pin + username` kombináció
4. Backend létrehoz profiles rekordot:
   - `username`, `pin_hash` (SHA-256), `recovery_code_hash`
5. Frontend automatikus bejelentkezés:
   - `supabase.auth.signInWithPassword({ email: auto_email, password })`

#### **Login folyamata:**
1. Frontend → `POST /functions/v1/login-with-username-pin`
   - Body: `{ username, pin }`
2. Backend ellenőrzi `profiles.pin_hash` vs. `hashPin(pin)`
3. Backend visszaadja `passwordVariants` tömböt (migráció miatt)
4. Frontend próbálja végig a password variánsokat:
   ```ts
   for (const password of loginData.passwordVariants) {
     const { error } = await supabase.auth.signInWithPassword({
       email: loginData.user.email,
       password
     });
     if (!error) break;
   }
   ```

---

## 2. Korábbi Hibák Feltérképezése

### 2.1 Supabase Kapcsolati Problémák

#### **❌ Hiba #1: Keveredett Supabase Projekt ID-k**

**Probléma:**
- Lehetséges, hogy a frontend és backend KÜLÖNBÖZŐ Supabase projekt ID-kat használ
- Vagy egy régi projekt ID maradt valahol a kódban/env-ben

**Ellenőrzés (csináld végig most!):**

1. **Nyisd meg a böngésző Developer Tools-t (F12)**
2. **Network tab → Filter: `supabase`**
3. **Próbálj meg bejelentkezni a frontenden**
4. **Nézd meg, MELYIK URL-re megy a request:**
   - Helyes: `https://wdpxmwsxhckazwxufttk.supabase.co`
   - Hibás: Ha más projekt ID van az URL-ben

5. **Ellenőrizd a .env fájlt:**
   ```bash
   cat .env | grep SUPABASE
   ```
   - `VITE_SUPABASE_PROJECT_ID` és `VITE_SUPABASE_URL` összhangban van?

6. **Ellenőrizd a backend env-et:**
   - Lovable-ben: Settings → Environment Variables → Backend
   - Kérdezd le: `SUPABASE_URL` értéke megegyezik a frontend-del?

**Fix:**
- Ha eltérés van: cseréld ki MINDENHOL ugyanarra az értékre
- Újra deploy kell minden érintett komponens után

---

#### **❌ Hiba #2: Anon Key vs. Service Role Key keveredés**

**Probléma:**
- Frontend SOHA nem használhat Service Role Key-t (biztonsági kockázat)
- Backend MINDIG Service Role Key-t használ (teljes hozzáférés)

**Ellenőrzés:**

1. **Frontend Supabase Client (`src/integrations/supabase/client.ts`):**
   ```ts
   const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
   ```
   - Ez ANON KEY (publishable key), NEM service role key
   - Ellenőrizd Supabase Dashboard → Settings → API:
     - `anon` / `public` kulcs kezdődik `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcHhtd3N4aGNrYXp3eHVmdHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MDQ3ODUsImV4cCI6MjA3NjE4MDc4NX0...`

2. **Backend Edge Functions:**
   ```ts
   const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
   ```
   - Ez SERVICE ROLE KEY, NEM anon key
   - Supabase Dashboard → Settings → API:
     - `service_role` kulcs kezdődik másképp, `"role":"service_role"` van benne

**Fix:**
- Ha frontend service role-t használ: AZONNAL cseréld anon key-re
- Ha backend anon key-t használ: cseréld service role-ra

---

#### **❌ Hiba #3: RLS Policy blokkolja a PIN auth-ot**

**Probléma:**
- A `profiles` tábla RLS policy-ja megakadályozza, hogy a backend ellenőrizze a PIN-t

**Ellenőrzés:**

1. **Supabase Dashboard → Database → Tables → profiles → Policies**
2. Nézd meg, van-e olyan policy, ami blokkolja a `SELECT` műveletet:
   ```sql
   -- Helyes policy (backend service role mindig hozzáfér):
   CREATE POLICY "Service role can manage profiles"
   ON profiles
   FOR ALL
   TO service_role
   USING (true);
   ```

3. **Tesztelés Console-ban:**
   ```sql
   SELECT id, username, pin_hash 
   FROM profiles 
   WHERE username = 'testuser' 
   LIMIT 1;
   ```
   - Ha "row level security policy" hibát kapsz: RLS policy probléma van

**Fix:**
- Ha hiányzik a service_role policy, add hozzá:
  ```sql
  CREATE POLICY "Service role full access profiles"
  ON profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);
  ```

---

#### **❌ Hiba #4: Edge Function Timeout / Cold Start**

**Probléma:**
- Edge function nem válaszol 10-30 másodpercen belül
- Első hívás (cold start) sokáig tart

**Ellenőrzés:**

1. **Lovable-ben: Backend → Functions → `login-with-username-pin` → Logs**
2. Nézd meg az utolsó 20 request időtartamát:
   - Ha >5 sec: lassú
   - Ha timeout error: 30 sec limit túllépve

**Fix (ideiglenesen Lovable-ben):**
- Warm-up script (auto-trigger function minden 5 percben)
- Deployment után: Vercel/Netlify serverless timeout növelése 60 sec-ra

---

### 2.2 Auth Specifikus Hibák

#### **❌ Hiba #5: Regisztráció után automatikus login sikertelen**

**Kód hely:** `src/pages/RegisterNew.tsx` → `handleSubmit()` → auto-login blokk

**Probléma:**
```ts
const { error: signInError } = await supabase.auth.signInWithPassword({
  email: autoEmail,
  password: validated.pin + validated.username,
});

if (signInError) {
  // Ide jut, mert a password NEM STIMMEL
}
```

**Ellenőrzés:**

1. **Regisztrálj új usert:**
   - Username: `testuser123`
   - PIN: `987654`

2. **Backend log-ot nézd:**
   - `register-with-username-pin` edge function visszatérési értéke:
     ```json
     {
       "success": true,
       "user": { "id": "...", "username": "testuser123" },
       "recovery_code": "ABCD-EFGH-IJKL"
     }
     ```

3. **Próbálj bejelentkezni manuálisan:**
   - Username: `testuser123`
   - PIN: `987654`
   - Ha sikeres login, de auto-login sikertelen → password kombináció eltérés

**Fix:**
- Backend és frontend password generálás PONTOSAN megegyezik?
  ```ts
  // Backend (register):
  password: pin + username
  
  // Frontend (auto-login):
  password: validated.pin + validated.username
  ```
- Ha eltér: egyikre standardizáld

---

## 3. Projekt Exportálása Lovable-ből

### 3.1 GitHub Repository Létrehozás + Push

**Lépések (ha még nincs GitHub repo):**

1. **GitHub-on hozz létre új private repository-t:**
   - Menj: https://github.com/new
   - Repository name: `dingleup-app` (vagy bármilyen név)
   - Private ✅
   - **NE pipáld be:** "Initialize with README"
   - Create repository

2. **Lovable-ben inicializáld a Git connection-t:**
   - Lovable Project → Settings → Integrations → GitHub
   - Kattints "Connect to GitHub"
   - Válaszd ki a repository-t: `dingleup-app`
   - Authorize

3. **Automatikus push történik** (Lovable automatikusan pusholja a kódot)

4. **Ellenőrizd GitHub-on:**
   - Menj: https://github.com/YOUR_USERNAME/dingleup-app
   - Látod a fájlokat: `src/`, `supabase/`, `package.json`, stb.

---

### 3.2 Manuális ZIP Export (ha GitHub nem működik)

**Lépések:**

1. **Lovable Project → Share → Download Source Code**
2. **Letöltődik egy ZIP fájl** (`dingleup-source.zip`)
3. **Csomagold ki:**
   ```bash
   unzip dingleup-source.zip -d dingleup-app
   cd dingleup-app
   ```

4. **Inicializálj Git repo-t helyben:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit from Lovable export"
   ```

5. **Pushold GitHub-ra:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/dingleup-app.git
   git branch -M main
   git push -u origin main
   ```

---

### 3.3 Fontos Fájlok és Mappák Ellenőrzése

**Nézd végig, hogy MINDEN megvan-e:**

```
dingleup-app/
├── src/                          # Frontend forrás
│   ├── pages/                    # Oldalak (Dashboard, Game, stb.)
│   ├── components/               # UI komponensek
│   ├── integrations/supabase/    # Supabase client
│   ├── hooks/                    # Custom React hooks
│   ├── i18n/                     # Többnyelvűség (hu, en)
│   └── assets/                   # Képek, videók, hangok
├── supabase/                     # Backend
│   ├── functions/                # 90+ edge function
│   │   ├── login-with-username-pin/
│   │   ├── register-with-username-pin/
│   │   ├── complete-game/
│   │   └── ...
│   └── config.toml               # Supabase config
├── db/                           # Adatbázis
│   ├── schema_latest.sql         # Teljes schema export
│   └── full_data_export.sql      # Adatok (ha van)
├── infra/                        # Docker config
│   ├── docker-compose.yml        # Teljes stack
│   ├── Dockerfile.frontend       # Frontend container
│   ├── Dockerfile.backend        # Backend container
│   └── nginx.conf                # Reverse proxy
├── package.json                  # Frontend dependencies
├── vite.config.ts                # Vite build config
├── tailwind.config.ts            # Tailwind design system
└── .env.example                  # Env template
```

**Ha valami hiányzik:**
- `src/integrations/supabase/`: KRITIKUS, nélküle nem működik
- `supabase/functions/`: KRITIKUS, backend logika
- `db/schema_latest.sql`: KRITIKUS, adatbázis séma

---

## 4. Új Független Környezet Tervezése

### 4.1 Választott Deploy Útvonal: **Vercel (Frontend) + Supabase (Backend + DB)**

**Miért ez az ajánlott?**
- ✅ Ingyenes tier elegendő kezdéshez (Vercel: 100 GB bandwidth/hónap)
- ✅ Automatikus CI/CD (Git push → deploy)
- ✅ Global CDN (gyors betöltés világszerte)
- ✅ Serverless Supabase Edge Functions (nincs szerver karbantartás)
- ✅ Managed PostgreSQL (Supabase: 500 MB DB ingyenes)

**Alternatívák:**
- Netlify + Supabase (hasonló, de Vercel jobb PWA támogatás)
- Railway / Render + Supabase (Docker deploy, drágább)
- Saját VPS (teljes kontroll, de karbantartás intenzív)

---

### 4.2 Új Supabase Projekt Létrehozása

**Lépések:**

1. **Menj: https://supabase.com/dashboard**
2. **Kattints: "New project"**
   - Organization: Create new / Válassz meglévőt
   - Name: `dingleup-production`
   - Database Password: Generálj erős jelszót (mentsd el!)
   - Region: **Europe (Frankfurt)** (legközelebbi Magyarországhoz)
   - Pricing Plan: **Free** (elég kezdéshez)

3. **Projekt létrejön (2-3 perc)**

4. **Másold ki az API kulcsokat:**
   - Settings → API
   - **URL:** `https://YOUR_NEW_PROJECT.supabase.co`
   - **anon / public key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (ANON)
   - **service_role key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (SERVICE)

5. **NE zárd be ezt a tabot!** (később kelleni fog)

---

### 4.3 Adatbázis Schema Importálás

**Most jön a KRITIKUS lépés: adatbázis séma betöltése.**

#### **Lépés 1: Nyisd meg az SQL Editor-t**
- Supabase Dashboard → SQL Editor

#### **Lépés 2: Másold be a schema fájl tartalmát**
1. **Nyisd meg lokálisan:** `db/schema_latest.sql`
2. **Másold ki a TELJES fájl tartalmát** (Ctrl+A → Ctrl+C)
3. **Illeszd be az SQL Editor-ba**

#### **Lépés 3: Futtasd le**
- Kattints: **"Run"** (vagy Ctrl+Enter)
- **Várj 30-60 másodpercet** (39 tábla + indexek + RLS policies)

#### **Lépés 4: Ellenőrizd**
- Database → Tables → Látod mind a 39 táblát?
  - `profiles`, `question_pools`, `topics`, `game_sessions`, stb.
- Ha hibát kapsz:
  - Másold ki a hibaüzenetet
  - Javítsd a schema-ban (pl. foreign key constraint)
  - Próbáld újra

---

### 4.4 Adatok Migrálása (Kérdések, Topics, stb.)

**Most töltsük be a KÉRDÉSEKET és TOPICS táblát.**

#### **Lépés 1: Exportáld az adatokat Lovable-ből**

**Lovable Admin Interface:**
1. **Jelentkezz be admin userrel** (username: `DingelUP!`)
2. **Admin Dashboard → "Teljes adatbázis export"** gomb
3. **Letöltődik:** `dingleup_full_export_2025-12-01.sql`

**VAGY használd a korábbi export-ot:**
- `db/full_data_export_2025-12-01.sql` (ha már van)

#### **Lépés 2: Nyisd meg az export fájlt**
```bash
cat db/full_data_export_2025-12-01.sql | head -50
```

**Nézd meg a struktúrát:**
```sql
BEGIN;

-- Data for table: topics
-- Exported 30 rows from topics
ALTER TABLE public.topics DISABLE TRIGGER ALL;
INSERT INTO public.topics (...) VALUES (...);
...
ALTER TABLE public.topics ENABLE TRIGGER ALL;

-- Data for table: question_pools
-- Exported 4500 rows from question_pools
ALTER TABLE public.question_pools DISABLE TRIGGER ALL;
INSERT INTO public.question_pools (...) VALUES (...);
...
ALTER TABLE public.question_pools ENABLE TRIGGER ALL;

COMMIT;
```

#### **Lépés 3: Importáld az adatokat**

**Opció A: SQL Editor (kis adatmennyiség):**
1. Supabase Dashboard → SQL Editor
2. Másold be az export fájl tartalmát
3. Run

**Opció B: psql CLI (nagy adatmennyiség, ajánlott):**
1. Telepítsd a PostgreSQL client-et:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql-client
   
   # macOS (Homebrew)
   brew install postgresql
   
   # Windows (Chocolatey)
   choco install postgresql
   ```

2. Kapcsolódj az új Supabase adatbázishoz:
   ```bash
   psql "postgresql://postgres:YOUR_DB_PASSWORD@db.YOUR_NEW_PROJECT.supabase.co:5432/postgres"
   ```

3. Importáld az adatokat:
   ```sql
   \i /path/to/db/full_data_export_2025-12-01.sql
   ```

4. Ellenőrizd:
   ```sql
   SELECT COUNT(*) FROM question_pools;
   -- Várt eredmény: 4500
   
   SELECT COUNT(*) FROM topics;
   -- Várt eredmény: 30
   ```

#### **Lépés 4: Kritikus táblák ellenőrzése**
```sql
-- Kérdések
SELECT COUNT(*) as question_count FROM question_pools;

-- Témák
SELECT COUNT(*) as topic_count FROM topics;

-- Fordítások (ha van)
SELECT COUNT(*) as translation_count FROM question_translations;

-- Admin user (ha van)
SELECT username, role FROM profiles p
JOIN user_roles ur ON p.id = ur.user_id
WHERE ur.role = 'admin';
```

---

### 4.5 Environment Változók Beállítása

#### **Frontend (Vercel):**

**Lépés 1: Vercel Project Létrehozása**
1. Menj: https://vercel.com/new
2. Import Git Repository → Válaszd ki a GitHub repo-t (`dingleup-app`)
3. Configure Project:
   - Framework Preset: **Vite**
   - Root Directory: `./` (alapértelmezett)
   - Build Command: `npm run build`
   - Output Directory: `dist`

**Lépés 2: Environment Variables beállítása**
- **FONTOS:** NE deployment előtt add meg, hanem MOST!
- Kattints: "Environment Variables" megnyitása

**Add meg ezeket:**
```env
VITE_SUPABASE_URL=https://YOUR_NEW_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (ANON KEY)
VITE_SUPABASE_PROJECT_ID=YOUR_NEW_PROJECT
```

- **Environments:** Production, Preview, Development (mind a hármat pipáld be)

**Lépés 3: Deploy**
- Kattints: **"Deploy"**
- Várj 2-3 percet
- Ha sikeres: `https://dingleup-app.vercel.app` (vagy hasonló URL)

---

#### **Backend (Supabase Edge Functions):**

**Lépés 1: Supabase CLI Telepítése**
```bash
# macOS / Linux
brew install supabase/tap/supabase

# Windows (Chocolatey)
choco install supabase

# Vagy NPM-mel (minden platform)
npm install -g supabase
```

**Lépés 2: Supabase CLI Login**
```bash
supabase login
```
- Megnyílik a böngésző → Authorize CLI

**Lépés 3: Projekthez Linkelés**
```bash
cd /path/to/dingleup-app
supabase link --project-ref YOUR_NEW_PROJECT
```
- `YOUR_NEW_PROJECT`: Az új Supabase projekt ID (pl. `abcdef123456`)

**Lépés 4: Edge Functions Deploy**
```bash
supabase functions deploy
```
- Deploy-olja mind a 90+ function-t
- Várj 5-10 percet

**Lépés 5: Secrets Beállítása**

**KRITIKUS:** A backend-nek szüksége van SECRET kulcsokra.

```bash
supabase secrets set SUPABASE_URL=https://YOUR_NEW_PROJECT.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (SERVICE KEY)
supabase secrets set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (ANON KEY)

# Ha Stripe van
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

**Lépés 6: Ellenőrizd a deploy-t**
```bash
supabase functions list
```

**Várható output:**
```
┌──────────────────────────────────┬────────────────┐
│ NAME                             │ VERSION        │
├──────────────────────────────────┼────────────────┤
│ login-with-username-pin          │ v1             │
│ register-with-username-pin       │ v1             │
│ complete-game                    │ v1             │
│ ...                              │ ...            │
└──────────────────────────────────┴────────────────┘
```

---

### 4.6 Build Parancsok Lokális Teszteléshez

#### **Frontend (lokális futtatás):**

1. **Klónozd a repo-t:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/dingleup-app.git
   cd dingleup-app
   ```

2. **Telepítsd a dependency-ket:**
   ```bash
   npm install
   ```

3. **Hozz létre `.env` fájlt:**
   ```bash
   cp .env.example .env
   ```

4. **Szerkeszd a `.env` fájlt:**
   ```env
   VITE_SUPABASE_URL=https://YOUR_NEW_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (ANON)
   VITE_SUPABASE_PROJECT_ID=YOUR_NEW_PROJECT
   ```

5. **Indítsd a dev szervert:**
   ```bash
   npm run dev
   ```

6. **Nyisd meg a böngészőt:**
   - http://localhost:8080

#### **Backend (lokális Edge Function futtatás):**

**FONTOS:** Edge function-ök lokálisan CSAK Supabase CLI-vel futnak (Deno környezet szükséges).

```bash
# Indítsd a Supabase local stacket
supabase start

# Ez elindítja:
# - PostgreSQL (localhost:54322)
# - Edge Functions runtime (localhost:54321)
# - Studio UI (http://localhost:54323)
```

**Teszteld az edge function-öket:**
```bash
curl -X POST http://localhost:54321/functions/v1/login-with-username-pin \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "pin": "123456"}'
```

---

## 5. Adatbázis Migrálás

### 5.1 Schema Export (ha még nem tetted meg)

**Supabase Dashboard → SQL Editor:**

```sql
-- Export schema (DDL only)
SELECT 
  'CREATE TABLE ' || quote_ident(table_schema) || '.' || quote_ident(table_name) || E'\n(\n' ||
  string_agg(
    '  ' || quote_ident(column_name) || ' ' || data_type ||
    CASE WHEN character_maximum_length IS NOT NULL 
      THEN '(' || character_maximum_length || ')' 
      ELSE '' 
    END ||
    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
    E',\n'
  ) || E'\n);'
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_schema, table_name;
```

**Kimenet:** Másold ki → mentsd `db/schema_manual_export.sql`-be

---

### 5.2 Teljes Data Export (4500 kérdés!)

**Admin Interface használata (ajánlott):**

1. **Lovable Admin → "Teljes adatbázis export"**
2. **Letöltődik:** `dingleup_full_export_2025-12-01.sql`
3. **Ellenőrizd a fájl méretét:**
   ```bash
   ls -lh db/dingleup_full_export_2025-12-01.sql
   ```
   - Várt méret: 10-50 MB (4500 kérdés + egyéb adatok)

4. **Nézd meg, tényleg MINDEN adat benne van:**
   ```bash
   grep -c "INSERT INTO public.question_pools" db/dingleup_full_export_2025-12-01.sql
   ```
   - Várt eredmény: ~4500

---

### 5.3 Adatok Betöltése Új Supabase-be

**psql CLI módszer (ajánlott nagy adatmennyiséghez):**

```bash
# 1. Kapcsolódás az új Supabase DB-hez
psql "postgresql://postgres:YOUR_DB_PASSWORD@db.YOUR_NEW_PROJECT.supabase.co:5432/postgres"

# 2. Importálás
\i /path/to/db/full_data_export_2025-12-01.sql

# 3. Ellenőrzés
SELECT COUNT(*) FROM question_pools;
SELECT COUNT(*) FROM topics;
SELECT COUNT(*) FROM profiles;
```

**Ha timeout-ot kapsz:**
- Növeld a statement_timeout-ot:
  ```sql
  SET statement_timeout = '10min';
  \i /path/to/db/full_data_export_2025-12-01.sql
  ```

---

## 6. Auth és PIN Rendszer Beállítása

### 6.1 Backend RPC Funkciók Ellenőrzése

**Supabase Dashboard → Database → Functions**

**Ellenőrizd, hogy léteznek-e:**
- `login_with_username_pin()` – NEM (edge function végzi)
- `credit_wallet(user_id, amount, idempotency_key)` – IGEN (RPC)
- `credit_lives(user_id, amount, idempotency_key)` – IGEN (RPC)
- `apply_invitation_reward(p_inviter_id, p_invited_user_id)` – IGEN (RPC)

**Ha hiányoznak, futtasd le SQL-ben:**

```sql
-- Credit wallet RPC (atomic, idempotent)
CREATE OR REPLACE FUNCTION credit_wallet(
  p_user_id UUID,
  p_amount INTEGER,
  p_idempotency_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert ledger entry (idempotent via unique constraint on idempotency_key)
  INSERT INTO wallet_ledger (user_id, amount, idempotency_key, transaction_type, metadata)
  VALUES (p_user_id, p_amount, p_idempotency_key, 'credit', jsonb_build_object('source', 'system'))
  ON CONFLICT (idempotency_key) DO NOTHING;
  
  RETURN TRUE;
END;
$$;
```

---

### 6.2 RLS Policies Ellenőrzése

**KRITIKUS:** Ellenőrizd, hogy a `profiles` tábla RLS policy-i helyesek-e.

**Supabase Dashboard → Database → Tables → profiles → Policies**

**Szükséges policy-k:**

1. **Service role teljes hozzáférés:**
   ```sql
   CREATE POLICY "Service role full access"
   ON profiles FOR ALL
   TO service_role
   USING (true)
   WITH CHECK (true);
   ```

2. **Felhasználók saját profil olvasása:**
   ```sql
   CREATE POLICY "Users can read own profile"
   ON profiles FOR SELECT
   TO authenticated
   USING (auth.uid() = id);
   ```

3. **Felhasználók saját profil módosítása:**
   ```sql
   CREATE POLICY "Users can update own profile"
   ON profiles FOR UPDATE
   TO authenticated
   USING (auth.uid() = id)
   WITH CHECK (auth.uid() = id);
   ```

**Ha hiányzik bármelyik:** SQL Editor-ban futtasd le a CREATE POLICY parancsot.

---

### 6.3 Frontend Auth Integration Ellenőrzése

**File:** `src/integrations/supabase/client.ts`

**Ellenőrizd:**
```ts
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

**Módosítás NEM szükséges** (már helyes), DE:
- A `.env` fájlban az ÚJ Supabase projekt URL-je és anon key-je szerepel?

**Tesztelés:**
1. Frontend elindul: `npm run dev`
2. Regisztráció működik?
   - Próbálj regisztrálni: username `testuser`, PIN `123456`
   - Sikeres regisztráció → átirányít dashboard-ra
3. Kijelentkezés → Bejelentkezés működik?
   - Username `testuser`, PIN `123456`
   - Sikeres login → átirányít dashboard-ra

**Ha nem működik:**
- Developer Tools → Network → Nézd meg a request URL-t
- Ha `wdpxmwsxhckazwxufttk.supabase.co` (régi) → `.env` fájl nem lett újra betöltve
- **Fix:** Állítsd le a dev szervert (Ctrl+C) → indítsd újra `npm run dev`

---

### 6.4 Backend Edge Function Auth Flow

**File:** `supabase/functions/login-with-username-pin/index.ts`

**Ellenőrizd a kritikus részt:**
```ts
// 1. Backend lekéri a user profile-t username alapján
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('user_id, username, pin_hash, email')
  .ilike('username', username)
  .maybeSingle();

// 2. Ellenőrzi a PIN hash-t
const inputPinHash = await hashPin(pin);
if (profile.pin_hash !== inputPinHash) {
  return { error: 'Invalid credentials' };
}

// 3. Visszaadja az email-t és password variánsokat
return {
  success: true,
  user: { email: profile.email },
  passwordVariants: [pin + username, username + pin] // Migráció miatt 2 variáns
};
```

**Tesztelés:**
```bash
curl -X POST https://YOUR_NEW_PROJECT.supabase.co/functions/v1/login-with-username-pin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"username": "testuser", "pin": "123456"}'
```

**Várt válasz:**
```json
{
  "success": true,
  "user": {
    "email": "testuser@dingleup.auto"
  },
  "passwordVariants": ["123456testuser", "testuser123456"]
}
```

**Ha hibát kapsz:**
- `Missing username or PIN` → body nem jó formátumú
- `Username not found` → profiles táblában nincs ilyen user
- `Invalid credentials` → PIN hash nem egyezik

---

## 7. End-to-End Checklist

### 7.1 Deploy Checklist

```
📦 PROJEKT SETUP
[ ] GitHub repository létrehozva
[ ] Kód push-olva GitHub-ra
[ ] .env.example fájl létezik (template)

🗄️ ADATBÁZIS SETUP
[ ] Új Supabase projekt létrehozva
[ ] db/schema_latest.sql lefuttatva (39 tábla)
[ ] db/full_data_export.sql importálva (4500 kérdés)
[ ] question_pools tábla: 4500 sor ✅
[ ] topics tábla: 30 sor ✅
[ ] profiles tábla: admin user létezik ✅

🔐 AUTH & RLS
[ ] profiles tábla RLS enabled
[ ] Service role policy létezik
[ ] PIN auth RPC funkciók léteznek
[ ] register-with-username-pin edge function deployed
[ ] login-with-username-pin edge function deployed

🚀 FRONTEND DEPLOY (Vercel)
[ ] Vercel project létrehozva
[ ] Environment variables beállítva:
    [ ] VITE_SUPABASE_URL
    [ ] VITE_SUPABASE_PUBLISHABLE_KEY
    [ ] VITE_SUPABASE_PROJECT_ID
[ ] Build successful (Vercel dashboard: zöld check)
[ ] Deploy URL működik: https://dingleup-app.vercel.app

⚙️ BACKEND DEPLOY (Supabase Edge Functions)
[ ] Supabase CLI telepítve
[ ] supabase login sikeres
[ ] supabase link --project-ref sikeres
[ ] supabase functions deploy sikeres (90+ function)
[ ] supabase secrets set (összes SECRET)

🧪 TESZTELÉS
[ ] Landing page betöltődik: https://YOUR_VERCEL_URL/
[ ] Regisztráció működik:
    [ ] Username: testregister
    [ ] PIN: 123456
    [ ] Sikeres regisztráció → Dashboard
[ ] Kijelentkezés működik
[ ] Bejelentkezés működik:
    [ ] Username: testregister
    [ ] PIN: 123456
    [ ] Sikeres login → Dashboard
[ ] Játék indul:
    [ ] Play Now gomb → Intro video
    [ ] Kérdések betöltődnek (magyarul ÉS angolul)
    [ ] Helyes válasz → coin jóváírás
[ ] Admin login működik:
    [ ] Username: DingelUP!
    [ ] PIN: admin PIN
    [ ] Sikeres login → Admin Dashboard
[ ] Leaderboard betöltődik (országonként TOP 100)
[ ] Profile page betöltődik (user adatok látszódnak)

📱 PWA TESZT
[ ] PWA install prompt megjelenik (mobil/tablet)
[ ] iOS Safari: Add to Home Screen működik
[ ] Android Chrome: Install App működik
[ ] Standalone mode: fullscreen működik
[ ] Offline mode: cached assets betöltődnek

💰 PAYMENT TESZT (ha van Stripe)
[ ] Stripe keys beállítva Supabase secrets-ben
[ ] Test purchase (lootbox): $1.99 → sikeres
[ ] Wallet frissül (gold + lives jóváírva)
[ ] Stripe webhook működik (verify-payment)
```

---

### 7.2 Mit Látsz, Ha Minden Rendben Van?

#### **Frontend (Vercel Dashboard):**
- **Deployments tab:** Legutóbbi deploy → zöld check ✅
- **Domains:** `dingleup-app.vercel.app` → Active
- **Analytics:** Request count növekszik (ha van forgalom)

#### **Backend (Supabase Dashboard):**
- **Database → Tables:** 39 tábla látható
- **Database → Functions:** 90+ edge function listázva
- **Auth → Users:** Létrehozott teszt user-ek látszódnak
- **Logs → Edge Functions:** Request log-ok jelennek meg (login, register)

#### **Böngészőben:**
- **Landing Page:** https://YOUR_VERCEL_URL/
  - Látszik a hero section, Play Now gomb
- **Login:** https://YOUR_VERCEL_URL/auth/login
  - Username + PIN input mezők
  - Bejelentkezés sikeres → átirányít /dashboard-ra
- **Dashboard:** https://YOUR_VERCEL_URL/dashboard
  - User profil (avatar, username, coins, lives)
  - Daily Gift popup (ha első login)
  - Play Now gomb működik
- **Game:** https://YOUR_VERCEL_URL/game
  - Intro video lejátszódik
  - Kérdések betöltődnek (15 random kérdés a pool-ból)
  - Válasz kiválasztása → helyes/helytelen feedback
  - Coin jóváírás működik (azonnal látszik a wallet-ben)

#### **Admin Dashboard:**
- **Admin Login:** https://YOUR_VERCEL_URL/auth/login
  - Username: `DingelUP!`, PIN: admin PIN
- **Admin Dashboard:** https://YOUR_VERCEL_URL/admin/dashboard
  - Metrics látszódnak (user count, game count, stb.)
  - "Teljes adatbázis export" gomb működik

---

## 8. Hibaelhárítás

### 8.1 "Network Error" vagy "Failed to fetch"

**Probléma:**
- Frontend nem tudja elérni a Supabase backend-et

**Ellenőrzés:**
1. **Developer Tools → Network tab**
2. **Nézd meg a hibás request URL-jét:**
   - Ha `https://wdpxmwsxhckazwxufttk.supabase.co` (régi projekt)
   - ⚠️ Frontend még a RÉGI Supabase projekt-re mutat

**Fix:**
1. **Ellenőrizd a `.env` fájlt:**
   ```bash
   cat .env
   ```
   - `VITE_SUPABASE_URL` értéke megegyezik az ÚJ projekt URL-jével?

2. **Ha nem egyezik, javítsd:**
   ```env
   VITE_SUPABASE_URL=https://YOUR_NEW_PROJECT.supabase.co
   ```

3. **Újraindítás:**
   - Lokálisan: Állítsd le a dev szervert (Ctrl+C) → `npm run dev`
   - Vercel-en: Redeploy (Vercel Dashboard → Deployments → "..." → Redeploy)

---

### 8.2 "Row level security policy violation"

**Probléma:**
- Backend nem tud hozzáférni a `profiles` táblához

**Ellenőrzés:**
- Supabase Dashboard → Database → Tables → profiles → Policies
- Van-e `service_role` policy?

**Fix:**
```sql
CREATE POLICY "Service role full access"
ON profiles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

---

### 8.3 "Invalid credentials" regisztráció/login után

**Probléma:**
- Frontend és backend password generálás NEM egyezik

**Ellenőrzés:**
1. **Backend:** `register-with-username-pin/index.ts` → `password: pin + username`
2. **Frontend:** `RegisterNew.tsx` → `password: validated.pin + validated.username`

**Fix:**
- Ha eltér: egyikre standardizáld (pl. mindig `pin + username`)

---

### 8.4 "Function not found" edge function híváskor

**Probléma:**
- Edge function nem lett deploy-olva

**Ellenőrzés:**
```bash
supabase functions list
```

**Fix:**
```bash
supabase functions deploy login-with-username-pin
supabase functions deploy register-with-username-pin
```

---

### 8.5 Kérdések NEM töltődnek be játékban

**Probléma:**
- `question_pools` tábla üres VAGY edge function nem tud hozzáférni

**Ellenőrzés:**
```sql
SELECT COUNT(*) FROM question_pools;
```

**Fix:**
- Ha 0: Importáld az adatokat (`db/full_data_export.sql`)
- Ha >0, de játék NEM működik: Edge function log-ot nézd:
  ```bash
  supabase functions logs get-game-questions
  ```

---

### 8.6 Admin User NEM tud bejelentkezni

**Probléma:**
- Admin user hiányzik az új adatbázisból

**Ellenőrzés:**
```sql
SELECT p.username, ur.role 
FROM profiles p
JOIN user_roles ur ON p.id = ur.user_id
WHERE ur.role = 'admin';
```

**Fix:**
- Ha üres: Hozz létre admin user-t VAGY importáld a teljes `profiles` + `user_roles` táblát

---

## 9. További Lépések

### 9.1 Custom Domain Beállítása (Vercel)

1. **Vercel Dashboard → Settings → Domains**
2. **Add Domain:** `dingleup.hu` (vagy amit szeretnél)
3. **DNS beállítások:**
   - Domain registrárnál (pl. GoDaddy, Namecheap):
     - Add A record: `@` → `76.76.21.21` (Vercel IP)
     - Add CNAME record: `www` → `cname.vercel-dns.com`
4. **SSL Certificate:** Automatikusan generálódik (Let's Encrypt)

---

### 9.2 Monitoring és Logging

#### **Vercel Analytics:**
- Vercel Dashboard → Analytics
- Látod: page views, unique visitors, performance metrics

#### **Supabase Logs:**
- Supabase Dashboard → Logs
- Edge Function logs: request count, error rate, latency

#### **Sentry (opcionális, error tracking):**
- https://sentry.io
- Integráld a frontend-be: `@sentry/react`

---

### 9.3 Backup Stratégia

#### **Automatikus DB Backup (Supabase):**
- Supabase Free tier: Daily backups (7 napos retention)
- Pro tier: Point-in-time recovery

#### **Manuális Backup:**
```bash
# Hetente futtasd le:
pg_dump "postgresql://postgres:PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres" \
  > backups/dingleup_backup_$(date +%Y%m%d).sql
```

---

## 10. Összefoglalás

**Mit csináltunk:**
1. ✅ Projekt exportálva Lovable-ből → GitHub
2. ✅ Új Supabase projekt létrehozva
3. ✅ Adatbázis schema + adatok migrálva (4500 kérdés!)
4. ✅ Frontend deploy-olva Vercel-re
5. ✅ Backend (Edge Functions) deploy-olva Supabase-re
6. ✅ Auth (username+PIN) működik
7. ✅ Játék betöltődik, kérdések megjelennek
8. ✅ Admin dashboard elérhető

**Következő lépések:**
- [ ] Custom domain beállítása
- [ ] Monitoring (Sentry, Vercel Analytics)
- [ ] Backup stratégia beállítása
- [ ] Load testing (ha nagy forgalom várható)

---

**Kérdések? Problémák?**
- Nézd meg a [Hibaelhárítás](#8-hibaelhárítás) részt
- Ellenőrizd a checklist-et: minden ✅?
- Ha továbbra is elakadtál: másold ki a hibaüzenetet és küldd el!