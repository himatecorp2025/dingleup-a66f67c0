# 🔐 DINGLEUP! AUTH & PROFILE & ONBOARDING RENDSZER — TELJES TECHNIKAI DOKUMENTÁCIÓ (v1.0, 2025-12-01)

## 0. Áttekintés

### 0.1 Rendszer célja
A DingleUP! auth rendszer felelős a felhasználói hitelesítésért, profil adatok tárolásáért, és az onboarding folyamatért. A rendszer username+PIN alapú bejelentkezést használ, nem email+password alapút.

### 0.2 Jelenlegi auth módszer
**KIZÁRÓLAG username + 6 számjegyű PIN**
- Regisztrációkor a user automatikusan kap egy `username@dingleup.auto` formátumú email címet az auth.users táblában
- Jelszó: `PIN + username` kombinációból generált (pl. `123456JohnDoe`)
- Nincs valódi email alapú autentikáció
- PIN SHA-256 hash-ben tárolva (`profiles.pin_hash`)

### 0.3 Profil mezők és kitöltésük

#### Kötelező mezők (regisztrációkor):
- `username` (3-30 karakter, alfanumerikus + magyar ékezetek + alulvonás)
- `pin_hash` (6 számjegy SHA-256 hash-e)

#### Automatikusan generált mezők (regisztrációkor):
- `id` (auth.users.id-ből)
- `invitation_code` (8 karakteres egyedi kód: A-Z + 0-9)
- `recovery_code_hash` (PIN helyreállításához, formátum: XXXX-XXXX-XXXX, SHA-256)
- `coins` = 0
- `lives` = 15
- `max_lives` = 15
- `lives_regeneration_rate` = 12 (percben)

#### Opcionális / később kitöltendő mezők:
- `email` (valódi email cím, opcionális)
- `birth_date` (Age Gate-nél kitöltendő, YYYY-MM-DD formátum)
- `age_verified` (Age Gate után true)
- `age_consent` (Age Gate checkbox elfogadása)
- `terms_accepted_at` (Age Gate elfogadási timestamp)
- `user_timezone` (automatikus detektálás, pl. "Europe/Budapest")
- `country_code` (timezone-ból levezetett, pl. "HU")
- `preferred_language` (hu/en, default: "en")
- `welcome_bonus_claimed` (boolean, default: false)
- `daily_gift_last_claimed` (utolsó Daily Gift claim timestamp)
- `daily_gift_last_seen` (utolsó Daily Gift popup megjelenés dátuma, YYYY-MM-DD)
- `daily_gift_streak` (Daily Gift sorozat számláló, nincs automatikus reset)
- `avatar_url` (profil kép URL)
- `first_login_age_gate_completed` (boolean, első login Age Gate completion flag)

#### Speciális mezők (WebAuthn, boosterek, játéklogika):
- `webauthn_credential_id`, `webauthn_public_key`, `webauthn_challenge`, `biometric_enabled`
- `help_third_active`, `help_2x_answer_active`, `help_audience_active` (játék helper flagek)
- `active_speed_expires_at` (speed token lejárat)
- `last_life_regeneration` (élet regeneráció utolsó timestamp)

---

## 1. Database Layer

### 1.1 auth.users (Supabase Auth Schema)

**Mezők:**
- `id` (UUID, PK)
- `email` (TEXT, automatikusan generált: `username@dingleup.auto`)
- `encrypted_password` (TEXT, `PIN + username` hash)
- `email_confirmed_at` (TIMESTAMP, regisztrációkor azonnal confirmed)
- `created_at`, `updated_at`
- `user_metadata` (JSONB, tartalmazza: `{"username": "..."}`)

**Használat:**
- Supabase Auth service által menedzselt tábla
- Regisztrációkor `admin.createUser()` hozza létre az auth user-t
- Login során `signInWithPassword()` validálja a jelszót
- **NINCS KÖZVETLEN RLS POLICY** ezen a táblán (Supabase Auth által védett)

**CURRENT INCONSISTENCY:**
- Legacy userek gmail címekkel létezhetnek az auth.users táblában
- Új userek `@dingleup.auto` címmel jönnek létre
- Login során a backend több jelszó variánst próbál (`pin + username`, `pin + username + !@#`)

---

### 1.2 profiles (public schema)

**Teljes séma (kritikus mezők):**

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL,
  email TEXT, -- opcionális valódi email
  
  -- Recovery & Security
  recovery_code_hash TEXT,
  recovery_code_set_at TIMESTAMP WITH TIME ZONE,
  pin_reset_attempts INT DEFAULT 0,
  pin_reset_last_attempt_at TIMESTAMP WITH TIME ZONE,
  
  -- Onboarding & Age Gate
  birth_date DATE,
  age_verified BOOLEAN DEFAULT FALSE,
  age_consent BOOLEAN DEFAULT FALSE,
  terms_accepted_at TIMESTAMP WITH TIME ZONE,
  first_login_age_gate_completed BOOLEAN DEFAULT FALSE,
  
  -- Location & Language
  user_timezone TEXT, -- pl. "Europe/Budapest"
  country_code TEXT DEFAULT 'HU', -- pl. "HU"
  preferred_country TEXT,
  preferred_language TEXT, -- "hu" vagy "en"
  
  -- Rewards & Economy
  coins INT DEFAULT 0,
  lives INT DEFAULT 15,
  max_lives INT DEFAULT 15,
  lives_regeneration_rate INT DEFAULT 12, -- percben
  last_life_regeneration TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active_speed_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Daily Gifts
  daily_gift_streak INT DEFAULT 0,
  daily_gift_last_claimed TIMESTAMP WITH TIME ZONE,
  daily_gift_last_seen DATE, -- YYYY-MM-DD formátum
  
  -- Welcome Bonus
  welcome_bonus_claimed BOOLEAN DEFAULT FALSE,
  
  -- Invitation System
  invitation_code TEXT UNIQUE, -- 8 karakter: A-Z + 0-9
  invitation_rewards_reset_at TIMESTAMP WITH TIME ZONE,
  last_invitation_reward_reset TIMESTAMP WITH TIME ZONE,
  
  -- Game Helpers
  help_third_active BOOLEAN DEFAULT TRUE,
  help_2x_answer_active BOOLEAN DEFAULT TRUE,
  help_audience_active BOOLEAN DEFAULT TRUE,
  question_swaps_available INT DEFAULT 0,
  
  -- WebAuthn (Biometric Login)
  biometric_enabled BOOLEAN DEFAULT FALSE,
  webauthn_credential_id TEXT,
  webauthn_public_key TEXT,
  webauthn_challenge TEXT,
  challenge_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  avatar_url TEXT,
  device_id TEXT,
  total_correct_answers INT DEFAULT 0,
  last_username_change TIMESTAMP WITH TIME ZONE,
  legal_consent BOOLEAN,
  legal_consent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexek:**
