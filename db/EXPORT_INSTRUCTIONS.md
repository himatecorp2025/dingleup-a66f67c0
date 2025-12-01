# Teljes Adatbázis Export Útmutató

## Automatikus Export (Node.js script használatával)

### 1. Függőségek telepítése

```bash
cd scripts
npm install
```

### 2. Környezeti változók beállítása

Győződj meg róla, hogy a projekt gyökér `.env` fájlban a következők be vannak állítva:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Opcionális, de ajánlott
```

### 3. Teljes export futtatása

```bash
cd scripts
npm run export:full
```

Ez létrehozza a `db/full_data_export.sql` fájlt az összes jelenlegi adattal (INSERT statementekkel).

## Manuális Export (pg_dump használatával)

Ha közvetlen hozzáférésed van a PostgreSQL adatbázishoz:

### Schema + Data export

```bash
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -f db/full_data_export.sql \
  --data-only \
  --inserts \
  --no-owner \
  --no-acl \
  --schema=public
```

### Csak séma export

```bash
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -f db/schema_export.sql \
  --schema-only \
  --no-owner \
  --no-acl \
  --schema=public
```

### Teljes export (schema + data)

```bash
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -f db/complete_export.sql \
  --inserts \
  --no-owner \
  --no-acl \
  --schema=public
```

## Supabase CLI használata

### 1. Supabase CLI telepítése

```bash
npm install -g supabase
```

### 2. Login

```bash
supabase login
```

### 3. Projekt linkelése

```bash
supabase link --project-ref your-project-ref
```

### 4. Adatbázis dump

```bash
supabase db dump -f db/supabase_dump.sql --data-only
```

## Import Útmutató

### 1. Séma létrehozása

```bash
psql -U postgres -d dingleup -f db/schema_latest.sql
```

### 2. Adatok importálása

```bash
psql -U postgres -d dingleup -f db/full_data_export.sql
```

### 3. Ellenőrzés

```bash
psql -U postgres -d dingleup -c "SELECT COUNT(*) FROM profiles;"
psql -U postgres -d dingleup -c "SELECT COUNT(*) FROM questions;"
psql -U postgres -d dingleup -c "SELECT COUNT(*) FROM translations;"
```

## Fontos táblák ellenőrzése export után

```sql
-- Felhasználók
SELECT COUNT(*) as user_count FROM profiles;

-- Admin jogosultságok
SELECT COUNT(*) as admin_count FROM user_roles WHERE role = 'admin';

-- Kérdések
SELECT COUNT(*) as question_count FROM questions;

-- Fordítások
SELECT COUNT(*) as translation_count FROM translations;

-- Témák
SELECT COUNT(*) as topic_count FROM topics;

-- Játék eredmények
SELECT COUNT(*) as game_count FROM game_results;
```

## Hibaelhárítás

### "Permission denied" hiba

Biztosítsd, hogy a SUPABASE_SERVICE_ROLE_KEY be van állítva az `.env` fájlban.

### Timeout hibák nagy táblák esetén

Növeld a timeout értéket:

```javascript
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  global: {
    headers: {
      'request-timeout': '300000' // 5 perc
    }
  }
});
```

### Túl nagy export fájl

Exportálj táblákat külön-külön és kombinálsd őket manuálisan:

```bash
node export-database-full.js --table=profiles > profiles.sql
node export-database-full.js --table=questions > questions.sql
```

## Biztonság

⚠️ **FIGYELEM**: Az export fájl érzékeny adatokat tartalmaz:
- Felhasználói PIN hash-ek
- Email címek
- Személyes adatok

**SOHA ne commitálj full data export fájlt Git-be!**

Már be van állítva a `.gitignore`-ban:
```
db/full_data_export.sql
db/*_export.sql
db/supabase_dump.sql
```
