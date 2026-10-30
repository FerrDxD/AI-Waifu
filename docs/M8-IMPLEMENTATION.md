# M8 — Paritas Fitur Komersial

Dokumen ini mencatat pekerjaan M8, keputusan desain yang mengikat, dan utang
teknis yang tersisa. Ditulis bertahap; bagian yang belum dikerjakan tetap
berstatus rencana.

Status: **M8.1 Phase 1 & Phase 2 SELESAI** (multi-provider engine + selector
model di settings). **M8.3 SELESAI** (tool calling JSON single-turn).
**M8.4 SELESAI** (gamifikasi server-validated, tanpa leaderboard).
**M8.5 SELESAI** (PWA/native: offline cache + push notification). M8.2,
M8.6–M8.7 belum dimulai.

---

## 1. M8.1 — Multi-provider

Tujuan: Livia tidak terkurung satu vendor. Engine bisa bicara ke Gemini,
OpenAI, Anthropic, dan **provider pihak ketiga berprotokol OpenAI**
(OpenRouter, Groq, TipRouter, Ollama yang di-host publik, dsb.) — tanpa
menyentuh satu baris pun kode domain (`persona.ts`, route chat, route date).

### 1.1 Kenapa provider pihak ketiga jadi warga kelas satu

Production memakai provider agregator (base URL sendiri + daftar model
campuran: DeepSeek, Qwen, Kimi, GPT, Gemini). Itu bukan kasus tepi — itu
**konfigurasi utama**. Karena itu `openai-compat` bukan "tambahan eksperimen"
melainkan adapter dengan penanganan khusus:

- base URL & key dari `OPENAI_COMPAT_BASE_URL` / `OPENAI_COMPAT_API_KEY`;
- **tanpa model default** (lihat §1.5) — nama model di provider seperti itu
  tidak bisa ditebak;
- **downgrade fitur bertahap**, karena tidak semua provider compatible
  mendukung `response_format: json_schema` strict atau
  `stream_options.include_usage`.

### 1.2 Arsitektur: satu kontrak, empat adapter

```
domain (persona.ts / route chat / route date)
   │  GenerateOptions<T>: turns, systemInstruction, responseSchema, outputSchema,
   │                      temperature, maxOutputTokens, model?, apiKey?
   ▼
lib/ai/index.ts  ── registry PROVIDERS[AI_PROVIDER] ──▶ satu instance adapter
   │
   ├─ providers/gemini.ts     @google/generative-ai
   ├─ providers/openai.ts     openai  ──┬─ OpenAIProvider        (api.openai.com)
   │                                    └─ OpenAICompatProvider  (base URL env)
   └─ providers/anthropic.ts  @anthropic-ai/sdk
         │
         └─ providers/common.ts   ← SATU sumber perilaku bersama
```

`providers/common.ts` memindahkan seluruh jaminan M2.6 keluar dari
`gemini.ts` supaya keempat adapter berperilaku identik:

| Fungsi | Jaminan |
|---|---|
| `isRetryableError` | 429/5xx & error jaringan diulang; 400/401/403/404/422 tidak |
| `backoff` | eksponensial + jitter ±25%, batas 8 detik |
| `isBackendFailure` | hanya `AI_TIMEOUT` / `AI_GENERATION_FAILED` yang membuka breaker |
| `wrapProviderError` | error mentah tidak bocor ke client |
| `toTimeoutError` | abort/timeout SDK → `AI_TIMEOUT` 504 yang jelas |
| `normalizeUsage` | bentuk token netral; nol semua → `undefined` |
| `normalizeTurns` | buang giliran kosong, gabung role berurutan, buang `model` di awal |
| `resolveModelForOperation` | model per operasi + override user + guard model kosong |
| `runGenerateWithRetry` | retry + fallback model (`AI_MODEL_FALLBACK`) sekali |
| `streamOnceWithRetry` | retry **hanya** sebelum delta pertama terkirim |

