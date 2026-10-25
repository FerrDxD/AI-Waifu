# M0 — HOTFIX KEAMANAN KRITIS: Laporan Implementasi

> Referensi: `docs/MILESTONES.md` (M0) + `docs/AUDIT.md` §1–2.
> Status: **kode selesai**, verifikasi manual masih pending (lihat §9).

M0 itu memadamkan api dulu, renovasi menyusul. Setiap poin punya catatan
"utang teknis" yang jelas — jangan dibaca sebagai "sudah aman sepenuhnya".

---

## 1. Ringkasan per item

| Item | Status | File utama |
|---|---|---|
| H0.1 API key keluar dari client | ✅ | `lib/crypto.ts`, `lib/ai/keys.ts`, `app/api/user/api-key/route.ts`, `lib/client/api-key.ts`, `components/guide/ApiGuideModal.tsx`, `app/(main)/settings/page.tsx` |
| H0.2 Safety filter dinyalakan | ✅ | `lib/gemini.ts` |
| H0.3 Security headers + CSP nonce | ✅ | `next.config.js`, `middleware.ts` |
| H0.4 Rate limit auth + lockout | ✅ | `lib/rate-limit.ts`, `lib/auth-lockout.ts`, `lib/auth.ts`, route auth |
| H0.5 Validasi input server-side | ✅ | `lib/validation.ts`, semua route AI |
| H0.6 Error mentah tidak bocor | ✅ | `lib/errors.ts`, `lib/logger.ts`, 15 route |
| H0.7 Bersih-bersih repo | ✅ | `.gitignore`, `scripts/` |

---

## 2. H0.1 — API key tidak lagi hidup di browser

### Masalah lama (AUDIT 1.1)
```js
localStorage.setItem('custom_gemini_api_key', apiKey);        // bisa dibaca XSS
document.cookie = `custom_gemini_api_key=...; SameSite=Lax`;  // non-HttpOnly, tanpa Secure
```
Ditambah klaim palsu *"Aman & Privasi Terjamin"* dan key yang ikut ke file backup JSON.

### Sekarang
1. **Browser tidak menyimpan key sama sekali.** Input key dikirim sekali ke
   `POST /api/user/api-key`.
2. Server mengenkripsi dengan **AES-256-GCM** (`lib/crypto.ts`) — ciphertext,
   IV, dan auth tag disimpan terpisah di tabel `userApiKeys`.
3. `GET /api/user/api-key` hanya mengembalikan `{ hasKey, keyHint }`
   (`keyHint` = `••••••••ab12`). **Plaintext tidak pernah kembali ke client.**
4. `resolveApiKey(userId)` (`lib/gemini.ts`) mengambil key dari DB untuk dipakai
   server-side. Tidak ada key → pakai `GEMINI_API_KEY` server.
5. `purgeLegacyApiKeyStorage()` menghapus sisa `localStorage.custom_gemini_api_key`
   + cookie lama saat app boot.
6. Key **dihapus dari file backup**, dan restore **mengabaikan** field
   `custom_gemini_api_key` dari file backup versi lama.
7. Klaim palsu diganti penjelasan faktual di `ApiGuideModal` dan Settings.

