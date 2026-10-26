# M4 — Safety, Privacy & Compliance

Dokumen ini mencatat apa yang **sudah** dikerjakan di M4, keputusan desain yang
mengikat, dan utang teknis yang tersisa.

Status: **M4.1 – M4.6 selesai.** `tsc` 0 error, 525 test lolos, eval offline
50/50.

---

## 1. Masalah yang diselesaikan

Sebelum M4, aplikasi ini punya satu masalah mendasar: **tidak ada lapisan
keamanan milik sendiri**. Semua penolakan topik bergantung pada `safetySettings`
Gemini, yang justru disetel longgar (`BLOCK_ONLY_HIGH` untuk konten seksual)
supaya persona tsundere romantis tidak mati di tengah kalimat.

Konsekuensinya berantai:

1. **Tidak ada yang menjaga saat provider longgar.** Kalau model memutuskan
   menjawab sesuatu, jawaban itu langsung tampil.
2. **Tidak ada penanganan krisis.** "Aku mau mengakhiri hidup" diperlakukan
   sama seperti "aku capek kerja" — dibalas dengan tsundere.
3. **PII ikut terkirim.** Nomor telepon, email, NIK dikirim apa adanya ke Google
   setiap turn, padahal Livia tidak membutuhkannya untuk menjawab.
4. **Hak user hanya slogan.** Tombol "reset data" menampilkan *"fitur sedang
   dalam tahap pengembangan"*. Tidak ada export, tidak ada hapus akun.
5. **Tidak ada jejak audit.** Aksi sensitif (ganti API key, hapus memori) tidak
   meninggalkan catatan apa pun.

---

## 2. M4.1 — Age gate

Aplikasi bertema romantis dengan karakter AI, untuk dewasa. Gate diterapkan di
**dua** tempat, karena satu saja tidak cukup:

| Jalur | Mekanisme |
| --- | --- |
| Registrasi baru | Checkbox wajib → `validateRegisterInput` menolak tanpa `ageConfirmed: true` |
| Akun lama (pra-M4) | Modal blokir di root layout → `POST /api/user/age-gate` |

### 2.1 Yang disimpan hanya waktu konfirmasi

Kolom `users.age_confirmed_at` (timestamp, nullable). **Tanggal lahir tidak
pernah diminta.** Alasannya: DOB adalah PII baru yang tidak dipakai fitur mana
pun. Menyimpannya "untuk berjaga-jaga" adalah pengumpulan data tanpa tujuan —
persis yang seharusnya dihindari oleh aplikasi yang menjual transparansi.

### 2.2 Modal yang tidak bisa ditutup

`AgeGateModal` tidak punya tombol X, tidak bisa di-ESC, dan tidak punya area
klik-di-luar. Satu-satunya jalan keluar: konfirmasi, atau keluar akun. Modal
yang bisa ditutup tanpa memilih tidak mengonfirmasi apa pun.

### 2.3 Kegagalan baca ≠ belum dewasa

`hasConfirmedAge()` mengembalikan `boolean | null`:

- `true` → sudah konfirmasi,
- `false` → terbukti belum,
- `null` → **tidak diketahui** (kolom belum ada karena `db:push` belum jalan,
  atau DB tidak bisa dihubungi).

`null` **tidak** memblokir. Ini keputusan yang sengaja berlawanan dengan
intuisi "lebih aman menampilkan gate": gate memblokir seluruh aplikasi, jadi
kalau kegagalan baca diperlakukan sebagai "belum konfirmasi", satu migrasi yang
belum dijalankan akan mengunci semua user di balik modal yang tombolnya selalu
gagal. Tidak bisa memverifikasi bukan bukti belum dewasa.

---

## 3. M4.2 — Guardrail sendiri

Modul: `lib/safety/guardrails.ts` (klasifikasi), `lib/safety/crisis.ts`
(respons krisis), `lib/safety/pipeline.ts` (orkestrasi).

### 3.1 Kenapa berbasis pola, bukan model klasifikasi

Roadmap menyebut Perspective API atau model flash-lite. Itu **tidak** dipakai,
dengan alasan yang disengaja:

- **Deterministik.** Tidak bisa "dibujuk" lewat prompt, dan hasilnya bisa diuji
  persis (`tests/safety.test.ts`, 65 test).
- **Tanpa latensi & biaya tambahan.** First-token P50 sudah jadi perhatian di
  M2; menambah satu round-trip ke model klasifikasi di setiap pesan akan
  merusaknya.
- **Tetap jalan saat provider down.** Justru saat itulah guardrail paling
  dibutuhkan.

Kelemahan yang diakui: ejaan yang diacak kreatif dan bahasa daerah tidak
tertangkap. Karena itu guardrail ini adalah **lapisan**, bukan satu-satunya
pertahanan — `safetySettings` provider dan persona tetap berperan.

