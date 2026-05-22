import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PATHS = ['/dashboard', '/interview', '/api/interview'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Use getClaims() to verify the JWT signature locally without a network
  // round-trip to Supabase. This avoids MIDDLEWARE_INVOCATION_TIMEOUT on Vercel
  // Edge while still rejecting forged session cookies (unlike getSession()).
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = !!data?.claims;

  const isProtected = PROTECTED_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (isProtected && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  const isAuthPage =
    request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup';
  if (isAuthPage && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/dashboard/:path*', '/interview/:path*', '/api/interview/:path*', '/login', '/signup'],
};
