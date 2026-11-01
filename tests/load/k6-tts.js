import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// M9.1 — Load test: /api/tts (ElevenLabs + cache)
// Target: 500 konkuren, p95 < 3s (cache hit < 500ms), error rate < 1%.
//
// Catatan biaya: tiap miss memanggil ElevenLabs (berbayar). Jalankan ke
// staging dengan cache hangat atau batasi VUS supaya tidak membengkakkan tagihan.

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '2m',  target: 200 },
    { duration: '30s', target: 500 },
    { duration: '1m',  target: 500 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000', 'p(99)<6000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SESSION_COOKIE = __ENV.SESSION_COOKIE || '';
const TEXTS = [
  'Halo, selamat pagi! Semangat ya hari ini.',
  'Aku di sini kok, istirahat dulu.',
  'Kamu hebat, jangan menyerah.',
  'Mau aku buatin teh hangat?',
];

export default function () {
  const url = `${BASE_URL}/api/tts`;
  const payload = JSON.stringify({
    text: TEXTS[Math.floor(Math.random() * TEXTS.length)],
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Cookie: SESSION_COOKIE,
    },
    responseType: 'binary',
    timeout: '20s',
  };

  const res = http.post(url, payload, params);

  const ok = check(res, {
    'status 200': (r) => r.status === 200,
    'content-type audio': (r) => (r.headers['Content-Type'] || '').includes('audio'),
    'body non-empty': (r) => (r.body || '').byteLength > 0,
  });

  errorRate.add(!ok);

  sleep(Math.random() * 2 + 1);
}