`streamOnceWithRetry` adalah aturan yang paling mudah salah: kalau teks sudah
mengalir ke layar lalu koneksi putus, mengulang berarti teks terulang dua kali.
Karena itu `emitted` menutup pintu retry begitu ada satu delta keluar.

### 1.3 Skema respons jadi tipe netral

Dulu `GenerateOptions.responseSchema` bertipe `ResponseSchema` milik
`@google/generative-ai`, sehingga domain "tahu" soal Google. Sekarang:

```ts
// lib/ai/types.ts
type JsonSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
interface JsonSchemaNode { type; description?; properties?; items?; required? }
type LlmResponseSchema = JsonSchemaNode;
```

Nilainya **tidak berubah**: `SchemaType.OBJECT` di SDK Google memang bernilai
string `'object'`. Jadi ini murni perpindahan tipe, nol risiko perilaku — dan
dibuktikan oleh 764 test lama yang tetap hijau tanpa diubah.

Terjemahan per adapter:

| Provider | Mekanisme structured output |
|---|---|
| Gemini | `responseMimeType: application/json` + `responseSchema` apa adanya |
| OpenAI | `response_format: { type: 'json_schema', strict: true }` |
| OpenAI-compat | `response_format: { type: 'json_object' }` (bisa turun ke tanpa format) |
| Anthropic | tidak ada native → instruksi JSON di `system` + validasi zod |

Apa pun mekanismenya, **sumber kebenaran tetap zod** (`outputSchema`). Model
tetap bisa melanggar skema; pelanggaran menjadi `AI_BAD_STRUCTURE` (502),
bukan data setengah benar yang masuk ke database.

### 1.4 OpenAI-compat: downgrade bertahap, bukan tebak-tebakan

Banyak provider compatible hanya mendukung sebagian fitur. Alih-alih menebak
lewat env, adapter mencoba dari yang paling kaya lalu turun:

```
json_schema (strict) ──400──▶ json_object ──400──▶ tanpa response_format
       ▲                                              │
       └── instruksi skema selalu ada di system prompt ┘
```

Aturan penting supaya downgrade tidak menelan bug asli:

- hanya status **400/422** dengan pesan yang menyebut
  `response_format` / `json_schema` / `json_object` / `stream_options` /
  `include_usage` yang dianggap "fitur tidak didukung";
- 400 lain (mis. `model does not exist`) **diteruskan** apa adanya;
- mode yang berhasil **diingat per proses** (`workingMode`, `includeUsage`),
  jadi request berikutnya tidak membayar percobaan gagal;
- maksimal 3 tingkat percobaan, lalu `AI_GENERATION_FAILED` dengan pesan
  "provider menolak format permintaan" (bukan error mentah).

Model reasoning (`o1`/`o3`/`o4`/`gpt-5*`) diperlakukan berbeda: memakai
`max_completion_tokens`, tanpa `temperature` — karena OpenAI menolak keduanya.

### 1.5 Model: default per provider, dan sengaja kosong untuk openai-compat

```ts
const DEFAULT_MODELS = {
  gemini: 'gemini-3.6-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-latest',
  'openai-compat': '',   // ← sengaja kosong
};
```

Kalau `AI_MODEL_CHAT` kosong sementara provider `openai-compat`,
`resolveModelForOperation` melempar `AI_MODEL_NOT_CONFIGURED` (500, pesan
"hubungi admin"). Alternatifnya — mengirim string kosong ke API — menghasilkan
400 yang membingungkan dan log yang tidak berguna. Gagal cepat di sini lebih
jujur.

`GenerateOptions.model` (baru) memungkinkan override per request untuk Phase 2.
Kontraknya tegas: **nilai WAJIB sudah lolos allowlist server** sebelum sampai
ke adapter; adapter tidak memvalidasi ulang ke env.

### 1.6 API key: satu key, satu provider

`userApiKeys` sudah punya kolom `provider`. Sekarang kolom itu benar-benar
dipakai:

