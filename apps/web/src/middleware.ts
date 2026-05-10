/**
 * Phase 0 middleware.
 *
 * Checks the presence of the `nx_session` cookie on protected routes.
 * If missing → redirect to /login.
 *
 * Real role enforcement (Admin cannot access /employee/*, etc.) lives in each
 * role group's layout.tsx via server-side getMe(), which returns the
 * authoritative role from the API — not from the cookie value.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Paths that require authentication */
const PROTECTED_PREFIXES = [
  '/admin',
  '/manager',
  '/employee',
  '/payroll',
  '/notifications',
  '/profile',
];

/** Paths that are public (skip auth check) */
const PUBLIC_PREFIXES = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/first-login',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow Next.js internals and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Allow public auth routes
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Root redirect — let the root page.tsx handle session check
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Check auth cookie for protected routes
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isProtected) {
    const sessionCookie = request.cookies.get('nx_session');
    if (!sessionCookie?.value) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Forward pathname in a header so server layouts can read the current path
  const response = NextResponse.next();
  response.headers.set('x-pathname', pathname);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
