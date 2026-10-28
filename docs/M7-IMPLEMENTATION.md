# M7 — Observability, Cost & Eval Loop

Dokumen ini mencatat apa yang **sudah** dikerjakan di M7, keputusan desain
yang mengikat, dan utang teknis yang tersisa.

Status: **M7.1 SELESAI.** Tiap request LLM tercatat (provider, model, token
in/out, biaya, user), agregasi harian atomik + alert budget, dan dashboard
owner-only satu layar di `/usage`. Sisa M7.2–M7.5 belum dimulai; utang di §5.

---

## 1. M7.1 — Token & cost dashboard

Tujuan: satu layar bisa menjawab "biaya Livia lepas kendali?" dan "user mana
yang banyak ngobrol?" — tanpa harus query Neon manual.

### 1.1 Model data: dua tabel, dua peran

```
Tiap request LLM
   │
   ├─▶ aiUsageLogs        SATU baris per request (detail)
   │     userId, provider, model, operation,
   │     input_tokens, output_tokens, cost_micros, user_key
   │     └─ dibuang db:prune setelah 30 hari (riwayat biaya, bukan data user)
   │
   └─▶ aiUsageDaily       1 baris per hari UTC (agregasi global)
         requests, input_tokens, output_tokens, cost_micros, cap_exceeded_at
         └─ increment atomik INSERT ... ON CONFLICT DO UPDATE + .returning()
         └─ TIDAK PERNAH dihapus (1 baris/hari, kecil selamanya)
```

Kenapa dua tabel, bukan satu + GROUP BY:
- **Alert budget** harus murah per request. Dengan agregasi atomik, baris
  hasil increment langsung di-`returning()` — cek cap **nol query
  tambahan**, dan konsisten walau banyak request konkuren (serverless).
- Kueri dashboard (breakdown per operasi/model/user) tetap memakai tabel
  log; 30 hari × skala app ini = ribuan baris, GROUP BY sepele.

**`costMicros` = integer micro-USD (1e-6 USD)** — bukan float. Akumulasi di
DB tanpa error pembulatan (pola yang sama dengan uang `userProfiles.money`).
int4 cukup (~$2.146 per baris-hari) — alert budget menyala jauh sebelum itu.

### 1.2 Alur pencatatan: provider netral, domain mencatat

```
route (punya userId)
  └─▶ lib/gemini.ts (generateLiviaResponse / streamLiviaReply / date*)
        └─▶ provider.generate()/stream()   ── GenerateResult.usage (baru, M7.1)
              └─▶ GeminiProvider: usageMetadata SDK → result.usage
        └─▶ recordProviderUsage(result, { userId, operation, userKey })  ◀── fire-and-forget
              └─▶ recordAiUsage()  → insert aiUsageLogs + upsert aiUsageDaily + cek alert
```

- **Provider (`lib/ai/providers/gemini.ts`)**: `generateOnce`/`streamOnce`
  mengekstrak `usageMetadata` (promptTokenCount/candidatesTokenCount/
  totalTokenCount) ke `GenerateResult.usage` di SEMUA return path — termasuk
  hasil `blocked`, karena prompt tetap dikirim dan tetap mengonsumi input
  token. SDK tanpa metadata → `usage: undefined` (pencatat skip sunyi).
- **Domain (`lib/gemini.ts`, `lib/livia/summary.ts`, `lib/livia/memory.ts`)**:
  memanggil `recordProviderUsage()` — satu-satunya tempat yang tahu
  `userId`. Provider sengaja TIDAK menulis DB (adapter SDK murni).
- **Call site (6)**: `chat`, `chat` (stream, dicatat saat `final` resolve),
  `date.dialogue`, `date.chat`, `chat.summary`, `memory.consolidate`.
  Opsional `userId?: string` ditambahkan di EKSTRAMA signature — pemanggil
  lama (test/evals) tidak pecah; tanpa userId request tetap jalan, cuma
  tidak tercatat.
- **`userKey`** (boolean): request yang memakai API key pribadi user
  (BYOK, M0/H0.1) ditandai — biayanya ditanggung user, bukan server.
  Dashboard memisahkan angkanya di baris "Top user".
- **Evals (`evals/run.ts`)** tidak tercatat: memanggil provider langsung
  tanpa userId — memang manual, bukan traffic produksi.

### 1.3 Alert budget

- Env `AI_DAILY_COST_LIMIT_USD` (default **$5**). Dilewati → 
  `logger.warn('ai.budget_alert', { day, costUsd, limitUsd })`.
- **Anti-spam**: kolom `cap_exceeded_at` di-stempel SEKALI per hari saat cap
  pertama kali dilewati; alert berikutnya hari itu tidak dikirim (log Vercel
  tidak boleh penuh warning). Keputusannya fungsi murni `shouldAlertBudget()`
  (teruji unit, tanpa DB).