- `saveUserApiKey(userId, apiKey, provider)` memvalidasi bentuk key sesuai
  provider (`AIza…` Gemini, `sk-…` OpenAI, `sk-ant-…` Anthropic,
  token bebas untuk pihak ketiga) sebelum dienkripsi;
- `getUserApiKey` mengembalikan `{ key, provider }`;
- `resolveApiKey(userId, req, targetProvider)` **hanya** memakai key user kalau
  providernya cocok — key Gemini tidak boleh dikirim ke OpenAI (dan sebaliknya:
  itu akan membocorkan key ke vendor lain);
- header `x-custom-api-key` hanya berlaku untuk provider default server, karena
  header tidak membawa informasi provider.

`POST /api/user/api-key` menerima `provider` (default `gemini` untuk client
lama yang belum mengirim field ini).

### 1.7 Konfigurasi production (provider pihak ketiga)

Default tetap `gemini` — **perilaku production tidak berubah** sampai env diisi.
Untuk memindahkan production:

```bash
AI_PROVIDER=openai-compat
OPENAI_COMPAT_BASE_URL=https://<provider>/v1
OPENAI_COMPAT_API_KEY=<key>
AI_MODEL_CHAT=<model-cepat>
AI_MODEL_DIALOGUE=<model-untuk-date>
# AI_MODEL_FALLBACK opsional — hanya isi kalau yakin namanya benar
```

Catatan:

- Base URL **harus** berakhiran `/v1` (protokol Chat Completions).
- `GEMINI_API_KEY` masih wajib di `lib/env.ts` (utang, §3).
- CI `evals-live` **tetap Gemini**; secret provider pihak ketiga tidak masuk
  GitHub. Jadi jalur yang diuji CI dan jalur production berbeda provider —
  ini disengaja (biaya + kestabilan), dan ditutup oleh test stub `fetch` (§2).

### 1.8 Harga & usage

`lib/ai/pricing.ts` ditambah harga publik OpenAI & Anthropic. Model provider
pihak ketiga **tidak ditebak** harganya — bergantung paket yang dibeli; kalau
tidak terdaftar, biaya dicatat 0 dan dashboard tetap menampilkan token/model.
Lebih baik "biaya tidak diketahui" daripada angka karangan.

---

## 2. Test yang menjaga M8.1

| File | Cakupan |
|---|---|
| `tests/providers-common.test.ts` | normalisasi giliran, usage netral, resolusi model (termasuk guard model kosong), strict schema, instruksi JSON, klasifikasi retry |
| `tests/openai-provider.test.ts` | body request nyata via stub `fetch`: `json_schema` strict, `json_object`, downgrade saat 400, 400 model-tidak-ada tidak ditelan, `content_filter`, tidak ada key → tanpa request, stream SSE + `stream_options` |
| `tests/anthropic-provider.test.ts` | system + skema, normalisasi giliran, klamp/penghapusan temperature, `refusal`, `NO_CANDIDATE`, usage stream |
| `tests/api-keys.test.ts` | bentuk key per provider, provider tak dikenal, batas panjang |

Alasan memilih stub `fetch` daripada `vi.mock('openai')`: yang ingin dibuktikan
adalah **body request yang benar-benar dikirim SDK** (nama field, `strict`,
`stream_options`), bukan tiruan tangan yang bisa menyimpang dari perilaku nyata.

Gerbang yang dijalankan: `typecheck` 0 error · `test` 764/764 (dua kali) ·
`lint` hanya warning lama · `evals` 55/55 offline.

---

## 3. Utang teknis M8.1

1. **`GEMINI_API_KEY` masih wajib** di `lib/env.ts` walau production memakai
   provider lain. Seharusnya menjadi kondisional per `AI_PROVIDER`.
2. **`openai-compat` belum punya native JSON Schema**: kalau provider
   mendukungnya, kualitas struktur bisa naik. Perlu flag env eksplisit, bukan
   auto-detect (auto-detect = biaya request gagal).
