# M6 — Voice & Realtime

Dokumen ini mencatat apa yang **sudah** dikerjakan di M6, keputusan desain yang
mengikat, dan utang teknis yang tersisa.

Status: **M6.1 + M6.2 + M6.3 selesai (kode + test).** TTS streaming
end-to-end, voice-ID hardcode terhapus, call memakai continuous listening +
barge-in + turn cue realtime, dan halaman chat punya diktasi suara.
M6.4–M6.5 belum dimulai — lihat §7.

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

## 4. Perubahan file

| File | Perubahan |
| --- | --- |
| `app/api/tts/route.ts` | rewrite: streaming pass-through, `requireEnvVar`, tanpa hardcode |
| `lib/tts/sentences.ts` | baru: `splitSentences`, `takeCompleteSentences`, `TTS_MAX_LEN` |
| `lib/tts/pipeline.ts` | baru: `TtsPipeline` (enqueue/prefetch/stop) |
| `lib/call/session.ts` | baru: `CallSession` (continuous listening, barge-in, giliran, status); M6.3 refactor pakai `collectTranscript` |
| `lib/speech/transcript.ts` | baru: `collectTranscript` (pure, isomorphic — rebuild transkrip per event) |
| `lib/speech/use-speech-recognition.ts` | baru: hook diktasi PTT (PTT, interim live, supported post-mount) |
| `features/chat/ChatClient.tsx` | M6.3: tombol mic + diktasi ke input (append, editable, hint izin) |
| `features/call/CallClient.tsx` | rework 2x: M6.1 SSE→pipeline; M6.2 jadi tipis (wiring+UI), pill status header, mic mute/unmute |
| `tests/setup.ts` | + mock `Audio` global, + handle reset store rate-limit, + mock `@/lib/auth` (pola holder) |
| `tests/tts-sentences.test.ts` | baru (15 test) |
| `tests/tts-pipeline.test.ts` | baru (6 test) |
| `tests/tts-route.test.ts` | baru (6 test) |
| `tests/call-session.test.ts` | baru (9 test) |
| `tests/speech-transcript.test.ts` | baru (7 test) |
| `tests/api-handler.test.ts` | pakai mock auth global dari setup.ts |
| `.env.example` | catatan: kedua variabel ElevenLabs wajib untuk TTS |

---

## 5. Keputusan yang mengikat

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

---

## 6. Checklist deploy

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

---

## 7. Utang M6 (untuk sub-milestone berikutnya)

- **Mitigasi feedback loop**: mic menangkap suara Livia sendiri (speaker
  besar) — barge-in bisa dipicu suara Livia; dimitigasi speaker toggle
  (0.25x) saja. VAD/echo-cancel proper = ranah native.
- **STT fallback server (Whisper/endpoint)** — hanya diperlukan untuk
  rilis native (Web Speech API tidak tersedia di native). Evaluasi saat
  itu, bukan sekarang.
- **M6.4**: TTS cache `sha256(text+voice)` → penyimpanan audio
  (R2/S3, atau Postgres `bytea` tanpa infra baru — pilihan saat
  implementasi), + pencatatan biaya TTS per DAU.
- **M6.5**: voice persona dinamis per expression (voice_settings per
  mood: happy → energik, scared → cepat).
- Panel krisis lengkap di call (resources clickable) — saat ini hanya
  teks pesan.
- Quirk iOS Safari untuk `SpeechRecognition` (continuous di call, PTT di
  chat) belum divalidasi di perangkat fisik — fallbacknya mute/unmute
  dan input ketik tetap berfungsi.
