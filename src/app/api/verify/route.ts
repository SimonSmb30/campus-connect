import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users, universities } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createToken, sessionCookieOptions } from '@/lib/auth'

// GET /api/verify?token=xxx&type=student|admin&id=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (!token || !id) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', req.url))
    }

    // ── Student ─────────────────────────────────────────────────────────────
    if (type === 'student') {
      const [user] = await db.select().from(users).where(eq(users.id, id))

      if (!user || user.verifyToken !== token) {
        return NextResponse.redirect(new URL('/login?error=invalid_token', req.url))
      }

      await db.update(users)
        .set({ emailVerified: true, verifyToken: null })
        .where(eq(users.id, id))

      const sessionToken = await createToken({
        sub: user.id,
        email: user.email,
        role: 'student',
        universityId: user.universityId,
        name: user.name,
      })

      const res = NextResponse.redirect(new URL('/feed', req.url))
      res.cookies.set(sessionCookieOptions(sessionToken))
      return res
    }

    // ── Admin ────────────────────────────────────────────────────────────────
    if (type === 'admin') {
      const [uni] = await db.select().from(universities).where(eq(universities.id, id))

      if (!uni || uni.verifyToken !== token) {
        return NextResponse.redirect(new URL('/login?error=invalid_token', req.url))
      }

      await db.update(universities)
        .set({ emailVerified: true, verifyToken: null })
        .where(eq(universities.id, id))

      const sessionToken = await createToken({
        sub: uni.id,
        email: uni.contactEmail,
        role: 'admin',
        universityId: uni.id,
        name: uni.contactName,
      })

      const res = NextResponse.redirect(new URL('/admin/dashboard', req.url))
      res.cookies.set(sessionCookieOptions(sessionToken))
      return res
    }

    return NextResponse.redirect(new URL('/login?error=invalid_token', req.url))
  } catch (err) {
    console.error('Verify error:', err)
    return NextResponse.redirect(new URL('/login?error=server_error', req.url))
  }
}
