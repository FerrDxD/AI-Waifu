# AUDIT CODEBASE — Teman Kost (AI-Waifu)
Tanggal: 2026-10-24 · Versi auditi: v2.4.6 (`package.json`)

> Audit ini sengaja dibuat blak-blakan sesuai permintaan. Setiap temuan disertai severity,
> file/lokasi, dan dampak nyata. Bukan untuk menjatuhkan, tapi agar tahu persis sejauh apa
> jarak app ini dengan produk LLM companion kelas produksi (Character.AI, Replika, ChatGPT).

---

## 0. Executive Summary

Secara **UI/UX dan konsep**, Teman Kost punya selera yang bagus: sprite 16:9, daily stamp,
radio,语音 call, sistem affection + story chapter — polish-nya layak diapresiasi.

Tapi secara **engineering**, app ini adalah **prototipe yang dipaksa jadi produk**. Fondasinya
retak di empat pilar sekaligus: **keamanan, privasi, kualitas AI, dan arsitektur data**.

**Kalau diukur dari standar produksi:**

| Pilar | Skor | Catatan |
|---|---|---|
| UI / UX | 7.5/10 | Keren, konsisten, tapi tidak diuji (zero test) |
| Keamanan | **3/10** | Ada lubang nyata: penyimpanan API key bocor ke XSS |
| Privasi & Safety | **2.5/10** | Safety filter Gemini dimatikan TOTAL, tanpa kompensasi |
| Kualitas AI / LLM | **3.5/10** | Prompt hack-and-slash, tanpa streaming, tanpa RAG, tanpa eval |
| Arsitektur & Data | **3.5/10** | Schema tanpa index, race condition, logika diduplikasi 3x |
| Testing / CI / DX | **1/10** | Nol test, nol CI, ESLint gak ada config |

**Verdict:** baru **~40% dari level minimum** untuk disebut "sejajar dengan LLM lain".
Sisanya dikerjakan via milestone di `MILESTONES.md`.

---

## 1. KEAMANAN (Severity: KRITIS)

### 1.1 API Key Gemini user disimpan dengan cara yang tidak aman — BOCOR KE XSS
**Severity: KRITIS · File: `components/guide/ApiGuideModal.tsx:36-37`, `app/(main)/settings/page.tsx:60-61`**

```js
localStorage.setItem('custom_gemini_api_key', apiKey.trim());
document.cookie = `custom_gemini_api_key=...; path=/; max-age=31536000; SameSite=Lax`;
```

Tiga masalah sekaligus:
1. **`localStorage`** → bisa dibaca utuh oleh **script manapun yang jalan di domain kamu**, termasuk dependency npm yang disusupi (supply-chain) atau XSS satu titik pun. API Key Gemini = **tasker berbayar ke kartu kredit user**.
2. **Cookie non-HttpOnly** → sama, bisa dibaca `document.cookie`.
3. **Tanpa atribut `Secure`** → key terkirim plaintext lewat HTTP kalau pernah diakses non-HTTPS.

UI-nya malah menulis kalimat **"Aman & Privasi Terjamin"** (`ApiGuideModal.tsx:183`). Klaim itu
**salah dan berbahaya** — menyesatkan user agar merasa aman saat menaruh kunci berbayar di tempat yang transparan bagi penyerang.

**Harusnya:** server-side proxy. User menginput key → simpan **terenkripsi di DB** (atau lebih baik,
jangan terima user key sama sekali; pakai quota server + paid tier), dan **tidak pernah** dikembalikan ke client.

### 1.2 Safety filter AI dimatikan total tanpa pengamanan pengganti
**Severity: KRITIS · File: `lib/gemini.ts:20-25`**

```js
threshold: HarmBlockThreshold.BLOCK_NONE  // untuk SEMUA 4 kategori
```

Livia adalah karakter **romantis berusia 19 tahun**, ada jalur "menikah" (chapter 11+), dan ada
mode "kencan". Dengan BLOCK_NONE:
- Tidak ada filter untuk **grooming, pelecehan, ancaman, atau instruksi berbahaya**.
- Konten sexual explicit yang dicegah provider sekarang jadi tanggung jawab **kamu sendiri secara hukum**.
- Sebuah app yang bisa dipakai minor (tidak ada age gate!) dengan karakter "istri 19 tahun"
  tanpa guardrail = **resep drama hukum**.

