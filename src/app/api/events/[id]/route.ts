import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/db'
import { events, comments, users, likes, bookmarks, commentLikes, moderationLogs } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { getSessionFromRequest } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

async function writeModerationLog(
  targetType: 'event' | 'comment' | 'user',
  targetId: string,
  action: 'hide' | 'unhide' | 'delete' | 'restore' | 'archive' | 'unarchive' | 'block' | 'unblock',
  performedBy: string,
  reason?: string,
) {
  await db.insert(moderationLogs).values({
    id: crypto.randomUUID(),
    targetType,
    targetId,
    action,
    performedBy,
    reason: reason ?? null,
  })
}

// GET /api/events/[id]  → Event-Detail inkl. Kommentare mit Likes
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Nicht eingeloggt.' }, { status: 401 })
    }

    const { id } = await ctx.params
    const [event] = await db.select().from(events).where(eq(events.id, id))

    if (!event || event.universityId !== session.universityId) {
      return NextResponse.json({ ok: false, error: 'Nicht gefunden.' }, { status: 404 })
    }

    // Kommentare laden
    const isAdmin = session.role === 'admin'
    const allComments = await db
      .select()
      .from(comments)
      .where(eq(comments.eventId, id))
      .orderBy(desc(comments.createdAt))

    // Autoren
    const authors = await db.select({ id: users.id, name: users.name }).from(users)
    const authorMap = Object.fromEntries(authors.map(a => [a.id, a.name]))

    // Kommentar-Likes für diesen Event
    const allCommentLikes = await db.select().from(commentLikes)
    const commentLikesMap: Record<string, number> = {}
    const commentLikedByMe: Record<string, boolean> = {}
    for (const cl of allCommentLikes) {
      commentLikesMap[cl.commentId] = (commentLikesMap[cl.commentId] ?? 0) + 1
      if (session.role === 'student' && cl.userId === session.sub) {
        commentLikedByMe[cl.commentId] = true
      }
    }

    // Likes-Zahl des Events
    const likesCount = (await db.select().from(likes).where(eq(likes.eventId, id))).length

    // Liked / Bookmarked
    const liked = session.role === 'student'
      ? !!(await db.select().from(likes).where(and(eq(likes.eventId, id), eq(likes.userId, session.sub))))[0]
      : false
    const bookmarked = session.role === 'student'
      ? !!(await db.select().from(bookmarks).where(and(eq(bookmarks.eventId, id), eq(bookmarks.userId, session.sub))))[0]
      : false

    // Kommentare filtern + anreichern
    const enrichedComments = allComments
      .filter(c => {
        if (isAdmin) return true // Admin sieht alles
        if (c.isHidden) return false
        if (c.isDeleted) return false
        return true
      })
      .map(c => ({
        ...c,
        authorName: authorMap[c.authorId] ?? 'Unbekannt',
        likesCount: commentLikesMap[c.id] ?? 0,
        liked: commentLikedByMe[c.id] ?? false,
      }))

    return NextResponse.json({
      ok: true,
      event: {
        ...event,
        authorName: authorMap[event.authorId] ?? 'Unbekannt',
        likesCount,
        liked,
        bookmarked,
        comments: enrichedComments,
      },
    })
  } catch (err) {
    console.error('GET event error:', err)
    return NextResponse.json({ ok: false, error: 'Serverfehler.' }, { status: 500 })
  }
}

// PATCH /api/events/[id]
// Student: bearbeiten / archivieren / löschen (nur eigene Events)
// Admin:   ausblenden / einblenden / wiederherstellen
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Nicht eingeloggt.' }, { status: 401 })
    }

    const { id } = await ctx.params
    const body = await req.json()
    const [event] = await db.select().from(events).where(eq(events.id, id))

    if (!event || event.universityId !== session.universityId) {
      return NextResponse.json({ ok: false, error: 'Nicht gefunden.' }, { status: 404 })
    }

    const now = new Date().toISOString()

    // ── Admin-Aktionen ──────────────────────────────────────────────────────────
    if (session.role === 'admin') {
      const updates: Record<string, unknown> = {}

      if (body.isHidden !== undefined) {
        updates.isHidden = body.isHidden
        updates.hiddenAt = body.isHidden ? now : null
        updates.hiddenBy = body.isHidden ? session.universityId : null
        await writeModerationLog('event', id, body.isHidden ? 'hide' : 'unhide', session.universityId, body.reason)
      }

      // Wiederherstellen (archiviert oder gelöscht)
      if (body.restore === true) {
        updates.isDeleted = false
        updates.deletedAt = null
        updates.isArchived = false
        updates.archivedAt = null
        await writeModerationLog('event', id, 'restore', session.universityId, body.reason)
      }

      await db.update(events).set({ ...updates, updatedAt: now }).where(eq(events.id, id))
      return NextResponse.json({ ok: true })
    }

    // ── Student-Aktionen (nur eigener Post) ────────────────────────────────────
    if (event.authorId !== session.sub) {
      return NextResponse.json({ ok: false, error: 'Keine Berechtigung.' }, { status: 403 })
    }

    const updates: Record<string, unknown> = {}

    // Archivieren / Dearchivieren
    if (body.isArchived !== undefined) {
      updates.isArchived = body.isArchived
      updates.archivedAt = body.isArchived ? now : null
    }

    // Löschen
    if (body.isDeleted !== undefined) {
      updates.isDeleted = body.isDeleted
      updates.deletedAt = body.isDeleted ? now : null
    }

    // Felder bearbeiten
    const editableFields = ['title', 'category', 'date', 'startTime', 'endTime', 'location', 'description'] as const
    for (const field of editableFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: 'Keine Änderungen.' }, { status: 400 })
    }

    await db.update(events).set({ ...updates, updatedAt: now }).where(eq(events.id, id))
    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('PATCH event error:', err)
    return NextResponse.json({ ok: false, error: 'Serverfehler.' }, { status: 500 })
  }
}