3. **Anthropic tanpa structured output native**: SDK v1.3 punya
   `output_config` + `zodOutputFormat`. Jalur peningkatan yang disiapkan adalah
   itu atau tool-use paksa (`tool_choice`), bukan mengubah kontrak domain.
4. **Biaya provider pihak ketiga tidak diketahui** sampai harganya diisi di
   `pricing.ts`.
5. **`AI_MODEL_FALLBACK` lintas provider** belum divalidasi: kalau fallback
   diisi nama model Gemini sementara provider `openai-compat`, request kedua
   akan 400. Perlu validasi/peringatan saat start.
6. **Circuit breaker per proses** (warisan M2.6) — bukan breaker terdistribusi.
7. **Migrasi `0006` wajib dijalankan** sebelum deploy Phase 2: tanpa kolom
   `userProfiles.preferred_model`, query profil (termasuk chat) gagal.
   Jalankan `bun run db:migrate` (atau `db:push` di dev) lebih dulu.
8. **`AI_MODEL_FALLBACK` tidak divalidasi provider**: kalau diisi nama model
   vendor lain, jalur fallback akan 400. Isi hanya model dari provider aktif.

---

## 4. M8.1 Phase 2 — selector model (selesai)

Tujuan: user boleh memilih model dari daftar yang **server** tentukan, tanpa
membuka pintu ke model sembarang (yang bisa membakar biaya atau memicu 400).

### 4.1 Rantai keputusan

```
Settings UI (dropdown)
   │  GET /api/user/model  → { model, models[] }   ← models dari AI_ALLOWED_MODELS
   │  POST { model } atau { model: null }          ← null = model server
   ▼
lib/ai/user-model.ts  ── isModelAllowed() ──▶ tolak 400 INVALID_MODEL
   │  simpan userProfiles.preferred_model
   ▼
loadChatTurnContext / route date
   └─ sanitizePreferredModel(profile.preferredModel)   ← pilihan usang → undefined
        └─ GenerateOptions.model → adapter → provider
```

Kenapa validasi **di server, setiap kali** (bukan hanya saat menyimpan):
allowlist bisa berubah setelah user menyimpan. Kalau owner menghapus model,
pilihan lama harus berhenti dipakai — bukan terus dikirim sampai provider
menolaknya. `sanitizePreferredModel` melakukan itu dan mencatat
`ai.preferred_model_not_allowed` supaya ada jejak.

### 4.2 Kenapa route API, bukan Server Action

Seluruh mutasi user di app ini lewat `/api/*` + `apiHandler`: auth, rate limit,
audit, dan pemetaan error sudah terpasang di sana. Menambah satu jalur Server
Action berarti dua pola keamanan yang harus diaudit terpisah — untuk satu
dropdown, itu tidak sepadan. Keputusan ini menggantikan rencana awal di §4.

### 4.3 Allowlist: fail-closed

`AI_ALLOWED_MODELS` kosong **bukan** berarti "semua model boleh". Yang
ditawarkan hanya model yang memang dipakai server (`AI_MODEL_CHAT`,
`AI_MODEL_DIALOGUE`, `AI_MODEL_FALLBACK`). Artinya: tanpa konfigurasi tambahan,
user tidak mendapat katalog lebih luas daripada yang sudah dibayar owner.

### 4.4 Provider API key di UI

Form BYOK sekarang punya pilihan provider (Gemini / OpenAI / Anthropic /
OpenAI-compatible) karena key disimpan bersama providernya dan hanya dipakai
kalau cocok dengan provider yang melayani request (§1.6). Placeholder input
mengikuti format provider, jadi typo bentuk key tertangkap sebelum disimpan.

### 4.5 Perbaikan yang ikut terbawa

`lib/gemini.ts` dulu mencatat `provider: 'gemini'` **hardcode** di setiap
`recordProviderUsage`. Setelah multi-provider itu berarti biaya OpenAI
tercatat atas nama Gemini di `/usage`. Sekarang memakai
`getAIConfig().provider`. Pesan error "server AI Google" juga dinetralkan
menjadi "server AI".

