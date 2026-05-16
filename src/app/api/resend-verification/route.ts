import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/db'
import { universities, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { sendStudentVerifyEmail, sendAdminWelcomeEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const { email, type } = await req.json()

    if (!email || !['student', 'admin'].includes(type)) {
      return NextResponse.json({ ok: false, error: 'Ungültige Anfrage.' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Max. 3 Versuche pro E-Mail in 10 Minuten
    const { allowed } = checkRateLimit(`resend:${normalizedEmail}`, 3, 10 * 60 * 1000)
    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: 'Zu viele Versuche. Bitte in 10 Minuten erneut versuchen.' },
        { status: 429 }
      )
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const newToken = crypto.randomBytes(32).toString('hex')

    if (type === 'student') {
      const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail))
      if (!user) return NextResponse.json({ ok: false, error: 'Kein Konto gefunden.' }, { status: 404 })
      if (user.emailVerified) return NextResponse.json({ ok: false, error: 'E-Mail ist bereits bestätigt.' }, { status: 400 })

      await db.update(users).set({ verifyToken: newToken }).where(eq(users.id, user.id))
      const verifyUrl = `${baseUrl}/api/verify?token=${newToken}&type=student&id=${user.id}`
      await sendStudentVerifyEmail({ to: normalizedEmail, name: user.name, verifyUrl })
    } else {
      const [uni] = await db.select().from(universities).where(eq(universities.contactEmail, normalizedEmail))
      if (!uni) return NextResponse.json({ ok: false, error: 'Kein Konto gefunden.' }, { status: 404 })
      if (uni.emailVerified) return NextResponse.json({ ok: false, error: 'E-Mail ist bereits bestätigt.' }, { status: 400 })

      await db.update(universities).set({ verifyToken: newToken }).where(eq(universities.id, uni.id))
      const verifyUrl = `${baseUrl}/api/verify?token=${newToken}&type=admin&id=${uni.id}`
      await sendAdminWelcomeEmail({ to: normalizedEmail, name: uni.contactName, university: uni.name, verifyUrl })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Resend verification error:', err)
    return NextResponse.json({ ok: false, error: 'Serverfehler.' }, { status: 500 })
  }
}
