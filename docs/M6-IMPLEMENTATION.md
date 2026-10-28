# M6 — Voice & Realtime

Dokumen ini mencatat apa yang **sudah** dikerjakan di M6, keputusan desain yang
mengikat, dan utang teknis yang tersisa.

Status: **M6.1–M6.5 SELESAI (seluruh milestone M6).** TTS streaming
end-to-end, voice-ID hardcode terhapus, call continuous listening + barge-in
+ turn cue realtime, diktasi suara di chat, TTS cache + pencatatan biaya
harian, dan voice persona dinamis per mood. Sisa utang M6 di §9.

---

## 1. M6.1 — TTS streaming + hapus voice-ID hardcode

Tujuan: voice call terasa konversasional (first-audio cepat) dan konfigurasi
TTS tidak punya fallback diam-diam.

### 1.1 Arsitektur: pipeline 3 tahap

Sebelum M6.1, alur call: `/api/chat` (balasan utuh, 5–15 detik) → `/api/tts`
(1 file mp3 utuh, di-buffer penuh) → baru suara keluar. User menunggu ~2x
latensi tanpa umpan balik.

Sekarang:

```
/api/chat/stream (SSE, M2.1)          client                          /api/tts
   delta "Halo, kamu—"  ──────────▶  buffer kalimat
   delta "sudah makan?" ──────────▶  "Halo, kamu sudah makan?" utuh
                                     └─enqueue▶ TtsPipeline ─fetch──▶ sintesis (streaming)
   delta "Aku di—"          ◀─      ──────────  ▶▶ audio kalimat 1 diputar
   delta "dapur." ─────────▶        ──────────  ▶▶ (kalimat 2 sudah di-fetch)
   done (expression, crisis)        ──────────  ▶▶ audio kalimat 2 ...
```

- **Tahap 1 — teks**: call kini memakai `/api/chat/stream` (SSE `delta`/
  `done`/`error`, sudah ada sejak M2.1 dan sudah mendukung `isVoiceCall`)
  alih-alih `/api/chat` non-streaming.
- **Tahap 2 — kalimat**: `takeCompleteSentences()` (lib/tts/sentences.ts)
  mengambil kalimat yang sudah utuh dari buffer yang masih bertambah, tiap
  delta. Kalimat utuh langsung di-enqueue ke TTS.
- **Tahap 3 — audio**: `TtsPipeline` (lib/tts/pipeline.ts) memutar kalimat
  sekuensial dengan prefetch: saat blob kalimat N tiba, fetch kalimat N+1
  langsung jalan sehingga overlap dengan playback N. First-audio ≈ waktu
  LLM menulis kalimat pertama + sintesis satu kalimat (target DoD < 2 detik
  untuk balasan pendek).

### 1.2 Route `/api/tts` streaming

`app/api/tts/route.ts` kini **melewatkan body upstream apa adanya**
(`new NextResponse(upstream.body)`) alih-alih `arrayBuffer()` → client
menerima byte audio secara chunked sejak sintesis mulai, bukan setelah
selesai. Header: `Content-Type: audio/mpeg`, `Cache-Control: no-store`.

Pengecekan `upstream.ok` dilakukan SEBELUM stream dilepas — error provider
(401/429/5xx) tetap menghasilkan respons JSON error yang sama seperti
sebelumnya, detail provider hanya ke log (M0/H0.6).

Kenapa bukan WebSocket ElevenLabs: runtime serverless Vercel tidak cocok
untuk koneksi panjang (timeout function), dan kebutuhan kita hanya aliran
satu arah server→client — pola SSE/chunked yang sudah dipakai M2.1 cukup.

### 1.3 Konfigurasi: tanpa hardcode, dengan cache env

- Voice-ID hardcode `EXAVITQu4vr4xnSDxMaL` **dihapus**.
- `ELEVENLABS_API_KEY` **dan** `ELEVENLABS_VOICE_ID` kini wajib lewat
  `requireEnvVar` (lib/env, M1.5) — validasi zod + cache modul, dibaca
  sekali per proses, pesan error menunjuk `.env.example`.
