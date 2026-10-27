# M5 — Arsitektur & Performance

Dokumen ini mencatat apa yang **sudah** dikerjakan di M5, keputusan desain yang
mengikat, dan utang teknis yang tersisa.

Status: **M5.1 – M5.7 selesai (kode).** `tsc` 0 error, 535 test lolos, eslint
0 error pada file yang berubah. Tiga item DoD yang butuh server/DB berjalan
(Lighthouse ≥85, explain-plan, verifikasi DevTools) belum terukur — lihat §8.

---

## 1. M5.1 — Pecah monolit

Tujuan: tidak ada file page > 300 baris, dan data story bisa di-edit tanpa
menyentuh JSX.

### 1.1 Story data → JSON statis

- 819 scene dari `story/page.tsx` (2028 baris) pindah ke
  `content/story/chapters/ch-XX.json` (16 file, satu per chapter).
  Format: writer-friendly, validasi dengan union `Requirement` zod — data
  tidak valid gagal saat build, bukan saat user membuka chapter.
- `story/page.tsx` jadi tipis; seluruh data chapter di-import sebagai modul
  statis (dibaca sekali, selalu cache-friendly — alasan `unstable_cache`
  tidak diperlukan, lihat §6).

### 1.2 HomeClient → per-fitur

`HomeClient` (1028 baris) dipecah ke `features/home/*` (siklus psikologis,
salam, interaksi sentuh, menu komando, modal, HUD, backdrop). Hasil akhir
279 baris — semua state interaksi tetap di satu tempat, yang dipecah hanya
presentasi + logika murni.

### 1.3 Pindahkan halaman >300 baris

12 halaman `app/(main)/*/page.tsx` yang >300 baris dipindah logikanya ke
`features/<domain>/*Client.tsx`, sisanya wrapper tipis 8 baris. Setelah ini
**semua `page.tsx` ≤ 300 baris** (terverifikasi `tsc` + lint).

---

## 2. M5.2 — Server Actions / RPC layer

Client memanggil operasi state lewat **Server Actions** (`lib/actions/index.ts`),
bukan `fetch('/api/...')` manual: ter-tipe end-to-end, tanpa boilerplate
headers/JSON, otoritas tetap di server (reusing core atomik M5.4).

### 2.1 Aksi yang tersedia

| Aksi | Mirip route | Catatan |
| --- | --- | --- |
| `updateAffection(delta, reason?)` | `PATCH /api/affection` | afeksi atomik + unlock chapter idempoten |
| `claimWork(earnedRv, jobId?)` | `POST /api/work` | `money = money + ?` + increment `jobStats` (jsonb) |
| `cookRecipe(recipeId, isMinigameFailed)` | `POST /api/cook` | harga & efek dari katalog server, guard `WHERE money >= cost` |

Semua aksi mengembalikan `ActionResult<T>` (discriminated union
`{ ok: true, data } | { ok: false, error, code }`) — **bukan throw** — supaya
kegagalan (uang kurang, rate limit, belum login) sampai ke client dengan bentuk
konsisten dan aman. AppError yang di-throw dari action tidak dijamin
terserialisasi utuh oleh Next.js.

### 2.2 Call site yang termigrasi

HomeClient (sentuh Livia), WorkClient + ScheduleClient (klaim kerja/misi/
milestone), PomodoroClient (sesi fokus), KitchenClient (masak).

### 2.3 REST dipertahankan untuk yang tidak bisa jadi action

- **Streaming/SSE**: chat stream, TTS, date/chat (action butuh round-trip
  selesai, tidak bisa mengalir token demi token).
- **`navigator.sendBeacon`**: screentime-end dipanggil saat `beforeunload` —
  fire-and-forget, tidak bisa menunggu response action.

### 2.4 Utang: operasi state yang masih REST

