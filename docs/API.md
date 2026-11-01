# Teman Kos — Dokumentasi API Publik

Base URL production: `https://livia.qzz.io` · Local: `http://localhost:3000`

Spesifikasi mesin: [`docs/openapi.json`](./openapi.json) (OpenAPI 3.0). SDK contoh:
[`sdk/teman-kos-client.mjs`](../sdk/teman-kos-client.mjs).

## 1. Autentikasi

Semua endpoint (kecuali `/api/health`) memerlukan sesi NextAuth.

- **Cookie**: `next-auth.session-token` (httpOnly). Login via
  `/api/auth/callback/credentials` (identifier + password) atau Google OAuth.
- Kirim cookie di setiap request (`credentials: 'include'` di fetch).
- Tanpa sesi → `401 { "error": "Unauthorized" }`.

## 2. Format error

```json
{ "error": "Pesan human-readable", "code": "KODE_OPSIONAL" }
```

Kode HTTP umum: `400` (validasi), `401` (belum login), `404` (tidak ditemukan),
`429` (rate limit / kuota habis), `500` (internal), `503` (DB down, hanya health).

## 3. Rate limit

- `aiRateLimit`: 5/menit per user (chat, TTS).
- Kuota harian per user: chat (`aiDailyQuota`), TTS (`TTS_MAX_CHARS_PER_DAY`, default 30rb karakter).
- `mutationRateLimit`: 30/menit per user (reminder, shopping, push, quest).
- Auth: 5 gagal → lockout 15 menit.

## 4. Endpoint (ringkas)

### Publik
| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/health` | Status DB (200/503). Tanpa auth, tanpa rate limit. |

### Chat
| Method | Path | Keterangan |
|---|---|---|
| POST | `/api/chat` | Balasan Livia (non-streaming). Body: `{ message, isVoiceCall? }`. |
| POST | `/api/chat/stream` | SSE streaming. Event: `delta`, `done`, `error`. |
| GET | `/api/chat/history` | Riwayat pesan + feedback. |
| POST | `/api/chat/feedback` | Rating balasan (`up`/`down`). Body: `{ messageId, rating }`. |

### Voice (TTS)
| Method | Path | Keterangan |
|---|---|---|
| POST | `/api/tts` | Sintesis suara (ElevenLabs, cache). Body: `{ text }` (≤300 char). Response: audio/mpeg. |

### Reminder & Belanja
| Method | Path | Keterangan |
|---|---|---|
| GET/POST/PATCH | `/api/reminders` | CRUD reminder. |
| GET/POST/PATCH | `/api/shopping` | CRUD item belanja. |

### Gamifikasi (Quest)
| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/quests?date=YYYY-MM-DD` | State quest harian. |
| POST | `/api/quests/action` | Catat aksi (server-validated). |
| POST | `/api/quests/claim` | Klaim reward quest. |
| POST | `/api/quests/milestone` | Klaim milestone. |

### Push (Web Push)
| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/push/vapid` | VAPID public key. |
| POST/DELETE | `/api/push/subscribe` | Simpan/hapus subscription. |
| POST | `/api/push/send` | Kirim push pomodoro (fire-and-forget). |

### User & Data
| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/user/export?format=json\|markdown` | Export data user. |
| GET/POST/PATCH/DELETE | `/api/user/*` | Model preference, API key, age-gate, account. |

### Lainnya
Story (`/api/story/complete`), Garden, Kitchen, Cook, Outfit, Wardrobe, Inventory,
Home items, Work, Date, Affection, Analytics, Usage, Memory, Screen time, Restore,
Onboarding, Push cron (`/api/cron/*` — butuh `CRON_SECRET`).

## 5. Contoh: chat non-streaming (curl)

```bash
curl -X POST https://livia.qzz.io/api/chat \
  -H 'Content-Type: application/json' \
  -b 'next-auth.session-token=YOUR_SESSION' \
  -d '{"message":"Halo Livia!"}'
```

Response:
```json
{
  "reply": "Halo! Senang ketemu kamu lagi.",
  "expression": "happy",
  "affectionDelta": 2,
  "newAffection": 42,
  "newLevel": 3,
  "unlockedChapter": null,
  "crisis": null,
  "messageId": "uuid",
  "toolsExecuted": 0
}
```

## 6. Contoh: streaming (SSE)

```bash
curl -N -X POST https://livia.qzz.io/api/chat/stream \
  -H 'Content-Type: application/json' \
  -b 'next-auth.session-token=YOUR_SESSION' \
  -d '{"message":"Ceritain dong"}'
```

Output (SSE):
```
data: {"type":"delta","text":"Halo "}
data: {"type":"delta","text":"juga!"}
data: {"type":"done","reply":"Halo juga!","expression":"happy",...}
```

## 7. SDK contoh

Lihat [`sdk/teman-kos-client.mjs`](../sdk/teman-kos-client.mjs) untuk client
minimal (fetch-based, tanpa dependency). Mendukung chat, chat stream, TTS.

## 8. Catatan modder

- Endpoint memerlukan sesi user (cookie). Untuk bot/otomasi, buat akun
  credentials lalu login programatik.
- Rate limit per user — jangan spam; gunakan cache TTS.
- Streaming SSE: parse baris `data: ` dan handle event `done`/`error`.
- Semua waktu dalam UTC; tanggal quest lokal dikirim client (YYYY-MM-DD).
