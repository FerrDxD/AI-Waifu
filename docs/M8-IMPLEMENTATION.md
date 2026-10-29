# M8 — Paritas Fitur Komersial

Dokumen ini mencatat pekerjaan M8, keputusan desain yang mengikat, dan utang
teknis yang tersisa. Ditulis bertahap; bagian yang belum dikerjakan tetap
berstatus rencana.

Status: **M8.1 Phase 1 & Phase 2 SELESAI** (multi-provider engine + selector
model di settings). **M8.2 Phase A & Phase B SELESAI** (engine karakter
data-driven + karakter aktif + progres terpisah per karakter). M8.3–M8.7 belum
dimulai.

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

## 5. M8.2 Phase A — engine karakter data-driven (selesai)

Tujuan: persona bukan lagi kode, tapi **data**. Masih ada satu karakter
yang aktif di app (Livia), tapi menambah karakter lain tidak lagi
menyentuh `lib/ai/persona.ts` — cukup tambah satu file JSON.

### 5.1 Struktur

```
content/characters/livia.json   ← data persona Livia (disalin persis dari kode lama)
content/characters/ayame.json   ← senpai tegas, 20 th
content/characters/enji.json    ← kouhai pemalu, 18 th
content/characters/laura.json   ← IBU Livia (non-romantis), 42 th
content/characters/naomi.json   ← onee-san lembut, 22 th
lib/characters/registry.ts      ← zod validation + getCharacter() + resolveSpriteExpression()
lib/ai/persona.ts               ← buildCharacterIdentity(character, input); buildLiviaIdentity = wrapper
lib/livia/cycle.ts              ← describePhysiologicalState(..., name?) — default "Livia"
components/livia/LiviaSprite.tsx ← prop `characterId`; folder datar + fallback ekspresi
```

Skema zod (`CharacterSchema`) menolak data rusak saat modul dimuat:
stage afeksi harus persis tiga (0-1/2-3/4-5), `marriedAtChapter` wajib
punya teks `married`, id tidak boleh duplikat, `defaultExpression`
harus benar-benar ada di daftar ekspresi.

### 5.2 Constraint yang dijaga

- **Prompt Livia byte-identical.** `tests/characters.test.ts` membandingkan
  `buildCharacterIdentity(getCharacter('livia'), input)` dengan
  `buildLiviaIdentity(input)` (implementasi lama) untuk 7 kombinasi input
  (menikah/belum, voice call, stats, memori, barang, EN/ID). Evalu
  `Kamu adalah Livia Einhart, gadis`, `tsundere`, dan
  `Kondisi Fisik & Biologis Livia` tetap lolos 55/55.
- **Level afeksi (`Orang Asing`…`Rumah`) bersifat shared** — semua karakter
  memakai ambang yang sama, hanya deskripsi per level yang berbeda.
- **`INJECTION_GUARD` dan aturan voice call** universal (tidak menyebut
  nama karakter), dipakai bersama oleh semua karakter.

### 5.3 Keputusan persona

Sesuai keputusan user: **Laura adalah ibu Livia** (Non-romantis — promptnya
secara eksplisit menulis "Kamu adalah IBU, bukan pasangan romantis User";
`marriedAtChapter` tidak diisi). Persona Ayame/Enji/Naomi diciptakan
assistant sendiri, dirancang dari ekspresi sprite yang tersedia
(mis. Naomi tidak punya pose `angry` → karakter yang tidak pernah marah).
Sprite `laura/` adalah folder `story-bab`; `rikuto.webp` di `ayame/`
adalah pose unik yang dipakai sebagai fallback `clingy`/`flirty`.

### 5.4 Yang sudah dikerjakan di Phase B

Fase berikutnya yang direncanakan di sini semuanya terealisasi (lihat §6):
`characterId` di `userProfiles` + pemilih karakter (settings + shortcut home),
progres dipisah per karakter (snapshot swap transaksi), dan prompt
`summary.ts`/`memory.ts` diparameter per karakter dari data JSON.

### 5.5 Yang masih Livia-only (keputusan produk)

Konten bertema Livia (16 chapter, quest, items, resep, TTS voice, sprite
outfit) **tetap milik Livia** — karakter lain hanya punya ekspresi datar.
Lihat §6.2 untuk daftar gerbangnya.

Gerbang: `typecheck` 0 · `test` 799/799 (dua kali) · `lint` hanya warning
lama · `evals` 55/55 offline.

