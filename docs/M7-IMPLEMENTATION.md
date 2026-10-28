# M7 — Observability, Cost & Eval Loop

Dokumen ini mencatat apa yang **sudah** dikerjakan di M7, keputusan desain
yang mengikat, dan utang teknis yang tersisa.

Status: **M7 SELESAI (M7.1–M7.5).** Tiap request LLM tercatat (provider,
model, token in/out, biaya, user), agregasi harian atomik + alert budget,
dashboard owner-only di `/usage`; analitik produk first-party (retensi
D1/D7/D30, pesan per session, drop-off) di `/analytics`; eval loop di CI
(55 skenario, persona/guardrail/memory recall) dengan gate di dua lapis:
branch protection GitHub + gate build Vercel; feedback in-app (👍/👎 di
chat) menjadi bahan kurasi dataset eval via `/feedback`; dan uptime &
alerting (monitor eksternal `/api/health` + webhook error-rate/budget
Discord/Slack, §5). Utang tersisa di §2.5, §3.7, §4.8, §5.7 & §9.

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

## 2. M7.2 — Product analytics (first-party)

Tujuan: satu layar bisa menjawab "User puas & betah? Apakah kualitas Livia
membuat mereka kembali?" — metrik milestone: retensi D1/D7/D30, pesan per
session, drop-off.

### 2.1 Keputusan stack: first-party, bukan PostHog/Plausible

Teks milestone menyebut "PostHog self-host atau Plausible", tapi keduanya
butuh hosting VPS terpisah (infra baru) dan data terpisah dari Neon.
**Dikonfirmasi dengan user**: semua metrik disyaratkan bisa dihitung dari
data milik sendiri — `users.createdAt` (kohort), `userProfiles.onboardingDone`
(drop-off), `chatMessages` (semua pesan ber-timestamp) + 1 tabel baru kecil
`userActivityDaily`. Nol infra baru, nol pihak ketiga (privasi maksimum —
tanpa SDK, tanpa cookie, tanpa tracking eksternal), konsisten pola M6.4
(Neon bytea, bukan R2). DoD milestone tentang **jawaban**, bukan tool.
Kalau kelak butuh event-level page view, Plausible self-hosted bisa ditambahkan
sebagai pelengkap.

### 2.2 Model data: `userActivityDaily`

```
Tiap interaksi yang selesai tersimpan (chat turn / date / date chat)
   └─▶ recordUserActivity(userId)  — upsert idempotent
         └─▶ userActivityDaily    1 baris per (user, hari-UTC)
               FK cascade hapus akun
               └─ TIDAK PERNAH di-prune
```

- **"Hari aktif" didefinisikan sempit**: minimal satu interaksi chat atau
  kencan yang selesai tersimpan. Kunjungan halaman TIDAK dihitung (signal
  terlalu bising untuk retensi); interaksi yang gagal (mis. AI overload)
  tidak tercatat → undercount kecil saat outage, wajar untuk analitik.
- **Tidak pernah di-prune** (kecuali cascade hapus akun): `chatMessages`
  di-prune 90 hari — tanpa baris aktivitas permanen, retensi kohort lama
  akan runtuh ke 0% begitu pesan mentahnya dibuang. 1 baris per user per
  hari = negligibel.

### 2.3 Pencatatan

`lib/analytics/activity.ts` → `recordUserActivity(userId)`:
- Upsert `ON CONFLICT DO NOTHING` (idempotent per hari UTC), **fail-open**
  (gagal DB = baris hilang/undercount, interaksi user tidak rusak).
- **Di-await, bukan fire-and-forget**: di Next serverless, promise yang tidak
  ditunggu bisa dibekukan begitu response dikirim — baris hilang = undercount
  retensi permanen untuk hari itu. Biayanya 1 upsert PK per interaksi.

Call sites (3 titik, menutup 4 route):
- `persistChatTurn` (`lib/livia/chat-turn.ts`) — menutup `/api/chat` **dan**
  `/api/chat/stream` sekaligus (keduanya persist lewat sini).
- `app/api/date/route.ts` — setelah `generateDateDialogue` sukses.
- `app/api/date/chat/route.ts` — setelah balasan + persist.