- Kalau env belum diisi, route gagal 500 `INTERNAL_ERROR`
  "Konfigurasi TTS belum lengkap." + log server — bukan memakai suara
  orang asing diam-diam.

**Dampak deploy (PENTING)**: karena fallback lama dihapus,
`ELEVENLABS_VOICE_ID` HARUS diisi di Vercel Environment Variables. Kalau
belum punya voice custom, isi `EXAVITQu4vr4xnSDxMaL` (voice default
ElevenLabs, perilaku lama) supaya call tidak mati total.

### 1.4 `TtsPipeline` (client)

Keputusan desain:

- **`HTMLAudioElement` + blob per kalimat, bukan MediaSource Extensions.**
  MSE dengan mp3 bermasalah di sebagian iOS Safari; audio element
  compatible semua browser dan berhenti instan (penting untuk barge-in).
  Byte-streaming yang diuntungkan di sini adalah dari sisi server (§1.2);
  di client, unit playback yang natural adalah per-kalimat.
- **Satu instance per giliran.** `stop()` mengakhiri pipeline (state
  `stopped` permanen); giliran berikutnya bikin instance baru. Lebih mudah
  dibuktikan benar daripada state machine reuse.
- **Gagal TTS ≠ gagal giliran.** Satu kalimat yang gagal (429/5xx/jaringan)
  dilewati; kalimat berikutnya tetap dibicarakan.
- **Volume per playback** lewat `getVolume()` — toggle speaker berlaku
  mulai kalimat berikutnya (lalu), bukan lompatan volume di tengah.
- **Race microtask**: enqueue yang masuk persis saat drain berakhir
  dilanjutkan lagi (cek `queue.length` di `finally`), tidak dibuang.

### 1.5 Call: state machine + barge-in dasar

`features/call/CallClient.tsx`:

- Status call kini enum `CallStatus = connecting | idle | listening |
  thinking | speaking | error` (sumber kebenaran tunggal untuk turn cue
  UI), menggantikan string status ad-hoc. Label ditampilkan sesuai status;
  timer durasi mulai saat audio pertama diputar.
- **Barge-in dasar**: `recognition.onstart` → kalau pipeline sedang
  berbicara, `stop()` langsung (user mulai bicara = Livia jeda). Ini prasyarat
  M6.2, dibuat sekarang karena pipeline baru tidak masuk akal tanpanya.
- **Krisis di call (M4.2)**: event `done` membawa `crisis.escalate` →
  audio dihentikan, persona dilepas, pesan krisis (sudah memuat hotline
  119 ext. 8) ditampilkan. Panel krisis lengkap (resources bisa diklik) di
  call = utang, §5.
- Mic tetap PTT (tap "Bicara"); continuous listening otomatis = M6.2.

### 1.6 Verifikasi

- `tests/tts-sentences.test.ts` (15 test): pemotongan kalimat, angka
  desimal, kutip penutup, ellipsis, chunk >300, akumulasi delta SSE,
  guard drift `TTS_MAX_LEN === LIMITS.ttsText`.
- `tests/tts-pipeline.test.ts` (6 test): urutan playback + overlap
  prefetch, barge-in `stop()`, kalimat gagal dilewati, `speakText()`,
  volume per playback, enqueue di akhir drain.
- `tests/tts-route.test.ts` (6 test): pass-through stream, voice-ID dari
  env (bukan fallback), env hilang → 500 tanpa panggil provider,
  upstream 500 → 503 tanpa bocor detail, teks >300 → 400.
- Mock `Audio` + handle reset store rate-limit terdaftar di
  `tests/setup.ts` (pola global mock suite, isolate: false).
- Live test end-to-end (dengar suaranya) butuh `ELEVENLABS_API_KEY` +
  `ELEVENLABS_VOICE_ID` valid — belum bisa lokal (env lokal kosong),
  diverifikasi di production setelah env Vercel diisi.