---

## 6. M8.2 Phase B — karakter aktif & progres terpisah (selesai)

Tujuan: user boleh memilih karakter yang menemani; progres tiap karakter
benar-benar terpisah — afeksi, memori, riwayat chat, bab cerita. **Tanpa
utang milestone**: semua keputusan scope dibuat eksplisit (§6.1).

### 6.1 Keputusan produk (diputuskan bersama user)

1. **Companion-only.** Karakter selain Livia dapat: chat, kencan, afeksi,
   memori, home screen. Sistem life-sim (cerita bab, koper, lemari, toko,
   dapur, kebun) **dan panggilan suara** tetap milik Livia — dengan gerbang
   server 403 `FEATURE_LOCKED` + pemberitahuan UI.
2. **Pemilih karakter di Settings + shortcut home screen.** Onboarding
   tetap berjalan cerita Livia (tidak diubah).
3. **Voice call Livia-only** sampai ada `voiceId` per karakter (kläu suara
    ElevenLabs tunggal dipakai untuk Livia, suara karakter lain belum ada).
4. **Snapshot per karakter.** Berganti karakter = profil aktif dipotret ke
   `characterProgress`, snapshot karakter tujuan dimuat ke profil, dalam
   **satu transaksi**. Balik ke karakter lama = progres persis seperti
   saat keluar.

### 6.2 Gerbang fitur (data-driven)

Setiap karakter JSON punya blok:

```json
"features": { "lifeSim": true, "story": true, "voiceCall": true },
"memory":   { "consolidationPersona": "...", "summaryIdentity": "...",
               "summaryPerspective": "...", "speakerLabel": "..." },
"dating":   { "intro": "...", "enPersonalityPhrase": "..." }
```

Hanya Livia yang `true` di ketiga fitur. Pemisahnya:

| Lapisan | Tempat | Perilaku |
|---|---|---|
| Server (aman) | `lib/characters/gates.ts` → `assertFeature(character, 'lifeSim'\|'story'\|'voiceCall')` | `AppError('FEATURE_LOCKED', …, 403, expose)` |
| Server route | gift, cook, kitchen, garden (GET+POST), outfit (GET+POST), hometown-items, bedroom/sleep, story/complete, tts, actions `cookRecipe` | gerbang di awal handler |
| Client (UX) | `components/characters/CharacterGate.tsx` | bungkus konten halaman → pemberitahuan; `useActiveCharacter` + `hasFeature` |
| Halaman tergate | `/story`, `/wardrobe`, `/shop`, `/kitchen`, `/garden`, `/inventory`, `/album`, `/call` | non-Livia melihat notice, route server tetap menolak mutasi |

`updateAffection` (Server Action, sentuhan home) sengaja **tidak** digate —
afeksi memang dimiliki semua karakter companion.

### 6.3 Skema DB & migrasi 0007

`userProfiles` tetap menyimpan kondisi karakter **AKTIF** (kolom progres
dibaca ~30 file melalui `profile.affection` dll — menghindari rewrite besar):

- `userProfiles.activeCharacterId text NOT NULL DEFAULT 'livia'`.
- Tabel baru `characterProgress(userId, characterId)` — snapshot per
  karakter (afeksi, level, outfit, items, buff/debuff, hunger/energy/
  hydration, cycle anchor, memori lama), unique index `(user_id, character_id)`.
- `chatMessages`, `messageSummaries`, `memoryItems` dapat kolom
  `character_id text NOT NULL DEFAULT 'livia'` + index.
- `storyProgress` unique `(userId)` → unique `(userId, characterId)`.

Migrasi `drizzle/0007_workable_madame_web.sql` juga **backfill**: profil
yang sudah ada dipotret sebagai snapshot Livia pertama
(`INSERT INTO characterProgress SELECT … FROM userProfiles ON CONFLICT
DO NOTHING`) — tanpa ini, user lama kehilangan progres Livia-nya saat
pertama kali berganti karakter.

**Deploy: `bun run db:migrate` wajib lebih dulu** (lihat §6.7).

### 6.4 Snapshot swap (satu transaksi)

`lib/characters/switch.ts` — `switchActiveCharacter(userId, nextId)`:

1. profil aktif saat ini → upsert snapshot karakter yang ditinggalkan;
2. snapshot karakter tujuan → profil (atau default: afeksi 0, stat 100,
   tanpa items — "karakter baru dikenal");