### 4.6 Test

`tests/model-selection.test.ts` (11 kasus): parsing allowlist, dedupe,
fail-closed tanpa allowlist, katalog kosong untuk provider tanpa model default,
pencocokan case-sensitive, dan pilihan usang yang jatuh ke model server.

Gerbang: `typecheck` 0 · `test` 775/775 (dua kali) · `lint` hanya warning lama ·
`evals` 55/55.

### 4.7 Deploy Phase 2

1. `bun run db:migrate` — **wajib lebih dulu** (kolom `preferred_model`).
2. Set `AI_ALLOWED_MODELS` di Vercel (contoh:
   `deepseek-v4.1-flash-1017,gpt-6-luna,gemini-3.8-flash`).
3. Redeploy, lalu cek `/settings` (dropdown muncul) dan `/usage`
   (provider tercatat benar).

---

## 5. M8.3 — Tool calling (selesai)

Tujuan: Livia jadi asisten sungguhan — "Livia, ingetin aku jam 7",
"Livia, catat belanja telur & susu" — lewat chat biasa.

### 5.1 Keputusan desain: JSON tools single-turn

Mekanisme **bukan** native function calling per provider. Alasan:

- Native function calling beda format di tiap provider (Gemini
  `functionDeclarations`, OpenAI/Anthropic `tools`) — memaksakannya berarti
  menyentuh 3-4 adapter sekaligus dan mahal (≥2 putaran LLM per pesan tool).
- `lib/ai/types.ts` sudah memaksa output JSON terstruktur. Livia cukup
  mengembalikan field opsional `tools: [{name, args}]` di JSON balasannya.
- Server memvalidasi tiap tool dengan zod per-tool, mengeksekusi, lalu
  menyisipkan baris konfirmasi faktual ke reply. **Satu putaran LLM**, murah,
  tanpa menyentuh kontrak provider. (Kontrak provider tidak diubah sama sekali.)

Alur satu turn:

```
user: "ingetin aku jam 7 minum obat"
  → Livia (JSON): { reply: "Siap!", tools: [create_reminder...] }
  → server: eksekusi tool (validasi zod + insert DB)
  → reply final: "Siap! [✓] Pengingat dibuat: ... untuk 2026-10-30 19:00."
```

### 5.2 Tool awal & domain

| Tool | Args | Efek |
|---|---|---|
| `create_reminder` | `{ text, time }` | Insert tabel `reminders` (content, remindAt) |
| `add_shopping_item` | `{ item }` | Insert tabel `shoppingItems` (name) |
| `list_shopping_items` | `{}` | Baca daftar belanja (hasil → baris konfirmasi) |

Skema DB (migrasi `0007`): tabel `reminders` (userId FK cascade, content,
remindAt timestamptz, status active/done/cancelled, index userId+status) dan
`shoppingItems` (userId FK cascade, name, checked, index userId+createdAt).

Waktu relatif: `lib/tools/time.ts` mem-parse "jam 7", "besok jam 9 pagi",
"jam 7 malam", "7:30", ISO absolute. Zona waktu user dikirim browser
(`offsetMinutes`, WIB = -420), semua hitungan "jam dinding" di zona itu lalu
dikonversi ke UTC. Waktu ambigu/tak dikenali → tool mengembalikan `[?]` dan
Livia meminta kejelasan (bukan gagal).

### 5.3 Server & keamanan

- `lib/tools/registry.ts` — daftar tool + zod schema (registry tunggal).
- `lib/tools/execute.ts` — executor murni; **tidak pernah melempar** ke route
  (gagal DB → `ok:false` + log, bukan 500).
- Field `tools` di `liviaReplyValidator` **non-kritis** (pola `memories`):
  bentuk aneh → `[]`, tool invalid dibuang satu per satu, tidak pernah
  menggagalkan balasan. Tidak ditambahkan ke `required` responseSchema.
- Nama tool divalidasi terhadap registry (`TOOL_NAME_SET`); args harus plain
  object; maksimal 5 tool per balasan (`MAX_TOOLS_PER_REPLY`).
