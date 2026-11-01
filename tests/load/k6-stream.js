import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// M9.1 — Load test: /api/chat/stream (SSE)
// Target: 500 konkuren, p95 < 8s (streaming LLM), error rate < 1%.
//
// Cara pakai:
//   k6 run -e BASE_URL=https://staging.livia.qzz.io \
//          -e SESSION_COOKIE="next-auth.session-token=..." \
//          -e VUS=500 tests/load/k6-stream.js
//
// Catatan:
// - Endpoint butuh sesi NextAuth. Dapatkan cookie dengan login manual di browser,
//   lalu salin nilai `next-auth.session-token` ke env SESSION_COOKIE.
// - JANGAN jalankan ke production tanpa quota AI yang cukup (tiap request
//   memanggil Gemini). Pakai staging dengan mock provider kalau bisa.

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // ramp-up
    { duration: '2m',  target: 200 },   // steady
    { duration: '30s', target: 500 },   // peak
    { duration: '1m',  target: 500 },   // sustain peak
    { duration: '30s', target: 0 },    // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<8000', 'p(99)<15000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SESSION_COOKIE = __ENV.SESSION_COOKIE || '';
const MESSAGES = [
  'Halo Livia, hari ini aku capek banget.',
  'Ceritain dong tentang hari mu.',
  'Aku lagi butuh semangat.',
  'Livia, tolong buatin reminder belajar jam 7 malam.',
];

export default function () {
  const url = `${BASE_URL}/api/chat/stream`;
  const payload = JSON.stringify({
    message: MESSAGES[Math.floor(Math.random() * MESSAGES.length)],
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Cookie: SESSION_COOKIE,
    },
    // SSE: baca seluruh body (k6 menunggu stream selesai).
    responseType: 'text',
    timeout: '30s',
  };

  const res = http.post(url, payload, params);

  const ok = check(res, {
    'status 200': (r) => r.status === 200,
    'content-type SSE': (r) => (r.headers['Content-Type'] || '').includes('text/event-stream'),
    'berisi event done': (r) => (r.body || '').includes('"type":"done"'),
    'tidak ada error event': (r) => !(r.body || '').includes('"type":"error"'),
  });

  errorRate.add(!ok);

  // Jeda antar pesan supaya tidak memicu rate limit (5/menit per user).
  sleep(Math.random() * 3 + 2);
}