---

## 2. M6.2 — Barge-in & turn cue

Tujuan: "saat user mulai bicara, Livia pause" + indikator status call
realtime — tanpa perlu tap tombol.

### 2.1 Continuous listening (bukan PTT lagi)

`CallSession` (lib/call/session.ts) kini memegang siklus mic:

- Recognition jalan **sepanjang call aktif**: `continuous: true`, dan
  setelah tiap `onend` (browser berhenti saat hening) sesi auto-restart
  (jeda 100ms anti error-loop).
- **Tombol mic = mute/unmute** (bukan PTT). Mute membuang ucapan yang
  sedang berjalan, menghentikan loop, dan status jadi `idle`; unmute
  langsung restart listening.
- `onerror 'not-allowed'/'service-not-allowed'` (izin mic ditolak) →
  status error + loop berhenti permanen sampai call baru.

### 2.2 Barge-in yang benar

- Pemicu: **interim result pertama** (suara TEREDETEKSI), bukan `onstart`
  — di mode continuous, `onstart` fire di tiap auto-restart walau tanpa
  suara, dan akan membuat Livia jeda sendiri tiap beberapa detik.
- Efek: pipeline TTS `stop()` seketika; **kalau LLM masih generating,
  giliran di-abort** — delta stream yang terlambat dibuang (test:
  "stream terlambat dibuang").
- Batasan yang dikenal (utang): mic bisa menangkap suara Livia sendiri
  (feedback loop) — dimitigasi speaker toggle (volume 0.25x); VAD /
  echo-cancel proper di ranah native (M6.3).

### 2.3 Turn cue realtime

- `recomputeStatus()` satu sumber kebenaran:
  `error` (sticky, dibersihkan giliran baru) > `speaking` > `thinking` >
  `listening` (mic on) > `idle`.
- UI: **pill status di header** (dot berwarna + label singkat + timer
  durasi setelah audio pertama), ring avatar (hijau = Livia bicara, pink
  = suara user terdeteksi), tombol mic berstatus (Mic / Mic off + pulse
  saat mendengar), baris status detail di bawah nama.
- Komponen `CallClient.tsx` jadi tipis: hanya wiring + UI; seluruh logika
  giliran (fetch SSE, pipeline, status) di `CallSession` — diuji tanpa
  React (tests/call-session.test.ts, 9 test: continuous restart, alur
  giliran, barge-in speaking/thinking, mute, izin mic, dispose, error
  stream).

---

## 3. M6.3 — STT input (diktasi suara di /chat)

Tujuan: input suara di halaman chat via Web Speech API — user tap mic,
bicara, transkrip masuk ke input, bisa diedit, baru kirim. Fallback
Whisper/endpoint server **belum** diimplementasi: itu hanya relevan untuk
rilis native (lihat utang).

### 3.1 `useSpeechRecognition` (lib/speech/use-speech-recognition.ts)

Hook React tipis di atas Web Speech API:

- **Pola PTT** — tap mulai, tap lagi (atau hening) berhenti. Beda dengan
  `CallSession` di call yang continuous + auto-restart: di chat satu
  ucapan per tap sudah pas (satu pesan = satu utterance).
- `interimResults: true`, `lang: 'id-ID'`, `continuous: false`.
- `supported` baru true **setelah mount** (Web Speech API tidak ada di
  server — hindari hydration mismatch; tombol mic tidak muncul saat SSR).
- `rec.start()` dipanggil dari handler klik (user gesture) — requirement
  iOS Safari.
- Cleanup unmount: `abort()` (tanpa onend).
- Semua error code diteruskan ke callback `onError`; caller deciding mana
  yang ditampilkan ('no-speech'/'aborted' = wajar, 'not-allowed' = izin
  mic ditolak → hint di UI).

### 3.2 `collectTranscript` (lib/speech/transcript.ts)

Logika akumulasi transkrip di-extract jadi fungsi pure isomorphic —
sumber kebenaran tunggal untuk `onresult`:

- `event.results` berisi **seluruh hasil sesi** (bukan delta), dan interim
  diperbarui di tempat → transkrip di-**rebuild** per event, bukan
  di-append (append = double hitung). Diuji eksplisit.
- Dipakai dua konsumen: `CallSession` (di-refactor, behavior sama — 9
  test call-session tetap hijau) dan `useSpeechRecognition`.

### 3.3 Integrasi UI (features/chat/ChatClient.tsx)

- Tombol mic muncul di antara textarea dan tombol kirim; hanya jika
  `supported`. State: idle (Mic abu-abu) / listening (MicOff merah +
  pulse).
- Transkrip live **ditulis langsung ke input**: `input = base +
  transcript`. `base` = teks yang sudah diketik user sebelum tap mic
  (diktasi MENAMBAHKAN, bukan menimpa).
- Saat diktasi selesai, isi input terakhir (base + final) **dipertahankan**
  → user bisa mengedit sebelum kirim.
- Enter & tombol kirim **disabled selama listening** (transkrip masih bisa
  berubah).
- Izin mic ditolak → hint merah di atas input, auto-clear 4 detik.

---

## 4. M6.4 — TTS cache + pencatatan biaya

Tujuan: hemat biaya ElevenLabs (di-tagih per karakter) untuk kalimat yang
berulang, + pencatatan "biaya TTS per DAU" (bagian DoD M6: *biaya TTS per
DAU tercatat & dibatasi*).

> **Soal angka "90%"**: itu estimasi di MILESTONES.md untuk kalimat
> repetitif, **bukan** jaminan terukur. Penghematan aktual = rasio hit
> cache, yang sekarang terukur lewat `ttsUsage.cacheHits` / `requests`.

### 4.1 Skema (migration `drizzle/0002`, sudah di-apply)

- **`ttsCache`** — `key` (PK) = `sha256(voiceId|modelId|text)`, `audio`
  (bytea), `mime_type`, `created_at`, `last_hit_at` (dasar LRU).
  Penyimpanan: **Neon `bytea`, bukan R2/S3** — tanpa infra baru, dan skala
  cache (puluhan MB, dibatasi 1000 baris) aman untuk Postgres serverless.
- **`ttsUsage`** — per (user, hari-UTC): `requests`, `cacheHits`,
  `charsBilled` (hanya miss — hit tidak di-billing). PK komposit
  (user_id, day).

### 4.2 Perilaku route `/api/tts`

Urutan: validasi teks → env → **cap harian karakter** → **cek cache** →
ElevenLabs.

- **Hit** = audio lama dari DB, header `X-Tts-Cache: hit`, nol biaya,
  latency lebih rendah. `last_hit_at` di-touch (LRU).
- **Miss** = buffer PENUH respons ElevenLabs (perubahan dari streaming
  M6.1 — audio harus utuh untuk disimpan), simpan ke cache, header
  `X-Tts-Cache: miss`. Tradeoff: sintesis satu kalimat pendek ~1–2 detik
  kini menunggu utuh, tapi pipeline call prefetch kalimat N+1 saat N
  diputar sehingga tambahan latency tersembunyi; hit justru lebih cepat.
- **Gagal upstream** = tidak masuk cache, tidak menambah `charsBilled`
  (tidak ada yang di-billing) — diuji eksplisit.
- **Fail-open** (pola M5.5): kegagalan cache/usage hanya di-log, tidak
  menggagalkan pemutaran.
- **Eviction LRU**: setelah insert, kalau baris > `TTS_CACHE_MAX_ROWS`
  (1000), baris terlama (urut `last_hit_at`, `created_at`) dibuang.

### 4.3 Cap biaya

- **Cap karakter/hari per user**: `TTS_MAX_CHARS_PER_DAY` (env, default
  30.000). Terlewat → 429 "Kuota suara hari ini sudah habis". Di atas
  rate limit request yang sudah ada (5/menit, 200/hari, 2000/bulan) —
  request cap membatasi jumlah, char cap membatasi ukuran.
