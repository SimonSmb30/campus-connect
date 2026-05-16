import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/db'
import { comments, events, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getSessionFromRequest } from '@/lib/auth'

// POST /api/comments  → Kommentar / Reply erstellen
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session || session.role !== 'student') {
      return NextResponse.json({ ok: false, error: 'Keine Berechtigung.' }, { status: 403 })
    }

    // Kommentarsperre prüfen
    const [userRow] = await db.select().from(users).where(eq(users.id, session.sub))
    if (userRow?.blockedCommenting) {
      return NextResponse.json(
        { ok: false, error: 'Du kannst derzeit keine Kommentare schreiben.' },
        { status: 403 },
      )
    }

    const { eventId, content, parentId } = await req.json()

    if (!eventId || !content?.trim()) {
      return NextResponse.json({ ok: false, error: 'Kommentar darf nicht leer sein.' }, { status: 400 })
    }

    // Event prüfen
    const [event] = await db.select().from(events).where(eq(events.id, eventId))
    if (!event || event.universityId !== session.universityId) {
      return NextResponse.json({ ok: false, error: 'Event nicht gefunden.' }, { status: 404 })
    }

    // Parent-Kommentar prüfen (falls Reply)
    if (parentId) {
      const [parent] = await db.select().from(comments).where(eq(comments.id, parentId))
      if (!parent || parent.eventId !== eventId) {
        return NextResponse.json({ ok: false, error: 'Parent-Kommentar nicht gefunden.' }, { status: 404 })
      }
    }

    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await db.insert(comments).values({
      id,
      content: content.trim(),
      parentId: parentId ?? null,
      eventId,
      authorId: session.sub,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({
      ok: true,
      comment: {
        id,
        content: content.trim(),
        parentId: parentId ?? null,
        eventId,
        authorId: session.sub,
        authorName: userRow?.name ?? 'Unbekannt',
        isHidden: false,
        isDeleted: false,
        likesCount: 0,
        liked: false,
        createdAt: now,
        updatedAt: now,
      },
    })
  } catch (err) {
    console.error('POST comment error:', err)
    return NextResponse.json({ ok: false, error: 'Serverfehler.' }, { status: 500 })
  }
}

// PATCH /api/comments
// Admin:   ausblenden / einblenden
// Student: eigenen Kommentar bearbeiten oder löschen
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Nicht eingeloggt.' }, { status: 401 })
    }

    const body = await req.json()
    const { commentId } = body

    if (!commentId) {
      return NextResponse.json({ ok: false, error: 'commentId fehlt.' }, { status: 400 })
    }

    const [comment] = await db.select().from(comments).where(eq(comments.id, commentId))
    if (!comment) {
      return NextResponse.json({ ok: false, error: 'Kommentar nicht gefunden.' }, { status: 404 })
    }

    const now = new Date().toISOString()

    // ── Admin: ausblenden / einblenden ──────────────────────────────────────────
    if (session.role === 'admin') {
      if (body.isHidden !== undefined) {
        await db.update(comments)
          .set({
            isHidden: body.isHidden,
            hiddenAt: body.isHidden ? now : null,
            hiddenBy: body.isHidden ? session.universityId : null,
            updatedAt: now,
          })
          .where(eq(comments.id, commentId))
      }
      return NextResponse.json({ ok: true })
    }

    // ── Student: nur eigene Kommentare ─────────────────────────────────────────
    if (comment.authorId !== session.sub) {
      return NextResponse.json({ ok: false, error: 'Keine Berechtigung.' }, { status: 403 })
    }

    // Löschen
    if (body.isDeleted !== undefined) {
      await db.update(comments)
        .set({
          isDeleted: body.isDeleted,
          deletedAt: body.isDeleted ? now : null,
          updatedAt: now,
        })
        .where(eq(comments.id, commentId))
      return NextResponse.json({ ok: true })
    }

    // Bearbeiten
    if (body.content !== undefined) {
      if (!body.content.trim()) {
        return NextResponse.json({ ok: false, error: 'Kommentar darf nicht leer sein.' }, { status: 400 })
      }
      await db.update(comments)
        .set({ content: body.content.trim(), updatedAt: now })
        .where(eq(comments.id, commentId))
      return NextResponse.json({ ok: true, content: body.content.trim() })
    }

    return NextResponse.json({ ok: false, error: 'Keine gültige Aktion.' }, { status: 400 })

  } catch (err) {
    console.error('PATCH comment error:', err)
    return NextResponse.json({ ok: false, error: 'Serverfehler.' }, { status: 500 })
  }
}