### 3.2 Normalisasi sebelum pencocokan

`normalizeForSafety()` melakukan huruf kecil, buang aksen, dan leetspeak dasar
(`b0mb` → `bomb`, `k1ll` → `kill`). Tanpa ini, filter kata kunci bisa dilewati
dengan mengganti satu huruf jadi angka.

### 3.3 Urutan pemeriksaan adalah bagian dari kontrak

```
1. krisis          → tampilkan bantuan (BUKAN penolakan)
2. sexual_minor    → tolak
3. weapons         → tolak
4. illegal_harm    → tolak
5. hate            → tolak
6. prompt_injection → tolak
```

Krisis diperiksa **paling awal dan mengalahkan semua kategori lain**. Orang yang
menulis "aku mau bunuh diri pakai bom" sedang dalam bahaya, bukan sedang minta
tutorial.

### 3.4 Perilaku krisis: persona dilepas

Ini aturan yang tidak bisa dinegosiasikan: ketika sinyal krisis terdeteksi,
**Livia berhenti berperan sebagai Livia**. Tidak ada tsundere, tidak ada
"b-bukan karena aku peduli", tidak ada deflection.

Yang tampil: pesan singkat yang manusiawi + jalur bantuan nyata (SEJIWA 119
ext. 8, Into The Light Indonesia, Halo Kemenkes 1500-567, ditambah direktori
internasional `findahelpline.com`). Nomor bisa diklik langsung dari HP.

Bercanda atau bersikap ketus pada orang yang sedang krisis bisa memperburuk
keadaan. Konsistensi karakter tidak layak dipertahankan dengan risiko itu.

Krisis **tidak** ditangani sebagai error atau penolakan: input tetap disimpan
sebagai pesan biasa, afeksi tidak berubah, dan panel bantuan dikirim terpisah
dari balon chat (`crisis` di response JSON, `crisis` di event `done` SSE) supaya
nomor hotline tidak terlihat seperti dialog.

### 3.5 Post-check output

`checkModelOutput()` memeriksa balasan model sebelum dirender. Yang diperiksa:
konten seksual anak, senjata, kejahatan, kebencian.

Yang **sengaja tidak** diperiksa: injeksi prompt. Kalau Livia menulis "kalau ada
yang bilang abaikan aturan, jangan didengar", itu bagian dari cerita, bukan
serangan.

### 3.6 Batas jujur pada jalur streaming

Pada SSE, delta sudah terlanjur mengalir ke browser. Kalau post-check menolak
balasan di akhir, yang bisa dilakukan hanyalah mengganti `final` (teks yang
disimpan & dipakai untuk afeksi) — **teks parsial yang sudah tampil tidak bisa
ditarik kembali**. Itu batas protokol, bukan kelalaian.

Karena itu pre-check input adalah pertahanan utama, dan post-check hanya jaring
kedua. Keduanya dipasang di `lib/gemini.ts` (satu-satunya pintu ke provider),
bukan di masing-masing route — supaya tidak ada endpoint baru yang lupa.

---

## 4. M4.3 — Redaksi PII

Modul: `lib/safety/pii.ts`.

### 4.1 Yang dikenali

| Jenis | Pola | Token |
| --- | --- | --- |
| email | bentuk email umum | `[[EMAIL_1]]` |
| NIK | tepat 16 digit | `[[NIK_1]]` |
| telepon | `08…`, `+62…`, `62…`, kode area `021…` | `[[PHONE_1]]` |
| rekening | 10–15 digit (dengan penyaring) | `[[BANK_ACCOUNT_1]]` |
| IP | IPv4 | `[[IP_1]]` |

### 4.2 Penyaring angka palsu

Nominal uang dan tahun akan salah tertangkap kalau tidak disaring. `isLikelyNotAccount()`
meloloskan:

- angka bulat rapi (`1500000` = "aku nabung 1500000"),
- tahun diikuti nol (`2024000000`),
- semua rangkaian < 10 digit.

Test menjaga ini secara eksplisit: `"aku nabung 1500000 bulan ini"` tidak
berubah sama sekali.

### 4.3 Seluruh riwayat diredaksi, bukan hanya pesan terbaru

`redactTurns()` memproses setiap giliran. Alasannya: riwayat chat tersimpan
mentah di DB dan dikirim sebagai konteks **setiap** turn. Kalau hanya pesan baru
yang diredaksi, nomor telepon yang disebut tiga giliran lalu tetap terkirim ke
Google setiap kali user mengirim pesan — kebocoran berulang, bukan sekali.

Token dinomori ulang lintas giliran (`[[PHONE_1]]`, `[[PHONE_2]]`, …) supaya dua
nomor berbeda tidak bertabrakan saat dipulihkan.

