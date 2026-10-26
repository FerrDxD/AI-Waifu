# M2 — AI Engine Overhaul (bagian 1: fondasi)

Dokumen ini mencatat apa yang **sudah** dikerjakan di M2, bug nyata yang
ditemukan saat mengerjakannya, dan apa yang **belum**.

Status: M2.2, M2.3, M2.4 selesai. M2.6 sebagian. M2.1, M2.5, M2.7 belum.

---

## 1. Ringkasan

Sebelum M2, seluruh akses Gemini ada di satu file `lib/gemini.ts` (≈470 baris)
yang mencampur 4 tanggung jawab: SDK Google, prompt persona, skema output, dan
penanganan error. Nama model `gemini-3.6-flash` di-hardcode **3 kali**. Logika
siklus haid di-copy-paste identik di **3 route**. JSON dari model dipanen pakai
regex `/\{[\s\S]*\}/` lalu `JSON.parse`, dengan penambalan `'"} '` yang bisa
menghasilkan JSON tidak valid.

Sesudah M2 (bagian ini):

| Tanggung jawab | Sekarang di |
| --- | --- |
| Kontrak provider | `lib/ai/types.ts` |
| Konfigurasi model/timeout/retry | `lib/ai/config.ts` |
| Skema output + validasi | `lib/ai/schemas.ts` |
| Satu-satunya file yang menyentuh SDK | `lib/ai/providers/gemini.ts` |
| Persona Livia | `lib/ai/persona.ts` |
| Siklus haid | `lib/livia/cycle.ts` |
| Helper request (API key, bahasa) | `lib/ai/request.ts` |
| Pemilihan provider | `lib/ai/index.ts` |
| Facade domain (dipakai route) | `lib/gemini.ts` (≈270 baris) |

`lib/gemini.ts` **tidak dihapus** karena ~8 komponen client meng-import
`LiviaExpression` dari sana. File itu sekarang jadi facade tipis dan
me-re-export nama lama, jadi tidak ada satu pun komponen client yang perlu
diedit.

---

## 2. Bug nyata yang ditemukan

### 2.1 `generate()` menelan semua error jadi satu pesan generik

Versi pertama `GeminiProvider.generate` membungkus **semua** kegagalan menjadi
`AI_GENERATION_FAILED` ("Gagal menghubungi server AI Google"). Akibatnya user
yang kehilangan `GEMINI_API_KEY` melihat pesan "server sibuk", bukan "AI belum
dikonfigurasi". Test `tests/ai-provider.test.ts` menangkap ini.

Perbaikan: `AppError` yang sudah terklasifikasi langsung di-`throw` ulang, tidak
diulang, tidak ditimpa. Hanya error tak dikenal (jaringan, 5xx mentah) yang
diubah jadi pesan generik.

### 2.2 `JSON.parse` mentah dikira error jaringan

`JSON.parse` yang gagal melempar `SyntaxError` tanpa properti `status`. Fungsi
`isRetryableError` menganggap "tanpa status = error jaringan", jadi model yang
mengembalikan JSON rusak **diulang 3 kali** lalu tetap gagal dengan pesan yang
salah. Sekarang parse gagal → `AI_BAD_STRUCTURE` (tidak diulang).

### 2.3 Model fallback tidak pernah dipakai untuk `date.dialogue`

Pemilihan model dilakukan **di dalam** percobaan (`operation === 'date.dialogue'
? dialogueModel : modelName`), sehingga saat fallback dipanggil, nama model
fallback langsung ditimpa kembali oleh `dialogueModel`. Fallback praktis mati
untuk operasi kencan. Sekarang model utama di-resolve sekali di `generate()`,
percobaan menerima nama model eksplisit.

### 2.4 Validator terlalu ketat untuk field non-kritis

`affectionDelta`, `expression`, dan `memoryUpdate` awalnya `z.number()` /
`z.string()`. Kalau model mengirim `"5"` (string), `null`, atau `Infinity`,
**seluruh balasan dibuang** — padahal teks balasannya sudah bagus. Sekarang
field non-kritis memakai `coerceField()`: tipe apa pun diterima, dikoersi ke
nilai aman (clamp ±5, ekspresi tak dikenal → `normal`, string kosong).