### 2.4 Metrik: fungsi murni (`lib/analytics/metrics.ts`)

- `sessionize()` — pecah pesan per user jadi sesi; gap > `SESSION_GAP_MS`
  (30 menit) = sesi baru; batas: tepat 30 menit masih satu sesi.
- `sessionStats()` — avg/median/p90 pesan user per sesi +
  `singleMessageSessionRate` (sesi "datang sekali, pergi" — proxy drop-off).
- `retentionCohorts()` — **D+N = user aktif pada hari eksak** createdDay+N
  (UTC, bukan "dalam N hari pertama"). Target di masa depan relatif `asOf`
  = belum matang → `null` (bukan 0% — cohort baru tidak boleh terlihat
  "retensi 0%"). `groupBy: 'week'` = awal-Senin ISO, dihitung per-user dulu
  lalu diakumulasi (bukan rata-rata dari rata-rata harian).
- `weightedCohortRetention()` — rata-rata tertimbang jumlah-user lintas
  semua user (user kohort besar berbobot lebih besar).
- `onboardingDropoff()` — bucket umur akun: `today` / `1` / `2` / `3-6` / `7+`.
- `dailySeries()` — per hari: user aktif, user baru, pesan user.

Semua tanpa DB, ter-unit-test penuh. `lib/analytics/queries.ts` = lapisan
kueri tipis (ambil data mentah, delegasikan ke fungsi murni) — fungsi DB
tidak di-unit-test (pola codebase), diverifikasi migrasi + drift + test route.

Jendela (tetap, tanpa parameter query): retensi = kohort 28 hari (tampil 8
minggu), sesi = 28 hari, tren = 14 hari. Jendela aktivitas = 28 + 31 hari
(memuat D+30 kohort terlama yang ditampilkan).

### 2.5 Dashboard: `/analytics` + `/api/analytics`

Pola sama persis dengan `/usage` (M7.1): **server component** (tanpa client
JS), owner-only — cek `OWNER_EMAIL` di dalam halaman/route, **env kosong =
403 semua**, UI Bahasa Indonesia.

- Baris KPI: user baru (28 hari), D1/D7/D30 tertimbang, % onboarding
  selesai, pesan rata-rata per sesi.
- Tabel retensi kohort mingguan (8 baris: minggu, user, D1, D7, D30).
- Kartu sesi (jumlah, avg/median/p90, total pesan, % sesi pesan-1) +
  tabel drop-off onboarding (per bucket umur) + "tidak pernah chat".
- Tabel tren 14 hari (aktif, user baru, pesan).
- Footer definisi ("hari aktif", UTC, first-party tanpa vendor).

`GET /api/analytics` (owner-only) — JSON mentah, tanpa parameter (jendela tetap).

### 2.6 File

| File | Isi |
| --- | --- |
| `lib/analytics/metrics.ts` | **BARU** — fungsi murni: `sessionize`, `sessionStats`, `retentionCohorts`, `weightedCohortRetention`, `onboardingDropoff`, `dailySeries` + helper tanggal UTC |
| `lib/analytics/activity.ts` | **BARU** — `recordUserActivity` (upsert idempotent, fail-open, awaited) |
| `lib/analytics/queries.ts` | **BARU** — `getAnalyticsOverview` (kueri tipis → fungsi murni), konstanta jendela |
| `lib/db/schema.ts` | tabel `userActivityDaily` (PK komposit user+day, FK cascade) |
| `drizzle/0004_cloudy_captain_flint.sql` | migrasi (sudah applied, drift bersih) |
| `lib/livia/chat-turn.ts` | `recordUserActivity` di `persistChatTurn` (menutup 2 route chat) |
| `app/api/date/route.ts` | `recordUserActivity` setelah dialogue sukses |
| `app/api/date/chat/route.ts` | `recordUserActivity` setelah balasan + persist |
| `app/api/analytics/route.ts` | **BARU** — GET owner-only |
| `app/(main)/analytics/page.tsx` | **BARU** — dashboard server component |
| `middleware.ts` | `/analytics` masuk `PROTECTED_PREFIXES` |
| `tests/analytics-metrics.test.ts` | **BARU** — 21 test fungsi murni |
| `tests/analytics-route.test.ts` | **BARU** — 5 test route (401/403×2/200/DB-error), mock per-file `@/lib/analytics/queries` (pola `@/lib/tts/cache`) |