- `idx_profiles_username_lower` on `lower(username)` (case-insensitive username lookup)
- `idx_profiles_lives_regen` on `(lives, last_life_regeneration)` WHERE `lives < max_lives`
- `idx_profiles_speed_expires` on `active_speed_expires_at` WHERE `active_speed_expires_at IS NOT NULL`
- `idx_profiles_invitation_code` on `invitation_code` (unique constraint)

**RLS Policies:**
- **SELECT**: Users can view their own profile (`auth.uid() = id`)
- **UPDATE**: Users can update their own profile (`auth.uid() = id`)
- **INSERT**: Trigger-based (új auth user creation automatikusan hoz létre profile sort)
- **DELETE**: Cascade deletion (auth.users törlésekor automatikusan törlődik)

**Trigger:**
```sql
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**CURRENT INCONSISTENCY:**
- `email` mező nullable, de nincs validáció hogy valódi email formátum-e
- `daily_gift_streak` soha nem reset-elődik (dokumentációban "NINCS IMPLEMENTÁLVA")
- `first_login_age_gate_completed` mező létezik, de nincs használva sehol

---

### 1.3 Egyéb auth-hoz kapcsolódó táblák

#### 1.3.1 invitations

**Célja:** Referral/invitation rendszer nyilvántartása

```sql
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES profiles(id),
  invited_user_id UUID REFERENCES profiles(id),
  invited_email TEXT,
  invitation_code TEXT NOT NULL, -- 8 karakter uppercase
  accepted BOOLEAN DEFAULT FALSE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Használat:**
- Regisztrációkor ha a user megad invitation code-ot, létrejön egy `invitations` rekord
- `accepted = true` és `invited_user_id` kitöltődik
- Az inviter automatikusan jutalom credit-et kap (tier-alapú: 1-2 accepted = 200 coin + 3 life, 3-9 = 1000 coin + 5 life, 10+ = 6000 coin + 20 life)

**RLS:**
- Users can SELECT their own invitations (inviter_id vagy invited_user_id)
- Admins can view all

---

#### 1.3.2 login_attempts_pin

**Célja:** PIN login rate limiting (max 5 sikertelen próbálkozás / óránként)

```sql
CREATE TABLE public.login_attempts_pin (
  username TEXT PRIMARY KEY, -- lowercase normalized
  failed_attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  locked_until TIMESTAMP WITH TIME ZONE
);
```

**Használat:**
- `login-with-username-pin` edge function használja
- 5 sikertelen próbálkozás után 10 perc lockout
- Sikeres login törli a rekordot

**RLS:** Service-role only (nincs user-facing access)

---

#### 1.3.3 welcome_bonus_attempts (NEM LÉTEZIK A JELENLEGI KÓDBAN)

**CURRENT INCONSISTENCY:** A dokumentációban említve van, de nem létezik a migrációkban vagy kódban.

---

## 2. RPC Functions

### 2.1 claim_welcome_bonus()

**Paraméterek:** NINCS (auth.uid()-ból veszi a user ID-t)

**Visszatérési érték:**
```json
{
  "success": true/false,
  "coins": 2500,
  "lives": 50,
  "error": "..." // ha hiba történt
}
```

**Logika:**
1. `auth.uid()` alapján azonosítja a user-t
2. Ellenőrzi `welcome_bonus_claimed` flaget (ha true → hiba)
3. Rate limit check (`check_rate_limit('claim_welcome_bonus', 5, 60)`)
4. Hívja a `credit_wallet()` RPC-t:
   - `p_delta_coins = 2500`
   - `p_delta_lives = 50`
   - `p_source = 'welcome_bonus'`
   - `p_idempotency_key = 'welcome_bonus:' || user_id`
5. Sikeresen credit után: `welcome_bonus_claimed = true` frissítés
6. Visszatér sikeres eredménnyel

**Idempotencia:**
- `wallet_ledger.idempotency_key` védi a dupla jóváírást
- `welcome_bonus_claimed` flag védi a többszöri claim-et

**CURRENT RISK:**
- Frontend "Later" gomb közvetlenül frissíti `welcome_bonus_claimed = true`-ra anélkül, hogy a jutalom kreditálódna
- Ez várható működés (user elutasíthatja a bónuszt), de nincs audit trail

---

### 2.2 claim_daily_gift()

**Paraméterek:** NINCS (auth.uid()-ból veszi a user ID-t)

**Visszatérési érték:**
```json
{
  "success": true/false,
  "grantedCoins": 50-500,
  "walletBalance": 1234,
  "streak": 5,
  "error": "NOT_LOGGED_IN" | "PROFILE_NOT_FOUND" | "ALREADY_CLAIMED_TODAY" | "SERVER_ERROR"
}
```

**Logika:**
1. `auth.uid()` validálás
2. `profiles` fetch: `user_timezone`, `daily_gift_last_claimed`, `daily_gift_last_seen`, `daily_gift_streak`
3. Timezone-aware "today" számítás: `TO_CHAR(NOW() AT TIME ZONE user_timezone, 'YYYY-MM-DD')`
4. Ellenőrzi hogy már claimelte-e ma: ha `daily_gift_last_seen = today` → `ALREADY_CLAIMED_TODAY`
5. Idempotencia check: `wallet_ledger.idempotency_key = 'daily-gift:' || user_id || ':' || today`
6. Reward számítás (streak % 7 alapján):
   - Cycle position 0: 50 coin
   - Cycle position 1: 75 coin
   - Cycle position 2: 110 coin
   - Cycle position 3: 160 coin
   - Cycle position 4: 220 coin
   - Cycle position 5: 300 coin
   - Cycle position 6: 500 coin
7. Increase `daily_gift_streak` (NINCS RESET LOGIKA)
8. Wallet credit via `wallet_ledger` INSERT
9. Update `daily_gift_last_claimed = NOW()` és `daily_gift_last_seen = today`
10. Visszatér eredménnyel