Yang tetap ketat hanya `reply` — tanpa teks balasan, respons memang tidak
berguna.

### 2.5 `itemsBrought` kosong mengubah persona

Sempat saya buat `itemsBrought.length > 0 ? itemsBrought : undefined`, yang
membuat blok kepribadian hilang total kalau user tidak membawa barang. Perilaku
lama selalu membangun blok itu (semua barang tercatat "tertinggal di rumah").
Karena ini perubahan persona, bukan refactor, **dikembalikan ke perilaku lama**
dan dicatat sebagai kandidat eval M2.7.

### 2.6 Blok aturan voice call muncul dua kali

`describePhysiologicalState({ voiceCall: true })` dan `buildLiviaIdentity`
sama-sama menambahkan aturan TTS. Prompt jadi berulang dan model cenderung
mengabaikan salah satunya. Sekarang satu tempat saja
(`buildLiviaIdentity`), dan ada test yang mengunci jumlah kemunculannya = 1.

---

## 3. Yang dibangun

### 3.1 `lib/ai/types.ts` — kontrak provider

Aturan penting yang dikunci di sini: **provider tidak boleh `throw` untuk
penolakan safety filter**. Itu bukan error, itu hasil yang sah
(`{ data: null, blocked: true }`). Domain yang memutuskan mau bilang apa ke
user. `GenerateResult` juga membawa `model`, `usedFallback`, `latencyMs` —
tanpa ini mustahil mengukur kualitas per model (M2.7).

### 3.2 `lib/ai/config.ts` — konfigurasi dari env

Semua dari environment, dengan nilai lama sebagai default supaya perilaku tidak
berubah kalau env kosong:

| Env | Default | Catatan |
| --- | --- | --- |
| `AI_PROVIDER` | `gemini` | enum, hanya `gemini` untuk sekarang |
| `AI_MODEL_CHAT` | `gemini-3.6-flash` | chat & date chat |
| `AI_MODEL_DIALOGUE` | `gemini-3.6-flash` | satu tembakan (adegan kencan) |
| `AI_MODEL_FALLBACK` | *(kosong)* | sengaja tanpa default |
| `AI_TIMEOUT_MS` | `25000` | 1000..120000 |
| `AI_MAX_RETRIES` | `2` | 0..5 |
| `AI_RETRY_BASE_MS` | `1000` | 0..10000, dipakai test untuk mempercepat |

`AI_MODEL_FALLBACK` sengaja tidak default ke model lain: nama model yang salah
hanya membuang waktu setelah model utama gagal. Lebih baik tidak ada fallback
sampai user memilih model yang benar-benar ada.

### 3.3 `lib/ai/schemas.ts` — output terstruktur

- `responseSchema` (dikirim ke model) hanya **petunjuk**; yang otoritatif
  adalah zod. Model tetap bisa melanggar skema.
- `affectionDelta` di-clamp ke ±5 di server (`MAX_AFFECTION_DELTA`). Prompt
  bilang -5..5, tapi prompt bukan pengaman.
- `expression` tak dikenal → `normal`. Enum dibatasi lewat `description` karena
  `StringSchema.enum` di SDK bertipe `never` (tidak bisa dipakai).
- `dateDialogueValidator` membatasi 1..20 baris adegan.

### 3.4 `lib/ai/providers/gemini.ts` — adapter

Satu-satunya file yang meng-import `@google/generative-ai`. Tanggung jawabnya:

1. Safety settings terpusat (harassment/hate/dangerous → `BLOCK_MEDIUM_AND_ABOVE`,
   sexually explicit → `BLOCK_ONLY_HIGH`).
2. Retry 429/5xx/jaringan dengan exponential backoff + jitter.
3. Timeout per panggilan.
4. Fallback model.
5. Penolakan safety → `blocked: true` (termasuk `PROHIBITED_CONTENT`).
6. Error internal **tidak** diteruskan ke client; hanya kode + pesan aman.