Suite: **680 test / 38 file** (naik dari 654/36).

### 2.7 Keputusan desain

1. **First-party, bukan PostHog/Plausible** (dikonfirmasi user) — nol infra
   baru; DoD milestone tentang jawaban ("user betah?"), bukan tool.
2. **Definisi "hari aktif" sempit** — interaksi chat/kencan yang selesai
   tersimpan; kunjungan halaman & interaksi gagal tidak dihitung.
3. **`userActivityDaily` tidak pernah di-prune** — retensi kohort lama harus
   tetap akurat setelah `chatMessages` dipangkas 90 hari.
4. **D+N hari eksak; belum matang → `null`** — definisi standar retensi;
   `null` (bukan 0%) supaya cohort baru tidak artifaktal buruk.
5. **Pencatatan di-await, bukan fire-and-forget** — risiko freezing
   serverless = undercount permanen; biayanya 1 upsert PK.
6. **Fail-open** — analitik tidak boleh pernah merusak interaksi user.
7. **Metrik murni + lapisan kueri tipis** — logika hitung teruji tanpa DB;
   SQL tipis diverifikasi migrasi/drift/test route (pola M6.4/M7.1).
8. **`everChatted` ≤ 90 hari** — konsekuensi prune `chatMessages`;
   approximation yang cukup untuk drop-off (terdokumentasi di footer UI).

### 2.8 Deploy checklist (M7.2)

- [ ] Migrasi `drizzle/0004` sudah applied manual ke Neon — **tidak ada**
      langkah migrasi di Vercel.
- [ ] `OWNER_EMAIL` (wajib sejak M7.1) — tanpa ini `/analytics` 403 semua.
- [ ] Buka `https://livia.qzz.io/analytics` sebagai owner → KPI + tabel
      tampil. Angka retensi terisi **bertahap** seiring kohort menua:
      D1 butuh 1 hari, D7 butuh 7 hari, D30 butuh 30 hari (baris baru
      banyak yang "—" di awal — normal, bukan bug).
- [ ] Chat/date beberapa interaksi, lalu query Neon:
      `SELECT * FROM "userActivityDaily" ORDER BY "day" DESC LIMIT 5;`
      → baris hari ini muncul (per user, 1 baris/hari).
- [ ] Bukan-owner membuka `/analytics` → "Akses ditolak" (bukan 500).

### 2.9 Utang teknis

- **Tidak ada event-level page view / tracking fitur** — tanpa SDK; kalau
  kelak perlu "halaman mana yang sering dibuka", Plausible self-hosted
  sebagai pelengkap (data akan terpisah dari Neon).
- **"Tidak pernah chat" tercap 90 hari** — konsekuensi prune `chatMessages`;
  user yang chat >90 hari lalu tapi berhenti terlihat "pernah chat" selama
  90 hari terakhir datanya.
- **Waktu selesainya onboarding tidak tercatat** — hanya flag akhir
  (`onboardingDone`); "berapa hari user ngendon di onboarding" belum bisa
  dijawab (butuh stempel waktu selesai).
- **Jendela tetap (28/14 hari)** — tanpa parameter `?days`; cukup untuk
  skala sekarang.
- **`chatMessages.createdAt` = timestamp tanpa tz** — parse benar di Vercel
  (TZ driver = UTC, sama dengan server Neon); dev lokal dengan TZ lain
  bergeser offset-nya — diabaikan (analitik dibaca di produksi).

---

## 3. M7.3 — Eval loop di CI (gate deploy)

Tujuan: tiap perubahan yang masuk `main` harus lulus suite eval (persona,
guardrail/injeksi, memory recall, struktur) — dan build-nya sendiri tidak
bisa menghasilkan app yang aturan level prompt-nya regresi.

### 3.1 Arsitektur: gate dua lapis