**Idempotencia:**
- `wallet_ledger.idempotency_key` védi a dupla credit-et
- `daily_gift_last_seen` mező védi a többszöri napi claim-et

**CURRENT INCONSISTENCY:**
- **NINCS STREAK RESET:** Ha a user kihagy egy napot, a streak nem nullázódik vissza
- Dokumentációban "NINCS IMPLEMENTÁLVA" jelöléssel szerepel
- `daily_gift_last_seen` csak megjelenést track-eli, nem automatikus reset alapját

---

### 2.3 use_life()

**Paraméterek:** NINCS (auth.uid()-ból veszi a user ID-t)

**Visszatérési érték:** BOOLEAN (true = sikeres, false = nincs elég élet)

**Logika:**
1. `SELECT FOR UPDATE` profile row (lives, max_lives, lives_regeneration_rate, last_life_regeneration, active_speed_expires_at)
2. Future timestamp guard: ha `last_life_regeneration > NOW()` → normalize to NOW()
3. Speed boost check: ha `active_speed_expires_at > NOW()` → regen rate = 6 perc (2x gyorsabb)
4. Inline regeneráció:
   - `minutes_passed = EXTRACT(EPOCH FROM (NOW() - last_life_regeneration)) / 60`
   - `lives_to_add = FLOOR(minutes_passed / regen_rate)`
   - Ha `lives_to_add > 0`: frissíti `lives` és `last_life_regeneration`
5. Ha regeneráció után `lives < 1` → `RETURN false` (nincs elég élet)
6. Egyébként: lives - 1, INSERT into `wallet_ledger` (source='game_start', delta_lives=-1)
7. `RETURN true`

**Idempotencia:** NINCS (minden hívás mindig 1 élet levonás)

**CURRENT RISK:**
- Nincs explicit idempotency key, így elméletileg dupla levonás lehetséges konkurrens hívások esetén
- `SELECT FOR UPDATE` védi a race condition-t egy user-en belül

---

### 2.4 regenerate_lives_background()

**Célja:** Cronjob által futtatott háttér élet regeneráció (minden user-re)

**Paraméterek:** NINCS

**Visszatérési érték:** VOID

**Logika:**
1. Loop minden user-en akinek `lives < max_lives`
2. Ugyanaz a regeneráció logika mint `use_life()`:
   - Future timestamp guard
   - Speed boost check (denormalized `active_speed_expires_at` column-ból)
   - Regeneráció számítás
   - UPDATE lives és last_life_regeneration
3. NINCS ledger INSERT (csak background sync)

**CURRENT RISK:**
- Konkurens futás `use_life()`-fal UPDATE contention-t okozhat nagy user számnál
- Dokumentációban "FUTURE OPTIMIZATION" jelöléssel szerepel a csak-cron-only stratégia

---

### 2.5 EGYÉB RPC (nem auth-specifikusak, de profile-t érintenek)

- `credit_wallet()`: Wallet credit (coins/lives) - lásd REWARD_ECONOMY dokumentáció
- `credit_lives()`: Lives credit (redundant, de még létezik) - lásd REWARD_ECONOMY dokumentáció
- `generate_invitation_code()`: Új invitation code generálás user számára
- `regenerate_invitation_code()`: Meglévő invitation code újragenerálása

---

## 3. Edge Functions

### 3.1 register-with-username-pin

**Input:**
```json
{
  "username": "JohnDoe",
  "pin": "123456",
  "invitationCode": "ABC12345" // opcionális
}
```

**Output:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "JohnDoe"
  },
  "recovery_code": "ABCD-1234-WXYZ" // CRITICAL: User-nek el kell mentenie!
}
```

**Logika:**
1. Validálás:
   - Username: 3-30 karakter, alfanumerikus + magyar ékezetek + alulvonás, NO SPACES
   - PIN: pontosan 6 számjegy
   - PIN biztonsági szabályok:
     - NEM kezdődhet 19-cel vagy 20-szal
     - NEM tartalmazhat 3 azonos számot egymás után
     - NEM lehet növekvő/csökkenő sorozat (123, 321 stb.)
2. Username uniqueness check (case-insensitive): `profiles.username ILIKE username`
3. Invitation code validálás (ha megadott): `profiles.invitation_code = invitationCode`
4. PIN hash generálás: `SHA-256(pin)`
5. Recovery code generálás: `XXXX-XXXX-XXXX` formátum (A-Z + 0-9), majd hash: `SHA-256(recovery_code)`
6. Auth user creation:
   ```javascript
   supabaseAdmin.auth.admin.createUser({
     email: `${username.toLowerCase()}@dingleup.auto`,
     password: pin + username,
     email_confirm: true, // IMMEDIATELY CONFIRMED
     user_metadata: { username }
   });
   ```
7. Profile upsert:
   ```javascript
   profiles.upsert({
     id: authUser.id,
     username,
     pin_hash: pinHash,
     email: null,
     recovery_code_hash: recoveryCodeHash,
     recovery_code_set_at: NOW()
   });
   ```
8. Ha invitation code valid:
   - Invitation record INSERT (`invitations` table)
   - Inviter reward credit (tier-based: `credit_wallet()` hívás)
9. Return success + **recovery_code** (plaintext, CSAK EGYSZER látható!)

**CURRENT RISK:**
- Recovery code plaintext-ben megy a response-ban (HTTPS-en keresztül, de nincs extra encryption)
- Frontend KÖTELEZŐ megjeleníteni a user-nek és figyelmeztetni hogy mentse el

**CURRENT INCONSISTENCY:**
- Profile creation és auth user creation között nincs tranzakció (ha profile fail → auth user létrejön de nem használható)
- Rollback: auth user törlődik ha profile creation fail

---

### 3.2 login-with-username-pin

**Input:**
```json
{
  "username": "JohnDoe",
  "pin": "123456"
}
```

**Output:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "JohnDoe",
    "email": "johndoe@dingleup.auto"
  },
  "passwordVariants": [
    "123456JohnDoe",
    "123456JohnDoe!@#"
  ]
}
```

**Logika:**
1. Rate limiting check (`login_attempts_pin` table): max 5 failed attempts / hour
2. Username lookup (case-insensitive): `profiles WHERE username ILIKE username`
3. PIN hash validation: `SHA-256(pin) === profile.pin_hash`
4. Ha sikertelen → `recordFailedAttempt()` (increment failed_attempts, lockout after 5)
5. Ha sikeres:
   - Auth password sync: `admin.updateUserById(userId, { password: pin + username })`
   - Actual auth email fetch: `auth.admin.getUserById(userId).email`
   - Clear failed attempts: `DELETE FROM login_attempts_pin WHERE username = ...`