Garden (pot + hitung stage), gift (buff/recovery/keychain), date, schedule
khusus, settings, wardrobe, story, memory, age-gate, privacy. Semuanya
mengikuti pola identik di `lib/actions/index.ts` (guard auth+rate-limit →
validasi → mutasi atomik → `ActionResult`) dan bisa dimigrasikan bertahap
tanpa mengubah arsitektur. Route REST lama dipertahankan (tetap berfungsi,
dipakai test, dan tetap jalan untuk caller yang belum dimigrasi).

---

## 3. M5.3 — Database

### 3.1 Index per-user

Empat index sesuai query utama:

- `idx_chat_user_created_at` — `chatMessages(userId, createdAt DESC)`
- `idx_screentime_user_date` — `screenTimeLogs(userId, date)`
- `idx_pomodoro_user_completed` — `pomodoroSessions(userId, completedAt DESC)`
- `idx_memories_user_last_recalled` — `memoryItems(userId, lastRecalledAt)`

Catatan drizzle 0.30: `extraConfig` index pg adalah object `Record` (bukan
array), dan `.desc()` di `IndexBuilder` berlaku untuk **semua** kolom —
backward scan Postgres menutup `ORDER BY ... DESC` tanpa index terpisah.

### 3.2 Migrations sistem

- Baseline satu file: `drizzle/0000_true_banshee.sql` (snapshot skema).
- `db:generate` = `drizzle-kit generate`; `db:check-drift` menjalankan generate
  dan gagal bila ada perubahan skema yang belum dimigrasikan (siap untuk CI).
- Setelah M5.5 menambah tabel `rateLimitCounters`, migrasi diff
  `drizzle/0001_high_morgan_stark.sql` dibuat dan drift check hijau.

### 3.3 Retensi

`db:prune [hari]` menghapus chat >90 hari **beserta** ringkasannya dalam satu
transaksi (kalau chatMessages saja yang dihapus, akuntansi
`messageSummaries.coveredCount` melenceng dan summarizer berhenti selamanya).
Fakta penting tetap hidup lewat `memoryItems` (M3). Sejak M5.5, skrip ini juga
membuang counter rate limit kedaluwarsa (lihat §5.4).

> **Belum dijalankan ke DB live** — `db:push`/`db:migrate` + `db:prune` masih
> menunggu (index M5.3 + tabel M4/M5.5 pending). Sampai saat itu, age gate
> berjalan dalam mode non-blocking "unknown" dan penulisan audit gagal
> sunyi.

---

## 4. M5.4 — Race condition & cheat

### 4.1 Mengapa bukan `SELECT ... FOR UPDATE`

Driver `neon-http` **tidak punya koneksi persisten** — setiap statement jalan
di koneksi baru. Lock baris dari `SELECT ... FOR UPDATE` tidak bertahan antar
statement, jadi pola read-modify-write klasik tidak bisa diandalkan.

Solusi: **setiap mutasi uang/afeksi = SATU statement `UPDATE` dengan ekspresi
SQL** (`lib/livia/atomic-profile.ts`):

- `SET money = money - ?` + `WHERE money >= ?` — anti double-spend, guard
  di-eksekusi Postgres, bukan di aplikasi.
- `SET affection = GREATEST(0, LEAST(100, affection + ?))` — clamp atomik.
- `affectionLevel` denormalisasi dalam statement yang sama (CASE 20/40/60/80/
  100 → level 1–5).
- `jobStats` via `jsonb_build_object` (nama job divalidasi pola `^[a-zA-Z0-9_]{1,64}$`
  — tidak pernah string user mentah).

`applyAffectionAtomic(userId, delta)` = UPDATE+RETURNING;
`ensureUnlockedChapters(userId, affection)` idempoten (set-union, aman dipanggil
ulang). Fungsi lama `applyAffectionUpdate` (read-modify-write) dihapus.

Terapan: cook, gift, kitchen, work, garden (plant+harvest), date-chat,
chat-turn, PATCH affection — semua response contract route dipertahankan.