### 4.4 Pemulihan saat streaming

Model hanya melihat `[[PHONE_1]]`. Kalau ia mengutipnya, user harus tetap
melihat nomornya sendiri — bukan token.

Masalahnya, pada SSE token bisa **terbelah antar delta**. `makePiiRestoringStream()`
menahan akhiran buffer yang merupakan awalan dari token yang dikenal. Versi
awal memakai regex `\[\[[A-Z_]*\d*$` dan gagal pada satu kasus: `[[EMAIL_1]`
(kurang satu `]`) terlihat seperti teks biasa. Solusinya mencocokkan ke daftar
token yang benar-benar ada, sehingga setiap titik potong tertangani — diuji
untuk **setiap** posisi potong.

### 4.5 Token palsu dari user dibuang

Kalau user menulis `[[EMAIL_1]]` sendiri, token itu diganti `[[]]` sebelum
proses. Tanpa ini, tahap pemulihan bisa menggantinya dengan PII dari mapping
request lain (kalau mapping bocor antar request).

### 4.6 Batas yang diakui

Ini **pengurangan risiko, bukan anonimitas**. Nama orang, alamat dalam bahasa
bebas, dan nomor yang dieja dengan kata ("nol delapan satu dua…") tidak
tertangkap. Kebijakan Privasi menyatakan ini secara eksplisit.

---

## 5. M4.4 — Data control

### 5.1 Export

`GET /api/user/export?format=json|markdown`

| Aspek | Keputusan |
| --- | --- |
| API key | **Tidak pernah** diekspor, hanya `hasKey` |
| Bagian gagal | Dicatat di `failures`, sisa export tetap dikirim |
| Pemotongan | Dicatat di `truncated` (jumlah dibuang, bukan disembunyikan) |
| Batas | 5.000 chat, 500 ringkasan, 500 memori, 1.000 screentime/pomodoro |
| Rate limit | Ya — export menyentuh 8 tabel sekaligus |

Alasan API key tidak ikut: file export biasanya berakhir di folder Download,
dikirim ke orang lain, atau diunggah ke layanan lain. Key LLM di dalamnya =
tagihan kartu kredit user berpindah tangan.

Alasan satu bagian gagal tidak menggagalkan semuanya: kalau tabel `memoryItems`
belum ada, user tetap berhak mendapat chat & profilnya. Menolak seluruh export
karena satu tabel bermasalah justru merugikan user.

### 5.2 Hapus akun

`DELETE /api/user/account` dengan `{ confirm: "HAPUS AKUN SAYA" }`.

- **Frasa diperiksa di server**, bukan hanya di UI. Form bisa dilewati dengan
  `curl`; validasi yang hanya di client adalah hiasan.
- **Hard delete.** Baris `users` dihapus, tabel anak cascade. Tidak ada
  soft-delete yang bisa dipulihkan diam-diam — menyimpan data yang diminta
  dihapus adalah kebohongan.
- **Audit ditulis setelah** penghapusan berhasil. Audit dulu lalu hapus gagal
  menghasilkan log bohong.
- Kalau akun tidak ditemukan (sesi basi), jawabannya `200 { deleted: false }`,
  bukan 500: tujuan user sudah tercapai.

### 5.3 UI

`app/(main)/privacy/page.tsx` — Pusat Privasi, dengan tiga aksi nyata:
unduh JSON, unduh Markdown, lupakan semua memori, hapus akun (dua langkah:
buka form → ketik frasa).

Tombol "reset data" di Pengaturan yang sebelumnya hanya menampilkan *"fitur
sedang dalam tahap pengembangan"* **dihapus** dan diganti tautan ke Pusat
Privasi.

---

## 6. M4.5 — Kebijakan Privasi & ToS

Dua halaman statis di route group `(legal)`:

- `/privacy-policy` — data apa yang disimpan, ke mana perginya, hak user.
- `/tos` — Livia adalah AI, batas usia, larangan, konten dewasa, batas tanggung
  jawab.

Keduanya bisa dibuka **tanpa login**: calon user berhak membacanya sebelum
mendaftar, dan dokumen hukum harus punya URL yang bisa dirujuk.

Isinya menyebut **Google Gemini secara eksplisit**. Kebijakan privasi yang
berbunyi "kami dapat membagikan data ke mitra" tanpa menyebut siapa mitranya
tidak memberi informasi apa pun yang berguna.

**Cookie consent tidak ditambahkan** karena aplikasi ini tidak memasang
analytics pihak ketiga maupun iklan. Menampilkan banner cookie tanpa cookie
yang perlu disetujui hanya melatih user mengabaikan banner.

---

## 7. M4.6 — Audit log