6. Return password variants (frontend ezekkel próbál `signInWithPassword()`-ot)

**CURRENT INCONSISTENCY:**
- Password sync minden login-kor frissíti az auth.users jelszót (lehet overhead nagy user számnál)
- Multiple password variants (migration compatibility miatt): legacy userek más jelszó formátummal rendelkezhetnek

**CURRENT RISK:**
- Rate limiting csak testuser-ekkel szemben van kikapcsolva (`username.startsWith('testuser')`)
- Nincs CAPTCHA vagy egyéb bot védelem

---

### 3.3 submit-dob (Age Gate)

**Input:**
```json
{
  "date_of_birth": "1990-05-15", // YYYY-MM-DD
  "age_consent": true
}
```

**Output:**
```json
{
  "success": true,
  "age": 34,
  "profile": { ... }
}
// vagy
{
  "success": false,
  "error": "UNDERAGE",
  "age": 15
}
```

**Logika:**
1. Auth check: `supabase.auth.getUser()` (Authorization header-ből)
2. Input validálás: date formátum, age_consent boolean
3. Age számítás:
   ```javascript
   let age = today.getFullYear() - dob.getFullYear();
   const monthDiff = today.getMonth() - dob.getMonth();
   if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
     age--;
   }
   ```
4. Ha `age < 16` → HTTP 403 + error: "UNDERAGE"
5. Profile update:
   ```sql
   UPDATE profiles SET
     birth_date = date_of_birth,
     age_verified = true,
     age_consent = age_consent,
     terms_accepted_at = NOW()
   WHERE id = user.id
   ```
6. Return success + age

**CURRENT INCONSISTENCY:**
- Frontend Age Gate modal külön `first_login_age_gate_completed` flaget is használ, de backend nem tölti ki
- `terms_accepted_at` timestamp itt kerül kitöltésre, de nincs explicit terms acceptance UI (csak checkbox)

---

### 3.4 forgot-pin (PIN Recovery)

**Input:**
```json
{
  "username": "JohnDoe",
  "recovery_code": "ABCD-1234-WXYZ",
  "new_pin": "654321",
  "new_pin_confirm": "654321"
}
```

**Output:**
```json
{
  "success": true,
  "message": "A PIN kódod sikeresen frissült.",
  "new_recovery_code": "WXYZ-9876-ABCD" // ÚJ recovery code!
}
```

**Logika:**
1. Validálás: minden mező kötelező, new_pin === new_pin_confirm, PIN formátum (6 digit)
2. Username lookup (case-insensitive): `profiles WHERE username ILIKE username`
3. Rate limiting: `pin_reset_attempts` (max 5 / hour per user)
4. Recovery code hash validálás: `SHA-256(recovery_code) === recovery_code_hash`
5. Ha sikertelen → increment `pin_reset_attempts` + `pin_reset_last_attempt_at`
6. Ha sikeres:
   - New PIN hash: `SHA-256(new_pin)`
   - New recovery code generálás + hash
   - Profile update:
     ```sql
     UPDATE profiles SET
       pin_hash = newPinHash,
       recovery_code_hash = newRecoveryCodeHash,
       recovery_code_set_at = NOW(),
       pin_reset_attempts = 0,
       pin_reset_last_attempt_at = NULL
     WHERE id = user.id
     ```
   - Auth password sync: `admin.updateUserById(userId, { password: new_pin + username })`
7. Return new recovery code (PLAINTEXT, user-nek el kell mentenie!)

**CURRENT RISK:**
- Recovery code plaintext-ben megy a response-ban
- Nincs email notification (user nem tud róla ha valaki más reset-eli a PIN-jét)

---

### 3.5 get-daily-gift-status

**Input:** NINCS (Authorization header-ből auth user)

**Output:**
```json
{
  "canShow": true/false,
  "localDate": "2025-12-01",
  "timeZone": "Europe/Budapest",
  "streak": 5,
  "nextReward": 220
}
```

**Logika:**
1. Auth check: `supabase.auth.getUser()`
2. Profile fetch: `user_timezone`, `daily_gift_last_seen`, `daily_gift_streak`, `username`
3. Admin user check: ha username = "DingleUP" vagy "DingelUP!" → `canShow = false` (admin soha nem lát Daily Gift-et)
4. Timezone-aware today számítás:
   ```javascript
   const localDateString = nowUtc.toLocaleDateString('en-CA', {
     timeZone: userTimezone,
     year: 'numeric',
     month: '2-digit',
     day: '2-digit',
   }); // "2025-12-01"
   ```
5. `canShow = (lastSeenDate !== localDateString)` (ha már látta ma → false)
6. Reward számítás: `streak % 7` alapján cycle position → coins (50, 75, 110, 160, 220, 300, 500)
7. Return status

**CURRENT INCONSISTENCY:**
- Admin username hardcoded ("DingleUP", "DingelUP!")
- Nincs role-based check, csak username string compare

---

### 3.6 dismiss-daily-gift

**Input:** NINCS (Authorization header-ből auth user)

**Output:**
```json
{
  "success": true,
  "localDate": "2025-12-01"
}
```

**Logika:**
1. Auth check
2. Profile fetch: `user_timezone`
3. Timezone-aware today számítás
4. Update: `daily_gift_last_seen = localDateString` (YYYY-MM-DD formátum)
5. Return success

**Idempotencia:** Nincs (minden hívás frissíti a last_seen mezőt, de ez OK mert csak timestamp)

---

### 3.7 EGYÉB EDGE FUNCTIONS (nem auth-specifikusak, de profile-t érintenek)

- `get-wallet`: Wallet fetch (lives regenerációval) - lásd REWARD_ECONOMY dokumentáció
- `update-pin`: PIN módosítás (jelenlegi PIN + új PIN validáció)
- `update-password`: Jelszó módosítás (régi jelszó + új jelszó validáció)

---

## 4. Onboarding Flow

### 4.1 Registration Flow (Jelenlegi valós működés)

**Frontend:** `RegisterNew.tsx`

**Lépések:**
1. User megadja:
   - Username (3-30 karakter, validáció frontend-en)
   - PIN (6 számjegy, biztonsági szabályok validálása frontend-en)
   - PIN confirm (egyezés ellenőrzés)
   - Invitation code (OPCIONÁLIS, 8 karakter uppercase)