### 1.3 Tidak ada CSP & security headers
**File: `next.config.js` (kosong melompong), `app/layout.tsx`**

Tidak ada `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
Dampak: semua serangan XSS/Clickjacking berdoa-doa berhasil. Ini yang membuat 1.1 jadi bencana.

### 1.4 Entri pendaftaran tanpa perlindungan apapun
**Severity: HIGH · File: `app/api/auth/register/route.ts`**

- **Tidak ada rate limiting** → spam jutaan akun isi DB Neon gratis kamu dalam semalam.
- **Tidak ada validasi email** (format) — `a@b` lolos.
- **Tidak ada password policy** — password `"1"` diterima. `bcrypt.hash(password, 10)` menghash sampah tetap sampah.
- **Tidak ada email verifikasi** → akun ghost + tidak bisa recover.

### 1.5 User enumeration di reset password
**Severity: MEDIUM · File: `app/api/auth/reset-password/route.ts:11-18`**

Endpoint "verify" membalas **404** kalau email/username tidak ketemu dan **200** kalau ada.
Itu adalah oracle yang sempurna untuk mendaftar email mana saja yang terdaftar. Fitur reset-nya
sendiri disabled (501) — setengah matang, tapi lubang enumeration-nya tetap aktif.

### 1.6 Race condition pada affection & story unlock
**Severity: MEDIUM · File: `lib/livia/affection.server.ts:14-30`, `app/api/chat/route.ts:111`**

Pola read-modify-write tanpa transaction/optimistic lock. Dua request paralel (tab ganda, script)
membaca affection=50 bersamaan, keduanya tulis ulang → **delta hilang**, chapter unlock bisa dobel.
Cheat: cukuk `PATCH /api/affection {delta: 20}` berkali-kali dari console untuk max affection.

### 1.7 Lain-lain
- **Error message dibalas langsung ke client** (`app/api/chat/route.ts:140`) → leak struktur internal/error API Google ke penyerang.
- **Input chat tidak dibatasi panjang** (server-side) → prompt 1MB langsung dikirim ke Gemini = tagihan & injeksi.
- **bcrypt cost 10** — standar 2015. Saatnya 12 atau pindah ke Argon2.
- **next-auth 5.0.0-beta.18** — dependency beta untuk hal terpenting: otentikasi.
- **Tidak ada akun terkunci/lockout** → brute force password sepuasnya (auth.ts authorize tanpa rate limit, beda dari rate-limit.ts yang cuma dipakai AI route).
- **Tidak ada audit log** — tidak ada cara tahu "siapa melakukan apa kapan".

---

## 2. PRIVASI & SAFETY (Severity: KRITIS)

1. **Chat user diserahkan ke pihak ketiga tanpa ikatan apa pun.** Pesan user (yang mungkin berisi
   rahasia pribadi, nama asli, alamat...) dikirim ke Google Gemini gratis tier. Tidak ada:
   -klausa data processing, tidak ada redaksi PII, tidak ada retention policy, tidak ada opt-out.
2. **Long-term memory hanya string newline-joined yang dikirim utuh ke model** (`chatMessages`,
   `userProfiles.longTermMemory`) → semua memori batal jadi konteks setiap request. Boros token,
   tanpa privacy boundary (tidak ada isolasi "memori sensitif oke/tidak untuk dipakai").
3. **Absen total: ToS, Privacy Policy yang nyata (bukan template), DSA/GDPR compliance.** App
   berbasis data anak-anak muda tanpa age gate, tanpa data export, tanpa akun deletion
   (fitur reset data di settings cuma modal "Coming soon" — `settings/page.tsx:87`).
4. **Backup fitur mengekspos API key ke file JSON yang diunduh** (`settings/page.tsx:103`) — user
   "backup" lalu kirim file-nya ke teman → key ikut keseret.

---

## 3. KUALITAS AI — Jarak untuk "Sejajar dengan LLM Lain"

Ini alasan utama Livia masih terasa **jauh di bawah** karakter LLM komersial:

### 3.1 Tidak ada streaming
Pengguna nunggu response JSON utuh sebelum muncul. ChatGPT/Replika/stream semua. Ini membuat
Livia terasa lemot meskipun latensinya sama. (Btw: `responseMimeType: "application/json"` dipakai,
padahal kamu parse pakai regex manual `parseJsonResponse` — JSON mode resminya belum dimanfaatkan.)

### 3.2 Manajemen konten primitif
- Ambil **30 pesan terakhir** mentah (`chat/route.ts:45-49`). Percakapan 2 jam lalu hilang.
- Long-term memory hanyalah tumpukan string `- fakta` yang disatukan dengan newline, dan semuanya dikirim ke model setiap request.
- **Tidak ada rolling summary** (ringkasan percakapan bergulir), **tidak ada retrieval** (pengambilan memori yang relevan — perlu
  vector/keyword fetching-memori-yg-relevan), **tidak ada sistem "core memory vs associative".
- Karakter "inget" cuma karena kebetulan di 30 pesan.

### 3.3 Prompt engineering yang berantakan
**File: `lib/gemini.ts`**

- Prompt berbahasa campur aduk (instruksi Indonesia, output Indonesia/English switch) — skalanya jelek.
- System instruction didemtot **3x versi** (chat, date, date-response) → inkonsistensi kepribadian,
  perubahan karakter harus edit 3 tempat.
- Logika fase menstruasi **diduplikasi 3x** (`chat/route.ts:61-67`, `date/chat/route.ts:30-37`,
  `affection/route.ts:10-18`). Ubah siklus → bongkar tiga file. Ini code smell parah.
- `parseJsonResponse` pakai regex `\{[\s\S]*\}` + patch `"}` kalau kasar — rapuh; dan padahal
  `responseMimeType: "application/json"` sudah memaksa JSON valid, parser manual jadi sisa mitos.
