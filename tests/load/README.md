# M9.1 — Load Test (k6)

Skrip k6 untuk menguji endpoint berat: `/api/chat/stream` (SSE, LLM) dan
`/api/tts` (ElevenLabs + cache). Target: **500 konkuren**, error rate < 1%.

## Prasyarat

1. **k6 terpasang** (belum ada di mesin ini):
   - Windows: `winget install k6` atau `choco install k6`
   - macOS: `brew install k6`
   - Linux: lihat https://k6.io/docs/get-started/installation/
2. **Server target berjalan** (staging, bukan production tanpa quota AI cukup):
   - `BASE_URL` (default `http://localhost:3000`).
3. **Sesi auth**: endpoint butuh cookie NextAuth. Login manual di browser,
   salin nilai `next-auth.session-token` → env `SESSION_COOKIE`.

## Menjalankan

```bash
# Streaming (chat)
k6 run -e BASE_URL=http://localhost:3000 \
       -e SESSION_COOKIE="next-auth.session-token=..." \
       tests/load/k6-stream.js

# TTS
k6 run -e BASE_URL=http://localhost:3000 \
       -e SESSION_COOKIE="next-auth.session-token=..." \
       tests/load/k6-tts.js
```

Override VUS / durasi via env jika perlu (edit stages di file skrip).

## Ambang (thresholds)

| Endpoint | p95 | p99 | error rate |
|---|---|---|---|
| /api/chat/stream | < 8s | < 15s | < 1% |
| /api/tts | < 3s | < 6s | < 1% |

## Catatan penting

- **Biaya**: tiap request chat memanggil Gemini, tiap TTS miss memanggil
  ElevenLabs. Jalankan di staging dengan kuota cukup; cache TTS hangat
  dulu (warm-up) supaya miss tidak meledakkan tagihan.
- **Rate limit**: `aiRateLimit` (5/menit per user) akan memicu 429 kalau
  satu user dipakai untuk 500 VUS. Untuk load test murni, gunakan banyak
  akun uji atau naikkan limit di staging (env).
- **Quota harian**: `aiDailyQuota` dan `ttsMaxCharsPerDay` akan habis
  cepat — gunakan akun dengan kuota besar atau reset di staging.
- **Hasil** belum dijalankan di repo ini (k6 tidak terpasang di mesin dev
  dan tidak ada staging). Skrip + runbook ini adalah deliverable M9.1;
  eksekusi membutuhkan k6 + staging + sesi auth.

## Status

- [x] Skrip k6 stream + TTS ditulis
- [x] Runbook dokumentasi
- [ ] Eksekusi load test (butuh k6 + staging + auth session)
- [ ] Analisis hasil & tuning (setelah eksekusi)