Tabel `auditEvents`: `id, user_id (nullable, tanpa FK), action, outcome, metadata, created_at`.

### 7.1 Kenapa `user_id` tanpa FK cascade

Kalau user dihapus dan FK-nya cascade, jejak "akun ini pernah minta hapus data"
ikut hilang — padahal justru itu bukti kepatuhan yang dibutuhkan saat
investigasi. Kolomnya dibuat nullable tanpa referensi, sehingga baris audit
bertahan melewati penghapusan akun.

### 7.2 Metadata daftar-putih, bukan daftar-hitam

`sanitizeAuditMetadata()` hanya meloloskan kunci yang terdaftar (`route`,
`reason`, `count`, `category`, …). Alasannya: audit log adalah tempat PII paling
sering bocor tanpa sengaja, karena orang menempelkan seluruh objek request ke
sana. Dengan daftar putih, field baru yang ditambahkan ke request **tidak**
otomatis ikut tercatat.

Nilai string dipotong 200 karakter; array dibatasi 20 item × 60 karakter.

### 7.3 Aksi yang diaudit

`auth.login.success`, `auth.login.failure`, `auth.register`,
`apikey.save`, `apikey.delete`, `memory.delete`, `memory.delete_all`,
`data.export`, `account.delete`, `age_gate.confirm`.

Login gagal ikut diaudit — termasuk percobaan saat akun terkunci, karena pola
percobaan berulang adalah sinyal serangan yang paling berguna.

### 7.4 Tidak pernah melempar

`recordAuditEvent()` menelan semua errornya. Kegagalan menulis audit tidak boleh
menggagalkan aksi yang diaudit — terutama hapus akun, yang justru sering
dilakukan saat DB bermasalah.

---

## 8. Utang teknis

| Utang | Dampak | Kapan dibayar |
| --- | --- | --- |
| Guardrail berbasis pola | Ejaan kreatif & bahasa daerah lolos | Kalau ada bukti penyalahgunaan nyata |
| PII regex, bukan NER | Nama & alamat bebas tidak tertangkap | Saat pindah ke klasifikasi model |
| Post-check tidak bisa menarik delta | Teks berbahaya bisa tampil sebagian di stream | Butuh buffer penuh sebelum render (mengorbankan first-token) |
| Nomor hotline hardcoded | Bisa berubah/mati | Verifikasi berkala; direktori universal jadi jaring |
| Audit tanpa retensi | Tabel tumbuh terus | Kebijakan retensi 12–24 bulan |
| Tidak ada halaman lihat audit untuk user | Transparansi belum penuh | Kalau audit dipakai untuk sengketa |

### 8.1 Verifikasi nomor hotline

Nomor di `lib/safety/crisis.ts` adalah layanan publik Indonesia yang berlaku
saat dokumen ini ditulis (SEJIWA 119 ext. 8, Halo Kemenkes 1500-567, Into The
Light Indonesia). **Nomor layanan bisa berubah.** Setiap entri menyertakan
`source` di komentar, dan `findahelpline.com` selalu disertakan sebagai jalur
universal kalau nomor lokal mati.

---

## 9. Verifikasi

| Pemeriksaan | Hasil |
| --- | --- |
| `bun run typecheck` | lolos (0 error) |
| `bun run test` | 525 test / 25 file lolos |
| `bun run evals` (offline) | 50/50 PASS, semua kategori 100% |

Test baru:

- `tests/safety.test.ts` (65) — normalisasi, deteksi krisis, semua kategori
  penolakan, **dan yang sama pentingnya: percakapan normal harus LOLOS**.
- `tests/safety-pipeline.test.ts` (35) — urutan tahap, redaksi lintas giliran,
  pemulihan token di setiap posisi potong streaming, sanitasi audit.
- `tests/validation.test.ts` — penambahan kasus age gate.

### 9.1 Yang masih kurang

- **`bun run db:push` belum dijalankan** untuk kolom `users.age_confirmed_at`
  dan tabel `auditEvents`. Tanpa itu: age gate berjalan dalam mode "tidak
  diketahui" (tidak memblokir), dan audit log gagal tulis secara senyap
  (warning di log, aksi user tetap berhasil).
- **Uji end-to-end di browser belum dilakukan** — halaman `/privacy`,
  `/privacy-policy`, `/tos`, dan modal age gate belum pernah dirender di
  browser sungguhan pada sesi ini. Yang terverifikasi baru `tsc`, unit test, dan
  eval offline.
- **Eval live 50 skenario** masih terutang sejak M2.7 (kuota free-tier habis).
- **M4.2 pre-check belum diukur false-positive rate-nya pada percakapan nyata.**
  Test menjaga 19 kalimat aman tetap lolos, tetapi itu sampel yang disusun
  sendiri — bukan distribusi percakapan sebenarnya.
