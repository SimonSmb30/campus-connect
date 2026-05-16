import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth'

export async function GET() {
  const res = NextResponse.redirect(
    new URL('/login', process.env.NEXTAUTH_URL ?? 'http://localhost:3000')
  )
  res.cookies.set(clearSessionCookie())
  return res
}
