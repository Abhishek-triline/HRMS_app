/**
 * POST /api/auth/signout — client-side sign-out handler.
 * Calls the backend /auth/logout then redirects to /login.
 * The Sign Out sidebar link should POST here, not navigate directly.
 */
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

  try {
    await fetch(`${apiBase}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Cookie: request.headers.get('cookie') ?? '',
      },
    });
  } catch {
    // Best-effort — even if the API call fails, clear the session client-side
  }

  // Redirect to login — the API's HttpOnly cookie will be cleared by the
  // backend's Set-Cookie: nx_session=; Max-Age=0 response
  const response = NextResponse.redirect(new URL('/login', request.url));
  // Belt-and-suspenders: also clear the cookie on the Next.js side
  response.cookies.delete('nx_session');
  return response;
}

/** GET redirects to login (for direct browser navigation to /auth/signout) */
export async function GET(request: Request) {
  return NextResponse.redirect(new URL('/login', request.url));
}