- **Pencatatan**: `ttsUsage` per user per hari — metrik biaya TTS per DAU
  (requests, hit ratio, chars di-billing) tinggal di-query dari tabel.

### 4.4 Catatan drizzle 0.30

drizzle-orm 0.30 **tidak punya kolom `bytea` bawaan** — didefinisikan via
`customType` (mapping identitas; driver neon-http memberi `Buffer`).
Normalisasi defensive (kalau datang string hex/base64) ada di
`lib/tts/cache.ts`.

---

## 5. M6.5 — Voice persona dinamis

Tujuan: suara Livia menyesuaikan suasana kalimat (DoD: *happy → energik,
scared → cepat*) alih-alih satu nada datar untuk semua.

### 5.1 Kendala timing — kenapa mood dari TEKS, bukan `expression`

Di call (M6.1), kalimat disintesis & diputar SEWAKTU stream `delta` masih
mengalir — `expression` turn-level baru dikirim di event `done` (setelah
semua kalimat). Pakai `expression` untuk TTS streaming = audio keburu
keluar dengan suara netral. Maka mood dideteksi dari TEKS kalimat via
`detectMood()` (`lib/tts/persona.ts`, pure/isomorphic).

### 5.2 Deteksi mood (heuristik kata kunci)

`detectMood(text)` → salah satu dari 7 mood: `neutral, happy, excited,
angry, sad, scared, tender`. Aturan:

- Kata kunci Indonesia + emoji, dicocokkan **case-insensitif, kata utuh**
  (supaya "maaf" tidak terhitung di "maafkan"); emoji sebagai substring.
- Skor = jumlah kata kunci berbeda per mood. Skor 0 → `neutral`.
- Tie skor → mood lebih "mendesak" menang: `scared > angry > excited >
  sad > tender > happy`.
- Sengaja sederhana & deterministik — false positive hanya soal
  penjiwaan suara, bukan kegagalan fungsional. Daftar kata dapat ditambah
  (lihat utang §9).

### 5.3 Mood → suara: dua lapis

1. **Server** (`/api/tts`): `voice_settings` ElevenLabs dari
   `MOOD_VOICE_SETTINGS[mood]` — timbre/energi. Contoh: `happy` style
   tinggi (energik), `scared` stability rendah (dinamis/terburu), `sad`
   stability tinggi (lembut). **`neutral` dipatok SAMA PERSIS dengan
   setting M6.1** (regresi: kalimat netral terdengar seperti sebelum
   M6.5 — diuji eksplisit).
2. **Client** (`TtsPipeline`): `playbackRate` dari
   `MOOD_PLAYBACK_RATE[mood]` — tempo (ElevenLabs tidak punya parameter
   kecepatan). `scared` 1.15× (cepat), `sad` 0.92× (lambat), `neutral`
   1.0×. `preservesPitch = true` → hanya tempo berubah, nada tetap.

Client menghitung mood dari kalimat yang sama dengan modul pure yang
SAMA dengan server (satu sumber kebenaran, tanpa tambah field request).
Header `X-Tts-Mood` ikut dikirim untuk observability di DevTools.

### 5.4 Dampak cache (M6.4)

Mood masuk key cache: `sha256(voiceId|modelId|mood|text)` — sama teks
beda mood = audio berbeda, tidak boleh berbagi entry. Konsekuensi:
rumusan key berubah dari M6.4 → entry lama tidak terpakai lagi (cache
baru tumbuh; dibersihkan LRU seperti biasa).

### 5.5 Scope yang TIDAK dilakukan

- Per-kalimat `expression` dari LLM (butuh ubah protokol stream + prompt
  — lebih besar, nilai marginal karena deteksi teks sudah menutup
  mayoritas kasus).
- VAD/echo-cancel, STT fallback server — tetap ranah native (lihat §9).

---

## 6. Perubahan file

