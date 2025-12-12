# DingleUP! – Teljes Önálló Üzemeltetési Útmutató

**Verzió:** 2.0  
**Frissítve:** 2025-12-12  
**Célja:** A DingleUP! alkalmazás TELJES függetlenítése Lovable-től – saját domain, saját szerver, saját Google Play/App Store publikáció

---

## 📋 Tartalomjegyzék

1. [Áttekintés – Mit Tartalmaz Ez Az Útmutató](#1-áttekintés)
2. [Szükséges Előfeltételek](#2-szükséges-előfeltételek)
3. [1. LÉPÉS: Adatbázis Export és Migráció](#3-adatbázis-export-és-migráció)
4. [2. LÉPÉS: Saját Supabase Projekt Létrehozása](#4-saját-supabase-projekt-létrehozása)
5. [3. LÉPÉS: Frontend Deploy (Vercel/Netlify/VPS)](#5-frontend-deploy)
6. [4. LÉPÉS: Edge Functions Deploy](#6-edge-functions-deploy)
7. [5. LÉPÉS: Domain és SSL Beállítás](#7-domain-és-ssl-beállítás)
8. [6. LÉPÉS: Google Play Publikáció](#8-google-play-publikáció)
9. [7. LÉPÉS: Apple App Store Publikáció](#9-apple-app-store-publikáció)
10. [8. LÉPÉS: Stripe Fizetés Beállítás](#10-stripe-fizetés-beállítás)
11. [Hibaelhárítás](#11-hibaelhárítás)
12. [Karbantartás és Backup](#12-karbantartás-és-backup)

---

## 1. Áttekintés

### Mit Kapsz Ezzel Az Útmutatóval?

- ✅ **Saját PostgreSQL adatbázis** – teljes kontroll az adatok felett
- ✅ **Saját backend** – Supabase Edge Functions VAGY saját Deno/Node.js szerver
- ✅ **Saját domain** – pl. `https://dingleup.hu` vagy `https://play.dingleup.com`
- ✅ **Saját hosting** – Vercel, Netlify, VPS, vagy bármilyen preferált szolgáltató
- ✅ **Google Play Store** – Android APK/AAB publikáció
- ✅ **Apple App Store** – iOS IPA publikáció (Capacitor)
- ✅ **Független Stripe** – saját Stripe fiók, saját bevételek

### Jelenlegi Technológiai Stack

| Komponens | Technológia | Verzió |
|-----------|-------------|--------|
| Frontend | React + Vite + TypeScript | 18.3.1 / 6.x |
| UI | shadcn/ui + Tailwind CSS | latest |
| Backend | Deno (Supabase Edge Functions) | 1.40+ |
| Database | PostgreSQL | 15+ |
| Mobile | Capacitor | 7.x |
| Payments | Stripe | latest |

---

## 2. Szükséges Előfeltételek

### Fiókok és Szolgáltatások

1. **Supabase Fiók** (INGYENES tier elég kezdéshez)
   - https://supabase.com → Sign Up
   
2. **Vercel VAGY Netlify Fiók** (Frontend hosting)
   - https://vercel.com VAGY https://netlify.com
   
3. **Domain Név** (opcionális, de ajánlott)
   - Bármely domain registrar: Namecheap, GoDaddy, Google Domains
   
4. **Google Play Developer Fiók** (Android)
   - https://play.google.com/console
   - Egyszeri $25 regisztrációs díj
   
5. **Apple Developer Program** (iOS)
   - https://developer.apple.com/programs
   - Éves $99 díj
   
6. **Stripe Fiók** (Fizetések)
   - https://stripe.com → Sign Up

### Szoftver Követelmények (Lokális Gép)

```bash
# Node.js (v18+)
node --version  # >= 18.0.0

# npm vagy yarn
npm --version   # >= 9.0.0

# Git
git --version

# Supabase CLI
npm install -g supabase

# Capacitor CLI (mobil build-hez)
npm install -g @capacitor/cli

# Android Studio (Android build-hez)
# Xcode (iOS build-hez - csak macOS)
```

---

## 3. Adatbázis Export és Migráció

### 3.1 Adatbázis Export Admin Felületről

1. **Jelentkezz be az admin felületre:** `/admin`
2. **Dashboard oldalon** három gomb található:
   - `Teljes adatbázis export` – letölti a sémát ÉS az összes adatot egyben
   - `Schema Export (CREATE TABLE)` – csak a séma SQL-t tölti le
   - `Data Export (INSERT)` – csak az adatokat tölti le SQL INSERT formában

3. **Exportálás módjai:**
   ```
   A) Teljes export (AJÁNLOTT):
      Kattints "Teljes adatbázis export" → dingleup_full_export_YYYY-MM-DD.sql
      
   B) Külön fájlok:
      1. Kattints "Schema Export" → dingleup_schema_YYYY-MM-DD.sql
      2. Kattints "Data Export" → dingleup_data_YYYY-MM-DD.sql
   ```

### 3.2 Export Fájlok Tartalma

**104 tábla kerül exportálásra a jelenlegi adatbázisból.**

**Teljes export fájl (`dingleup_full_export_*.sql`):**
```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enum Types
DO $$ BEGIN CREATE TYPE app_role AS ENUM ('admin', 'user'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tables (104 tábla)
DROP TABLE IF EXISTS public.topics CASCADE;
CREATE TABLE public.topics (...);
INSERT INTO public.topics (...) VALUES (...);

-- stb.
```

**Schema fájl (`dingleup_schema_*.sql`):**
```sql
-- CREATE TABLE statements only (no data)
DROP TABLE IF EXISTS public.topics CASCADE;
CREATE TABLE public.topics (...);
```

**Data fájl (`dingleup_data_*.sql`):**
```sql
BEGIN;
SET session_replication_role = 'replica';
SET CONSTRAINTS ALL DEFERRED;

TRUNCATE TABLE public.topics CASCADE;
INSERT INTO public.topics (...) VALUES (...);
-- stb.

COMMIT;
```

### 3.3 Manuális Export (Alternatíva)

Ha az admin export nem működik, használd a Supabase Dashboard-ot:

1. Supabase Dashboard → Project → Settings → Database
2. "Database URL" másolása
3. Terminálban:

```bash
# Schema export
pg_dump -h db.PROJECT_ID.supabase.co \
  -U postgres \
  -d postgres \
  -f schema_export.sql \
  --schema-only \
  --no-owner \
  --no-acl \
  --schema=public

# Data export
pg_dump -h db.PROJECT_ID.supabase.co \
  -U postgres \
  -d postgres \
  -f data_export.sql \
  --data-only \
  --inserts \
  --no-owner \
  --no-acl \
  --schema=public
```

---

## 4. Saját Supabase Projekt Létrehozása

### 4.1 Új Projekt Létrehozása

1. **Supabase Dashboard** → https://supabase.com/dashboard
2. **"New Project"** gombra kattints
3. **Beállítások:**
   - Organization: válassz vagy hozz létre újat
   - Project name: `dingleup-production`
   - Database Password: **MENTSD EL BIZTONSÁGOS HELYRE!**
   - Region: `eu-central-1` (Frankfurt) – legközelebb Magyarországhoz
   - Pricing Plan: Free tier kezdésnek OK

4. **Várj 2-3 percet** amíg a projekt létrejön

### 4.2 API Kulcsok Mentése

Supabase Dashboard → Settings → API:

```env
# Ezeket MENTSD EL:
SUPABASE_URL=https://XXXXXX.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4.3 Schema Importálás

1. **Supabase Dashboard → SQL Editor**
2. **"New Query"**
3. **Másold be a `dingleup_schema_*.sql` teljes tartalmát**
4. **"Run"** gomb

### 4.4 Data Importálás

1. **SQL Editor → New Query**
2. **Másold be a `dingleup_data_*.sql` teljes tartalmát**
3. **"Run"** gomb

**FIGYELEM:** Nagy adatmennyiség esetén (>50MB) használj `psql` klienst:

```bash
# Terminálból:
psql "postgresql://postgres:PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres" \
  -f dingleup_schema_*.sql

psql "postgresql://postgres:PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres" \
  -f dingleup_data_*.sql
```

### 4.5 Auth Beállítások

Supabase Dashboard → Authentication → Settings:

1. **Site URL:** `https://your-domain.com` (vagy Vercel URL kezdetben)
2. **Redirect URLs:** 
   ```
   https://your-domain.com/*
   http://localhost:5173/*
   capacitor://localhost/*
   ```
3. **Email Confirmations:** **KIKAPCSOLVA** (Username+PIN auth miatt)
4. **Phone Confirmations:** Kikapcsolva

### 4.6 RLS Policies Ellenőrzése

A schema export tartalmazza az RLS policy-kat, de ellenőrizd:

```sql
-- Ellenőrizd, hogy minden tábla RLS enabled:
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

---

## 5. Frontend Deploy

### 5.1 Vercel Deploy (Ajánlott)

#### A) GitHub Integráció

1. **Push kódot GitHub repo-ba:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/dingleup.git
   git push -u origin main
   ```

2. **Vercel Dashboard** → https://vercel.com/dashboard
3. **"Add New" → "Project"**
4. **Import Git Repository** → Válaszd a repo-t
5. **Configure Project:**
   - Framework Preset: `Vite`
   - Root Directory: `./` (gyökér)
   - Build Command: `npm run build`
   - Output Directory: `dist`

6. **Environment Variables** (KRITIKUS!):
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIs...
   VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_ID
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```

7. **Deploy** gombra kattints

#### B) Manuális Deploy

```bash
# Build locally
npm run build

# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### 5.2 Netlify Deploy (Alternatíva)

1. **Netlify Dashboard** → https://app.netlify.com
2. **"Add new site" → "Import an existing project"**
3. **Connect to Git** → Válaszd a repo-t
4. **Build settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
5. **Environment variables:** Ugyanaz mint Vercel-nél
6. **Deploy site**

### 5.3 VPS Deploy (Haladó)

Ha saját VPS-t (DigitalOcean, Hetzner, stb.) használsz:

```bash
# 1. SSH belépés
ssh root@your-server-ip

# 2. Node.js telepítés
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# 3. Nginx telepítés
apt-get install -y nginx

# 4. Projekt klónozás
git clone https://github.com/YOUR_USERNAME/dingleup.git /var/www/dingleup
cd /var/www/dingleup

# 5. Dependencies és build
npm install
npm run build

# 6. Nginx konfiguráció
cat > /etc/nginx/sites-available/dingleup << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/dingleup/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

ln -s /etc/nginx/sites-available/dingleup /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# 7. SSL (Let's Encrypt)
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

---

## 6. Edge Functions Deploy

### 6.1 Supabase CLI Telepítés

```bash
# NPM-mel
npm install -g supabase

# Vagy Homebrew-vel (macOS)
brew install supabase/tap/supabase
```

### 6.2 Projekt Linkelés

```bash
# Login Supabase-be
supabase login

# Link a projekthez
supabase link --project-ref YOUR_PROJECT_ID
```

### 6.3 Secrets Beállítása

```bash
# Stripe kulcsok
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Egyéb secrets
supabase secrets set RESEND_API_KEY=re_...
```

### 6.4 Functions Deploy

```bash
# Összes function deploy
supabase functions deploy

# Vagy egyesével
supabase functions deploy login-with-username-pin
supabase functions deploy register-with-username-pin
supabase functions deploy complete-game
# stb.
```

### 6.5 Functions Ellenőrzése

```bash
# Lista
supabase functions list

# Logs
supabase functions logs login-with-username-pin
```

---

## 7. Domain és SSL Beállítás

### 7.1 Custom Domain Vercel-en

1. **Vercel Dashboard → Project → Settings → Domains**
2. **"Add"** → `play.dingleup.com`
3. **DNS beállítás a domain registrar-nál:**
   ```
   Type: CNAME
   Name: play
   Value: cname.vercel-dns.com
   ```
4. **Várj 5-15 percet** a propagációra
5. **SSL automatikusan aktiválódik**

### 7.2 Custom Domain Supabase-en (Opcionális)

Ha saját API domaint szeretnél (pl. `api.dingleup.com`):

1. Supabase Dashboard → Settings → Custom Domains
2. Add domain → `api.dingleup.com`
3. DNS CNAME beállítás a dashboard utasításai szerint

---

## 8. Google Play Publikáció

### 8.1 Android Build Előkészítés

```bash
# 1. Capacitor sync
npx cap sync android

# 2. Android Studio megnyitása
npx cap open android
```

### 8.2 Signing Key Létrehozása

```bash
# Keystore generálás (EGYSZER, MENTSD EL!)
keytool -genkey -v -keystore dingleup-release.keystore \
  -alias dingleup \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Mentsd el biztonságos helyre:
# - dingleup-release.keystore fájl
# - Alias: dingleup
# - Keystore jelszó
# - Key jelszó
```

### 8.3 Release Build

Android Studio-ban:
1. **Build → Generate Signed Bundle / APK**
2. **Android App Bundle (AAB)** – Google Play-hez kötelező
3. **Válaszd a keystore-t**, add meg a jelszavakat
4. **Build variant: release**
5. **Finish** → `app/release/app-release.aab`

### 8.4 Google Play Console

1. **Google Play Console** → https://play.google.com/console
2. **"Create app"**
3. **App details:**
   - App name: DingleUP!
   - Default language: Magyar
   - App or game: Game
   - Free or paid: Free
4. **Dashboard → Release → Production**
5. **"Create new release"**
6. **Upload AAB** fájlt
7. **Release notes** kitöltése
8. **Review and rollout**

### 8.5 Store Listing

- **Rövid leírás:** "Kvízjáték napi jutalmakkal és ranglistával!"
- **Teljes leírás:** (részletes magyar és angol leírás)
- **Screenshots:** 
  - Minimum 2 db phone screenshot
  - 7-inch tablet screenshot (opcionális)
  - 10-inch tablet screenshot (opcionális)
- **Feature graphic:** 1024x500 px
- **App icon:** 512x512 px (már van: `public/logo.png`)

---

## 9. Apple App Store Publikáció

### 9.1 iOS Build Előkészítés

**Követelmény:** macOS + Xcode

```bash
# 1. Capacitor sync
npx cap sync ios

# 2. Xcode megnyitása
npx cap open ios
```

### 9.2 Xcode Beállítások

1. **Signing & Capabilities:**
   - Team: Válaszd az Apple Developer fiókod
   - Bundle Identifier: `com.dingleup.app`
   - Signing Certificate: Distribution
   
2. **Info.plist ellenőrzés:**
   - Privacy descriptions (Camera, Photo Library, stb. ha használod)

### 9.3 Archive és Upload

1. **Product → Archive**
2. **Distribute App → App Store Connect**
3. **Upload**

### 9.4 App Store Connect

1. **App Store Connect** → https://appstoreconnect.apple.com
2. **My Apps → "+"** → New App
3. **App Information:**
   - Name: DingleUP!
   - Primary Language: Hungarian
   - Bundle ID: com.dingleup.app
   - SKU: dingleup-001
4. **App Privacy:** Kitöltés
5. **Screenshots:** 
   - 6.7" (iPhone 15 Pro Max): 1290x2796 px
   - 5.5" (iPhone 8 Plus): 1242x2208 px
   - iPad Pro: 2048x2732 px
6. **Submit for Review**

---

## 10. Stripe Fizetés Beállítás

### 10.1 Stripe Dashboard Konfiguráció

1. **Stripe Dashboard** → https://dashboard.stripe.com
2. **Developers → API Keys**
3. **Mentsd el:**
   ```env
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   ```

### 10.2 Webhook Beállítás

1. **Developers → Webhooks → Add endpoint**
2. **Endpoint URL:** `https://YOUR_PROJECT.supabase.co/functions/v1/creator-webhook`
3. **Events:**
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

4. **Signing secret mentése:** `whsec_...`

### 10.3 Termékek Létrehozása

Stripe Dashboard → Products:

1. **Coin csomagok:**
   - 300 Coins - $0.99
   - 500 Coins - $1.49
   - 1000 Coins + 15 Lives - $2.99
   - stb.

2. **Creator előfizetések:**
   - Starter (1 video) - 2,990 Ft/hó
   - Growth (3 video) - 5,990 Ft/hó
   - Pro (10 video) - 14,990 Ft/hó

### 10.4 Environment Variables Frissítés

```bash
# Supabase secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend .env
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## 11. Hibaelhárítás

### Gyakori Hibák és Megoldások

#### ❌ "Invalid API key" hiba
```
Ellenőrizd:
1. VITE_SUPABASE_PUBLISHABLE_KEY helyes-e
2. Frontend újra build-elve deploy után?
```

#### ❌ "RLS policy violation"
```sql
-- Ellenőrizd a policy-kat:
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Service role bypass:
-- Backend mindig SUPABASE_SERVICE_ROLE_KEY-t használjon
```

#### ❌ "Function not found"
```bash
# Deploy ellenőrzés
supabase functions list

# Újra deploy
supabase functions deploy FUNCTION_NAME
```

#### ❌ "CORS error"
```typescript
// Edge function-ben:
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

#### ❌ Android build hiba
```bash
# Clean build
cd android
./gradlew clean
./gradlew assembleRelease
```

---

## 12. Karbantartás és Backup

### 12.1 Automatikus Backup

Supabase Pro tier-en automatikus daily backup elérhető.

Free tier-en manuális backup:

```bash
# Heti backup script
#!/bin/bash
DATE=$(date +%Y-%m-%d)
pg_dump "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres" \
  --inserts \
  --no-owner \
  > backup_$DATE.sql

# Tömörítés
gzip backup_$DATE.sql

# Upload cloud storage-ba (opcionális)
aws s3 cp backup_$DATE.sql.gz s3://your-bucket/backups/
```

### 12.2 Monitoring

1. **Supabase Dashboard → Reports** – Database metrics
2. **Vercel Analytics** – Frontend performance
3. **Stripe Dashboard** – Payment analytics

### 12.3 Updates

```bash
# Dependency frissítés
npm update

# Capacitor frissítés
npx cap sync

# Supabase CLI frissítés
npm update -g supabase
```

---

## Összefoglaló Checklist

### Teljes Függetlenítés Checklist:

- [ ] Supabase projekt létrehozva saját fiókban
- [ ] Schema importálva
- [ ] Data importálva
- [ ] Edge Functions deploy-olva
- [ ] Stripe webhook konfigurálva
- [ ] Frontend deploy-olva (Vercel/Netlify/VPS)
- [ ] Custom domain beállítva
- [ ] SSL aktív
- [ ] Android build kész és aláírva
- [ ] Google Play listing elkészítve
- [ ] iOS build kész (ha szükséges)
- [ ] App Store listing elkészítve (ha szükséges)
- [ ] Backup stratégia beállítva
- [ ] Monitoring beállítva

---

**Kérdéseid vannak?** A dokumentáció folyamatosan frissül. A legújabb verzió mindig a `docs/INDEPENDENT_DEPLOYMENT.md` fájlban található.
