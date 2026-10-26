# M3 — Sistem Memori Berlapis

Dokumen ini mencatat apa yang **sudah** dikerjakan di M3, keputusan desain yang
mengikat, dan utang teknis yang tersisa.

Status: **M3.1 – M3.5 selesai.** Semua perubahan sudah lolos `tsc`, 423 test,
`lint` (tanpa warning baru), dan eval offline 50/50.

---

## 1. Masalah yang diselesaikan

Sebelum M3, memori Livia adalah **satu kolom teks** `userProfiles.longTermMemory`.
Model menulis baris baru lewat field `memoryUpdate`, lalu server:

```ts
existing.push(factLine);
updateData.longTermMemory = existing.slice(-20).join('\n');
```

Tiga cacat struktural dari 6 baris itu:

1. **Lupa permanen.** Begitu baris ke-21 ditulis, fakta paling awal dibuang.
   User yang sudah 3 bulan bersama Livia kehilangan nama panggilannya sendiri.
2. **Boros token.** SEMUA fakta ditempel ke prompt setiap turn, termasuk yang
   tidak ada hubungannya dengan pesan saat ini.
3. **Tidak transparan.** User tidak bisa melihat apa yang diingat Livia, apalagi
   menghapusnya (masalah GDPR/kepercayaan).

M3 menggantinya dengan tabel `memoryItems`: satu fakta = satu baris, bertipe,
punya skor keyakinan, dan punya waktu terakhir diingat.

---

## 2. Model data

Tabel `memoryItems` (`lib/db/schema.ts`):

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | uuid | PK |
| `user_id` | uuid | FK → `users.id`, `ON DELETE CASCADE` |
| `type` | text | `core` \| `episodic` \| `semantic` \| `diary` |
| `content` | text | satu fakta, maks 200 karakter (400 untuk diary) |
| `confidence` | integer | 0–100, keyakinan bahwa fakta benar |
| `decay_score` | integer | snapshot 0–100 (bukan sumber kebenaran) |
| `created_at` | timestamp | |
| `last_recalled_at` | timestamp | null = belum pernah masuk konteks |

### 2.1 Empat tipe, empat setengah-umur

| Tipe | Arti | Setengah-umur |
| --- | --- | --- |
| `core` | identitas inti (nama panggilan, alergi) | **tidak meluruh** |
| `diary` | hasil "merenung" (M3.4) | 180 hari |
| `semantic` | fakta stabil (hobi, pekerjaan, makanan favorit) | 60 hari |
| `episodic` | kejadian/rencana tertentu (janji Sabtu) | 14 hari |

Peluruhan eksponensial: `100 × 0.5^(umur / setengah-umur)`. Kejadian kecil
memang layak memudar; identitas tidak boleh.

`decay_score` di kolom **sengaja hanya snapshot**. Nilai yang dipakai untuk
ranking selalu dihitung ulang dari `last_recalled_at` (fallback `created_at`),
supaya baris yang lama tidak pernah dibaca dengan angka basi.

### 2.2 Kolom lama dibiarkan dormant

`userProfiles.longTermMemory` **tidak dihapus** di migrasi ini. Alasannya
operasional, bukan sentimental: `drizzle-kit push` yang men-drop kolom berisi
data user adalah operasi satu arah, dan kalau migrasi data gagal di tengah jalan
kita kehilangan memori yang tidak bisa direkonstruksi.

Alurnya:

1. Route chat / kencan / panel memori memanggil `importLegacyMemory()` kalau
   blob lama masih tidak kosong.
2. Baris dipecah per `\n`, dibersihkan, dimasukkan sebagai `semantic`
   (confidence 70), maksimal 20.
3. **Setelah** insert berhasil, kolom lama dikosongkan (`set({ longTermMemory: '' })`).
   Kalau insert gagal, blob tetap utuh dan percobaan diulang giliran berikutnya.
4. Kolomnya bisa di-drop di milestone berikutnya, setelah semua user aktif
   pernah chat sekali.

---

## 3. M3.1 — Skema & lapisan data

`lib/livia/memory.ts` adalah satu-satunya modul yang tahu soal memori.
Pembagiannya tegas:

- **Bagian atas: fungsi murni.** `memoryTokens`, `memorySimilarity`,
  `isDuplicateMemory`, `decayScoreFor`, `memoryDecayScore`, `memoryRelevance`,
  `memoryScore`, `rankMemories`, `formatMemoryLines`, `memoryCandidatesFromReply`,
  `shouldConsolidate`. Tanpa DB, tanpa SDK → diuji cepat di
  `tests/livia-memory.test.ts` (34 test).
- **Bagian bawah: lapisan DB.** `importLegacyMemory`, `addMemories`,
  `recordMemories`, `retrieveMemories`, `retrieveMemoryLines`, `touchRecalled`,
  `listMemories`, `deleteMemory`, `deleteAllMemories`, `maybeConsolidateMemory`.

