# Teman Kost (AI-Waifu) 🌸

[![License: MIT](https://img.shields.io/badge/License-MIT-pink.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Visual Novel](https://img.shields.io/badge/Genre-Visual_Novel_/_Productivity-blue.svg)]()

Selamat datang di **Teman Kost**, sebuah perpaduan unik antara aplikasi produktivitas dan game Visual Novel (VN). Teman Kost menghadirkan seorang pendamping AI bernama **Livia** yang siap menemani hari-harimu, mengatur jadwalmu, serta berinteraksi layaknya heroine dari game Visual Novel favoritmu.

> *"Aku cuma kebetulan lagi luang kok, bukan berarti aku nungguin kamu pulang lho ya!"* - Livia

## 🌟 Fitur Utama

- **Visual Novel Experience**: Antarmuka interaktif yang indah dengan karakter Livia (lengkap dengan sistem Sprite 16:9 ala game gacha/VN modern).
- **Sistem Wardrobe / Lemari**: Kustomisasi pakaian Livia (Seragam Sekolah, Yukata, dll) layaknya fitur *dress-up* di *rhythm game* / visual novel.
- **Produktivitas Berbasis Cerita**: Fitur To-Do list, pengingat, dan mode fokus yang didampingi oleh interaksi langsung dari AI.
- **Respons Dinamis**: Livia menggunakan engine AI (Gemini) untuk bereaksi secara cerdas terhadap apa yang kamu kerjakan, kapan kamu membuka aplikasi, dan bagaimana progres harianmu.

---

## 🚀 Mulai Cepat

Prasyarat: **Node.js 20+** dan **[Bun](https://bun.sh) 1.1+** (manajer paket proyek ini).

```bash
git clone https://github.com/FerrDxD/AI-Waifu.git
cd AI-Waifu
bun install
```

### 1. Siapkan environment

```bash
cp .env.example .env.local
```

Lalu isi nilainya. Lihat tabel [Environment Variables](#-environment-variables) di bawah.

Generate dua secret ini dengan perintah yang tercantum:

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# ENCRYPTION_KEY (wajib 32 byte base64)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. Siapkan database

```bash
bun run db:push
```

Perintah ini menyinkronkan `lib/db/schema.ts` ke database. Jalankan setiap kali
schema berubah. **Wajib** dijalankan minimal sekali, kalau tidak tabel
`userApiKeys` tidak akan ada dan fitur "pakai API key sendiri" akan menolak.

### 3. Jalankan

```bash
bun run dev      # http://localhost:3000
```

---

## 🔑 Environment Variables

Semua divalidasi oleh `lib/env.ts` (zod). Kalau ada yang salah, aplikasi
gagal dengan pesan yang jelas — bukan `undefined` yang menjalar jadi bug aneh.

| Variabel | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ✅ | Connection string Postgres (Neon). Harus diawali `postgres`. |
| `NEXTAUTH_SECRET` | ✅ | Minimal 32 karakter. Untuk menandatangani sesi. |
| `GEMINI_API_KEY` | ✅ | API key Google Gemini untuk AI Livia. |
| `NEXTAUTH_URL` | ⬜ | URL publik aplikasi (mis. `https://...`). |
| `ENCRYPTION_KEY` | ⬜ | 32 byte base64. **Wajib** kalau user boleh menyimpan API key sendiri (AES-256-GCM). Kalau kosong, fitur itu dinonaktifkan dengan pesan jelas. |
| `ELEVENLABS_API_KEY` | ⬜ | Untuk text-to-speech (suara Livia). |
| `ELEVENLABS_VOICE_ID` | ⬜ | Voice ID ElevenLabs. Ada default. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ⬜ | Login Google (opsional). |

> ⚠️ **Jangan pernah commit `.env.local`.** File itu sudah masuk `.gitignore`.
> Yang di-commit hanya `.env.example` berisi nama variabel tanpa nilai.

### Tentang `ENCRYPTION_KEY`

API key Gemini milik user disimpan **terenkripsi** (AES-256-GCM) di database,
bukan di `localStorage` atau cookie. Konsekuensinya:

- Kalau `ENCRYPTION_KEY` **hilang atau berubah**, semua key user yang tersimpan
  **tidak bisa didekripsi**. User harus memasukkan ulang key-nya.
- Simpan di secret manager (Vercel Environment Variables), jangan di file yang
  ikut ter-commit.
- Rotasi kunci butuh re-enkripsi manual (dekripsi dengan kunci lama, enkripsi
  dengan kunci baru). Belum ada UI-nya; dicatat sebagai utang teknis.

---

## 🧭 Arsitektur Singkat

```
app/
  (main)/              Halaman utama (chat, date, garden, story, ...)
  api/                 Route handler: tipis, validasi → logika → respons
components/            UI React
lib/
  api-handler.ts       Wrapper auth + rate limit + error untuk route
  auth.ts              NextAuth (Credentials + lockout)
  crypto.ts            AES-256-GCM untuk secret user
  env.ts               Validasi environment (zod)
  errors.ts            AppError + apiErrorResponse (anti-bocor)
  logger.ts            Log JSON terstruktur + redaksi secret
  rate-limit.ts        Limiter per aksi (in-memory)
  validation.ts        Validasi & sanitasi input server-side
  db/                  Drizzle schema + koneksi
  livia/               Logika karakter (affection, quest, personality)
docs/
  AUDIT.md             Hasil audit keamanan & kualitas
  MILESTONES.md        Roadmap M0–M9
  M0-IMPLEMENTATION.md Laporan hotfix keamanan
  M1-IMPLEMENTATION.md Laporan test harness, CI, validasi env
tests/                 Vitest (unit test logika murni)
```

**Prinsip yang dipegang:** route handler tidak boleh menyimpan logika bisnis
panjang, dan pesan error internal tidak pernah dikirim ke client. Semua error
melewati `apiErrorResponse()` yang mencatat detail di server dan mengirim pesan
aman ke browser.

---

## 🧪 Perintah

| Perintah | Fungsi |
|---|---|
| `bun run dev` | Development server |
| `bun run build` | Build produksi |
| `bun run start` | Jalankan hasil build |
| `bun run lint` | ESLint |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run test` | Unit test (Vitest) |
| `bun run test:watch` | Test mode watch |
| `bun run test:coverage` | Test + laporan coverage (ambang 30% pada `lib/`) |
| `bun run verify` | typecheck + lint + test sekaligus |
| `bun run format` | Prettier (`--write`) |
| `bun run format:check` | Cek format tanpa mengubah file |
| `bun run db:push` | Sinkronkan schema ke database |
| `bun run db:studio` | Drizzle Studio (GUI database) |

### Konvensi commit

Format Conventional Commits, dipaksa oleh hook `commit-msg` (husky + commitlint):

```
<type>(<scope>): <subject>

fix(security): tutup kebocoran API key di client
feat(api): tambah endpoint restore backup
```

`type`: `feat fix docs style refactor perf test build ci chore revert`.
Hook hanya `commit-msg` — tidak ada `pre-commit` yang menjalankan test, supaya
commit tidak terasa seperti menunggu build. Jalankan `bun run verify` sebelum push.

### CI

`.github/workflows/ci.yml` menjalankan **typecheck → lint → test → build** pada
setiap push/PR ke `main`.

Build di CI sengaja dijalankan **tanpa `.env`**. Kalau build gagal karena env
kosong, itu berarti ada modul yang melempar error saat import — bug yang sudah
pernah terjadi dan diperbaiki (lihat `docs/M0-IMPLEMENTATION.md`).

---

## 🔒 Keamanan

Ringkasan hal yang sudah ditangani:

- API key user tidak pernah menyentuh browser (enkripsi di server).
- Safety filter Gemini aktif; respons terblokir dibalas in-character.
- CSP nonce per-request, `X-Frame-Options: DENY`, HSTS di produksi.
- Rate limit per aksi + lockout login (5 gagal → 15 menit).
- Validasi & sanitasi semua input server-side.
- Log dengan redaksi otomatis untuk field sensitif.

Yang **belum** ditangani ada di `docs/M0-IMPLEMENTATION.md` §10 — baca itu
sebelum menganggap aplikasi ini aman untuk produksi publik.

---

## 🤝 Kontribusi

Kami sangat menyambut kontribusi dari kreator lain! Entah kamu seorang Programmer, Penulis Cerita (VN Writer), atau Artist (Sprite/Background), bantuanmu sangat berharga.
Silakan baca [CONTRIBUTING.md](CONTRIBUTING.md) untuk pedoman lengkap mengenai format aset (seperti rasio sprite 16:9) dan cara *pull request*.

Sebelum membuka PR, pastikan `bun run verify` lulus.

## 📜 Lisensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE).
Untuk aset gambar (Sprite dan Background), silakan merujuk pada ketentuan lisensi spesifik dari masing-masing artist (apabila ada).

---
*Dibuat dengan ❤️ oleh para penggemar Visual Novel.*
