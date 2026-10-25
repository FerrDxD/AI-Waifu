/** @type {import('next').NextConfig} */

/**
 * Security headers (M0/H0.3).
 *
 * CSP TIDAK diatur di sini — `middleware.ts` sudah menyusun CSP berbasis nonce
 * per-request (lebih kuat dari 'unsafe-inline'). Menaruh CSP di dua tempat
 * membuat browser memakai irisan keduanya, yang justru bisa mematikan halaman.
 *
 * File ini hanya menangani header yang tidak butuh nilai dinamis.
 */

const isDev = process.env.NODE_ENV !== 'production';

const securityHeaders = [
  // Cegah halaman di-embed di iframe pihak lain (clickjacking).
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  // Matikan fitur browser yang tidak dipakai; microphone dibutuhkan voice call.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), geolocation=(), payment=(), usb=(), microphone=(self)',
  },
  // HSTS hanya di production — di dev (http://localhost) justru mengganggu.
  ...(isDev
    ? []
    : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]),
];

const nextConfig = {
  reactStrictMode: true,

  // Jangan bocorkan versi framework di header response.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
