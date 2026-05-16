import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { db } from '@/db'
import { universities } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { sendAdminWelcomeEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'

// POST /api/universities  → Hochschule registrieren (Admin)
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
    const { allowed } = checkRateLimit(`register:${ip}`, 10, 60 * 60 * 1000)
    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: 'Zu viele Registrierungsversuche. Bitte in einer Stunde erneut versuchen.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { universityName, emailDomain, contactName, contactEmail, password, city } = body

    if (!universityName || !emailDomain || !contactName || !contactEmail || !password) {
      return NextResponse.json({ ok: false, error: 'Alle Felder sind erforderlich.' }, { status: 400 })
    }

    const normalizedEmail = contactEmail.trim().toLowerCase()
    const normalizedDomain = emailDomain.trim().toLowerCase().replace(/^@/, '')

    // Domain schon vergeben?
    const [existingDomain] = await db.select().from(universities).where(eq(universities.emailDomain, normalizedDomain))
    if (existingDomain) {
      return NextResponse.json({ ok: false, error: 'Diese E-Mail-Domain ist bereits registriert.' }, { status: 409 })
    }

    // E-Mail schon vergeben?
    const [existingEmail] = await db.select().from(universities).where(eq(universities.contactEmail, normalizedEmail))
    if (existingEmail) {
      return NextResponse.json({ ok: false, error: 'Diese E-Mail-Adresse wird bereits verwendet.' }, { status: 409 })
    }

    const id = crypto.randomUUID()
    const hashedPassword = await bcrypt.hash(password, 12)
    const verifyToken = crypto.randomBytes(32).toString('hex')

    await db.insert(universities).values({
      id,
      name: universityName.trim(),
      emailDomain: normalizedDomain,
      contactName: contactName.trim(),
      contactEmail: normalizedEmail,
      password: hashedPassword,
      emailVerified: false,
      verifyToken,
      city: city?.trim() ?? null,
    })

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const verifyUrl = `${baseUrl}/api/verify?token=${verifyToken}&type=admin&id=${id}`

    try {
      await sendAdminWelcomeEmail({
        to: normalizedEmail,
        name: contactName.trim(),
        university: universityName.trim(),
        verifyUrl,
      })
      return NextResponse.json({ ok: true, emailSent: true })
    } catch (mailErr) {
      console.error('❌ Mailversand fehlgeschlagen:', mailErr)
      return NextResponse.json({ ok: true, emailSent: false })
    }
  } catch (err) {
    console.error('University register error:', err)
    return NextResponse.json({ ok: false, error: 'Serverfehler.' }, { status: 500 })
  }
}

// GET /api/universities  → Alle Hochschulen (für Domain-Check)
export async function GET() {
  const all = await db.select({
    id: universities.id,
    name: universities.name,
    emailDomain: universities.emailDomain,
  }).from(universities)

  return NextResponse.json({ ok: true, universities: all })
}
