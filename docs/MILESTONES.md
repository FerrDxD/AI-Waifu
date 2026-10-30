# MILESTONE ROADMAP — Teman Kost (AI-Waifu)
Generated: 2026-10-24 · Pendamping: `docs/AUDIT.md`

Tujuan: mengubah prototipe menjadi **AI companion kelas produksi** yang sejajar dengan
LLM product modern (Character.AI / Replika / ChatGPT-level engineering).

Konvensi: setiap milestone punya **Definition of Done (DoD)**. Tidak ada yang dianggap selesai
sebelum DoD terpenuhi + ada test yang lulus.

---

## M0 — HOTFIX: Bunuh Lubang Keamanan Kritis (Minggu 1)
> Seperti rumah kebakaran: matikan dulu, renovasi belakangan.

**Tujuan:** Hilangkan 3 lubang yang bisa bikin dituntut/dirampok kuota user dalam 24 jam.

- [ ] **H0.1** Hapus penyimpanan API key di `localStorage` + cookie non-HttpOnly.
  - Sementara: key hanya dikirim via header per-request dari **session memory JS** (lebih baik dari localStorage) + banner "fitur ini akan dipindah ke server".
  - Target akhir: key disimpan di DB terenkripsi (`pgcrypto`), keluar dari client selamanya.
  - Hapus klaim palsu "Aman & Privasi Terjamin" dari `ApiGuideModal.tsx:183`. Ganti dengan penjelasan jujur.
  - Cookie wajib `HttpOnly; Secure; SameSite=Strict` jika dipakai.
- [ ] **H0.2** Hidupkan kembali safety filter minimal: setidaknya `HARM_CATEGORY_HARASSMENT`, `HARM_CATEGORY_HATE_SPEECH`, `HARM_CATEGORY_DANGEROUS_CONTENT` ke `BLOCK_MEDIUM_AND_ABOVE`. Seksual eksplisit tetap `BLOCK_ONLY_HIGH` saja jika dirasa mengekang persona — tapi **wajib** compensasi guardrail sendiri (lihat M4).
- [ ] **H0.3** Pasang security headers: `next.config.js` → `headers()` CSP strict-dynamic + nonce, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.
- [ ] **H0.4** Rate limit endpoint auth (register/login/verify) + lockout 5x gagal / 15 menit.
- [ ] **H0.5** Input validation server-side: panjang chat ≤ 2000 char, sanitize `location`, `userName`, `history` sebelum masuk prompt (cek bagian A.3 di audit).
- [ ] **H0.6** Stop membalas `error.message` mentah ke client → pesan generic + log server terstruktur.
- [ ] **H0.7** Bersih-bersis repo: `git rm --cached` `tsconfig.tsbuildinfo`, `__pycache__/`, `missing*.txt`, pindahkan Python script ke `scripts/` + `.gitignore`.

**DoD:** Tidak ada API key di storage client (diverifikasi via DevTools), headers lulus
`securityheaders.com` grade A, `npm run lint` lulus tanpa error, register tidak bisa dispam.

---

## M1 — Fondasi Engineering (Minggu 2–4)
> Tidak ada renovation tanpa blueprint. M1 ini yang bikin refactor berikutnya tidak menakutkan.

