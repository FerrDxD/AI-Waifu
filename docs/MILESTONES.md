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

- [ ] **M4.1** **Age gate**: konfirmasi 18+ (atau 13+ dengan gate konten) di registrasi + modal pertama.
- [ ] **M4.2** **Guardrail layer sendiri** (karena BLOCK_NONE):
  - Pre-check input: classifikasi bahasa kasar/ancaman/SI sexual terhadap moderasi cepat (Perspective API atau model flash-lite classifier).
  - Post-check output Livia sebelum dirender/stream.
  - Safe-word & behavior: deteksi "aku mau mengakhiri hidup" → tampilkan hotline + escape script.
- [ ] **M4.3** **PII redaction** sebelum data ke Gemini: nomor telepon, email, NIK, alamat lengkap → token (PHONE_1) yang di-mapping kembali saat rendering jika perlu. Opsional opt-in "mode privat ekstra".
- [ ] **M4.4** **Data control**: halaman Privacy Center — export semua data (tanpa API key!), hapus akun + seluruh data (hard delete cascade + forget memory), tidak lagi "Coming soon".
- [ ] **M4.5** **Privacy Policy + ToS asli** (bukan template), cookie consent jika ada analytics.
- [ ] **M4.6** **Audit log** (`audit_events` table): login, reset, delete data, perubahan sensitive — mempermudah investigasi insiden.

**DoD:** Lulus tabel linter privasi internal, takedown insiden terdokumentasi, ToS menyebut LLM processing & transfer data ke Google, age gate aktif.

---

## M5 — Arsitektur & Performance (Bulan 4)

- [ ] **M5.1** **Pecah monolit**: `story/page.tsx` 2028 baris → data pindah ke `content/story/chapters/*.json` (writer-friendly, bisa di-edit tanpa ngetik JSX). `HomeClient` 1028 baris → dipecah per-fitur (`features/home/*`). Tujuan: tidak ada file page > 300 baris.
- [ ] **M5.2** **Server Actions / RPC layer** ganti fetch manual ke API untuk operasi state (mengurangi boilerplate + typed end-to-end). Pertahankan REST hanya untuk streaming/SSE.
- [ ] **M5.3** **Database**:
  - Index: `chatMessages(userId, createdAt DESC)`, `screenTimeLogs(userId, date)`, `pomodoroSessions(userId, completedAt)`, `memory_items(userId, lastRecalledAt)`.
  - Migrations sistem (`drizzle-kit generate` + folder migrations + CI check drift), bukan `push` ke prod.
  - Retention policy: chat > 90 hari dipindah ke cold storage/diresume (agree dengan M2.5).
- [ ] **M5.4** **Hindari race condition**: `SELECT ... FOR UPDATE` / atomic increment (`SET affection = affection + ?`) untuk update affection & story unlock. Client-side cheat diberantas: money/item/affection state otoritas server; `localStorage` hanya preferensi (volume, bahasa).
- [ ] **M5.5** **Distributed rate limiter**: pindah ke DB/Redis (`Neon` table atau Upstash) — per-user, per-route, daily + monthly cap + alert cost. Hapus in-memory `Map` (memory leak + tidak efektif).
- [ ] **M5.6** **Cache**: LRU untuk cache konteks persona, memori prebuilt; `unstable_cache` untuk data read berat (story chapters adalah JSON statis). Image optimization diaktifkan (`formats: ['image/avif']` + `sharp`).
- [ ] **M5.7** **Lazy load** komponen global di layout (RadioProvider, QuestTracker) agar first load JS turun.

**DoD:** Skor Lighthouse Performance ≥85 di mobile, query utama explain-plan pakai index (bukan seq scan), zero cheat lewat DevTools console (diverifikasi manual).

---

## M6 — Voice & Realtime (Bulan 5)

- [ ] **M6.1** **TTS streaming** (ElevenLabs websocket/SSE) — suara mengalir saat teks masih dirender. Hapus voice-ID hardcode di `tts/route.ts:24` (sekaligus env cache yang benar).
- [ ] **M6.2** **Barge-in & turn cue**: saat user mulai bicara, Livia pause. Indikator status call realtime.
- [ ] **M6.3** **STT input**: browser SpeechRecognition-to-text untuk voice input chat (fallback Gemini Live API / Whisper endpoint bila ingin rilis native).
- [ ] **M6.4** **TTS cache**: hash `sha256(text+voice)` → simpan audio di blob storage (R2/S3), menghemat 90% biaya ElevenLabs untuk kalimat yang berulang (Livia banyak bicara kasar repetitif).
- [ ] **M6.5** **Voice persona**: voice settings dinamis berdasarkan expression (happy → energik, scared → cepat).

**DoD:** Voice call terasa konversasional (latency first-audio < 2 detik), biaya TTS per DAU tercatat & dibatasi.

---

## M7 — Observability, Cost & Eval Loop (Bulan 6)

- [ ] **M7.1** **Token & cost dashboard**: tiap request tercatat (provider, model, token in/out, biaya, user). Agregasi harian + alert kalau budget meledak.
- [ ] **M7.2** **Product analytics** privacy-first (PostHog self-host atau Plausible): retention D1/D7/D30, jumlah pesman per session, drop-off.
- [ ] **M7.3** **Eval loop otomatis** dalam CI: persona test, guardrail test (prompt injection, usaha "lewatkan filter"), memory recall test → gate deployment.
- [ ] **M7.4** **Feedback loop in-app**: tombol "jawaban buruk/baik" di chat → masuk dataset evals.
- [ ] **M7.5** **Uptime & alerting**: status page (UptimeRobot / Better Stack), webhook Discord/Slack saat route error rate naik.

**DoD:** Dashboard satu layar bisa menjawab: "kualitas Livia hari ini naik gak? Biaya gak lepas kendali? User betah?"

---

## M8 — Fitur Paritas agar Bertaraf Komersial (Bulan 7–9)

- [ ] **M8.1** **Multi-model selector di settings** (gemini-flash / pro / gpt / claude / ollama) — biar user lihat kamu memposisikan Livia sebagai client cerdas, bukan terkurung Gemini.
- [ ] **M8.2** **Karakter lain** (ayah, legal): defensif vs Code Geass — engine-nya abstrak, `persona.ts` cukup file JSON. Di-app kamu tinggal Ayame/Enji/Laura/Naomi (public/ folder mereka sudah ada, tapi characternya belum dipakai engine?).
- [ ] **M8.3** **Tool calling**: "Livia, ingetin aku jam 7", "Livia, tolong catat belanja", integrasi TODO/schedule/kitchen → dia benar-benar asisten (infrastruktur M2).
- [ ] **M8.4** **Gamifikasi server-validated**: quest & achievement otoritas server (lihat M5.4), leaderboard opsional, daily challenge bervariasi.
- [ ] **M8.5** **PWA_native**: `manifest.json` sudah ada → lengkapi offline cache (service worker dengan Next 14 `next-pwa`), install banner, push notification (pomodoro selesai, "Livia kangen").
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