| File | Perubahan |
| --- | --- |
| `app/api/tts/route.ts` | M6.1: streaming pass-through, `requireEnvVar`, tanpa hardcode; M6.4: cek cache + cap harian + buffer penuh + pencatatan usage (X-Tts-Cache); M6.5: `voice_settings` dinamis per mood + header X-Tts-Mood |
| `lib/tts/sentences.ts` | baru: `splitSentences`, `takeCompleteSentences`, `TTS_MAX_LEN` |
| `lib/tts/pipeline.ts` | baru: `TtsPipeline` (enqueue/prefetch/stop); M6.5: `playbackRate` + `preservesPitch` per mood |
| `lib/tts/persona.ts` | baru (M6.5): `detectMood`, `MOOD_VOICE_SETTINGS`, `MOOD_PLAYBACK_RATE` (pure/isomorphic) |
| `lib/call/session.ts` | baru: `CallSession` (continuous listening, barge-in, giliran, status); M6.3 refactor pakai `collectTranscript` |
| `lib/speech/transcript.ts` | baru: `collectTranscript` (pure, isomorphic — rebuild transkrip per event) |
| `lib/speech/use-speech-recognition.ts` | baru: hook diktasi PTT (PTT, interim live, supported post-mount) |
| `lib/tts/cache.ts` | baru (M6.4): key sha256, get/put + eviction LRU, usage harian, fail-open; M6.5: `mood` masuk key |
| `lib/db/schema.ts` | M6.4: tabel `ttsCache` (bytea via customType) + `ttsUsage` (PK komposit) |
| `drizzle/0002_*.sql` | baru: migration tabel ttsCache + ttsUsage (sudah di-apply) |
| `features/chat/ChatClient.tsx` | M6.3: tombol mic + diktasi ke input (append, editable, hint izin) |
| `features/call/CallClient.tsx` | rework 2x: M6.1 SSE→pipeline; M6.2 jadi tipis (wiring+UI), pill status header, mic mute/unmute |
| `tests/setup.ts` | + mock `Audio` global (+ `playbackRate`/`preservesPitch`, M6.5), + handle reset store rate-limit, + mock `@/lib/auth` (pola holder) |
| `tests/tts-sentences.test.ts` | baru (15 test) |
| `tests/tts-pipeline.test.ts` | baru (6 test); M6.5: + playbackRate per mood |
| `tests/tts-persona.test.ts` | baru (M6.5): deteksi mood, rentang parameter, pin baseline netral |
| `tests/tts-route.test.ts` | M6.1: 6 test streaming/env/upstream; M6.4: + hit/miss, kuota harian, gagal upstream tidak tercatat; M6.5: + voice_settings per mood |
| `tests/call-session.test.ts` | baru (9 test) |
| `tests/speech-transcript.test.ts` | baru (7 test) |
| `tests/tts-cache.test.ts` | baru (M6.4, 10 test: key, bucket harian, parsing cap); M6.5: + mood di key |
| `tests/api-handler.test.ts` | pakai mock auth global dari setup.ts |
| `.env.example` | ElevenLabs wajib (M6.1) + `TTS_MAX_CHARS_PER_DAY` opsional (M6.4) |

---

## 7. Keputusan yang mengikat

1. **SSE/chunked, bukan WebSocket** — Vercel serverless; kebutuhan satu arah.
2. **Unit playback = kalimat (audio element), bukan byte (MSE)** —
   kompatibilitas iOS + barge-in instan.
3. **Titik di ujung buffer belum dianggap penutup kalimat** (kecuali
   `! ? …`) — mencegah "3.1" → "3.14" terpotong di tengah stream.
4. **`ELEVENLABS_VOICE_ID` wajib** — tidak ada suara default diam-diam.
5. **`TTS_MAX_LEN` di client disengaja duplikat** dari `LIMITS.ttsText`
   supaya `next/server` tidak masuk bundle client; drift diuji.