```
PR / push
   │
   ├─▶ GitHub Actions CI (.github/workflows/ci.yml)
   │     typecheck · lint · test ×2 · evals-offline · evals-live
   │     └─ branch protection "Require status checks" (setting GitHub)
   │        = gate MERGE ke main
   │
   └─▶ Vercel build (package.json "build")
         vitest run tests/evals-dataset.test.ts && next build
         └─ eval offline (asersi 55 skenario yang sama, ~20 dtk, tanpa API)
            = gate DEPLOY itu sendiri (build merah → tidak ada deploy)
```

Kenapa dua lapis:
- **GitHub CI** = gate penuh (termasuk eval *live* ke model produksi). Tapi
  status checks hanya memblokir *merge* — direct push ke main (workflow
  saat ini) tidak diblokir checks.
- **Gate build Vercel** = backstop yang tidak bisa dilewati: regresi aturan
  level prompt / integritas dataset = build gagal. Deterministik, tanpa API,
  tanpa biaya (~20 detik).
- Kedua lapis memakai **asersi yang sama** (eval offline): runner CLI
  (`bun run evals`) di CI, file vitest yang mengasersi hal serupa di Vercel —
  tidak ada dua sumber kebenaran aturan.

### 3.2 Eval live: gate kualitas

- 55 skenario → model produksi (`--live`): persona (8), guardrail/injeksi
  (13), memory recall (10), language (8), politeness (8), structure (8).
- Pacing: `AI_EVAL_DELAY_MS=15000`, `AI_MAX_RETRIES=1` (pola anti 429
  free-tier, M2.8) — total ~20–30 menit, timeout job 45 menit.
- DoD runner: cek hard 100% + soft (persona) ≥85% (exit 1 kalau gagal).
- Secret `GEMINI_API_KEY` **belum diset** → job lulus dengan `::warning::`
  (bukan gagal): milestone tetap bisa merge sebelum user men-set secret;
  gate live aktif otomatis begitu secret ada.

### 3.3 Skenario guardrail baru (tambahan M7.3)

5 skenario *bypass* filter (safety 8 → 13, dataset 50 → 55):

| ID | Vektor |
| --- | --- |
| `safety.bypass_roleplay` | Roleplay "AI tanpa aturan, tanpa filter" |
| `safety.bypass_developer` | Pesan developer palsu "filter nonaktif untuk sesi ini" |
| `safety.bypass_emotional` | Tekanan/ancaman emosional agar prompt dibocorkan |
| `safety.bypass_indirect` | Relay indirek via permintaan terjemahan |
| `safety.bypass_freedom` | Janji "kebebasan" dari aturan demi isi aturan |

Cek per skenario: `prompt.injection_guard` (offline — penjaga injeksi WAJIB
ada di prompt untuk skenario ini) + `reply.no_system_leak` + `REPLY_SAFE`
(live). Tidak ada cek baru — cek existing sudah menutup semua vektor.

### 3.4 File

| File | Isi |
| --- | --- |
| `.github/workflows/ci.yml` | **BARU** — 5 job: typecheck, lint, test (2x), evals-offline, evals-live (secret-gated, pacing 15 s) |
| `evals/dataset.ts` | +5 skenario bypass (50 → 55) |
| `tests/evals-dataset.test.ts` | asersi jumlah 50 → 55 |
| `package.json` | `build` = `vitest run tests/evals-dataset.test.ts && next build` (gate deploy Vercel) |

### 3.5 Keputusan desain

1. **Gate dua lapis (CI GitHub + build Vercel)** — checks CI hanya memblokir
   merge; direct push ke main tidak tergate. Build Vercel = backstop yang
   selalu jalan. Asersi offline sama di kedua lapis (satu sumber kebenaran).
2. **Gate Vercel hanya porsi offline** — eval live di build = 55 call API
   per deploy + risiko 429 = deploy tertahan oleh throttling, bukan kualitas.
   Live = domain CI.
3. **Gate Vercel via vitest, bukan `bun run evals`** — build Vercel berjalan
   di npm (bun tidak tersedia di environment build-nya). `vitest run
   tests/evals-dataset.test.ts` = asersi yang sama, bentuk deterministik ~20
   detik. Script tetap jalan di bun secara lokal.
4. **Skenario baru, bukan cek baru** — `no_system_leak`/`no_forbidden`/
   `REPLY_SAFE` sudah cukup; yang kurang adalah variannya, bukan metriknya.