2. Frontend hívja `register-with-username-pin` edge function-t
3. Backend:
   - Username uniqueness check
   - PIN hash + recovery code generálás
   - Auth user creation (`email_confirm: true` → AZONNAL MEGERŐSÍTETT)
   - Profile creation
   - Invitation processing (ha megadott)
4. Auto-login:
   ```javascript
   supabase.auth.signInWithPassword({
     email: `${username.toLowerCase()}@dingleup.auto`,
     password: pin + username
   });
   ```
5. Sikeres login után: navigáció `/dashboard`-ra
6. **CRITICAL:** Recovery code megjelenítése user-nek toast message-ben (CSAK EGYSZER!)

**CURRENT INCONSISTENCY:**
- Recovery code toast duration = 2000ms (rövid, user könnyen lemaradhat róla)
- NINCS kötelező "Elmentettem a recovery code-ot" checkbox

---

### 4.2 First Login Flow

**Frontend:** `Dashboard.tsx` + `AgeGateModal.tsx`

**Lépések:**
1. User bejelentkezik → `/dashboard` navigáció
2. Dashboard componentDidMount:
   - Profile fetch (`useProfileQuery`)
   - Wallet fetch (`useWalletQuery`)
   - Timezone detection (`useTimezoneDetection`)
3. **Age Gate Check:**
   - Ha `!profile.age_verified || !profile.birth_date` → Age Gate modal megjelenik
   - Modal blokkolja az összes többi popup-ot (ABSOLUTE PRIORITY)
4. Age Gate submission:
   - Birth date kiválasztása (3 dropdown: year, month, day)
   - Consent checkbox: "Megerősítem..."
   - Submit → `submit-dob` edge function
   - Ha `age < 16` → error toast + logout + redirect `/auth/login`
   - Ha `age >= 16` → success + modal close
5. **Popup szekvencia (Age Gate után):**
   1. Welcome Bonus (ha `!welcome_bonus_claimed`)
   2. Daily Gift (ha nem látta ma + Welcome Bonus zárva)
   3. Daily Winners (ha Daily Gift zárva)

**CURRENT INCONSISTENCY:**
- `first_login_age_gate_completed` mező nincs használva (létezik a sémában, de nincs értéke)
- Age Gate modal újramegjelenik minden login-kor amíg nincs kitöltve (nincs "skip" opció)

---

### 4.3 Username Setup Flow (NEM LÉTEZIK A JELENLEGI KÓDBAN)

**CURRENT INCONSISTENCY:** Username regisztrációkor kötelező, nincs külön setup flow

---

### 4.4 Birth Date Requirement Flow

**Lásd: 4.2 First Login Flow → Age Gate**

---

### 4.5 Welcome Bonus Trigger Logic

**Hook:** `useWelcomeBonus.ts`

**Feltétel:**
- `!profile.welcome_bonus_claimed`
- User authenticated
- Age Gate completed

**Megjelenés:**
- Dashboard load után, Age Gate után első popup
- Blocking: Daily Gift nem jelenhet meg amíg Welcome Bonus nincs claim-elve vagy dismiss-elve

**Claim:**
- Gomb kattintás → `claim_welcome_bonus()` RPC hívás
- Sikeres claim: `+2500 coins, +50 lives`
- Toast megjelenítés
- Modal bezáródik

**Later (dismiss):**
- Gomb kattintás → Direct profile UPDATE: `welcome_bonus_claimed = true` (NINCS RPC HÍVÁS)
- Modal bezáródik
- **CURRENT RISK:** Nincs audit trail hogy user dismiss-elte vs. claim-elte

---

### 4.6 Daily Gift First Appearance Logic

**Hook:** `useDailyGift.ts`

**Feltétel:**
- `canShow` (backend `get-daily-gift-status` edge function dönt)
- Admin user-ek (`DingleUP`, `DingelUP!`) SOHA NEM látják

**Megjelenés:**
- Welcome Bonus után (ha Welcome Bonus completed)
- Timezone-aware: ha user ma még nem látta (`daily_gift_last_seen !== today`)

**Claim:**
- Gomb kattintás → `claim_daily_gift()` RPC hívás
- Sikeres claim: coins (50-500 cycle alapján)
- Toast megjelenítés
- Modal bezáródik

**Later (dismiss):**
- Gomb kattintás → `dismiss-daily-gift` edge function hívás
- UPDATE: `daily_gift_last_seen = today`
- Modal bezáródik

---

### 4.7 Required Fields Summary

**Regisztrációkor kötelező:**
- Username
- PIN

**Első login után kötelező (Age Gate):**
- Birth date (YYYY-MM-DD)
- Age consent checkbox

**Opcionális:**
- Email (valódi email cím)
- Avatar URL
- Invitation code (regisztrációkor)

---

### 4.8 Country Code Determination

**Automatikus timezone-based detection:**

**Hook:** `useTimezoneDetection.ts`

**Logika:**
1. Browser API: `Intl.DateTimeFormat().resolvedOptions().timeZone` (pl. "Europe/Budapest")
2. Timezone → Country mapping: `getCountryFromTimezone()` helper function (lásd `src/lib/utils.ts`)
3. Profile UPDATE:
   ```javascript
   profiles.update({
     user_timezone: detectedTimezone,
     country_code: derivedCountry,
     preferred_country: derivedCountry
   });
   ```

**Futási idő:** App init után, authenticated user esetén (egyszer)

**CURRENT INCONSISTENCY:**
- Timezone mapping nem 100%-os pontosságú (egy timezone több ország is lehet)
- User NEM TUDJA manually módosítani a country_code-ot (automatikus only)

---

### 4.9 Timezone Determination

**Lásd: 4.8 Country Code Determination**

**Fallback:** Ha timezone detection fail → default "UTC"

---

## 5. Login Flow

### 5.1 Login működése

**Frontend:** `LoginNew.tsx`

**Lépések:**
1. User megadja: username + PIN (6 digit)
2. Frontend hívja `login-with-username-pin` edge function-t
3. Backend:
   - Rate limiting check (max 5 failed / hour)
   - Username lookup (case-insensitive)
   - PIN hash validálás
   - Auth password sync (frissíti auth.users password-ját)
   - Return password variants
4. Frontend próbálja password variant-eket:
   ```javascript
   for (const password of passwordVariants) {
     await supabase.auth.signInWithPassword({
       email: userEmail,
       password
     });
   }
   ```
