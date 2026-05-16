import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'campus-connect-super-secret-key-change-in-production'
)
const COOKIE = 'cc_session'

// Routes that require authentication
const PROTECTED_STUDENT = ['/feed', '/post', '/profile', '/calendar']
const PROTECTED_ADMIN = ['/admin']
const AUTH_ROUTES = ['/login', '/register', '/verify', '/complete-profile-student', '/complete-profile-admin']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const sessionCookie = req.cookies.get(COOKIE)?.value

  // Try to verify the session token
  let session: { role?: string } | null = null
  if (sessionCookie) {
    try {
      const { payload } = await jwtVerify(sessionCookie, SECRET)
      session = payload as { role?: string }
    } catch {
      session = null
    }
  }

  const isLoggedIn = !!session
  const isStudent = session?.role === 'student'
  const isAdmin = session?.role === 'admin'

  // If user is logged in and tries to access auth pages → redirect to their dashboard
  if (isLoggedIn && AUTH_ROUTES.some(r => pathname.startsWith(r))) {
    const redirect = isAdmin ? '/admin/dashboard' : '/feed'
    return NextResponse.redirect(new URL(redirect, req.url))
  }

  // Student-only routes
  if (PROTECTED_STUDENT.some(r => pathname.startsWith(r))) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    if (!isStudent) {
      // Admin trying to access student route
      return NextResponse.redirect(new URL('/admin/dashboard', req.url))
    }
  }

  // Admin-only routes
  if (PROTECTED_ADMIN.some(r => pathname.startsWith(r))) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    if (!isAdmin) {
      // Student trying to access admin route
      return NextResponse.redirect(new URL('/feed', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next (Next.js internals)
     * - api routes (handled by their own auth checks)
     * - static files (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