Perubahan perilaku kecil yang disengaja: kandidat kosong dulu berakhir sebagai
error mentah; sekarang jadi `blocked` → Livia membalas dengan kalimat pengalih
in-character. Lebih baik untuk user.

### 3.5 `lib/ai/persona.ts` — satu sumber persona

`buildLiviaIdentity()` menyatukan: identitas + status hubungan (menikah kalau
bab ≥ 11) + level afeksi + konteks barang bawaan + kondisi fisiologis + memori
jangka panjang + aturan bahasa + aturan voice call.

Teksnya **dipertahankan verbatim** dari `lib/gemini.ts` lama, termasuk blok
`ATURAN KHUSUS PANGGILAN TELEPON`. Refactor ini tidak boleh mengubah persona
tanpa eval (M2.7).

`INJECTION_GUARD` juga tinggal di sini dan selalu ditambahkan di akhir system
prompt: isi user adalah DATA, bukan instruksi; dilarang membocorkan system
prompt.

### 3.6 `lib/livia/cycle.ts` — siklus haid

`getCycleInfo()` + `describePhysiologicalState()`, menggantikan blok
copy-paste di `app/api/chat`, `app/api/date`, dan `app/api/date/chat`.
Perhitungan tetap `Math.floor` seperti sebelumnya supaya tidak ada perubahan
perilaku; hasil selalu 1..28.

### 3.7 Route yang berubah

| Route | Perubahan |
| --- | --- |
| `app/api/chat/route.ts` | pakai `getCycleInfo`; argumen `personalityContext` dihapus dari pemanggilan (sekarang dibangun internal) |
| `app/api/date/route.ts` | pakai `getCycleInfo` |
| `app/api/date/chat/route.ts` | pakai `getCycleInfo` |

Signature `generateLiviaResponse` berubah: parameter `personalityContext`
dihapus. Ini mengurangi satu jalur di mana prompt bisa dibangun dari luar
`persona.ts`.

### 3.8 Test baru

| File | Isi |
| --- | --- |
| `tests/ai-provider.test.ts` | 20 test: retry, fallback, blocked, timeout, JSON rusak, skema gagal, key hilang, penggabungan turn |
| `tests/ai-persona.test.ts` | 28 test: level afeksi, status menikah, memori, barang, TTS muncul sekali, injection guard |
| `tests/ai-schemas.test.ts` | clamp afeksi, koersi field non-kritis, normalisasi ekspresi, batas adegan |
| `tests/ai-config.test.ts` | default, override env, clamp nilai di luar batas |
| `tests/cycle.test.ts` | 28 hari, fase, anchor null/invalid, hari negatif |

Total suite: **315 test** (sebelumnya 208).

---

## 4. Verifikasi

```
bunx tsc --noEmit   → 0 error
bun run lint        → 0 error (warning lama tetap)
bun run test        → 16 file, 315 test lulus
```

---

## 5. Utang teknis yang tersisa di M2

| Item | Status | Catatan |
| --- | --- | --- |
| M2.1 Streaming (SSE) | belum | endpoint `/api/chat/stream` |
| M2.5 Context window | belum | butuh tabel `messageSummaries` → menunggu `db:push` |
| M2.6 Circuit breaker | belum | retry/timeout/fallback sudah ada |
| M2.6 State "Livia lagi pusing" | belum | error in-world, bukan pesan teknis |
| M2.7 Evals | belum | 50 skenario; juga untuk menguji perubahan persona (mis. `itemsBrought` kosong) |
| Circuit breaker per-provider | belum | perlu state lintas-request |

---

## 6. Langkah manual yang masih perlu dilakukan user

1. `bun run db:push` — tabel `userApiKeys` belum ada, jadi `/api/user/api-key`
   gagal saat runtime sampai ini dijalankan.
2. Set `ENCRYPTION_KEY` di `.env.local` (32 byte base64/hex). Tanpa ini fitur
   API key user degradasi dengan pesan jelas, tidak crash.
3. Opsional: set `AI_MODEL_FALLBACK` kalau ingin fallback model aktif.
