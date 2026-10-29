# M8 — Paritas Fitur Komersial

Dokumen ini mencatat pekerjaan M8, keputusan desain yang mengikat, dan utang
teknis yang tersisa. Ditulis bertahap; bagian yang belum dikerjakan tetap
berstatus rencana.

Status: **M8.1 Phase 1 SELESAI** (multi-provider di lapisan engine).
Phase 2 (selector model di UI + allowlist server) dan M8.2–M8.7 belum dimulai.

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
7. Phase 2 belum ada: selector model di UI, allowlist `AI_ALLOWED_MODELS`,
   kolom `userProfiles.preferredModel`.

---

## 4. Selanjutnya (Phase 2)

1. Migrasi `userProfiles.preferredModel` (nullable, default null = pakai env).
2. `lib/ai/model-selection.ts`: parse `AI_ALLOWED_MODELS`, validasi pilihan
   user terhadap allowlist **dan** provider aktif.
3. Server Action + dropdown model di `features/settings/SettingsClient.tsx`,
   plus form BYOK yang mengirim `provider`.
4. Wiring: route chat/date meneruskan `model` tervalidasi ke `GenerateOptions`.
5. Gate + dokumentasi + commit.