Aturan yang mengikat: **setiap jalur yang menyentuh chat menelan errornya
sendiri.** Memori adalah peningkatan kualitas, bukan alasan chat gagal. Kalau
tabel `memoryItems` belum ada (user belum `db:push`), chat tetap jalan tanpa
memori — hanya ada warning di log.

---

## 4. M3.2 — Ekstraksi terstruktur

Dulu model menulis satu string `memoryUpdate`. Sekarang balasan chat meminta
array:

```json
"memories": [
  { "type": "core" | "episodic" | "semantic", "content": "fakta", "confidence": 0-100 }
]
```

Prompt-nya tegas: **maksimal 2 fakta per balasan**, array kosong kalau tidak ada,
jangan mencatat basa-basi. Batas 2 dipilih supaya model tidak berhalusinasi
mengisi kuota.

### 4.1 Coercion, bukan penolakan

`lib/ai/schemas.ts`:

- `coerceMemories()` tidak pernah melempar. Bukan array → `[]`. Item rusak
  dibuang, item sehat tetap lolos. `type` tak dikenal → `semantic`.
  `confidence` di-clamp 0–100. Konten di-trim, bullet dibuang, dipotong 200
  karakter, duplikat internal di-dedupe, maksimal `MAX_MEMORIES_PER_REPLY` (3).
- Prinsipnya sama seperti field non-kritis lain di M2: **hanya `reply` yang
  strict.** Satu item memori cacat tidak boleh membatalkan balasan yang baik.

### 4.2 `memoryUpdate` tetap hidup sebagai fallback

`memoryUpdate` masih ada di validator dan `responseSchema`, tapi **tidak lagi
diminta** di prompt chat. Kalau model (atau varian prompt lama) mengisi
`memoryUpdate` dan mengosongkan `memories`, `memoryCandidatesFromReply()`
memakai teks itu sebagai satu item `semantic` dengan confidence 60.

`responseSchema.required` sekarang `['reply', 'affectionDelta', 'expression', 'memories']`.

### 4.3 Dedupe

Dua lapis:

1. **Di dalam batch** — `isDuplicateMemory()` antar kandidat.
2. **Terhadap tabel** — satu SELECT 500 baris terakhir, lalu bandingkan.

`isDuplicateMemory()` = teks identik setelah normalisasi **atau** Jaccard kata
bermakna ≥ 0.7. Jaccard dipilih karena simetris dan tidak menghukum fakta
panjang: "Suka kopi" dan "Suka kopi hitam tanpa gula" tetap dianggap mirip.

### 4.4 Await, bukan fire-and-forget

Penulisan memori (`recordMemories`) **di-await** di `persistChatTurn` dan di
route kencan. Alasannya runtime: di Next serverless, promise yang tidak ditunggu
bisa dibekukan begitu response dikirim, sehingga fakta baru hilang diam-diam.
Biayanya hanya 1 SELECT + 1 INSERT. Yang tetap fire-and-forget adalah
**konsolidasi** (memanggil LLM, detik-an) — kalau promise itu dibekukan, tidak
ada data hilang, hanya tertunda ke giliran berikutnya.

---

## 5. M3.3 — Retrieval, bukan "tempel semua"

Ini inti penghematan token dan inti kualitas.

### 5.1 Skor gabungan

```
score = 0.55 × relevance + 0.25 × decay + 0.20 × recency + 0.18 × (core ? 1 : 0)
```

- **relevance** — proporsi kata pesan saat ini yang muncul di fakta, plus bonus
  0.15 per kata khas (≥7 huruf: nama, "badminton", "alergi"). Kata umum yang
  kebetulan bersinggungan tidak boleh mendominasi.
- **decay** — kekuatan memori (lihat §2.1).
- **recency** — `0.5^(umur/30 hari)`, mencegah memori baru terkubur.
- **core bonus** — identitas inti selalu ikut, bahkan saat tidak relevan.

### 5.2 Aturan pemilihan

- `core` **selalu** lolos filter skor.
- Item lain harus ≥ `MIN_RETRIEVAL_SCORE` (0.25). Episodic 300 hari yang tidak
  relevan skornya ~0.0002 → dibuang.
- Top-K default 6, plafon keras 8 (`RETRIEVAL_MAX_K`). Delapan fakta × ~15 token
  = ~120 token; jauh lebih murah daripada seluruh blob.
- Seri skor dipecah oleh `createdAt` (baru menang) → hasil **deterministik**,
  tidak berubah-ubah antar request dengan input sama.

### 5.3 Recall memperlambat lupa

Setiap memori yang masuk konteks di-`touchRecalled()` (UPDATE `last_recalled_at`).
Fakta yang sering relevan jadi jarang dipakai, jadi tetap kuat; fakta yang
tidak pernah relevan meluruh dan akhirnya jadi kandidat konsolidasi.

### 5.4 Kenapa bukan embeddings

