# DingleUP! 🎮

**A gamified trivia platform** with daily challenges, leaderboards, and rewards.

**Verzió:** Production Ready  
**Utolsó frissítés:** 2025-12-14

---

## 📋 Projekt Áttekintés

DingleUP! egy PWA-alapú kvízjáték alkalmazás, amely napi kihívásokat, országos ranglistákat és jutalomrendszert kínál.

### Főbb Jellemzők
- 🎯 **6,000 kérdés** 30 témakörben (200/téma)
- 🌍 **Kétnyelvű** támogatás (Magyar + Angol)
- 📊 **Országos ranglisták** időzóna-alapú napi versennyel
- 🎁 **Napi jutalmak** és streak rendszer
- 👨‍🎨 **Creator rendszer** videó hirdetésekkel
- 💰 **Monetizáció** Stripe integrációval
- 📱 **PWA + Capacitor** (iOS/Android natív build)

---

## 🛠️ Technológiai Stack

| Komponens | Technológia | Verzió |
|-----------|-------------|--------|
| Frontend | React + Vite + TypeScript | 18.3.1 / 6.x |
| UI | shadcn/ui + Tailwind CSS | latest |
| Backend | Deno (Supabase Edge Functions) | 1.40+ |
| Database | PostgreSQL | 15+ |
| Mobile | Capacitor | 7.x |
| Payments | Stripe | latest |
| State | TanStack Query + Zustand | 5.x / 5.x |

---

## 📦 Adatbázis Statisztikák

| Metrika | Érték |
|---------|-------|
| Táblák | **100** |
| Edge Functions | **97+** |
| Kérdések | **6,000** |
| Kérdésfordítások | **18,000** |
| Témakörök | **30** |
| Nyelvek | HU, EN |

---

## 🚀 Gyors Kezdés

### Lokális Fejlesztés

```bash
# 1. Klónozás
git clone <YOUR_GIT_URL>
cd dingleup

# 2. Dependencies telepítés
npm install

# 3. Fejlesztői szerver indítás
npm run dev
```

### Önálló Telepítés (Self-Hosted)

Részletes útmutató: **[docs/INDEPENDENT_DEPLOYMENT.md](docs/INDEPENDENT_DEPLOYMENT.md)**

```bash
# Docker-alapú telepítés
cd infra
docker-compose up -d

# Adatbázis inicializálás
docker cp ../db/schema_latest.sql dingleup-db:/tmp/
docker exec dingleup-db psql -U postgres -d dingleup -f /tmp/schema_latest.sql
```

---

## 📚 Dokumentáció

| Dokumentum | Leírás |
|------------|--------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Rendszer architektúra, diagramok |
| [docs/INDEPENDENT_DEPLOYMENT.md](docs/INDEPENDENT_DEPLOYMENT.md) | Önálló üzemeltetés útmutató |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Telepítési útmutató |
| [docs/EXPORT_REPORT.md](docs/EXPORT_REPORT.md) | Export összefoglaló |
| [db/EXPORT_INSTRUCTIONS.md](db/EXPORT_INSTRUCTIONS.md) | Adatbázis export útmutató |
| [infra/README.md](infra/README.md) | Docker infrastruktúra |
| [backend/README.md](backend/README.md) | Backend API dokumentáció |
| [frontend/README.md](frontend/README.md) | Frontend fejlesztési útmutató |

---

## 🔐 Admin Felület

Az admin felület elérhető: `/admin`

**Főbb funkciók:**
- Dashboard statisztikák
- Felhasználók kezelése
- Kérdésfordítások kezelése
- **Adatbázis export** (Full/Schema/Data)
- Analitika dashboardok
- Creator kezelés

---

## 🌐 Önálló Működés

Ez a projekt **100% független** tud működni a Lovable platformtól:

✅ Teljes forráskód exportálva  
✅ 100 táblás adatbázis séma  
✅ 97+ edge function  
✅ Docker infrastruktúra  
✅ Részletes dokumentáció  

Részletek: **[docs/EXPORT_REPORT.md](docs/EXPORT_REPORT.md)**

---

## 📱 Mobil Build

### Android (APK/AAB)
```bash
npx cap sync android
npx cap open android
# Android Studio → Build → Generate Signed Bundle
```

### iOS (IPA)
```bash
npx cap sync ios
npx cap open ios
# Xcode → Product → Archive
```

---

## 🔧 Environment Változók

### Frontend (`.env`)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Backend (Supabase Secrets)
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 📞 Támogatás

- **Dokumentáció:** `/docs` mappa
- **Adatbázis export:** Admin Dashboard → "Teljes adatbázis export"
- **Load tesztek:** `/load-tests` mappa

---

**© 2025 DingleUP! - All Rights Reserved**
