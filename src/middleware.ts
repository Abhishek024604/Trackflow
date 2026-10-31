import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ['/auth/signin', '/auth/signup', '/api/auth'];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // If accessing a public path while authenticated, redirect to dashboard
  if (isPublicPath && session?.user?.id && !pathname.startsWith('/api/auth')) {
    if (pathname === '/auth/signin' || pathname === '/auth/signup') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Protect dashboard and team routes
  const protectedPaths = ['/dashboard', '/teams'];
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtectedPath && !session?.user?.id) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};