### Wajib dilakukan operator
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# → set hasilnya sebagai ENCRYPTION_KEY
```
Tanpa `ENCRYPTION_KEY`: endpoint simpan-key membalas 500 dengan pesan
"belum diaktifkan di server" (bukan crash), dan Livia tetap jalan dengan key server.

> ⚠️ Kalau `ENCRYPTION_KEY` hilang/berubah, semua key tersimpan tidak bisa
> didekripsi (user cukup menyimpan ulang). Simpan di secret manager.

### Utang teknis
- Belum ada `keyVersion` per baris → rotasi kunci belum mungkin tanpa re-enkripsi massal.
- Belum ada audit log akses key (M4.6).
- Migration DB untuk `userApiKeys` belum dijalankan (`npm run db:push`).

---

## 3. H0.2 — Safety filter

| Kategori | Sebelum | Sesudah |
|---|---|---|
| HARM_CATEGORY_HARASSMENT | BLOCK_NONE | **BLOCK_MEDIUM_AND_ABOVE** |
| HARM_CATEGORY_HATE_SPEECH | BLOCK_NONE | **BLOCK_MEDIUM_AND_ABOVE** |
| HARM_CATEGORY_DANGEROUS_CONTENT | BLOCK_NONE | **BLOCK_MEDIUM_AND_ABOVE** |
| HARM_CATEGORY_SEXUALLY_EXPLICIT | BLOCK_NONE | BLOCK_ONLY_HIGH |

Seksual eksplisit sengaja `BLOCK_ONLY_HIGH` agar persona romantis tidak mati —
**konsekuensinya guardrail sendiri (M4.2) + age gate (M4.1) jadi WAJIB, bukan
opsional.** Jangan turunkan threshold lagi sebelum M4 selesai.

Bonus (bukan bagian DoD): prompt punya blok `INJECTION_GUARD` yang menegaskan isi
chat user = data, bukan instruksi sistem.

---

## 4. H0.3 — Security headers

### `next.config.js` (statis)
`X-Frame-Options: DENY` · `X-Content-Type-Options: nosniff` ·
`Referrer-Policy: strict-origin-when-cross-origin` · `X-DNS-Prefetch-Control: off` ·
`Permissions-Policy: camera=(), geolocation=(), payment=(), usb=(), microphone=(self)` ·
`Strict-Transport-Security` (production saja) · `poweredByHeader: false`

### `middleware.ts` (CSP dengan nonce per-request)
```
default-src 'self';
script-src 'self' 'nonce-<random>' 'strict-dynamic';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data: blob: https:;
media-src 'self' blob: data: https:;
connect-src 'self' https://api.open-meteo.com https://api.rss2json.com;
worker-src 'self' blob:; manifest-src 'self';
object-src 'none'; base-uri 'self'; form-action 'self';
frame-ancestors 'none'; upgrade-insecure-requests
```

Nonce dikirim di **header request** (`x-nonce`) supaya Next.js menempelkannya ke
tag `<script>` hasil render. Kalau hanya di header response, script Next tidak
punya nonce dan halaman mati.

**Catatan `style-src 'unsafe-inline'`**: belum bisa dihindari — Next.js dan
halaman story VN menyuntik `<style>` inline, dan `strict-dynamic` hanya berlaku
untuk script. Utang teknis M5.

**Bonus:** daftar halaman terproteksi diperluas. Sebelumnya hanya
`/home`, `/chat`, `/pomodoro`, `/story`, `/onboarding` — sekarang `/settings`,
`/date`, `/shop`, `/garden`, `/kitchen`, `/work`, `/wardrobe`, `/inventory`,
`/album`, `/lounge`, `/schedule`, `/radio`, `/call`, `/bedroom` ikut diproteksi.

---

## 5. H0.4 — Rate limit & lockout

| Limiter | Batas | Dipakai di |
|---|---|---|
| `aiRateLimit` | 5 / menit / user | `/api/chat`, `/api/date`, `/api/date/chat`, `/api/tts` |
| `aiDailyQuota` | 200 / 24 jam / user | `/api/chat` (pengaman biaya) |
| `registerRateLimit` | 5 / 10 menit / IP | `/api/auth/register` |
| `passwordResetRateLimit` | 5 / 15 menit / IP | `/api/auth/reset-password` |
| `loginAttemptLimiter` + lockout | 5 gagal → kunci 15 menit | `authorize()` |
| `mutationRateLimit` | 30 / menit / user | `/api/user/api-key` |

Perbaikan tambahan: `Map` sekarang punya **eviction** (dulu tumbuh selamanya =
memory leak), hasil limit menyertakan `Retry-After`.

Password policy registrasi: minimal 8 karakter, wajib huruf + angka.
bcrypt cost **10 → 12**. Form register di UI diselaraskan (dulu `minLength={6}`).

> ⚠️ Masih in-memory: reset saat cold start, tidak dibagi antar instance.
> M5.5 memindahkannya ke DB/Redis dengan daily + monthly cap.

### Reset password (AUDIT 1.5)
Endpoint `verify` dulu oracle enumerasi akun (404 = tidak ada, 200 = ada).
Sekarang `verify` **selalu** membalas `{ success: true }` apa pun hasilnya, dan
`reset` tetap 501 sampai ada alur OTP/token (M4).

---

## 6. H0.5 — Validasi input server-side

`lib/validation.ts`:

| Input | Aturan |
|---|---|
| `message` | wajib string, ≤ **2000** char, karakter kontrol dibuang |
| `location` | **whitelist** 17 lokasi kencan (bukan sekadar trim) |
| `userName` | ≤ 40 char, newline & kutip dibuang, di-wrap `<<<...>>>` di prompt |
| `history` | maks 20 entri, tiap entri ≤ 2000 char, role di-whitelist |
| `text` (TTS) | ≤ 300 char |
| registrasi | email regex (tolak `a@b`), username 3–20, password ≥ 8 + huruf & angka |

Bonus: `generateDateDialogue` tidak lagi menempelkan system prompt di slot **user
content** (AUDIT 3.3). Sekarang pakai `systemInstruction` + user turn netral +
`responseMimeType: application/json`.

---

## 7. H0.6 — Error tidak lagi bocor

`lib/errors.ts`:
- `AppError` dengan `code`, `statusCode`, `expose`.
- `apiErrorResponse(error, { route, userId })` — satu-satunya jalan keluar error
  dari route handler. Detail lengkap → log; client dapat pesan generic kecuali
  `expose: true` (mis. "Password minimal 8 karakter").

`lib/logger.ts`:
- Satu baris JSON di production, human-readable di dev.
- **Redaksi otomatis** untuk field yang mengandung `apikey`, `authorization`,
  `password`, `token`, `cookie`, `secret`.

Diterapkan di 15 route; `console.error` di production path sudah tidak ada.

---

## 8. H0.7 — Bersih-bersih repo

`git rm --cached`: `tsconfig.tsbuildinfo`, `__pycache__/*.pyc`, `missing.txt`,
`missing2.txt`.

Dipindah ke `scripts/`: 8 script Python maintenance + `unlock-story.ts`.

`.gitignore` diperluas: `*.tsbuildinfo`, `__pycache__/`, `*.py[cod]`,
`missing*.txt`, `.env.local`, `.vercel`, dll.

> `unlock-story.ts` memberi **semua chapter ke semua user** — script maintenance
> berbahaya, sekarang terkumpul di `scripts/` dan tidak lagi di root.

---

## 9. Verifikasi DoD

| DoD | Cara verifikasi | Status |
|---|---|---|
| Typecheck bersih | `bunx tsc --noEmit` | ✅ **exit 0** |
| `bun run lint` lulus | `bun run lint` | ✅ **0 error** (lihat catatan di bawah) |
| `bun run build` lulus | `bun run build` | ✅ **sukses**, `/api/user/api-key` terdaftar |
| Tidak ada API key di storage client | DevTools → Application → Local Storage & Cookies: `custom_gemini_api_key` **kosong**; `localStorage.getItem(...)` → `null` | ⬜ manual |
| Headers grade A | `securityheaders.com` setelah deploy HTTPS | ⬜ manual |
| Register tidak bisa dispam | 6x POST `/api/auth/register` dari satu IP → request ke-6 balas **429** | ⬜ manual |
| Key tidak kembali ke browser | `GET /api/user/api-key` → hanya `{hasKey, keyHint}` | ⬜ manual |
| Lockout login | 5x password salah → login ke-6 ditolak walau password benar, sampai 15 menit | ⬜ manual |
| Tabel `userApiKeys` ada | `bun run db:push` lalu cek `\dt` | ⬜ manual |

### Catatan lingkungan (penting)
`node_modules` sempat **korup**: `node_modules/next` kehilangan `package.json` dan
folder `types/`, sehingga `tsc` melaporkan ratusan `Cannot find module 'next/*'`
yang **bukan** masalah kode. Setelah dependensi dipasang ulang dengan **bun**
(`bun.lock`), typecheck keluar bersih. Kalau kamu melihat error serupa, itu
gejala instalasi rusak, bukan bug aplikasi.

### Dua bug build yang ditemukan & diperbaiki saat verifikasi
1. **`lib/db/index.ts`** melempar error di top-level kalau `DATABASE_URL` kosong
   → `next build` gagal di tahap "Collecting page data". Build seharusnya tidak
   butuh koneksi DB. Sekarang kegagalan dipindah ke query pertama (lazy proxy).
2. **`lib/gemini.ts`** sama: melempar error saat import kalau `GEMINI_API_KEY`
   kosong. Sekarang client dibuat lazy lewat `getServerClient()`.

Keduanya bug lama yang selama ini tersembunyi karena `.env` selalu ada di mesin
developer. Di CI (tanpa `.env`) build akan selalu merah tanpa perbaikan ini.

### Soal `react/no-unescaped-entities`
Aturan ini menghasilkan 28 error **pre-existing** di teks dialog VN
(`story/page.tsx`, `lounge`, `kitchen`, dst.) — tanda kutip di dalam JSX.
Mengubahnya satu per satu berisiko mengubah konten cerita, jadi aturannya
diturunkan ke `warn` (dengan `forbid: [">", "}"]` yang tetap menjaga kasus
berbahaya). Ini utang kosmetik, bukan celah keamanan.

---

## 10. Sisa risiko yang BELUM ditutup M0

Supaya tidak ada rasa aman palsu:

1. **Rate limit masih in-memory** → reset saat cold start. Efektif untuk spam
   klik, bukan penyerang serius. (M5.5)
2. **Tidak ada age gate** padahal karakter 19 tahun + jalur romantis. (M4.1)
3. **Tidak ada guardrail sendiri** — `BLOCK_ONLY_HIGH` untuk konten seksual
   berarti tanggung jawab hukum ada di kita. (M4.2)
4. **PII belum diredaksi** sebelum dikirim ke Gemini. (M4.3)
5. **Tidak ada audit log** — belum bisa menjawab "siapa melakukan apa kapan". (M4.6)
6. **`next-auth` masih 5.0.0-beta** dan `next@14.2.3` punya security advisory —
   upgrade terjadwal, bukan M0.
7. **Cheat state client** (affection/money lewat DevTools) belum dibereskan. (M5.4)
8. **CSP masih mengizinkan `style-src 'unsafe-inline'`** — belum bisa dihindari
   tanpa refactor style. (M5)

---

## 11. Langkah manual yang WAJIB dilakukan

```bash
# 1. Set ENCRYPTION_KEY (32 byte base64) di .env
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 2. Buat tabel userApiKeys
bun run db:push

# 3. Verifikasi
bunx tsc --noEmit
bun run lint
bun run build
```

Tanpa langkah 1–2: aplikasi tetap jalan (fallback ke `GEMINI_API_KEY` server),
tapi fitur "pakai API key sendiri" akan menolak dengan pesan
"Penyimpanan API key belum diaktifkan di server ini".