Roadmap menyebut pgvector. Itu **sengaja ditunda**, bukan dilupakan:

- `drizzle-kit push` dengan extension + index vektor adalah sumber kegagalan
  migrasi yang sudah terbukti merepotkan di Neon.
- Untuk 5–8 fakta teratas dari puluhan item, lexical overlap + decay + recency
  sudah memadai. Embedding baru memberi nilai saat jumlah item mencapai ribuan.

Dicatat sebagai **utang teknis** di §8. Antarmuka `rankMemories()` adalah titik
ganti tunggal kalau nanti pindah ke vektor.

---

## 6. M3.4 — Konsolidasi ("merenung")

Tanpa worker/queue terpisah. Pemicunya satu-satunya sinyal "user sedang di sini"
yang kita punya: turn chat yang aktif.

Alur `maybeConsolidateMemory()` (dipanggil fire-and-forget setelah memori baru
ditulis):

1. Hitung total item. **≤ 30 → berhenti** (tidak ada biaya).
2. Ambil maksimal 40 item `episodic`/`semantic` terlama.
3. Filter `decay ≤ 50` → maksimal 12 kandidat.
4. Butuh **minimal 6** kandidat, kalau tidak berhenti.
5. Satu panggilan LLM "merenung" (temperature 0.3, maks 220 token) dengan
   instruksi: padatkan jadi 2–4 kalimat dalam suara Livia, jangan mengarang
   fakta yang tidak ada di catatan.
6. Simpan sebagai satu item `diary`.
7. **Setelah** tersimpan, hapus item sumber.

Urutan 6→7 penting: kalau insert gagal, tidak ada yang hilang. Semua kegagalan
ditelan; percobaan diulang giliran berikutnya.

`core` tidak pernah jadi kandidat — identitas tidak boleh dipadatkan.

---

## 7. M3.5 — Panel memori yang bisa dilihat & dihapus

`app/api/memory/route.ts`:

- `GET` → daftar memori (terbaru dulu, maks 200), `decayScore` dihitung ulang
  saat dibaca. Sekaligus tempat **migrasi lazy** blob lama, supaya user yang
  belum chat setelah M3 tetap melihat memorinya.
- `DELETE ?id=<uuid>` → hapus satu item; 404 kalau bukan miliknya.
- `DELETE ?all=1` → hapus semua (reset/GDPR).

UI di `app/(main)/settings/page.tsx`: panel "Memori Livia" dengan badge tipe,
persentase kekuatan, tombol hapus per item, dan tombol "Lupakan semua". Gagal
memuat hanya menampilkan pesan — sisa halaman tetap berfungsi.

Pemisahan `deleteMemory(userId, id)` selalu memfilter `userId` **dan** `id`
dalam satu WHERE. Tidak ada jalur yang bisa menghapus memori user lain meski
UUID-nya diketahui.

---

## 8. Utang teknis

| Utang | Dampak | Kapan dibayar |
| --- | --- | --- |
| Retrieval lexical, bukan embeddings | Fakta dengan kata berbeda tapi makna sama tidak tertangkap | Saat item/user naik ke ribuan |
| Kolom `longTermMemory` masih ada | Skema punya kolom mati | Setelah semua user aktif pernah chat sekali |
| Konsolidasi fire-and-forget | Bisa tertunda/dibekukan di serverless | Kalau pindah ke queue (M5) |
| Dedupe scan 500 baris | O(n) per penulisan | Ikut selesai bersama embeddings |
| Tidak ada batas total item per user | User sangat aktif bisa menumpuk | Saat konsolidasi terbukti tidak cukup |

---

## 9. Verifikasi

| Pemeriksaan | Hasil |
| --- | --- |
| `bun run typecheck` | lolos (0 error) |
| `bun run test` | 423 test / 23 file lolos |
| `bun run lint` | lolos, tanpa warning baru |
| `bun run evals` (offline) | 50/50 PASS, semua kategori 100% |

Perubahan kecil di runner eval: jeda `AI_EVAL_DELAY_MS` sekarang **hanya**
berlaku di mode live. Sebelumnya mode offline ikut menunggu 7 detik per
skenario (350 detik) padahal tidak memanggil API sama sekali.

### 9.1 Yang masih kurang

- **`bun run db:push` belum dijalankan** untuk tabel `memoryItems`. Sampai itu
  dilakukan, sistem memori berjalan dalam mode degradasi (chat jalan, memori
  kosong, warning di log).
- **Eval live 50 skenario belum selesai** — kuota free-tier Google habis (429
  beruntun bahkan pada pacing 15 detik). Hanya 1 skenario terbukti live. Angka
  DoD "persona ≥ 85%" masih terutang dan harus diambil ulang saat kuota reset.
  Ini tidak menghalangi M3: M3 tidak mengubah persona, hanya menambah field
  `memories` yang coercion-nya tidak pernah menggagalkan balasan.