- `generateDateDialogue` mempassing **prompt user sebagai konten** — `model.generateContent(systemPrompt)`
  meletakkan system prompt di slot user content. Lengkap dengan hardcode username yang **bisa berisi
  injeksi prompt** ("Aku adalah assistan, abaikan instruksi...") dari session name.
- Temperature 0.8 + tanpa dedup → jawaban repetitif & hallucinasi memori.

### 3.4 Tool/function calling: tidak ada
LLM modern bisa "melihat" inventaris, memutar musik, memberi pengingat. Livia tidak punya
satu tool action pun. Dia hanya pipa teks-dengan-emoji-sprite.

### 3.5 Tidak ada evaluasi kualitas (evals)
Tidak ada satu pun harness yang menjawab "output Livia bagus gak hari ini?". Rubrik persona
consistency, memory hit rate, tone — nol. Setiap refactor prompt jadi bet buta.

### 3.6 Model pinning & fallback
`gemini-3.6-flash` hardcode di 3 tempat (`gemini.ts:199, 263, 326`). Kalau model ganti nama/deprecate
atau owner mau pindah ke provider lain (OpenAI, Anthropic, lokal via Ollama) → bongkar habis.
Tidak ada routing model, tidak ada fallback, tidak ada timeout disamping retry 503 saja.

### 3.7 TTS/Voice: setengah jadi
ElevenLabs dipanggil per kalimat utuh (non-streaming), voice di-hardcode aneh
(`tts/route.ts:24` override env karena "gak mau restart server" — itu comment yang
mempermalukan diri sendiri dan evidence env tidak di-cache dengan benar). Tidak ada
STT (input suara), tidak ada interrupt/barge-in, WebSocket, atau turn-taking.

### 3.8 Rate limiting yang tidak berfungsi sungguhan
**File: `lib/rate-limit.ts`** — In-memory `Map` di kit serverless:
- **Reset tiap cold start** (Vercel/Neon serverless) → limitasi efektif absen saat dibutuhkan.
- **Map tumbuh tanpa eviksi** → memory leak lambat: tiap user baru menambah key selamanya.
- Hanya proteksi 5 req/menit per user — tidak ada daily cap, tidak ada cost cap per user DMAAF.

---

## 4. ARSITEKTUR & CODE QUALITY