- [x] **M1.1** ESLint config nyata (`.eslintrc.json`: `next/core-web-vitals` + `no-throw-literal` + `no-debugger` + `@typescript-eslint/no-explicit-any` sebagai warning), Prettier, commit convention (Conventional Commits + commitlint + husky `commit-msg`).
- [x] **M1.2** **CI** (GitHub Actions): typecheck → lint → test:coverage → build. Semua PR wajib lulus.
- [x] **M1.3** Testing harness pertama: Vitest. **208 tes / 11 file**, coverage `lib/` **53.96%** (target 30%). React Testing Library belum dipasang (menunggu komponen dipecah di M5.1).
- [x] **M1.4** Custom error class (`AppError` + `apiErrorResponse`) dan helper `apiHandler()`/`jsonApiHandler()`/`publicApiHandler()` untuk auth + rate limit + try/catch. *Sentry ditunda — butuh DSN.*
- [x] **M1.5** Environment validation: `zod` schema di `lib/env.ts` (`GEMINI_API_KEY`, `DATABASE_URL`, `ELEVENLABS_API_KEY`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`) — fail fast dengan semua masalah sekaligus, bukan `!` non-null assertion.
- [x] **M1.6** Docs: README ditulis ulang (arsitektur, env variable, perintah dev dengan Bun, path folder `AI-Waifu` yang benar) + `docs/M1-IMPLEMENTATION.md`.

**DoD:** CI hijau, coverage ≥30% di `lib/`, tidak ada `any` baru, nol `console.error` di production path (semua lewat logger).

---

## M2 — AI Engine Overhaul: Bikin Livia Beneran Cerdas (Bulan 2)
> Ini jantung "sejajar dengan LLM lain".

- [x] **M2.1** **Streaming response**. Endpoint baru `/api/chat/stream` (SSE) menggantikan JSON round-trip. Typewriter effect diganti partial render. Latensi perceived turun drastis.`responseSchema` + langkah pipe "tag dulu JSON, stream text setelahnya".
- [x] **M2.2** **Abstraksi provider AI** (interface `LLMProvider` dengan implementasi `GeminiProvider`, dan nanti `OpenAIProvider`/`AnthropicProvider`/`OllamaProvider`). Model dari env, bukan hardcode `gemini-3.6-flash` 3x.
- [x] **M2.3** **Satu sumber persona**: `lib/ai/persona.ts` dengan builder terpusat (base + konteks afeksi + konteks fisiologis + memori). Hapus duplikasi logika siklus haid ke `lib/livia/cycle.ts` (digunakan oleh 3 route). Hapus juga `generateDateDialogue` injection: nama user tidak pernah masuk ke prompt mentah.
- [x] **M2.4** **Structured output pakai JSON schema** (`responseSchema`/Zod) — hapus `parseJsonResponse` regex. Kalau model mendukung native JSON mode, pakai itu.
- [x] **M2.5** **Context window engineering**:
  - Rolling summary: tiap 20 pesan belum-terringkas, rentang lama direkap jadi 1 entri (`messageSummaries` table; pelacak cakupan = `SUM(coveredCount)`, pemicu fire-and-forget setelah persist).
  - Root message selection: pesan lama relevan dipilih via kata kunci (`lib/ai/context.ts` — ≥2 kata bersinggungan, atau 1 kata khas ≥7 huruf), bukan "30 terakhir mentah".
  - Token budget: heuristik `chars/3.5` (`approximateTokens`) — cukup untuk memangkas; window 14 turn terakhir selalu dijaga, sisanya di-pangkas dari yang paling lama.
- [x] **M2.6** **Robust retry & circuit breaker**: retry 503/429/502 dengan exponential backoff, timeout 25 detik, fallback model (flash → flash-lite), ke state "Livia lagi pusing" bila semua gagal (in-world error recovery yang lucu, bukan stack trace).
  - *Selesai di sisi single-instance:* retry 429/5xx + backoff & jitter, timeout, fallback model, circuit breaker (`lib/ai/circuit-breaker.ts`), dan balasan in-world "Livia pusing" (`lib/gemini.ts`). Catatan: breaker masih per-proses — breaker terdistribusi ditunda ke M5.5.- [x] **M2.7** **Evals pertama**: dataset 50 scenario uji (kesopanan, konsistensi persona, ingat nama, nol bahasa Jepang) yang dijalankan terhadap tiap perubahan prompt. Lulus sebelum merge.
  - Harness: `evals/` — dataset 50 skenario (6 kategori), registry cek hard/soft, runner CLI (`bun run evals` offline tanpa API; `bun run evals:live` dengan API). Integritas dataset + cek level-prompt dipaksa CI lewat `tests/evals-dataset.test.ts`.

**DoD:** First-token latency < 1.5 detik (P50), response Livia konsisten dengan persona ≥85% di evals, ganti provider tidak mengubah code domain (hanya adapter baru).

---

## M3 — Sistem Memori Berlapis (Bulan 3)
> Karakter AI yang diingat sebagai standar. Selama ini Livia "amnesia chapter-based".

- [x] **M3.1** Tabel `memory_items`: `id, user_id, type (core|episodic|semantic), content, confidence, created_at, last_recalled_at, decay_score`. Hapus `longTermMemory` text blob.
      → Selesai dengan penyesuaian: kolom `longTermMemory` **dormant**, bukan dihapus (drop kolom berisi data user = operasi satu arah). Migrasi data otomatis (`importLegacyMemory`) mengosongkannya setelah insert berhasil. Lihat `docs/M3-IMPLEMENTATION.md` §2.2.
- [x] **M3.2** **Memory extraction pipeline**: setiap balasan model, ekstrak fakta (tool/function calling, bukan prompt "memoryUpdate"), tulis ke tabel, dedupe dengan similarity.
      → Field terstruktur `memories: [{type, content, confidence}]` di skema balasan (schema-hint + zod coercion), dedupe dua lapis (batch + tabel, Jaccard ≥ 0.7). `memoryUpdate` disisakan sebagai fallback legacy.
- [x] **M3.3** **Retrieval (bukan ambil semua)**: scoring gabungan: relevance (embeddings di Neon pgvector atau cosine sederhana via `pgvector`), recency, decay. Ambil top-K (5–8) yang masuk konteks.
      → Relevance **lexical** (bukan pgvector — ditunda sebagai utang teknis, lihat §5.4/§8) + decay + recency + bonus core. Top-K 6, plafon 8, skor minimum 0.25.
- [x] **M3.4** **Memory consolidation**: tiap minggu, memori lama dipadatkan menjadi "inti memori" (entri tipe diary). Livia bisa "merenung" saat user offline.
      → Dipicu per turn aktif (tanpa worker/queue): total item > 30 dan ≥ 6 kandidat ber-decay ≤ 50 → satu entri `diary`, sumber dihapus setelah capture.
- [x] **M3.5** **User-visible memory UI**: panel "Apa yang Livia ingat tentang kamu" (transparansi) + tombol hapus per item (GDPR).
      → `/api/memory` GET/DELETE + panel di halaman Settings (badge tipe, kekuatan, hapus per item, "Lupakan semua").

**DoD:** Tes memori: user bilang "aku beli kucing bernama Poy" di sesi A → di sesi B hari berbeda, Livia menyebut Poy secara natural tanpa diprompt, ≥70% kasus.

**Status DoD:** mekanismenya sudah ada (fakta → `memoryItems` → retrieval relevansi → blok memori di prompt), tetapi **pengukuran ≥70% belum diambil**: butuh 2 sesi live ke API dan kuota free-tier sedang habis. Yang sudah terbukti: `memory.*` (10 skenario, termasuk `memory.pet_name`) lulus 10/10 di eval offline, dan test unit retrieval membuktikan fakta relevan mengalahkan fakta baru yang tidak relevan.

---

## M4 — Safety, Privacy & Compliance (Bulan 3, paralel)
> Bukan batasan, tapi fitur yang membuat user (dan hukum) percaya.

- [x] **M4.1** **Age gate**: konfirmasi 18+ (atau 13+ dengan gate konten) di registrasi + modal pertama.
      → Checkbox wajib di registrasi (divalidasi ulang di server) + modal blokir untuk akun pra-M4. Hanya waktu konfirmasi yang disimpan (`users.age_confirmed_at`), bukan tanggal lahir. Kegagalan baca = "tidak diketahui" → tidak memblokir.
- [x] **M4.2** **Guardrail layer sendiri** (karena BLOCK_NONE):
  - Pre-check input: classifikasi bahasa kasar/ancaman/SI sexual terhadap moderasi cepat (Perspective API atau model flash-lite classifier).
  - Post-check output Livia sebelum dirender/stream.
  - Safe-word & behavior: deteksi "aku mau mengakhiri hidup" → tampilkan hotline + escape script.
      → Berbasis pola (deterministik, tanpa latensi/biaya, tetap jalan saat provider down) — bukan Perspective API. Urutan: krisis > sexual_minor > weapons > illegal_harm > hate > prompt_injection. Krisis **melepas persona**: panel bantuan terpisah + hotline (SEJIWA 119 ext. 8, Into The Light, Halo Kemenkes) + direktori `findahelpline.com`. Dipasang di `lib/gemini.ts` (satu pintu ke provider), jadi JSON & streaming memakai aturan identik.
- [x] **M4.3** **PII redaction** sebelum data ke Gemini: nomor telepon, email, NIK, alamat lengkap → token (PHONE_1) yang di-mapping kembali saat rendering jika perlu. Opsional opt-in "mode privat ekstra".
      → Email, NIK (16 digit), telepon (`08…`/`+62…`/kode area), rekening (dengan penyaring nominal/tahun), IPv4. **Seluruh riwayat** diredaksi, bukan hanya pesan terbaru (kalau tidak, PII lama terkirim ulang setiap turn). Pemulihan token aman untuk streaming yang terbelah antar delta. Alamat bebas & nama tidak tertangkap — diakui sebagai batas, bukan diklaim sempurna.
- [x] **M4.4** **Data control**: halaman Privacy Center — export semua data (tanpa API key!), hapus akun + seluruh data (hard delete cascade + forget memory), tidak lagi "Coming soon".
      → `/privacy` (JSON + Markdown), `GET /api/user/export` (API key tidak pernah ikut; bagian gagal tidak menggagalkan sisanya; pemotongan dicatat jujur), `DELETE /api/user/account` (frasa konfirmasi divalidasi di server, hard delete cascade). Tombol "reset data" palsu di Pengaturan dihapus.
- [x] **M4.5** **Privacy Policy + ToS asli** (bukan template), cookie consent jika ada analytics.
      → `/privacy-policy` dan `/tos` bisa dibuka tanpa login, menyebut Google Gemini secara eksplisit. Cookie consent **tidak** ditambahkan karena tidak ada analytics/iklan — banner tanpa cookie yang perlu disetujui hanya melatih user mengabaikannya.
- [x] **M4.6** **Audit log** (`audit_events` table): login, reset, delete data, perubahan sensitive — mempermudah investigasi insiden.
      → `auditEvents` dengan `user_id` **tanpa FK cascade** (jejak hapus akun harus bertahan). Metadata daftar-putih (bukan daftar-hitam) supaya field request baru tidak otomatis bocor ke log. `recordAuditEvent()` tidak pernah melempar. Diaudit: login sukses/gagal/terkunci, register, simpan/hapus API key, hapus memori, export, hapus akun, age gate.

**DoD:** Lulus tabel linter privasi internal, takedown insiden terdokumentasi, ToS menyebut LLM processing & transfer data ke Google, age gate aktif.

**Status DoD:** ToS & Kebijakan Privasi menyebut Google Gemini sebagai pemroses data — terpenuhi. Age gate aktif di registrasi & akun lama — terpenuhi (butuh satu `db:push` untuk kolomnya). "Linter privasi internal" tidak ada sebagai tool; yang dijalankan adalah `tsc` + 525 unit test + eval offline 50/50. Takedown insiden **belum terdokumentasi** — belum pernah ada insiden, dan prosedurnya belum ditulis.


---

## M5 — Arsitektur & Performance (Bulan 4)

- [x] **M5.1** **Pecah monolit**: `story/page.tsx` 2028 baris → data pindah ke `content/story/chapters/*.json` (writer-friendly, bisa di-edit tanpa ngetik JSX). `HomeClient` 1028 baris → dipecah per-fitur (`features/home/*`). Tujuan: tidak ada file page > 300 baris.
- [x] **M5.2** **Server Actions / RPC layer** ganti fetch manual ke API untuk operasi state (mengurangi boilerplate + typed end-to-end). Pertahankan REST hanya untuk streaming/SSE. *(Core termigrasi: affection, work, cook — lihat docs/M5-IMPLEMENTATION.md §2; operasi lain = utang terdokumentasi.)*
- [x] **M5.3** **Database**:
  - Index: `chatMessages(userId, createdAt DESC)`, `screenTimeLogs(userId, date)`, `pomodoroSessions(userId, completedAt)`, `memory_items(userId, lastRecalledAt)`.
  - Migrations sistem (`drizzle-kit generate` + folder migrations + CI check drift), bukan `push` ke prod.
  - Retention policy: chat > 90 hari dipindah ke cold storage/diresume (agree dengan M2.5).
- [x] **M5.4** **Hindari race condition**: `SELECT ... FOR UPDATE` / atomic increment (`SET affection = affection + ?`) untuk update affection & story unlock. Client-side cheat diberantas: money/item/affection state otoritas server; `localStorage` hanya preferensi (volume, bahasa). *(neon-http tak punya koneksi persisten → semua mutasi jadi SATU UPDATE dengan ekspresi SQL + guard, bukan FOR UPDATE.)*
- [x] **M5.5** **Distributed rate limiter**: pindah ke DB/Redis (`Neon` table atau Upstash) — per-user, per-route, daily + monthly cap + alert cost. Hapus in-memory `Map` (memory leak + tidak efektif).
- [x] **M5.6** **Cache**: LRU untuk cache konteks persona, memori prebuilt; `unstable_cache` untuk data read berat (story chapters adalah JSON statis). Image optimization diaktifkan (`formats: ['image/avif']` + `sharp`). *(LRU in-proses dinilai tidak tepat untuk serverless stateless + retrieval per-query — alasan di docs/M5-IMPLEMENTATION.md §6.2; image avif/webp aktif.)*
- [x] **M5.7** **Lazy load** komponen global di layout (RadioProvider, QuestTracker) agar first load JS turun.

**DoD:** Skor Lighthouse Performance ≥85 di mobile, query utama explain-plan pakai index (bukan seq scan), zero cheat lewat DevTools console (diverifikasi manual).

---

## M6 — Voice & Realtime (Bulan 5)

- [x] **M6.1** **TTS streaming** (ElevenLabs websocket/SSE) — suara mengalir saat teks masih dirender. Hapus voice-ID hardcode di `tts/route.ts:24` (sekaligus env cache yang benar). *(Implementasi: SSE `/api/chat/stream` → `takeCompleteSentences` → `TtsPipeline` per-kalimat + prefetch; route TTS pass-through stream; config via `requireEnvVar` — detail docs/M6-IMPLEMENTATION.md.)*
- [x] **M6.2** **Barge-in & turn cue**: saat user mulai bicara, Livia pause. Indikator status call realtime. *(CallSession: continuous listening + auto-restart, barge-in via interim result (termasuk abort giliran thinking), pill status di header — detail docs/M6-IMPLEMENTATION.md §2.)*
- [x] **M6.3** **STT input**: browser SpeechRecognition-to-text untuk voice input chat (fallback Gemini Live API / Whisper endpoint bila ingin rilis native). *(useSpeechRecognition (PTT, interim live) + collectTranscript shared dgn call; diktasi ke input /chat — append, editable, hint izin. Fallback Whisper/Gemini Live tertunda ke saat rilis native — lihat docs/M6-IMPLEMENTATION.md §7.)*
- [x] **M6.4** **TTS cache**: hash `sha256(text+voice)` → simpan audio di blob storage (R2/S3), menghemat 90% biaya ElevenLabs untuk kalimat yang berulang (Livia banyak bicara kasar repetitif). *(Implementasi: key `sha256(voiceId|modelId|text)`; audio di Neon `bytea` (tanpa infra baru, bukan R2/S3 — skala cache aman di Postgres); eviction LRU; cap `TTS_MAX_CHARS_PER_DAY` + pencatatan `ttsUsage` per user/hari (requests, cacheHits, charsBilled). Rasio "hemat 90%" = target, diukur via `ttsUsage.cacheHits` — lihat docs/M6-IMPLEMENTATION.md §4.)*
- [x] **M6.5** **Voice persona**: voice settings dinamis berdasarkan expression (happy → energik, scared → cepat). *(Implementasi: mood dideteksi dari TEKS kalimat (`detectMood`, `lib/tts/persona.ts`) karena `expression` turn-level baru dikirim di event `done` (terlambat untuk TTS streaming per-kalimat). Timbre via `MOOD_VOICE_SETTINGS` di server (happy style tinggi=energik, scared stability rendah=cepat); tempo via `playbackRate`+`preservesPitch` di client (ElevenLabs tak punya param kecepatan). `neutral` dipatok identik setting M6.1 (regresi). Mood masuk key cache — lihat docs/M6-IMPLEMENTATION.md §5.)*

**DoD:** Voice call terasa konversasional (latency first-audio < 2 detik), biaya TTS per DAU tercatat & dibatasi.

---

## M7 — Observability, Cost & Eval Loop (Bulan 6)

- [x] **M7.1** **Token & cost dashboard**: tiap request tercatat (provider, model, token in/out, biaya, user). Agregasi harian + alert kalau budget meledak. (docs/M7-IMPLEMENTATION.md)
- [x] **M7.2** **Product analytics** privacy-first: retention D1/D7/D30, jumlah pesan per session, drop-off. **Diputuskan first-party di Neon** (bukan PostHog/Plausible — nol infra baru, nol pihak ketiga; semua metrik dari data sendiri). Dashboard owner-only `/analytics`. (docs/M7-IMPLEMENTATION.md §2)
- [x] **M7.3** **Eval loop otomatis** dalam CI: persona test, guardrail test (prompt injection, usaha "lewatkan filter"), memory recall test → gate deployment. CI GitHub (5 job, live eval secret-gated) + gate build Vercel (eval offline di `build`), +5 skenario bypass. (docs/M7-IMPLEMENTATION.md §3)
- [x] **M7.4** **Feedback loop in-app**: tombol "jawaban buruk/baik" di chat → masuk dataset evals. Tabel `chatFeedback` (1 rating/user/pesan, upsert) + `POST /api/chat/feedback` + tombol 👍/👎 di balasan Livia (`messageId` via `.returning()` di event `done`) + dashboard owner `/feedback` dengan sketsa skenario siap-salin (human-in-the-loop ke `evals/dataset.ts`). (docs/M7-IMPLEMENTATION.md §4)
- [x] **M7.5** **Uptime & alerting**: status page (UptimeRobot / Better Stack), webhook Discord/Slack saat route error rate naik. Endpoint monitor `/api/health` (cek DB, publik) + `lib/alerting.ts`: jendela 5xx 5 menit (counter atomik di `rateLimitCounters`, tepat 1 alert/jendela) + alert budget `ai.budget_alert` keluar dari log (utang M7.1 tertutup). Env opsional `ALERT_WEBHOOK_URL`/`ALERT_5XX_THRESHOLD`; akun monitor & webhook = konfigurasi user (checklist docs §5.6). (docs/M7-IMPLEMENTATION.md §5)

**DoD:** Dashboard satu layar bisa menjawab: "kualitas Livia hari ini naik gak? Biaya gak lepas kendali? User betah?"

---

## M8 — Fitur Paritas agar Bertaraf Komersial (Bulan 7–9)

- [x] **M8.1 Phase 1** **Multi-provider engine** — adapter Gemini / OpenAI / Anthropic / OpenAI-compatible (provider pihak ketiga), helper retry–fallback–breaker bersama, skema respons netral, API key per provider. Detail: `docs/M8-IMPLEMENTATION.md`.
- [x] **M8.1 Phase 2** **Multi-model selector di settings** — dropdown model dari allowlist server (`AI_ALLOWED_MODELS`), kolom `userProfiles.preferredModel`, validasi ulang saat dipakai, plus provider BYOK di UI. Detail: `docs/M8-IMPLEMENTATION.md` §4.
- [ ] **M8.2** **Karakter lain** (ayah, legal): defensif vs Code Geass — engine-nya abstrak, `persona.ts` cukup file JSON. Di-app kamu tinggal Ayame/Enji/Laura/Naomi (public/ folder mereka sudah ada, tapi characternya belum dipakai engine?).
- [x] **M8.3** **Tool calling**: "Livia, ingetin aku jam 7", "Livia, tolong catat belanja", integrasi TODO/schedule/kitchen → dia benar-benar asisten (infrastruktur M2). JSON tools single-turn: Livia mengembalikan field opsional `tools:[{name,args}]` di JSON balasan; server validasi zod per-tool + eksekusi (tabel `reminders` + `shoppingItems`), hasil jadi baris konfirmasi di reply. UI panel pengingat & belanja di /schedule. (docs/M8-IMPLEMENTATION.md §5)
- [x] **M8.4** **Gamifikasi server-validated** (tanpa leaderboard): quest & achievement otoritas server (lihat M5.4) — progress & klaim dipindahkan ke tabel `dailyQuests` + API `/api/quests/*`; server satu-satunya sumber kebenaran (anti-cheat: hanya aksi yang tercatat di DB yang dihitung, reward Rv/afeksi idempoten). Aksi yang direkam: visit route (QuestTracker), sentuh Livia (home), tool chat M8.3 (reminder/shopping). Milestone 3/6/9 (100/300/500 Rv, +3 afeksi di 9) juga server-validated. Daily challenge bervariasi per tanggal (katalog deterministik). (docs/M8-IMPLEMENTATION.md §6)
- [x] **M8.5** **PWA/native**: `manifest.json` + ikon (192/512/maskable) + service worker `public/sw.js` (offline cache app shell + aset statis, network-first untuk halaman dinamis, fallback `/offline`), install banner, push notification (Web Push + VAPID) untuk reminder lewat waktu, pomodoro selesai, dan "Livia kangen" harian (cron Vercel, guard `CRON_SECRET`). (docs/M8-IMPLEMENTATION.md §7)
- [ ] **M8.6** **Sharing & komunitas**: export momen chat sebagai card gambar (pake canvas), kirim ke SosMed — growth factor terbesar aplikasi character.
- [ ] **M8.7** **Monetisasi** (bila dimaksud): subscription tier — kuota AI lebih besar, voice premium, kostum. Implementasi WAJIB sesuai M4 (tidak ada data dijual).

**DoD:** Grafik retensi naik, minimal 1 fitur yang membuat user bilang "wah, Livia kayak hidung hidup".

---

## M9 — Hardening & Scale (Bulan 10+)

- [ ] Load test (k6) untuk endpoint streaming + TTS; target 500 konkuren.
- [ ] Web Application Pen-test eksternal (Bugcrowd / HackerOne) setelah M0–M5 selesai.
- [ ] Backup otomatis Neon + disaster recovery drill.
- [ ] GDPR audit resmi, data residency pilihan (EU/Asia).
- [ ] Dokumentasi API publik + SDK (jika ingin ekosistem modder VN).

---

## Timeline Ringkas

| Milestone | Fokus | Target |
|---|---|---|
| **M0** | Hotfix kritis | 1 minggu |
| **M1** | Fondasi (lint, CI, test) | 3 minggu |
| **M2** | AI engine (streaming, provider, evals) | 1 bulan |
| **M3** | Sistem memori | 1 bulan |
| **M4** | Safety & privacy compliance | 1 bulan |
| **M5** | Arsitektur & performa | 1 bulan |
| **M6** | Voice & realtime | 1 bulan |
| **M7** | Observability & cost | 1 bulan |
| **M8** | Paritas fitur komersial | 2–3 bulan |
| **M9** | Hardening & scale | ongoing |

## Urutan yang Direkomendasikan
Nilai paling tinggi untuk reputasi & bertaraf: **M0 → M1 → M2 → M4 → M3 → M5 → M6 → M7 → M8 → M9**.
(M4 dinaikkan lebih awal dari M3 karena paritas tanpa safety = bom waktu hukum; tapi M0 sudah meminimalisir paling parah dulu.)

> **Disclaimer**: Estimasi untuk solo dev / tim kecil. Setiap estimasi bisa di-split; yang penting konsisten mengejar DoD, bukan jumlah milestone.