### 4.2 Cheat dari client

- Client tidak pernah menentukan harga/reward final: biaya resep, harga bibit,
  dan efek afeksi diambil dari **katalog server** (RECIPES/ITEMS/SEED_CATALOG).
- Client boleh mengirim `earnedRv`, tapi di-clamp 0..1000 di server (lihat utang).
- `localStorage` hanya preferensi UI (volume, bahasa); state ekonomi/afeksi
  selalu dibaca ulang dari server.

### 4.3 Utang

- `earnedRv` hasil kerja game masih dihitung di client (hanya di-clamp server).
  Penyelesaian penuh: katalog job + perhitungan reward di server (milestone
  berikutnya).
- `itemsBrought` gift/garden masih snapshot-based (race item minor; uang sudah
  terlindungi guard atomik).

---

## 5. M5.5 — Distributed rate limiter

In-memory `Map` versi M0 dihapus dari jalur produksi: ia reset tiap cold start
serverless, tidak dibagi antar instance, hilang saat redeploy, dan dulu bisa
bocor memori.

### 5.1 Tabel `rateLimitCounters`

```
key          text PK  -- `${name}:${scope}:${windowMs}:${bucketStart}`
count        integer  -- kumulatif di bucket ini
window_start timestamptz -- awal bucket (dipakai prune)
```

Migrasi: `drizzle/0001_high_morgan_stark.sql`.

### 5.2 Increment atomik, aman di neon-http

Satu statement (sama prinsipnya dengan M5.4 — tidak ada FOR UPDATE):

```sql
INSERT INTO "rateLimitCounters" (key, count, window_start)
VALUES ($key, 1, $windowStart)
ON CONFLICT (key) DO UPDATE SET count = count + 1
RETURNING count
```

Dua request bersamaan di-queue oleh lock baris Postgres, bukan saling menimpa.

**Fail-open (keputusan penting):** kalau store tidak bisa menulis (tabel
belum di-migrasi, Neon free-tier tertidur, DB error), limiter **tidak**
menggagalkan request — ia `logger.error` dan menganggap count = 1. Rate
limit adalah lapisan pertahanan tambahan (bcrypt cost 12 + lockout tetap
jalan), dan aplikasi yang 500 di semua tombol mutasi karena limiter-nya
tidak bisa menulis lebih buruk dari limiter yang sekilas tidak aktif.

### 5.3 Multi-cap: per-menit + harian + bulanan

Setiap limiter punya daftar `caps` (window terpendek dulu). `limit(key)`
mengecek semua cap; request yang **ditolak cap pendek tidak menambah cap
panjang**. Konfigurasi:

| Limiter | Cap |
| --- | --- |
| `aiRateLimit` | 5/menit + 200/hari + 2.000/bulan |
| `aiDailyQuota` | 200/hari + 2.000/bulan |
| `mutationRateLimit` | 30/menit + 1.000/hari |
| `authIpRateLimit` / `registerRateLimit` | per-IP (10 atau 5 / 10 menit) |
| `passwordResetRateLimit` / `loginAttemptLimiter` | 5 / 15 menit |

Scope (user vs IP) tetap ditentukan pemanggil (`api-handler`: `userOrIpKey`/
`ipKey`) — interface `RateLimiter` tidak berubah, jadi tidak ada route yang
harus disentuh. Perubahan satu-satunya: `reset()` kini async.

### 5.4 Alert biaya (cost alert)

Cap dengan label `alert` memicu `logger.warn` **sekali** saat pertama kali
terlampaui (count == limit + 1) — sinyal user menyentuh kuota AI, tanpa spam
log per-request.

Counter kedaluwarsa (window >31 hari, window terpanjang 30 hari) dibuang
`db:prune` — statement terpisah, toleran bila tabel belum dibuat.

### 5.5 Test