- Alert ke log = scope M7.1. Notif Discord/Slack adalah domain M7.5.

### 1.4 Dashboard: `/usage` + `/api/usage`

- **Owner-only**: middleware memaksa login; cek `OWNER_EMAIL` (env) di dalam
  halaman/route. **`OWNER_EMAIL` kosong = 403 untuk semua orang** (default
  aman — endpoint menampilkan data semua user).
- `app/(main)/usage/page.tsx` — **server component** (tanpa client JS):
  - Budget hari ini: biaya vs cap + progress bar + status cap terlampaui.
  - Total 14 hari terakhir: request, token in/out, estimasi biaya.
  - Tabel harian (14 baris): request, token in/out, biaya, tanda "cap!".
  - Breakdown: per operasi, per model, top-20 user (email dari join
    `users`; user terhapus → uuid pendek).
  - Kartu TTS (M6.4, dari `ttsUsage`): request, cache-hit rate, karakter
    di-billing — biaya suara tidak campur dengan biaya LLM.
- `/api/usage?days=N` (1..90, default 14) — JSON mentah, owner-only;
  `?days` non-numerik jatuh ke default (route membuang NaN, `getUsageOverview`
  juga defensive terhadap NaN).
- Bahasa UI: Indonesia — panel internal owner, bukan fitur user.

### 1.5 Harga model

`lib/ai/pricing.ts` (murni): tabel `MODEL_PRICING` eksplisit per model
(USD per 1 juta token). **Model tak dikenal dihargai 0, bukan ditebak** —
dashboard menampilkan nama model tanpa biaya, jadi owner langsung tahu harus
menambah harganya. `costMicrosFor()` membulatkan ke micro terdekat, token
negatif di-klamp 0.

---

## 2. File

| File | Isi |
| --- | --- |
| `lib/ai/pricing.ts` | **BARU** — tabel harga model + `costMicrosFor`/`costUsd` (murni) |
| `lib/ai/usage.ts` | **BARU** — `recordAiUsage` (fail-open), `recordProviderUsage`, `getUsageOverview`, `shouldAlertBudget`, `aiDailyCostLimitUsd`, `dayBucketUtc` |
| `lib/ai/types.ts` | `GenerateResult.usage?` (inputTokens/outputTokens/totalTokens) |
| `lib/ai/providers/gemini.ts` | `usageOf()` + surface `usageMetadata` di 6 return path (generate & stream, incl. blocked) |
| `lib/gemini.ts` | param `userId?` di 4 fungsi high-level + `recordProviderUsage` di 4 call site |
| `lib/livia/summary.ts` | `recordProviderUsage` (op `chat.summary`) |
| `lib/livia/memory.ts` | `recordProviderUsage` (op `memory.consolidate`) |
| `lib/db/schema.ts` | tabel `aiUsageLogs` (+index `created_at`) & `aiUsageDaily` |
| `drizzle/0003_mature_vindicator.sql` | migrasi (sudah applied, drift bersih) |
| `app/api/usage/route.ts` | **BARU** — GET owner-only, `?days=` |
| `app/(main)/usage/page.tsx` | **BARU** — dashboard server component |
| `middleware.ts` | `/usage` masuk `PROTECTED_PREFIXES` |
| `lib/env.ts` + `.env.example` | `OWNER_EMAIL`, `AI_DAILY_COST_LIMIT_USD` |
| `scripts/prune-expired-data.ts` | hapus `aiUsageLogs` >30 hari (di luar tx utama, try/catch) |
| `tests/setup.ts` | holder mock global `@/lib/ai/usage` (pola `@/lib/auth`) |
| `tests/ai-pricing.test.ts` | **BARU** — 11 test logika biaya |
| `tests/ai-usage.test.ts` | **BARU** — 10 test fungsi murni (env cap, alert, bucket) |
| `tests/usage-route.test.ts` | **BARU** — 7 test route (401/403/200/days/DB-error) |
| `tests/ai-provider.test.ts` | +5 test surface `usageMetadata` (generate & stream, incl. blocked) |

Suite: **654 test / 36 file** (naik dari 619/33).

---

## 3. Keputusan desain

1. **Dua tabel (log + agregasi), bukan satu + GROUP BY** — alert budget
   harus O(1) per request dan konkuren-safe; agregasi `.returning()` dari
   upsert atomik = nol query tambahan. Pola `ttsUsage` (M6.4) + `rateLimitCounters`.
2. **Biaya integer micro-USD** — akumulasi tanpa error float; konsisten
   dengan pola uang app (`money` integer).
3. **Pencatatan di domain, bukan provider** — provider = adapter SDK netral
   (tanpa DB, tanpa userId). Domain yang tahu `userId`. `userId` opsional di
   signature (ekstrama) supaya tidak ada pemanggil lama yang pecah.