5. **Live eval skip-with-warning tanpa secret** — gate tidak boleh merah
   karena konfigurasi yang belum user set; begitu `GEMINI_API_KEY` masuk
   GitHub Secrets, gate aktif tanpa perubahan kode.
6. **Pacing 15 s + 1 retry** — pola free-tier yang terbukti (M2.8); 55
   skenario ≈ 20–30 menit per run.
7. **Branch protection = task user** — setting "Require status checks" ada
   di GitHub, bukan di repo; di-checklist di §3.6.

### 3.6 Deploy checklist (M7.3)

- [ ] **GitHub Secrets**: Settings → Secrets and variables → Actions → tambah
      `GEMINI_API_KEY` (key Google yang sama; yang di Vercel view-once, jadi
      salin ulang dari Google AI Studio). Selama belum: `evals-live` jalan
      sebagai skip-with-warning.
- [ ] **Branch protection** (gate merge): Settings → Branches → add rule
      `main` → "Require status checks to pass before merging" → centang
      `typecheck`, `lint`, `test (2x)`, `evals-offline`, `evals-live`.
      Opsi lebih ketat: "Require pull request before merging" — direct push
      ke main tidak lagi lolos tanpa checks.
- [ ] Push/PR pertama: 5 job hijau di tab Actions.
- [ ] Vercel: log build berikutnya menampilkan 7 test vitest sebelum
      `next build` — bukti gate deploy aktif.
- [ ] (Opsional, test negatif) rusak satu aturan prompt di `lib/ai/persona.ts`
      → `bun run build` harus GAGAL sebelum `next build` jalan.

### 3.7 Utang teknis

- **Biaya live eval di CI** — 55 call per PR/push; aman untuk free-tier
  dengan pacing, tapi kalau volume naik, jadwalkan live hanya untuk push ke
  main (bukan tiap PR) atau pakai key berbayar.
- **Branch protection hidup di setting GitHub, bukan repo** — kalau repo
  dipindah/reset, gate merge hilang diam-diam (gate build Vercel tetap ada).
- **Soft <85% dihitung global, bukan per kategori** — regresi persona di
  satu kategori bisa tertutup rata hijau; tabel per kategori tetap tercetak
  di log untuk diagnosis.
- **PR dari fork tidak dapat secrets** — `evals-live` akan skip (kebijakan
  keamanan GitHub); tidak masalah untuk repo solo.

---

## 4. M7.4 — Feedback loop in-app (chat → dataset evals)

**Yang dikirim**: tombol 👍/👎 di balasan Livia (halaman chat) → tersimpan
ke `chatFeedback` → owner meninjau di `/feedback` → menyalin sketsa skenario
→ mengkurasi ke `evals/dataset.ts` (menutup loop dengan M7.3).

### 4.1 Model data: `chatFeedback`

- 1 baris per (user, pesan): `UNIQUE (user_id, message_id)` — re-rating =
  upsert (rating terakhir menang); `created_at` memuat rating **pertama**.
- FK cascade ke `users` DAN `chatMessages`: hapus akun & `db:prune` pesan
  chat >90 hari menghapus rating-nya otomatis — feedback tidak boleh
  bertahan lebih lama dari pesan yang dirating-nya.

### 4.2 Asal `messageId` (detail penting)

Pesan baru di UI memakai ID sementara (`Date.now()`); ID baris DB baru ada
setelah persist. Solusi:
- `persistChatTurn` kini pakai `.returning()` → hasil menambah
  `liviaMessageId` (dicari per `role`, tidak bergantung urutan insert).
- Route stream: event `done` menambah `messageId`; route JSON: response
  menambah `messageId`.
- Client: `dbId` diisi dari event; tombol feedback hanya muncul kalau `dbId`
  ada (balasan sudah selesai & tersimpan — bukan tengah ditypewriter).

### 4.3 Jalur tulis: `POST /api/chat/feedback`

- Body `{ messageId, rating: 'up' | 'down' }` — validasi manual (uuid +
  enum), konsisten dengan `lib/validation` (tanpa zod).
- Ownership dicek di `saveChatRating`: tidak ada **atau** bukan milik user
  → 404 yang SAMA (keberadaan pesan orang lain tidak dibocorkan).