- Eksekusi terjadi **setelah** generate, **sebelum** `persistChatTurn`; hasil
  disisipkan ke reply yang tersimpan. Tool yang gagal internal di-skip.
- Route `/api/reminders` + `/api/shopping` (GET/POST/PATCH) memakai pola
  `apiHandler`/`jsonApiHandler` dan fungsi store yang sama dengan executor —
  tidak ada duplikasi logika.

### 5.4 Konteks ke model & penyampaian reminder

- Blok "REMINDER & BELANJA" disisipkan ke `buildChatReplyPrompt` hanya kalau
  ada data — Livia tahu reminder aktif & daftar belanja tanpa query tool.
- Penyampaian: daftar reminder aktif di UI `/schedule` (panel Pengingat &
  Daftar Belanja) + Livia menyebutkan reminder yang lewat saat user ngobrol
  lagi. **Belum ada push/cron** (ranah M8.5).
- UI memakai fetch ke route baru; form "tambah reminder" mengubah "jam 7"
  → `datetime-local` (durasi/fuzzy kecil, server tetap otoritatif).

### 5.5 Test & gerbang

`tests/tools.test.ts` (coerce tools, validasi `tools` di liviaReplyValidator,
parse waktu relatif, executor, registry) + `tests/tools-routes.test.ts`
(route reminders & shopping; store di-mock global di `tests/setup.ts` pola
`@/lib/auth`/usage).

Gerbang: `db:check-drift` sinkron (0007) · `typecheck` 0 error · `test`
812/812 (dua kali) · `lint` hanya warning lama · `evals` 55/55 offline.

### 5.6 Deploy

1. `bun run db:migrate` — **wajib lebih dulu** (tabel reminders/shoppingItems).
2. Redeploy. Cek: `/schedule` (panel muncul), chat "ingetin aku jam 7"
   (balasan berisi `[✓] Pengingat dibuat: ...`).
3. `_journal`/`0007` sudah digenerate; production memakai `db:migrate`
   sebenarnya (bukan push).

---

## 6. M8.4 — Gamifikasi server-validated (selesai)

Tujuan: quest & achievement pindah dari localStorage (bisa dipalsukan, tidak
sinkron antar perangkat) menjadi **otoritas server penuh**. Keputusan user:
**tanpa leaderboard**.

### 6.1 Keputusan desain

- **Server = satu-satunya sumber kebenaran.** Progress quest = jumlah aksi
  yang BENAR-BENAR tercatat di tabel `dailyQuests` hari itu. LocalStorage
  tidak lagi dipakai sebagai otoritas (sisa event lokal hanya untuk refresh UI
  instan, angka otoritatif tetap dari server).
- **Aksi yang direkam** (whitelist `ALLOWED_ACTIONS` di `quests.server.ts`):
  - visit route (`visit_radio`, `visit_bedroom`, ...) dari `QuestTracker`;
  - sentuh Livia (`touch_livia`) dari `HomeClient`;
  - tool chat M8.3 (`tool_create_reminder`, `tool_add_shopping_item`,
    `tool_list_shopping_items`) dari `executeToolCalls` (JSON + stream).
- **Anti-cheat**: klaim quest/milestone diverifikasi server (count >= required
  & belum diklaim). Aksi di luar whitelist ditolak 400. Klaim idempoten via
  unique index `userId+date+action` + cek baris klaim.
- **Reward**: quest = +15 Rv; milestone 3/6/9 = 100/300/500 Rv (+3 afeksi di
  9) — semua sekali per hari (idempoten), pakai `moneyPlusExpr`/ekspresi SQL
  atomik (pola M5.4).

### 6.2 Struktur