5. Sikeres login → navigáció `/dashboard`-ra

---

### 5.2 PIN/Password Check

**Backend:** `login-with-username-pin` edge function

**Validálás:**
1. PIN formátum: pontosan 6 számjegy
2. PIN hash compare: `SHA-256(pin) === profile.pin_hash`
3. Ha nem egyezik → `recordFailedAttempt()` → HTTP 401

---

### 5.3 Session Creation

**Supabase Auth által menedzselt:**
- `supabase.auth.signInWithPassword()` hívás létrehozza a session-t
- Session tárolása: localStorage (browser default)
- Token auto-refresh: Supabase client automatic

**CURRENT INCONSISTENCY:**
- Nincs explicit session expiration (Supabase default: 1 óra access token, 7 nap refresh token)
- Frontend useAutoLogout hook (15 perc inaktivitás után warning)

---

### 5.4 Error Cases

**Rate limiting exceeded:**
- HTTP 429: "Too many failed attempts. Try again in X minutes."
- Lockout: 10 perc

**Invalid credentials:**
- HTTP 401: "Incorrect username or PIN"
- NINCS különbség username vs. PIN hiba között (biztonsági okokból)

**Server error:**
- HTTP 500: "Unexpected error occurred"

---

### 5.5 Rate Limiting / Lockout Behavior

**login_attempts_pin table:**
- Key: `username` (lowercase normalized)
- Increment: minden sikertelen PIN validálás
- Threshold: 5 failed attempts
- Lockout duration: 10 perc (`locked_until` timestamp)
- Reset: sikeres login törli a rekordot, vagy 1 óra után automatikusan reset

**CURRENT RISK:**
- Username-based rate limiting (nem IP-based) → könnyen bypassolható több username-mel
- Test user-ek (`testuser*`) kikapcsolt rate limittel (load testing miatt)

---

### 5.6 Missing Validations

**CURRENT RISK:**
- NINCS CAPTCHA vagy bot protection
- NINCS IP-based rate limiting
- NINCS device fingerprinting
- NINCS 2FA (két-faktoros autentikáció)
- WebAuthn (biometric) létezik a sémában, de nincs használva

---

## 6. Timezone & Country Handling

### 6.1 Timezone tárolása

**Mező:** `profiles.user_timezone` (TEXT, pl. "Europe/Budapest")

**Forrás:** Browser API → `Intl.DateTimeFormat().resolvedOptions().timeZone`

**Frissítés:** App init után automatikusan (`useTimezoneDetection` hook)

---

### 6.2 Timezone olvasása

**Használat:**
- Daily Gift timezone-aware dátum számításhoz
- Daily Rankings midnight számításhoz
- Lootbox drop timing-hoz

**Fallback:** Ha nincs beállítva → "UTC" default

---

### 6.3 Timezone frissítése

**Automatikus:** Minden app load után ellenőrzi és frissíti ha változott (pl. user utazás közben)

**CURRENT INCONSISTENCY:**
- User NEM TUDJA manually override-olni (automatikus only)
- Nincs timezone change notification (silent update)

---

### 6.4 Country Code tárolása

**Mező:** `profiles.country_code` (TEXT, 2-letter ISO code, pl. "HU")

**Forrás:** Timezone → Country mapping (`getCountryFromTimezone()` helper)

**Frissítés:** Timezone-zal együtt automatikusan

---

### 6.5 Country Code inferálása

**Mapping logika:** `src/lib/utils.ts` → `getCountryFromTimezone()`

**Példa:**
- "Europe/Budapest" → "HU"
- "America/New_York" → "US"
- "Asia/Tokyo" → "JP"

**CURRENT INCONSISTENCY:**
- Mapping nem teljes (néhány timezone nincs lefedve)
- Multi-country timezone-ok (pl. "America/Phoenix") → first match wins

---

### 6.6 Fallback logika

**Timezone fallback:** "UTC"
**Country fallback:** "HU" (Hungary default)

---

## 7. Welcome Bonus Logic

### 7.1 Popup megjelenése

**Feltétel:**
- `!profile.welcome_bonus_claimed`
- Age Gate completed
- User authenticated

**Pozíció a popup szekvenciában:** 1. (Age Gate után)

---

### 7.2 Eligibility mező

**Mező:** `profiles.welcome_bonus_claimed` (BOOLEAN)

**Initial value:** `false` (regisztrációkor)

---

### 7.3 Bonus megadása

**RPC:** `claim_welcome_bonus()`

**Jutalom:** +2500 coins, +50 lives

**Idempotency key:** `'welcome_bonus:' + user_id`

**Ledger entry:**
- `wallet_ledger.source = 'welcome_bonus'`
- `wallet_ledger.delta_coins = 2500`
- `wallet_ledger.delta_lives = 50`

---

### 7.4 Idempotency keys

**Wallet ledger:** `wallet_ledger.idempotency_key = 'welcome_bonus:' + user_id`

**Profile flag:** `welcome_bonus_claimed = true` (csak egyszer lehet claim-elni)

---

### 7.5 "Later" gomb működése

**Frontend:** `useWelcomeBonus.ts` → `handleLater()`

**Működés:**
```javascript
await supabase
  .from('profiles')
  .update({ welcome_bonus_claimed: true })
  .eq('id', userId);
```

**CURRENT INCONSISTENCY:**
- Direct profile UPDATE (nincs RPC hívás)
- Nincs audit trail hogy user dismiss-elte vs. claim-elte
- Nincs ledger entry (csak profile flag)
- User VÉGLEG elveszti a bónuszt (nem jön vissza később)

---

### 7.6 Inkonzisztencia a Reward dokumentációval

**NINCS INKONZISZTENCIA:** Welcome Bonus logika megegyezik a REWARD_ECONOMY dokumentációval

---

## 8. Daily Gift Logic (Onboarding Aspect)

### 8.1 Popup első megjelenése

**Feltétel:**
- Welcome Bonus completed (claim vagy dismiss)
- `canShow = true` (backend `get-daily-gift-status` dönt)
- Admin user-ek KIVÉTELEK

**Első megjelenés:** Első bejelentkezés után, Welcome Bonus után

---

### 8.2 daily_gift_last_seen működése

**Mező:** `profiles.daily_gift_last_seen` (DATE, YYYY-MM-DD formátum)

