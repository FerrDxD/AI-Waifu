import { auth } from './lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnboardingDone = req.auth?.user ? (req.auth.user as any).onboardingDone : false;
  
  const pathname = req.nextUrl.pathname;

  const authRoutes = ['/login', '/register'];
  const protectedRoutes = ['/home', '/chat', '/pomodoro', '/story', '/onboarding'];
  const mainRoutes = ['/home', '/chat', '/pomodoro', '/story'];

  const isAuthRoute = authRoutes.includes(pathname);
  const isProtectedRoute = protectedRoutes.some(r => pathname.startsWith(r));
  const isMainRoute = mainRoutes.some(r => pathname.startsWith(r));

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL('/home', req.url));
  }

  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isMainRoute && isLoggedIn && !isOnboardingDone) {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  if (pathname.startsWith('/onboarding') && isLoggedIn && isOnboardingDone) {
    return NextResponse.redirect(new URL('/home', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