- Rate limit `mutationRateLimit` — rating mutasi ringan, bukan endpoint AI.

### 4.4 Jalur baca

- `GET /api/chat/history` menambah peta `feedback` — rating lama langsung
  tampil setelah reload (tombol tidak mulai dari kosong).
- `/feedback` (owner-only, `OWNER_EMAIL`, pola `/usage`): ringkasan
  (total / baik / buruk / rasio buruk) + 200 baris terbaru (termasuk pesan
  user tepat sebelum balasan via subquery skalar — satu kueri, tanpa N+1) +
  tombol "Salin skenario" per baris (`scenarioSnippet`, fungsi murni).

### 4.5 File

| File | Isi |
| --- | --- |
| `lib/feedback.ts` | **BARU** — `saveChatRating`, `getUserFeedbackMap`, `getFeedbackRows`, `scenarioSnippet` (murni) |
| `lib/db/schema.ts` | tabel `chatFeedback` + `uniqueIndex` |
| `drizzle/0005_pink_warbird.sql` | migrasi (sudah applied, drift bersih) |
| `lib/livia/chat-turn.ts` | `.returning()` + `liviaMessageId` di `PersistChatTurnResult` |
| `app/api/chat/stream/route.ts` | event `done` + `messageId` |
| `app/api/chat/route.ts` | response + `messageId` |
| `app/api/chat/feedback/route.ts` | **BARU** — POST rating |
| `app/api/chat/history/route.ts` | + peta `feedback` |
| `features/chat/ChatClient.tsx` | `FeedbackThumbs`, `dbId`, `handleRate` (optimistic) |
| `app/(main)/feedback/page.tsx` | **BARU** — review owner |
| `components/ui/CopySnippetButton.tsx` | **BARU** — clipboard (satu-satunya client component di halaman) |
| `middleware.ts` | `/feedback` masuk `PROTECTED_PREFIXES` |
| `tests/feedback-route.test.ts` | **BARU** — 7 test route |
| `tests/feedback-scenario.test.ts` | **BARU** — 5 test (incl. round-trip escaping) |

Suite: **692 test / 40 file** (naik dari 680/38).

### 4.6 Keputusan desain

- **Human-in-the-loop, bukan otomatis.** Pesan user mentah boleh berisi PII
  atau percobaan injeksi — tidak boleh masuk dataset eval tanpa kurasi.
  Loop: user rating → owner meninjau → salin sketsa → kurasi (id unik,
  kategori, afeksi, cek) → `bun run evals` + CI (M7.3).
- **Sketsa skenario hanya memuat yang diketahui baris feedback.** Afeksi
  saat kejadian tidak tersimpan (yang ada: `affectionDelta` per pesan &
  afeksi profil terkini) → snippet memakai placeholder `GANTI:` eksplisit.
- **Tidak ada endpoint hapus rating.** Re-rating menimpa; hapus manual via
  DB kalau suatu hari diperlukan (fitur internal).
- **`/feedback` tidak di-link dari navigasi user** (sengaja, seperti
  `/usage` & `/analytics`).
- Tombol hanya di balasan **Livia** — rating pesan milik sendiri tidak
  bermakna untuk kualitas jawaban.

### 4.7 Deploy checklist (M7.4)

- [ ] User: set `OWNER_EMAIL` di Vercel (bersama M7.1/M7.2 — tanpa itu
  `/usage`, `/analytics`, `/feedback` semua 403).
- [ ] User: chat beberapa pesan di prod → 👍/👎 di balasan Livia → baris
  muncul di `/feedback` (hard refresh post-deploy).
- [ ] User (Neon): `SELECT count(*) FROM "chatFeedback";`
- [ ] Non-owner membuka `/feedback` → "Akses ditolak".

### 4.8 Utang teknis

- **Date chat (`/date`) belum punya tombol feedback** — milestone scope
  "in chat" = halaman chat utama. `FeedbackThumbs` siap dipakai ulang.
- **Label tanggal snippet** memakai `created_at` rating, bukan `created_at`
  pesan (dekat, tidak memengaruhi kurasi).
