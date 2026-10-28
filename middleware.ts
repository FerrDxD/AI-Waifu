import { auth } from './lib/auth';
import { NextResponse } from 'next/server';

/**
 * Content-Security-Policy dengan nonce per-request (M0/H0.3).
 *
 * Kenapa di middleware: CSP dengan `strict-dynamic` butuh nonce yang unik untuk
 * setiap response. Nonce harus dikirim di header request (`x-nonce`) supaya
 * Next.js menempelkannya ke tag <script> hasil render — kalau hanya di header
 * response, script Next tidak akan punya nonce dan halaman mati.
 *
 * Catatan `style-src 'unsafe-inline'`: Next.js dan beberapa halaman (story VN,
 * sprite Livia) menyuntik <style> inline. `strict-dynamic` hanya berlaku untuk
 * script, bukan style, jadi ini tidak bisa dihindari tanpa refactor besar.
 */
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== 'production';

  const directives = [
    "default-src 'self'",
    // strict-dynamic: script yang dimuat oleh script ber-nonce otomatis dipercaya,
    // jadi tidak perlu daftar CDN. TIDAK ada 'unsafe-inline' untuk script.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // Google Fonts diimpor dari app/globals.css + inline style dari Next.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    // Sprite/background adalah file lokal; data: & blob: untuk canvas/audio.
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: data: https:",
    // API internal + layanan yang memang dipanggil client (cuaca, RSS proxy).
    `connect-src 'self' https://api.open-meteo.com https://api.rss2json.com${
      isDev ? ' ws: wss:' : ''
    }`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Clickjacking (pelengkap X-Frame-Options untuk browser modern).
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ];

  if (isDev) {
    // Turbopack/webpack dev server butuh eval untuk HMR.
    directives.push("frame-src 'self'");
  }

  return directives.join('; ');
}

/**
 * Halaman yang butuh login.
 *
 * Dulu hanya ['/home', '/chat', '/pomodoro', '/story', '/onboarding'], sehingga
 * /settings, /date, /shop, /garden, /kitchen, /work, /wardrobe, /inventory,
 * /album, /lounge, /schedule, dan /call bisa dibuka tanpa sesi. Semua halaman
 * di grup (main) sekarang diproteksi.
 */
const PROTECTED_PREFIXES = [
  '/home',
  '/chat',
  '/call',
  '/pomodoro',
  '/story',
  '/date',
  '/shop',
  '/garden',
  '/kitchen',
  '/work',
  '/wardrobe',
  '/inventory',
  '/album',
  '/lounge',
  '/schedule',
  '/radio',
  '/bedroom',
  // M7.1: dashboard biaya AI (owner-only, cek OWNER_EMAIL di dalam halaman).
  '/usage',
  // M7.2: dashboard produk (owner-only, cek OWNER_EMAIL di dalam halaman).
  '/analytics',
];

const AUTH_ROUTES = ['/login', '/register'];

/**
 * Halaman yang masih boleh diakses walau onboarding belum selesai.
 * `/onboarding` sendiri wajib bisa diakses, kalau tidak akan terjadi
 * redirect loop tak berujung.
 */
const ONBOARDING_EXEMPT = ['/onboarding'];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnboardingDone = req.auth?.user
    ? (req.auth.user as { onboardingDone?: boolean }).onboardingDone === true
    : false;

  const pathname = req.nextUrl.pathname;

  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isOnboardingRoute = ONBOARDING_EXEMPT.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // --- Aturan akses ---

  // Sudah login tapi membuka /login atau /register → lempar ke aplikasi.
  if (isAuthRoute && isLoggedIn) {
    const target = isOnboardingDone ? '/home' : '/onboarding';
    return NextResponse.redirect(new URL(target, req.url));
  }

  // Belum login dan membuka halaman terproteksi → ke /login.
  if ((isProtectedRoute || isOnboardingRoute) && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Sudah login tapi onboarding belum selesai → paksa onboarding.
  // PENTING: jangan redirect saat sudah berada di /onboarding (redirect loop).
  if (isProtectedRoute && isLoggedIn && !isOnboardingDone) {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  // Onboarding sudah selesai tapi membuka /onboarding lagi → ke /home.
  if (isOnboardingRoute && isLoggedIn && isOnboardingDone) {
    return NextResponse.redirect(new URL('/home', req.url));
  }

  // --- CSP nonce ---
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);

  return response;
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