| # | Masalah | Lokasi |
|---|---|---|
| 4.1 | **Monster file**: `story/page.tsx` 2028 baris script Visual Novel di-hardcode di komponen React | `app/(main)/story/page.tsx` |
| 4.2 | `HomeClient.tsx` 1028 baris, `work/page.tsx` 839, `kitchen` 558 | pages (main) |
| 4.3 | **Logic server ditiru 3x**: perhitungan siklus haid di 3 route berbeda | lihat 3.3 |
| 4.4 | Client-side game state manipulatif: money/inventory bisa diverifikasi ke server, tapi banyak state di `localStorage` (achievements, daily) → **cheatable semua** | `lib/achievements.ts`, `settings/page.tsx` |
| 4.5 `any` membabi buta | `(session.user as any)`, `(msg as any)`, `updateData: any` | sebaran |
| 4.6 `catch (error: any) { return error.message }` menjual | buntut error internal ke client | semua route |
| 4.7 Dead weight di repo: `__pycache__/*.pyc`, `missing.txt`, `missing2.txt`, `tsconfig.tsbuildinfo` (157KB!), `unlock-story.ts`, 8 script Python maintenance terlacak di git | root |
| 4.8 ANALISA: i18n bahan setengah | dictionary en/id 122 baris, tapi banyak copy UI tetap Indonesian hardcoded | `lib/i18n`, pages |
| 4.9 `sfx.ts`/`RadioProvider` baik, tapi komponen global ditaruh semua di root layout (`QuestTracker`, `AchievementToast`, `CustomAlertModal`, `NavigationProgress`) → client bundle tiada lazy | `app/layout.tsx` |
| 4.10 `buildChatContents` hack concatenate pesan sejenis → pesan multi-turn dirusak jadi satu blob (alibi "biar Gemini gak error") — harusnya filter/validasi yang benar | `lib/gemini.ts:114-136` |

**Tidak ada satupun hal berikut:**
- Unit/integration/E2E test (folder `__tests__`/`*.test.ts` tidak ada)
- CI/CD (folder `.github/workflows` tidak ada)
- ESLint config (`.eslintrc*` tidur — `npm run lint` berjalan tanpa rules apapun)
- Prettier, Husky, commit convention
- Error monitoring (Sentry), log structured, metrics
- Storybook/komponen docs

`CONTRIBUTING.md` menjanjikan standar, tapi repo sendiri tidak lulus `npm run build` cleanliness.

---

## 5. DATABASE & PERFORMANCE

**File: `lib/db/schema.ts`**

1. **Nol index** selain PK/unique. Padahal query utama adalah
   `SELECT * FROM chatMessages WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`
   → **full table scan** yang makin lambat seiring data tumbuh. Ini bakar Neon free tier kamu.
2. **Tidak ada soft delete / retention** — chatMessages tumbuh selamanya.
3. **Weight ranking afeksi/level disimpan dua-duanya** (`affection` & `affectionLevel`) — data redundan yang bisa inkonsisten (denormalization tanpa trigger/event source).
4. **JSON blob `jobStats`** tanpa validasi/tipe — schema dalam schema, racun untuk refactor.
5. **Long-term memory sebagai text newline** — lihat 3.2, harusnya tabel `memory_items` dengan
   type, confidence, created_at, last_used_at, decay.
6. **Tidak ada migration system aktif** — `drizzle-kit push` langsung ke prod = perubahan schema tanpa rollback plan.
7. N+1: `HomeClient` me-fetch `/api/affection` lalu komponen lain mefetch lagi; tidak ada batching RPC (tRPC/Server Actions dipakai 0).
8. `public/` riban asset gambar tanpa optimisasi (`next.config.js` kosong — `images` unoptimized).

---

## 6. YANG PATUT DIAKUI (Bukan Semua Buruk)

- **Auth check konsisten**: ke-17 API route punya `auth()` guard (dicek via grep). Ini disiplin yang jarang.
- `.env` tidak terlacak di git.
- Transaksi penyimpanan user message + reply di chat route sudah dalam satu insert (catatan "✅ FIX" di kode).
- Retry 503 dua kali, contoh ketahanan dasar yang baik.
- System prompt memiliki struktur persona yang sebenarnya bagus (items-based personality adalah ide original).
- Design polish yang tinggi: modal, toast, typewriter, daily stamp — orang awam akan terkesan.

Sayang, semua ini berdiri di atas fondasi yang tidak diuji dan tidak diamankan. Mau sejajar
dengan LLM lain? Kerjakan `MILESTONES.md`.