| File | Peran |
|---|---|
| `lib/db/schema.ts` → `dailyQuests` | Tabel progress/klaim (unique `userId+date+action`, index parsial klaim) |
| `drizzle/0008_friendly_madame_web.sql` | Migrasi tabel baru |
| `lib/livia/quests.pool.ts` | Katalog quest murni (tanpa localStorage/window, dipakai client+server) |
| `lib/livia/quests.server.ts` | Logika server: record/state/claim/milestone/anti-cheat |
| `lib/livia/quests.ts` | Sisi client: re-export katalog + `recordQuestAction` → POST `/api/quests/action` (fire-and-forget) + event lokal |
| `app/api/quests/route.ts` (+`action`/`claim`/`milestone` subroute) | GET state, POST rekam/klaim/milestone (jsonApiHandler + mutationRateLimit) |
| `features/schedule/ScheduleClient.tsx` | UI server-driven (fetch state, klaim via API, fallback katalog lokal) |
| `lib/tools/execute.ts` | `executeToolCalls` → `{ lines, tools }` (nama tool sukses untuk rekam quest) |
| `tests/quests-routes.test.ts`, `tests/quests.test.ts`, `tests/tools.test.ts` | Test M8.4 (route + server + tools) |

### 6.3 Alur

1. `QuestTracker`/`HomeClient`/tool chat memanggil `recordQuestAction` →
   `POST /api/quests/action` → `recordQuestActionServer` (upsert atomik
   `count+1`).
2. `/schedule` fetch `GET /api/quests?date=YYYY-MM-DD` → state (quests,
   progress, claimed, milestones).
3. Klaim quest → `POST /api/quests/claim` → `claimQuestRewardServer` (+15 Rv,
   idempoten); klaim milestone → `POST /api/quests/milestone`.
4. Tanggal lokal user dikirim client (server reject format non-YYYY-MM-DD);
   tool chat memakai `utcToday()` sebagai default.

### 6.4 Anti-cheat & idempotensi

- `ALLOWED_ACTIONS` whitelist ketat — aksi tak dikenal → 400.
- Klaim tanpa `count >= required` → 400 `INSUFFICIENT_PROGRESS`.
- Klaim ganda → 400 `ALREADY_CLAIMED` (cek baris `questId`).
- `mutationRateLimit` di semua route quest (per user).

### 6.5 Test & gerbang

- `tests/quests-routes.test.ts` (route GET/action/claim/milestone, mock global
  `@/lib/livia/quests.server` di `tests/setup.ts`), `tests/quests.test.ts`
  (katalog + record tanpa window), `tests/tools.test.ts` (kontrak baru
  `{ lines, tools }`).
- Verifikasi penuh: drift sinkron, typecheck 0, test 822/822 (2×), lint hanya
  warning lama, evals HARD 55/55.

### 6.6 Deploy

1. `bun run db:migrate` — **wajib lebih dulu** (tabel `dailyQuests`).
2. Redeploy. Cek: `/schedule` menampilkan quest dari server; visit route /
   sentuh Livia menambah progress; klaim quest & milestone memberi Rv/afeksi.
3. `_journal`/`0008` sudah digenerate; production memakai `db:migrate`
   sebenarnya (bukan push).

---

## 7. M8.5 — PWA/native (selesai)

Tujuan: jadikan Teman Kos bisa di-install (add-to-home-screen) dan mengirim
push notification, tanpa library berat (`next-pwa`) — cukup `manifest.json` +
service worker hand-written + `web-push`.

### 7.1 Keputusan desain

- **Manifest + service worker hand-written** (bukan `next-pwa`) supaya kontrol
  penuh atas strategi cache & tidak menambah dependency config. `next-pwa`
  tidak dipakai (Next 14 App Router + `force-dynamic` perminta packet berbeda).
- **Offline cache = app shell + aset statis** (pilihan user): precache
  `/offline` + ikon; network-first untuk navigasi (halaman dinamis), cache-first
  untuk aset ber-contenthash (`_next/static`, gambar); API (`/api/...`) TIDAK
  pernah di-cache.