3. `activeCharacterId` ditulis;
4. snapshot karakter tujuan dihapus (nilainya sudah hidup di profil;
   akan dipotret lagi saat user berganti keluar).

Karakter yang tidak dikenal ditolak 400 `INVALID_CHARACTER` (pilihan tidak
boleh diam-diam bergeser), tapi `getActiveCharacter` **fail-closed ke Livia**
supaya aplikasi tidak pecah walau data anomali.

Sistem shared (uang, model AI, API key, layar/pomodoro) **tidak ikut**
berganti — itu milik user, bukan karakter.

### 6.5 Partisi data per karakter

| Modul | Perubahan |
|---|---|
| `lib/livia/chat-turn.ts` | ctx.character; riwayat, story, memori, insert `chatMessages` per `characterId` |
| `lib/livia/memory.ts` | `addMemories`/`retrieve*`/`listMemories`/`deleteAllMemories(userId, characterId?)`/`maybeConsolidateMemory` ter-scope per karakter; `buildConsolidationInstructions(character)` mengganti konstanta hardcode |
| `lib/livia/summary.ts` | `loadSummaries`/`maybeSummarizeChats` per karakter; `buildSummaryInstructions(character)` |
| `lib/livia/affection.server.ts` | `applyAffectionAtomic`/`ensureUnlockedChapters` terima `character?` (karakter tanpa `features.story` tidak menyentuh `storyProgress`) |
| `lib/gemini.ts` | `ChatPromptInput.characterId`; `generateLiviaResponse`/`streamLiviaReply`/`generateDateDialogue`/`generateDateResponse` terima `characterId`; prompt date di-drive dari `dating.*` + `hasPhysiology` |
| Route | chat (+stream, history), date (+chat), memory, affection, dan semua route life-sim (§6.2) |
| `/api/affection` GET | mengembalikan `characterId`; decay stat hanya untuk karakter dengan fisiologi |

`deleteAllMemories(userId)` tanpa `characterId` tetap menghapus **semua
karakter** — dipakai alur GDPR (`lib/safety/data-control.server.ts`).

### 6.6 Client

- `app/api/user/character/route.ts` — GET (pilihan + aktif) / POST (switch),
  pola identik `/api/user/model`: `apiHandler`, rate limit, audit event
  `character.switch`.
- `lib/client/character.ts` — hook `useActiveCharacter` (fetch + save), pola
  `useModelPreference`.
- `components/characters/CharacterPicker.tsx` — grid pemilih (sprite preview
  dari data server); dipakai di Settings (section) & home (modal).
- Home: shortcut tombol karakter (pojok kanan atas), sprite `characterId`,
  sapaan & reaksi sentuh **fallback generik** untuk companion
  (`features/home/greeting.ts` / `touch-interactions.ts` — jalur Livia
  byte-identik, lihat test), stat island hanya untuk Livia, preloader
  karakter-aware (`preloadCharacterSprites`).
- Chat: header menampilkan karakter aktif + tombol call hanya untuk
  karakter dengan `voiceCall`.
- Date: outfit & karakter dari `/api/affection` (bukan `/api/outfit` yang
  sekarang lifeSim-only), sprite `characterId`.

### 6.7 Deploy Phase B

1. `bun run db:migrate` — **wajib** (kolom + tabel + backfill 0007).
2. Redeploy; cek `/settings` (section Karakter), home (shortcut pojok kanan
   atas), chat & date dengan karakter non-Livia.

### 6.8 Test

`tests/characters-features.test.ts`: hanya Livia yang punya ketiga fitur;
blok `memory`/`dating` lengkap untuk semua karakter; `assertFeature`
melempar `FEATURE_LOCKED` 403 untuk companion; instruksi
summarizer/konsolidasi Livia **identik dengan teks hardcode lama**
(regression); instruksi non-Livia menyebut karakternya; sapaan companion
tidak membawa kepribadian Livia.

### 6.9 Yang berikutnya (bukan utang Phase B — pencapaian berikutnya)

- `voiceId` per karakter (data JSON) → buka kembali `voiceCall` untuk
  karakter lain.
- Konten life-sim per karakter (quest, resep, item, outfit sprite) kalau
  diminta — saat ini sengaja Livia-only, bukan utang: keputusan produk.
