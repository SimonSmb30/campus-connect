import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/db'
import { commentLikes } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getSessionFromRequest } from '@/lib/auth'

// POST /api/comment-likes  → Like auf Kommentar togglen
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session || session.role !== 'student') {
      return NextResponse.json({ ok: false, error: 'Keine Berechtigung.' }, { status: 403 })
    }

    const { commentId } = await req.json()
    if (!commentId) {
      return NextResponse.json({ ok: false, error: 'commentId fehlt.' }, { status: 400 })
    }

    const [existing] = await db
      .select()
      .from(commentLikes)
      .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, session.sub)))

    if (existing) {
      await db.delete(commentLikes).where(eq(commentLikes.id, existing.id))
      return NextResponse.json({ ok: true, action: 'removed' })
    } else {
      await db.insert(commentLikes).values({
        id: crypto.randomUUID(),
        commentId,
        userId: session.sub,
      })
      return NextResponse.json({ ok: true, action: 'added' })
    }
  } catch (err) {
    console.error('POST comment-like error:', err)
    return NextResponse.json({ ok: false, error: 'Serverfehler.' }, { status: 500 })
  }
}
