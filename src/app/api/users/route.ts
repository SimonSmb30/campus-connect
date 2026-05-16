import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { db } from '@/db'
import { universities, users, moderationLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { sendStudentVerifyEmail } from '@/lib/email'
import { getSessionFromRequest } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

// GET /api/users  → Alle Nutzer der Hochschule (Admin)
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Keine Berechtigung.' }, { status: 403 })
  }

  const all = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      blockedPosting: users.blockedPosting,
      blockedCommenting: users.blockedCommenting,
      blockedUntil: users.blockedUntil,
      banReason: users.banReason,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.universityId, session.universityId))

  return NextResponse.json({ ok: true, users: all })
}

// POST /api/users  → Studierenden registrieren
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
    const { name, email, password } = body

    if (!name || !email || !password) {
      return NextResponse.json({ ok: false, error: 'Alle Felder sind erforderlich.' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const domain = normalizedEmail.split('@')[1]

    if (!domain) {
      return NextResponse.json({ ok: false, error: 'Ungültige E-Mail-Adresse.' }, { status: 400 })
    }

    // Hochschule anhand Domain finden
    const [university] = await db.select().from(universities).where(eq(universities.emailDomain, domain))
    if (!university) {
      return NextResponse.json(
        { ok: false, error: 'Deine Hochschule ist noch nicht bei CampusConnect registriert.' },
        { status: 404 }
      )
    }

    // Doppelte E-Mail prüfen
    const [existing] = await db.select().from(users).where(eq(users.email, normalizedEmail))
    if (existing) {
      return NextResponse.json({ ok: false, error: 'Diese E-Mail-Adresse wird bereits verwendet.' }, { status: 409 })
    }

    const id = crypto.randomUUID()
    const hashedPassword = await bcrypt.hash(password, 12)
    const verifyToken = crypto.randomBytes(32).toString('hex')

    await db.insert(users).values({
      id,
      email: normalizedEmail,
      name: name.trim(),
      password: hashedPassword,
      universityId: university.id,
      verifyToken,
      emailVerified: false,
    })

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const verifyUrl = `${baseUrl}/api/verify?token=${verifyToken}&type=student&id=${id}`

    try {
      await sendStudentVerifyEmail({ to: normalizedEmail, name: name.trim(), verifyUrl })
      return NextResponse.json({ ok: true, emailSent: true })
    } catch (mailErr) {
      console.error('❌ Mailversand fehlgeschlagen:', mailErr)
      return NextResponse.json({ ok: true, emailSent: false })
    }
  } catch (err) {
    console.error('User register error:', err)
    return NextResponse.json({ ok: false, error: 'Serverfehler.' }, { status: 500 })
  }
}

// PATCH /api/users  → Nutzer sperren/entsperren (Admin)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Keine Berechtigung.' }, { status: 403 })
    }

    const { userId, blockedPosting, blockedCommenting, blockedUntil, banReason } = await req.json()

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'userId fehlt.' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (blockedPosting !== undefined) updates.blockedPosting = blockedPosting
    if (blockedCommenting !== undefined) updates.blockedCommenting = blockedCommenting
    if (blockedUntil !== undefined) updates.blockedUntil = blockedUntil   // ISO string or null
    if (banReason !== undefined) updates.banReason = banReason

    await db.update(users).set(updates).where(eq(users.id, userId))

    // Moderation-Log
    const isBlocking = blockedPosting === true || blockedCommenting === true
    const isUnblocking = blockedPosting === false && blockedCommenting === false
    if (isBlocking || isUnblocking) {
      await db.insert(moderationLogs).values({
        id: crypto.randomUUID(),
        targetType: 'user',
        targetId: userId,
        action: isUnblocking ? 'unblock' : 'block',
        performedBy: session.universityId,
        reason: banReason ?? null,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('User patch error:', err)
    return NextResponse.json({ ok: false, error: 'Serverfehler.' }, { status: 500 })
  }
}