**Frissítés:**
- Claim után: `claim_daily_gift()` RPC frissíti
- Dismiss után: `dismiss-daily-gift` edge function frissíti

**Logika:**
- Backend `get-daily-gift-status` összehasonlítja `last_seen` vs. `today` (timezone-aware)
- Ha egyeznek → `canShow = false` (már látta ma)

---

### 8.3 Első nap kezelése

**Nincs speciális logika:** Első nap ugyanúgy működik mint bármelyik más nap

**Reward:** `streak % 7` alapján (első nap: position 0 → 50 coin)

---

### 8.4 Timezone használat

**Timezone-aware dátum számítás:**
```javascript
const localDateString = nowUtc.toLocaleDateString('en-CA', {
  timeZone: userTimezone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}); // "2025-12-01"
```

**Fallback:** Ha `user_timezone` nincs beállítva → "UTC"

---

### 8.5 Inkonzisztencia a Reward/Streak logikával

**CURRENT INCONSISTENCY:**
- **NINCS STREAK RESET:** `daily_gift_streak` soha nem nullázódik vissza (még ha user kihagy napokat)
- Dokumentációban "NINCS IMPLEMENTÁLVA" jelöléssel szerepel
- Backend `claim_daily_gift()` RPC csak increment-eli, nincs reset logika
- `dismiss-daily-gift` TODO komment említi, de nincs implementálva

---

## 9. Security Model

### 9.1 RLS (Row Level Security)

**auth.users:** Supabase Auth által védett (nincs közvetlen RLS policy)

**profiles:**
- SELECT: `auth.uid() = id`
- UPDATE: `auth.uid() = id`
- INSERT: Trigger-based (auth user creation → profile creation)
- DELETE: CASCADE (auth.users törléskor automatikusan törlődik)

**invitations:**
- SELECT: `auth.uid() = inviter_id OR auth.uid() = invited_user_id`
- INSERT: User can create invitations
- Admins: Full access

**login_attempts_pin:** Service-role ONLY (nincs user-facing access)

---

### 9.2 Access Control

**Authenticated users:**
- Saját profile READ/UPDATE
- Saját wallet READ
- RPC hívások (claim_welcome_bonus, claim_daily_gift, use_life stb.)

**Unauthenticated users:**
- Public pages: Landing, ÁSZF, Adatkezelés, Install
- Login/Register pages
- **NINCS** game access, dashboard access

**Admin users:**
- Role-based check: `user_roles.role = 'admin'`
- Admin pages: `/admin/*`
- Admin RPC-k: `has_role(auth.uid(), 'admin')`

**CURRENT INCONSISTENCY:**
- Daily Gift admin check username-based (`DingleUP`, `DingelUP!`) NEM role-based

---

### 9.3 SECURITY DEFINER RPC-k

**Összes RPC SECURITY DEFINER:**
- `claim_welcome_bonus()`
- `claim_daily_gift()`
- `use_life()`
- `regenerate_lives_background()`
- `credit_wallet()`
- `credit_lives()`

**search_path = public:** Minden RPC explicit beállítja (SQL injection védelem)

---

### 9.4 Unauthenticated vs. Authenticated műveletek

**Unauthenticated:**
- Register (`register-with-username-pin` edge function)
- Login (`login-with-username-pin` edge function)
- Forgot PIN (`forgot-pin` edge function)
- Public page view (/, /aszf, /adatkezeles, /install)

**Authenticated:**
- Dashboard access
- Game access
- Profile update
- Wallet operations
- RPC hívások (claim bonuses stb.)

---

### 9.5 Privilege Escalation lehetőségek

**CURRENT RISK:**
- Welcome Bonus "Later" gomb direct profile UPDATE-et csinál (RLS védi, de nincs audit trail)
- PIN reset során nincs email notification (user nem tud róla ha más reset-eli a PIN-jét)
- Rate limiting bypass test user-ekkel (`testuser*` prefix)
- Invitation reward calculation frontend-ről is hívható (de backend validálja)

**NINCS KRITIKUS SÉRÜLÉKENYSÉG:** RLS policies védik az adatokat

---

## 10. Frontend Integration

### 10.1 useWallet (profile part)

**Hook:** `src/hooks/useWallet.ts`

**Használat:** Wallet state (coins, lives, nextLifeAt stb.) fetch

**Profile kapcsolat:**
- Wallet fetch indirekt profile read (`get-wallet` edge function → profile lives/coins/regen rate)
- Speed boost check: `active_speed_expires_at` mező

**CURRENT INCONSISTENCY:** Nincs

---

### 10.2 useDailyGift (profile part)

**Hook:** `src/hooks/useDailyGift.ts`

**Használat:** Daily Gift popup state management

**Profile kapcsolat:**
- `get-daily-gift-status` edge function → `user_timezone`, `daily_gift_last_seen`, `daily_gift_streak`
- Claim: `claim_daily_gift()` RPC → frissíti `daily_gift_last_claimed`, `daily_gift_last_seen`, `daily_gift_streak`

**CURRENT INCONSISTENCY:** Nincs

---

### 10.3 useWelcomeBonus

**Hook:** `src/hooks/useWelcomeBonus.ts`

**Használat:** Welcome Bonus popup state management

**Profile kapcsolat:**
- Profile read: `welcome_bonus_claimed` flag
- Claim: `claim_welcome_bonus()` RPC → frissíti `welcome_bonus_claimed = true`
- Later: Direct profile UPDATE → `welcome_bonus_claimed = true`

**CURRENT INCONSISTENCY:**
- Later action nincs audit trail-ben (lásd 7.5)

---

### 10.4 useUserProfile (NEM LÉTEZIK KÜLÖN HOOK)

**Használat:** `useProfileQuery` hook (több helyen használva)

**Profile kapcsolat:** Direct profile fetch `profiles` table-ből

**CURRENT INCONSISTENCY:** Nincs

---

### 10.5 Dashboard Loader Behavior

**Component:** `src/pages/Dashboard.tsx`

**Loading szekvencia:**
1. **PHASE 1:** Profile + Wallet fetch (kritikus adatok)
2. Loading screen megjelenítése amíg profile/wallet nincs kész
3. **PHASE 2:** Secondary hooks enable (lootbox, tutorial, stb.)
4. Popup szekvencia:
   - Age Gate (ha nincs age_verified)
   - Welcome Bonus (ha nincs welcome_bonus_claimed)
   - Daily Gift (ha nincs daily_gift_last_seen ma)
   - Daily Winners (ha van pending rank reward)

