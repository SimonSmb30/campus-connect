import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { db } from '@/db'
import { users, universities } from '@/db/schema'
import { eq } from 'drizzle-orm'

// GET /api/me  → aktuelle Session + Profildaten
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Nicht eingeloggt.' }, { status: 401 })
  }

  if (session.role === 'admin') {
    const [uni] = await db.select().from(universities).where(eq(universities.id, session.universityId))
    return NextResponse.json({
      ok: true,
      user: {
        id: session.sub,
        name: session.name,
        email: session.email,
        role: 'admin',
        universityId: session.universityId,
        universityName: uni?.name ?? '',
        initials: session.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase(),
      },
    })
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.sub))
  const [uni] = await db.select().from(universities).where(eq(universities.id, session.universityId))

  return NextResponse.json({
    ok: true,
    user: {
      id: session.sub,
      name: session.name,
      email: session.email,
      role: 'student',
      universityId: session.universityId,
      universityName: uni?.name ?? '',
      initials: session.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase(),
      blockedPosting: user?.blockedPosting ?? false,
      blockedCommenting: user?.blockedCommenting ?? false,
    },
  })
}
