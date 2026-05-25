import { auth } from '@/auth';
import { NextResponse, type NextRequest } from 'next/server';
import type { Session } from 'next-auth';

type AuthRequest = NextRequest & { auth: Session | null };

export default auth((req: AuthRequest) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === '/login';
  const isAuthRoute = req.nextUrl.pathname.startsWith('/api/auth');

  if (isAuthRoute) return NextResponse.next();
  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/', req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
