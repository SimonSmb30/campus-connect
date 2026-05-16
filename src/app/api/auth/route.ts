import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/db'
import { universities, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createToken, sessionCookieOptions, clearSessionCookie } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

const AUTH_ERROR = 'E-Mail oder Passwort falsch.'

// POST /api/auth  → Login
export async function POST(req: NextRequest) {
  try {
    // Rate Limiting: max. 5 Versuche pro IP in 15 Minuten
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
    const { allowed } = checkRateLimit(ip)
    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: 'Zu viele Anmeldeversuche. Bitte in 15 Minuten erneut versuchen.' },
        { status: 429 }
      )
    }

    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'E-Mail und Passwort sind erforderlich.' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPassword = password.trim()

    // Erst in Hochschulen suchen (Admin)
    const [admin] = await db.select().from(universities).where(eq(universities.contactEmail, normalizedEmail))

    if (admin) {
      const valid = await bcrypt.compare(normalizedPassword, admin.password)
      if (!valid) {
        return NextResponse.json({ ok: false, error: AUTH_ERROR }, { status: 401 })
      }

      if (!admin.emailVerified) {
        return NextResponse.json({ ok: false, error: 'Bitte bestätige zuerst deine E-Mail.' }, { status: 403 })
      }

      const token = await createToken({
        sub: admin.id,
        email: admin.contactEmail,
        role: 'admin',
        universityId: admin.id,
        name: admin.contactName,
      })

      const res = NextResponse.json({ ok: true, role: 'admin', redirect: '/admin/dashboard' })
      res.cookies.set(sessionCookieOptions(token))
      return res
    }

    // Dann in Studierenden suchen
    const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail))

    // Dummy-Compare wenn kein Account gefunden – verhindert Timing-Angriff zur E-Mail-Enumeration
    if (!user) {
      await bcrypt.compare(normalizedPassword, '$2a$12$dummy.hash.prevents.timing.attack.XXXXXXXXXXXXXXXXXX')
      return NextResponse.json({ ok: false, error: AUTH_ERROR }, { status: 401 })
    }

    const valid = await bcrypt.compare(normalizedPassword, user.password)
    if (!valid) {
      return NextResponse.json({ ok: false, error: AUTH_ERROR }, { status: 401 })
    }

    if (!user.emailVerified) {
      return NextResponse.json({ ok: false, error: 'Bitte bestätige zuerst deine E-Mail.' }, { status: 403 })
    }

    const token = await createToken({
      sub: user.id,
      email: user.email,
      role: 'student',
      universityId: user.universityId,
      name: user.name,
    })

    const res = NextResponse.json({ ok: true, role: 'student', redirect: '/feed' })
    res.cookies.set(sessionCookieOptions(token))
    return res
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ ok: false, error: 'Serverfehler.' }, { status: 500 })
  }
}

// DELETE /api/auth  → Logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(clearSessionCookie())
  return res
}