- **Push via `web-push`** (pilihan user): VAPID + enkripsi ECDH otomatis.
- **Tiga pemicu push** (pilihan user): reminder lewat waktu (cron), pomodoro
  selesai (client fire-and-forget), "Livia kangen" harian (cron, user yang
  tidak aktif kemarin).

### 7.2 Struktur

| File | Peran |
|---|---|
| `public/manifest.json` | Manifest PWA (name, icons 192/512/maskable, tema) |
| `public/sw.js` | Service worker (precache shell, routing cache, push, klik) |
| `public/icon*.png` + `icon.svg` | Ikon (dibuat dari SVG via `@resvg/resvg-js`) |
| `public/offline` … `app/offline/page.tsx` | Halaman fallback offline |
| `lib/push/push.server.ts` | Kirim push (VAPID, cleanup endpoint mati, log) |
| `lib/push/push-client.ts` | Sub/unsub client + daftar SW + status |
| `lib/push/validate.ts` | Validasi subscription (anti-abuse) |
| `lib/push/cron-guard.ts` | Guard autorisasi cron (Bearer CRON_SECRET) |
| `app/api/push/subscribe|vapid|send/route.ts` | API subscription + kirim pomodoro |
| `app/api/cron/reminders|miss-you/route.ts` | Cron push terjadwal |
| `vercel.json` | Jadwal Vercel Cron (reminders */5, miss-you harian 09 UTC) |
| `components/PwaProvider.tsx` | Daftar SW + restore subscription saat boot |
| `lib/db/schema.ts` → `pushSubscriptions`+`pushSentLogs`+`reminders.notifiedAt` | Penyimpanan |

### 7.3 Alur push

1. User aktifkan toggle di Settings → `pushManager.subscribe` (VAPID) →
   `POST /api/push/subscribe` (validasi + upsert).
2. Pemicu:
   - **Reminder lewat**: cron `*/5` → ambil `reminders` active & lewat &
     `notifiedAt` null → kirim push → set `notifiedAt` (dedupe).
   - **Pomodoro selesai**: client `POST /api/push/send` (hanya tab hidden).
   - **Livia kangen**: cron harian → user punya subscription & TIDAK aktif
     kemarin (`userActivityDaily`) & belum dikirimi hari ini (`pushSentLogs`).
3. `web-push` kirim; 404/410 (endpoint mati) → hapus subscription.

### 7.4 Keamanan & ketahanan

- `validPushSubscription`: endpoint wajib https://, keys base64url, panjang
  wajar — menolak isian asing (anti-abuse endpoint orang lain).
- `isCronAuthorized`: Bearer token `CRON_SECRET` (Vercel Cron mengirim header
  otomatis) — mencegah panggil cron massal tanpa izin.
- Teks push dari server (default per kind), bukan teks bebas client.
- Kegagalan push 4xx/5xx di-log, tidak menggagalkan cron/route.
- Push nonaktif total kalau env VAPID belum diset (service worker tetap jalan).

### 7.5 Test & gerbang

- `tests/push.test.ts`: validasi subscription, guard cron, deteksi push enabled
  (14 test, murni tanpa DB/network).
- Fix isolasi rate limit mock (`beforeEach(resetMockRateLimit)` di setup) —
  bug laten `isolate: false` yang jadi flake saat file test baru ditambah.
- Verifikasi penuh: drift sinkron, typecheck 0, test 836/836 (2×), lint hanya
  warning lama, evals HARD 55/55.

### 7.6 Deploy

1. `bun run db:migrate` — **wajib lebih dulu** (tabel `pushSubscriptions`,
   `pushSentLogs`, kolom `reminders.notified_at`).
2. Set env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
   `CRON_SECRET` (generate: `npx web-push generate-vapid-keys --json`).
3. Deploy `vercel.json` (cron) + redeploy. Cek: install banner muncul, toggle
   notifikasi di Settings menyimpan subscription, selesai pomodoro (tab
   tersembunyi) memunculkan notifikasi, cron reminder/miss-you tereksekusi.
4. `_journal`/`0009` sudah digenerate; production memakai `db:migrate`.