Algoritma diuji **tanpa database**: store di-mock global di `tests/setup.ts`
(bukan `vi.mock` per file — dengan `isolate: false` mock per file tidak andal
karena registry modul dibagi antar file test). Tes baru: multi-cap
(window pulih → cap harian menang), "ditolak cap pendek tidak menambah cap
panjang" (pakai fake timers), dan cost alert (warn tepat sekali). 535 test
lulus.

---

## 6. M5.6 — Cache & image

### 6.1 Image optimization

`next.config.js`: `images.formats: ['image/avif', 'image/webp']` — `next/image`
mengutamakan AVIF lalu WebP (`sharp` di-bundle Next saat production). Catatan:
hanya 3 pemakaian `next/image`; sisanya `<img>` polos (35 warning pre-existing)
yang memang tidak lewat optimizer. Konversi aset ke `next/image` = utang.

### 6.2 Mengapa LRU in-proses TIDAK diterapkan

DoD menyebut LRU untuk cache konteks persona/memori. Dua alasan teknis
membuatnya salah arah di arsitektur ini:

1. **Retrieval bergantung query.** Konteks yang diambil dari memori berbeda
   per pesan user (ranked by token pesan). Cache keyed-oleh-user akan menyimpan
   konteks yang sering tidak relevan untuk pesan berikutnya.
2. **App-nya serverless stateless** (neon-http, instance pendek). Cache
   in-proses berumur seumur instance — kebanyakan rater akan miss di instance
   lain. LRU di sini menambah kompleksitas tanpa hit rate yang berarti.

Data read berat (chapter story) memang JSON statis (import modul, sudah
cache-friendly). `unstable_cache` tidak menambah apa-apa di atasnya.

Yang benar untuk retrieval cepat di masa depan: **embedding** (sudah di-plan
sebagai utang terpisah) — itu cache semantik, bukan cache in-proses.

---

## 7. M5.7 — Lazy load global di layout

- **RadioProvider** tetap di initial bundle (context dibutuhkan `useRadio` di
  halaman radio; dynamic import akan memutus context). Yang dipindah: pembuatan
  `<audio>` + fetch MP3 + autoplay ambien dari mount sinkron ke
  `requestIdleCallback` (fallback `setTimeout` 500 ms). Autoplay tetap terjadi,
  tapi keluar dari critical path first paint.
- **QuestTracker** dibungkus `Deferred` (`components/deferred.tsx`) — dynamic
  import setelah browser idle via `DeferredQuestTracker`, sehingga modulnya
  tidak masuk initial JS chunk. `Deferred` reusable untuk komponen global
  opsional lainnya.

---

## 8. DoD — yang belum terukur

Tiga item DoD M5 butuh server + DB + browser berjalan, dan environment ini
belum punya keduanya (DB live belum di-migrasi, API key AI invalid):

1. **Lighthouse Performance ≥85 mobile** — jalankan setelah `db:push`, di
   deployment dengan data nyata.
2. **Explain-plan query utama pakai index** — jalankan `EXPLAIN ANALYZE` untuk
   query chat/screentime/pomodoro/memories setelah index dibuat (M5.3).
3. **Zero cheat lewat DevTools** — verifikasi manual: ubah uang/afeksi di
   DevTools → state kembali dari server; kirim request POST langsung → guard
   atomik menolak (uang tak mungkin negatif, delta di-clamp).

## 9. Daftar utang M5 (ringkas)

- Migrasi Server Actions: garden, gift, date, schedule-khusus, settings,
  wardrobe, story, memory, age-gate, privacy (pola identik, §2.4).
- `earnedRv` dihitung client (clamp 0..1000 server) — butuh katalog job server
  (§4.3).
- `itemsBrought` snapshot-based (§4.3).
- Konversi `<img>` polos ke `next/image` (§6.1).
- Embedding untuk retrieval memori (gantinya LRU, §6.2).
- `db:push`/`db:migrate` + `db:prune` ke DB live; retry eval live penuh setelah
  kuota API reset.