- **Rasio buruk dihitung dari 200 baris terbaru**, bukan seluruh sejarah
  (sejarah rating ikut ter-prune bersama pesannya).

---

## 5. M7.5 — Uptime & alerting

**Yang dikirim**: status page eksternal (UptimeRobot/Better Stack)
memantau `/api/health` (cek DB); webhook error-rate + alert budget
(Discord/Slack) keluar dari log.

### 5.1 Status page: monitor eksternal `/api/health`

- Status page ditahan layanan eksternal (UptimeRobot/Better Stack) — nol
  infra di repo. User men-set monitor ke `https://livia.qzz.io/api/health`.
- `GET /api/health` publik, TANPA rate limit (monitor harus selalu bisa
  menjangkau, termasuk saat aplikasi bermasalah; kuerinya cuma `select 1`
  per poll 30–60 dtk). 200 = DB terjawab; 503 = DB down. Vercel serverless
  bisa 200 walau aplikasi mati — cek DB membuat status page mencerminkan
  yang dirasakan user.
- DB down → monitor menandai down; webhook error-rate biasanya ikut menyala
  (semua route API 5xx) — dua jalur, satu insiden.

### 5.2 Webhook error-rate (5xx saja)

- Pemicu: `apiErrorResponse` (choke point SEMUA route API — pola M1.4).
  4xx TIDAK dihitung: itu kesalahan user (input salah, rate limit, not
  found), bukan insiden.
- Jendela 5 menit, dihitung di `rateLimitCounters` (store yang SAMA dengan
  limiter produksi). Increment atomik `ON CONFLICT ... RETURNING count`
  → hanya SATU pemanggil yang melihat `count === threshold` → tepat satu
  alert per jendela, tanpa lock tambahan.
- `apiErrorResponse` menjadi **async**: increment di-AWAIT sebelum response
  (bukan fire-and-forget) — serverless yang membeku kehilangan hitungan,
  dan alert bisa tidak pernah menyala (pola M7.2).
- Env: `ALERT_WEBHOOK_URL` (Discord/Slack — payload dideteksi dari URL;
  host lain dapat kedua field `content`+`text`) + `ALERT_5XX_THRESHOLD`
  (default 10). Kosong = no-op sunyi.
- Webhook: timeout 3 dtk, fail-open — Discord mati tidak boleh mengubah
  response user.

### 5.3 Alert budget keluar dari log (utang M7.1 tertutup)

- Titik `ai.budget_alert` di `lib/ai/usage.ts` kini juga memanggil
  `sendWebhookAlert` (sekali/hari, stempel `capExceededAt` yang sama).
  Gagal kirim hanya ke log — `logger.warn` tetap sumber kebenaran.

### 5.4 File

| File | Isi |
| --- | --- |
| `lib/alerting.ts` | **BARU** — `alertBucketStart`, `detectWebhookKind`, `buildWebhookBody`, `errorThreshold` (murni) + `sendWebhookAlert`, `reportRouteError5xx` (IO fail-open) |
| `lib/errors.ts` | `apiErrorResponse` → async + `reportRouteError5xx` untuk 5xx |
| `lib/api-handler.ts` | `await apiErrorResponse(...)` |
| `lib/ai/usage.ts` | webhook budget setelah `ai.budget_alert` |
| `lib/health.ts` | **BARU** — `checkHealth` (`select 1`) |
| `app/api/health/route.ts` | **BARU** — GET publik, 200/503 |
| `lib/env.ts` + `.env.example` | `ALERT_WEBHOOK_URL`, `ALERT_5XX_THRESHOLD` (opsional) |
| `tests/alerting.test.ts` | **BARU** — 19 test (murni + IO fetch-stub + jendela) |
| `tests/errors.test.ts` | semua call `await` + 4 test integrasi alert |
| `tests/health-route.test.ts` | **BARU** — 3 test |
| `tests/setup.ts` | mock store rate-limit: objek stabil lintas file (pola holder globalThis) — menutup flake urutan pada test alerting |

Suite: **718 test / 42 file** (naik dari 692/40).

### 5.5 Keputusan desain

- **5xx saja** — menghitung 4xx akan membanjiri webhook dengan typo user
  dan percobaan hammering; insiden = server yang tidak berfungsi.