4. **Blocked juga tercatat** — prompt tetap mengonsumi token; biaya nyata.
5. **Model tak dikenal = biaya 0, bukan ditebak** — salah menebak harga lebih
   berbahaya daripada 0; dashboard menampakkan model "tanpa harga" ke owner.
6. **`OWNER_EMAIL` kosong = terkunci semua** — endpoint data semua user
   tidak boleh punya default terbuka.
7. **Dashboard server component** — tidak ada data baru per-interaction;
   client JS hanya menambah surface attack & bundle.
8. **Agregasi harian global, bukan per-user** — detail per user ada di
   `aiUsageLogs` (GROUP BY saat dibutuhkan); satu baris/hari membuat alert
   sederhana. "Biaya per DAU" tinggal query log 30 hari.
9. **Retensi log 30 hari via `db:prune`** — riwayat biaya, bukan data user;
   agregasi harian permanen.
10. **Alert = `logger.warn` + stempel sekali-per-hari** — Vercel logs adalah
    alerting channel saat ini (M7.5 akan menambah webhook). Anti-spam via
    `cap_exceeded_at`.
11. **Mock `@/lib/ai/usage` global di setup.ts (holder + `importOriginal`)** —
    `isolate: false` membuat `vi.mock` per file tidak andal (modul ini
    ditarik `lib/gemini.ts` yang di-import test evals). Fungsi murni tetap
    diuji implementasi asli lewat spread `...actual`; yang di-fake hanya dua
    fungsi DB.
12. **Fungsi DB tidak di-unit-test** — konsisten dengan pendekatan M5.5/M6.4
    (`tts-cache.test.ts`): yang diuji logika biaya murni; lapisan SQL
    diverifikasi migrasi + drift check + test route.
13. **TTS tidak dicampur ke `aiUsageDaily`** — ElevenLabs menagih per
    karakter (bukan token); angka dicatat terpisah di `ttsUsage` (M6.4) dan
    ditampilkan sebagai kartu sendiri di dashboard.
14. **`?days` NaN dibuang di dua lapis** — route (parse) dan
    `getUsageOverview` (defensive): satu lapis saja cukup, tapi NaN yang
    lolos ke `since` menghasilkan jendela query rusak tanpa error jelas.

---

## 4. Deploy checklist (M7.1)

- [ ] **Vercel env**: set `OWNER_EMAIL` (email kamu) — tanpa ini `/usage`
      403 untuk semua orang. Opsional: `AI_DAILY_COST_LIMIT_USD` (default 5).
- [ ] Deploy berjalan (auto dari push). Migrasi `drizzle/0003` sudah applied
      manual ke Neon — **tidak ada** langkah migrasi di Vercel.
- [ ] Buka `https://livia.qzz.io/usage` sebagai owner → budget card + tabel
      harian tampil (kosong di hari pertama — normal).
- [ ] Chat beberapa pesan di `/chat` (streaming), 1x `/date`, tunggu
      ringkasan/konsolidasi terpicu (butuh volume) — lalu muat ulang
      `/usage`: baris hari ini bertambah (request, token, biaya).
- [ ] Query manual (Neon console):
      `SELECT * FROM "aiUsageDaily" ORDER BY "day" DESC LIMIT 3;`
      `SELECT operation, count(*), sum("cost_micros") FROM "aiUsageLogs" GROUP BY 1;`
- [ ] Bukan-owner membuka `/usage` → "Akses ditolak" (bukan 500).
- [ ] (Opsional) set `AI_DAILY_COST_LIMIT_USD=0.001` di dev, chat sampai
      lewat, lalu cek log Vercel: tepat SATU `ai.budget_alert` per hari.

---

## 5. Utang teknis

- **Alert belum keluar dari log** — `ai.budget_alert` hanya `logger.warn`;
  webhook Discord/Slack + status page adalah M7.5.
- **Harga model tidak live** — tabel statis di `lib/ai/pricing.ts`; kalau
  Google mengubah harga, harus deploy. (Skala biaya app ini: tidak
  sepadan fetch pricing API.)
- **Evals tidak tercatat** di `aiUsageLogs` (memanggil provider langsung
  tanpa userId) — biaya run evals manual tidak terlihat di dashboard.
- **`usageMetadata` tanpa `cachedContentTokenCount`** — Gemini cache
  (prompt caching) belum dimanfaatkan; token cached tetap dihitung penuh.
- **Kualitas Livia** belum di dashboard ("kualitas naik gak?") — itu M7.3
  (eval gate CI) + M7.4 (feedback in-app). "User betah?" — M7.2 (analytics).
- **`costMicros` int4** — batas ~$2.146/baris-hari; kalau suatu hari traffic
  menembus itu (mustahil di skala sekarang), naikkan ke bigint + migrasi.
- Halaman `/usage` tidak ada di navigasi (sengaja: fitur internal owner,
  tidak perlu di-link dari UI user).
