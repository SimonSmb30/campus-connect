import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/db'
import { likes, bookmarks, events } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getSessionFromRequest } from '@/lib/auth'

// POST /api/likes  → Like togglen
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session || session.role !== 'student') {
      return NextResponse.json({ ok: false, error: 'Keine Berechtigung.' }, { status: 403 })
    }

    const { eventId, type } = await req.json() // type: 'like' | 'bookmark'

    if (!eventId) {
      return NextResponse.json({ ok: false, error: 'eventId fehlt.' }, { status: 400 })
    }

    const table = type === 'bookmark' ? bookmarks : likes
    const [existing] = await db
      .select()
      .from(table)
      .where(and(eq(table.eventId, eventId), eq(table.userId, session.sub)))

    if (existing) {
      await db.delete(table).where(eq(table.id, existing.id))
      return NextResponse.json({ ok: true, action: 'removed' })
    } else {
      await db.insert(table).values({
        id: crypto.randomUUID(),
        eventId,
        userId: session.sub,
        createdAt: new Date().toISOString(),
      })
      return NextResponse.json({ ok: true, action: 'added' })
    }
  } catch (err) {
    console.error('POST likes error:', err)
    return NextResponse.json({ ok: false, error: 'Serverfehler.' }, { status: 500 })
  }
}