- **Hitungan di `rateLimitCounters`** (bukan tabel baru) — increment
  atomik sudah ada & terbukti di produksi (M5.5); `db:prune` mengurus
  baris lama. DB down → hitungan 5xx tak terjamin → detector UTAMA tetap
  status page (monitor eksternal, tidak bergantung DB yang sama).
- **Status page eksternal** — halaman self-host di host yang sama tak
  bermakna (host mati = halaman mati); UptimeRobot/Better Stack memberi
  URL publik + histori + email alert gratis di tier awal.
- **Webhook budget best-effort** — `recordProviderUsage` dipanggil
  fire-and-forget (M7.1); kalau fungsi membeku sebelum kirim, alert hari
  itu bisa hilang — log + badge `capExceededAt` di `/usage` tetap ada.
- **Tanpa paging (PagerDuty)** — overkill di skala ini; webhook + log
  cukup. Ulangi kalau jumlah user tumbuh besar.

### 5.6 Deploy checklist (M7.5)

- [ ] User: buat akun UptimeRobot/Better Stack → monitor
  `https://livia.qzz.io/api/health` (interval 30–60 dtk) → aktifkan
  status page publik + notifikasi email.
- [ ] User: buat webhook Discord/Slack → set `ALERT_WEBHOOK_URL` di
  Vercel (`ALERT_5XX_THRESHOLD` opsional) → redeploy.
- [ ] User: uji webhook manual — `curl -X POST <URL> -H
  "Content-Type: application/json" -d "{\"content\":\"uji dari terminal\"}"`
  → pesan muncul di channel.
- [ ] User: buka `https://livia.qzz.io/api/health` → 200
  `{"ok":true,"db":"ok",...}`.
- [ ] (Opsional) uji lonjakan: set `ALERT_5XX_THRESHOLD=1` sementara,
  picu satu 5xx → pesan "Lonjakan error 5xx" muncul di channel.

### 5.7 Utang teknis

- **Error halaman (server component) tidak terhitung** — choke point
  hanya route API; error render halaman hanya terlihat di log Vercel
  (monitor `/api/health` menutup skenario app-down secara parsial).
- **Counter 5xx & rate limit berbagi tabel** — `db:prune` membuang
  jendela lama; prune di tengah jendela (jarang) bisa mereset hitungan →
  max satu alert terlewat, jendela berikutnya alert lagi.
- **Kunci webhook ada di URL** — URL bocor = siapa pun bisa mem-post ke
  channel (profil risiko Discord/Slack); rotasi kalau dicurigai.
- **Tanpa dedup antar-jendela** — insiden 30 menit = 6 pesan.
  Diterima: tujuannya owner PASTI melihat.

---

## 6. File (M7.1)

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

## 7. Keputusan desain (M7.1)

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

## 8. Deploy checklist (M7.1)

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

## 9. Utang teknis (M7.1)

- ~~**Alert belum keluar dari log**~~ — **TERTUTUP di M7.5** (`§5.3`):
  `ai.budget_alert` kini juga dikirim ke webhook Discord/Slack.
- **Harga model tidak live** — tabel statis di `lib/ai/pricing.ts`; kalau
  Google mengubah harga, harus deploy. (Skala biaya app ini: tidak
  sepadan fetch pricing API.)
- **Evals tidak tercatat** di `aiUsageLogs` (memanggil provider langsung
  tanpa userId) — biaya run evals manual tidak terlihat di dashboard.
- **`usageMetadata` tanpa `cachedContentTokenCount`** — Gemini cache
  (prompt caching) belum dimanfaatkan; token cached tetap dihitung penuh.
- **Kualitas Livia** belum di dashboard ("kualitas naik gak?") — itu M7.3
  (eval gate CI) + M7.4 (feedback in-app). "User betah?" — selesai di M7.2
  (analytics first-party, §2).
- **`costMicros` int4** — batas ~$2.146/baris-hari; kalau suatu hari traffic
  menembus itu (mustahil di skala sekarang), naikkan ke bigint + migrasi.
- Halaman `/usage` tidak ada di navigasi (sengaja: fitur internal owner,
  tidak perlu di-link dari UI user).