6. **Barge-in dipicu interim result, bukan `onstart`** — `onstart` tidak
   bisa dipercaya di mode continuous (fire tiap restart walau hening).
7. **Logika call hidup di `CallSession` (bukan komponen React)** — bisa
   diuji tanpa DOM; komponen hanya wiring + presentasi.
8. **`vi.mock` per file dilarang untuk modul yang dipakai lintas test
   file** (`@/lib/auth`, gemini SDK, rate-limit store) — dengan
   `isolate: false` instance mock terpisah per file → flake 401
   bergantung urutan. Semua mock global di `tests/setup.ts`.
9. **Diktasi chat = PTT + transkrip ke input (bukan auto-kirim)** —
   user selalu melihat & bisa mengedit sebelum pesan terkirim; risiko
   salah dengar terkompensasi manusia, bukan dibuang sistem.
10. **Akumulasi transkrip rebuild per event, bukan append** —
    `event.results` adalah state kumulatif sesi (interim diperbarui di
    tempat); append per event = double hitung. Logikanya satu tempat
    (`collectTranscript`) untuk call & chat.
11. **Cache TTS di Neon `bytea`, bukan R2/S3** — tanpa infra baru;
    skala cache (≤1000 baris, puluhan MB) aman untuk Postgres serverless.
    Kalau tumbuh besar nanti, tabel ini mudah dimigrasi ke object storage.
12. **Cache key = `sha256(voiceId|modelId|text)`** — voice & model masuk
    key supaya ganti suara/model tidak memakai audio lama.
13. **`charsBilled` hanya dihitung saat MISS** — hit tidak di-billing ke
    ElevenLabs; pencatatannya harus memisahkan keduanya supaya metrik
    biaya per DAU akurat.
14. **Cap biaya TTS dua lapis** — rate limit request (jumlah) + cap
    karakter/hari per user (`TTS_MAX_CHARS_PER_DAY`, ukuran). Gagal
    upstream tidak menambah `charsBilled` (tidak ada yang dibayar).
15. **Mood dari TEKS, bukan `expression` turn-level** — `expression`
    baru dikirim di event `done` (setelah semua kalimat sudah disintesis),
    jadi terlambat untuk TTS streaming per-kalimat. `detectMood` (pure,
    satu modul untuk client & server) menutup mayoritas kasus.
16. **Mood masuk key cache** — sama teks beda mood = audio berbeda;
    key `sha256(voiceId|modelId|mood|text)`. Konsekuensi: rumusan key
    M6.5 membatalkan entry cache M6.4 (cache tumbuh ulang, LRU).
17. **Kecepatan via `playbackRate` + `preservesPitch` (client), timbre via
    `voice_settings` (server)** — ElevenLabs tidak punya parameter
    kecepatan, jadi tempo ditangani client; `neutral` dipatok identik
    dengan setting & tempo M6.1 (regresi kalimat netral).

---

## 8. Checklist deploy

- [ ] Vercel: pastikan `ELEVENLABS_API_KEY` terisi.
- [ ] Vercel: **isi `ELEVENLABS_VOICE_ID`** (wajib sejak commit M6.1).
- [ ] Test M6.1 di production: buka call, ucapkan sesuatu — suara Livia
  harus mulai keluar **sebelum** seluruh teks selesai disintesis.
- [ ] Test M6.2 di production:
  - tanpa tap apa pun, status header harus `MENDENGARKAN` (listening
    continuous) dan bicara langsung terdeteksi (ring pink + tombol mic
    pulse);
  - saat Livia sedang berbicara, bicaralah → Livia harus jeda seketika
    (barge-in) dan giliran lamanya dibatalkan;
  - tap tombol mic → `Mic off` (mute), status `SIAGA`; tap lagi →
    listening kembali.
- [ ] Test M6.3 di production (halaman `/chat`):
  - tombol mic muncul di samping input; tap → merah + pulse, placeholder
    `Mendengarkan...`;
  - ucapkan kalimat → transkrip muncul di input; berhenti bicara → teks
    final tertinggal dan bisa diedit; Enter/kirim disabled selama
    listening;
  - ketik separuh kalimat, tap mic, lanjut bicara → hasil = teks lama +
    diktasi (append, bukan timpa).