**CURRENT INCONSISTENCY:**
- Age Gate absolute priority, de nincs explicit blocking (csak UI-ban van)

---

### 10.6 "New user" kritérium

**Jelenleg nincs explicit "new user" flag**

**Implicit new user detektálás:**
- `!welcome_bonus_claimed` → valószínűleg új user
- `!age_verified` → biztosan új user (első login Age Gate-et még nem töltötte ki)

**CURRENT INCONSISTENCY:**
- Nincs unified "new user" state (több feltétel kombinációja)

---

## 11. Known Issues (Do NOT Fix, Only Document)

### 11.1 Inkonzisztenciák

1. **Daily Gift Streak Reset NINCS IMPLEMENTÁLVA**
   - `daily_gift_streak` soha nem nullázódik vissza
   - Dokumentációban "NINCS IMPLEMENTÁLVA" jelöléssel szerepel
   - Backend TODO komment van (`dismiss-daily-gift` edge function)

2. **Welcome Bonus "Later" nincs audit trail**
   - Direct profile UPDATE (nincs RPC hívás)
   - Nincs ledger entry
   - Nincs különbség dismiss vs. claim között az audit log-ban

3. **Recovery Code rövid megjelenítési idő**
   - Toast duration = 2000ms
   - User könnyen lemaradhat róla
   - NINCS "Elmentettem" kötelező checkbox

4. **Admin user check username-based, nem role-based**
   - Daily Gift status hardcoded username check (`DingleUP`, `DingelUP!`)
   - Nem használja a `user_roles` táblát

5. **first_login_age_gate_completed mező unused**
   - Létezik a sémában, de nincs sehol használva
   - Frontend külön state-ben track-eli

6. **Multiple password variants (migration compat)**
   - Login során több jelszó formátumot próbál
   - `pin + username`, `pin + username + !@#`

7. **Email mező nincs validálva**
   - `profiles.email` nullable és nincs formátum validáció
   - Lehet bármilyen string

8. **Country code mapping incomplete**
   - Timezone → Country mapping nem 100% pontos
   - Multi-country timezone-ok → first match wins

### 11.2 Race Conditions

1. **use_life() idempotency**
   - Nincs explicit idempotency key
   - `SELECT FOR UPDATE` védi egy user-en belül, de konkurens hívások esetén elméletileg dupla levonás lehetséges

2. **regenerate_lives_background() + use_life() contention**
   - Két függvény egyidejűleg UPDATE-elhet ugyanazon profile row-t
   - Nagy user számnál UPDATE contention risk

3. **Profile + Auth user creation nincs tranzakció**
   - `register-with-username-pin` során ha profile creation fail → auth user létrejön de nem használható
   - Rollback van, de nincs atomic transaction

### 11.3 Missing Validations

1. **NINCS CAPTCHA vagy bot protection**
   - Login, register, forgot-pin stb. nincs védve

2. **NINCS IP-based rate limiting**
   - Csak username-based rate limiting van
   - Könnyen bypassolható több username-mel

3. **NINCS device fingerprinting**
   - User ugyanarról az eszközről többször rate limit-et tud kerülni

4. **NINCS 2FA (két-faktoros autentikáció)**
   - WebAuthn séma létezik, de nincs használva

5. **PIN reset email notification NINCS**
   - User nem tud róla ha valaki más reset-eli a PIN-jét

### 11.4 TODOs a kódban

**dismiss-daily-gift edge function:**
```javascript
// TODO FUTURE FEATURE (NOT IMPLEMENTED YET):
// - Daily Gift streak reset behavior: Currently streak increases indefinitely
//   without any reset mechanism. Documentation marks this as "NINCS IMPLEMENTÁLVA"
// - Future implementation should reset streak to 0 if user misses a day
// - Requires comparing daily_gift_last_seen with today's date and resetting if gap > 1 day
// - Risk: must handle timezone edge cases carefully to avoid accidental resets
```

**get-wallet edge function:**
```javascript
// TODO FUTURE OPTIMIZATION (NOT IMPLEMENTED YET):
// - High concurrency issue: inline regeneration causes UPDATE contention at scale (10k+ concurrent users)
// - Consider moving to cron-only regeneration strategy (regenerate-lives-background only)
// - If cron-only: get-wallet becomes read-only, nextLifeAt computed from profile data without UPDATE
// - Trade-off: eliminates contention but introduces slight staleness (~1min cron interval)
// - Current hybrid model (inline + background cron) works well for current scale but may need revision
```

### 11.5 Kód vs. Valós működés eltérései

**Nincs jelentős eltérés:** A dokumentált működés megegyezik a kóddal

---

## 12. Summary

### 12.1 Jelenlegi rendszer állapota (10 sor)

A DingleUP! auth rendszer **username + PIN alapú** autentikációt használ, Supabase Auth backend-del. Regisztrációkor automatikusan generált `@dingleup.auto` email címmel és `PIN + username` jelszóval jön létre az auth user. A profile adatok tárolása `profiles` táblában történik, RLS policy-kkal védve. Onboarding flow: regisztráció → első login → Age Gate (16+ ellenőrzés) → Welcome Bonus → Daily Gift. Timezone és country code automatikusan detektálódik és tárolódik. Recovery code rendszer védi a PIN reset-et (max 5 próbálkozás/óra). Rate limiting védelem van a login-ra (max 5 sikertelen/óra), de nincs CAPTCHA vagy IP-based védelem. Welcome Bonus és Daily Gift popup-ok kezelése idempotens RPC hívásokkal történik, ledger audit trail-lel.

### 12.2 Kritikus inkonzisztenciák kiemelt listája

1. **Daily Gift Streak NINCS RESET** (soha nem nullázódik, csak növekszik)
2. **Welcome Bonus "Later" nincs audit trail** (direct profile UPDATE, nincs ledger)
3. **Recovery Code rövid toast** (2000ms, user lemaradhat róla)
4. **Admin check username-based** (nem role-based)
5. **first_login_age_gate_completed unused** (létezik, de nincs használva)
6. **Email validáció hiányzik** (nullable, nincs formátum check)
7. **PIN reset nincs email notification** (user nem tud róla)
8. **NINCS CAPTCHA/2FA/IP rate limit** (security gap)

---

**VÉGE: AUTH & PROFILE & ONBOARDING RENDSZER DOKUMENTÁCIÓ v1.0**