- [ ] Test M6.4 di production (verifikasi via Vercel logs / DevTools):
  - call/chat beberapa kalimat, lalu ulangi kalimat sama → response
    `X-Tts-Cache: hit` (tanpa hit ke ElevenLabs);
  - query Neon: tabel `ttsCache` terisi, `ttsUsage` mencatat requests &
    `chars_billed` per user per hari;
  - (opsional) set `TTS_MAX_CHARS_PER_DAY` kecil di env + redeploy untuk
    mencoba 429 kuota — kembalikan setelahnya.
- [ ] Test M6.5 di production (DevTools → Network → /api/tts):
  - minta Livia bergembira (mis. "puji aku!") → header `X-Tts-Mood:
    happy`/`excited` dan suara terdengar lebih energik;
  - kalimat netral ("apa kabar?") → `X-Tts-Mood: neutral`, nada seperti
    sebelum M6.5 (regresi);
  - kalimat menyeramkan → `X-Tts-Mood: scared`, tempo terdengar lebih
    cepat.
  - (Catatan: deteksi = heuristik kata kunci — kalau sebuah kalimat
    "salah mood", itu expected sampai daftar kata dituning, bukan bug.)

---

## 9. Utang M6 (untuk sub-milestone berikutnya)

- **Mitigasi feedback loop**: mic menangkap suara Livia sendiri (speaker
  besar) — barge-in bisa dipicu suara Livia; dimitigasi speaker toggle
  (0.25x) saja. VAD/echo-cancel proper = ranah native.
- **STT fallback server (Whisper/endpoint)** — hanya diperlukan untuk
  rilis native (Web Speech API tidak tersedia di native). Evaluasi saat
  itu, bukan sekarang.
- **Metrik "hemat 90%" belum terukur** — M6.4 sudah mencatat
  `ttsUsage.cacheHits`/`requests`/`charsBilled`, tapi belum ada dashboard
  / laporan yang menghitung rasio hit aktual. Penghematan sesungguhnya
  bergantung frekuensi pengulangan kalimat Livia; ukur dari `ttsUsage`
  setelah berjalan beberapa hari.
- **Eviction LRU hanya jalan per-insert** — kalau tidak ada miss baru,
  baris cache tidak dibuang. Aman untuk sekarang (tabel kecil, insert
  sering di awal), tapi kalau tabel membesar perlu jadwal eviction
  terpisah (cron / prune).
- **Cache TTS di Postgres `bytea`** — praktis, tapi membesar seiring
  variabilitas kalimat. Kalau tumbuh > ratusan MB, migrasi ke R2/S3
  (schema `ttsCache` tinggal ganti `audio` → URL).
- **Tuning daftar kata kunci mood (M6.5)** — `MOOD_KEYWORDS` di
  `lib/tts/persona.ts` baru cover kosakata umum; leksikon khas Livia
  (sapaan kasar repetitif, istilah inside-joke) perlu ditambah setelah
  melihat kalimat aktual dari log. False positive hanya soal penjiwaan
  suara, bukan kegagalan.
- **`preservesPitch` belum divalidasi di semua browser (M6.5)** —
  Chromium & Safari mendukung; perilaku Firefox perlu dicek di perangkat.
- **Mood belum memakai `expression` LLM (M6.5)** — upgrade ke
  per-kalimat expression dari model butuh ubah protokol stream + prompt;
  nilai marginal dibanding deteksi teks untuk sekarang.
- Panel krisis lengkap di call (resources clickable) — saat ini hanya
  teks pesan.
- Quirk iOS Safari untuk `SpeechRecognition` (continuous di call, PTT di
  chat) belum divalidasi di perangkat fisik — fallbacknya mute/unmute
  dan input ketik tetap berfungsi.
