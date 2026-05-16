import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/db'

import { events, users, likes, bookmarks, comments } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { getSessionFromRequest } from '@/lib/auth'
import { generateDisplayText } from '@/lib/event-time'

// GET /api/events  → Feed laden
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Nicht eingeloggt.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const sort = searchParams.get('sort') ?? 'new'

    const mine = searchParams.get('mine') === 'true'
    const includeArchived = searchParams.get('includeArchived') === 'true'
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

    // Events laden – Sichtbarkeitsregeln
    const allEvents = (await db
      .select()
      .from(events)
      .where(eq(events.universityId, session.universityId))
      .orderBy(desc(events.createdAt)))
      .filter(e => {
        if (session.role === 'admin') return true

        // Eigene Events auf Profil-Seite: archivierte/gelöschte einblenden falls gewünscht
        if (mine && e.authorId === session.sub) {
          if (!includeDeleted && e.isDeleted) return false
          if (!includeArchived && e.isArchived) return false
          return true
        }

        // Standard-Feed: nur sichtbare, nicht archivierte, nicht gelöschte
        if (e.isHidden) return false
        if (e.isArchived) return false
        if (e.isDeleted) return false
        return true
      })

    // Likes + Bookmarks des Users laden
    const userLikes = session.role === 'student'
      ? await db.select().from(likes).where(eq(likes.userId, session.sub))
      : []
    const userBookmarks = session.role === 'student'
      ? await db.select().from(bookmarks).where(eq(bookmarks.userId, session.sub))
      : []

    const likedSet = new Set(userLikes.map(l => l.eventId))
    const bookmarkSet = new Set(userBookmarks.map(b => b.eventId))

    // Autoren laden
    const authorIds = [...new Set(allEvents.map(e => e.authorId))]
    const authors = authorIds.length
      ? await db.select({ id: users.id, name: users.name }).from(users)
      : []
    const authorMap = Object.fromEntries(authors.map(a => [a.id, a.name]))

    // Likes-Anzahl (aus likes-Tabelle)
    const allLikes = await db.select().from(likes)
    const likesCount: Record<string, number> = {}
    for (const l of allLikes) {
      likesCount[l.eventId] = (likesCount[l.eventId] ?? 0) + 1
    }

    // Kommentaranzahl (aus comments-Tabelle)
    const allComments = await db.select().from(comments)
    const commentsCount: Record<string, number> = {}
    for (const c of allComments) {
      commentsCount[c.eventId] = (commentsCount[c.eventId] ?? 0) + 1
    }

    let result = allEvents.map(e => ({
      ...e,
      authorName: authorMap[e.authorId] ?? 'Unbekannt',
      liked: likedSet.has(e.id),
      bookmarked: bookmarkSet.has(e.id),
      likesCount: likesCount[e.id] ?? 0,
      commentsCount: commentsCount[e.id] ?? 0,
    }))

    // Kategorie-Filter
    if (category) {
      result = result.filter(e => e.category === category)
    }

    // Sortierung
    if (sort === 'popular') {
      result.sort((a, b) => b.likesCount - a.likesCount)
    } else if (sort === 'saved') {
      result = result.filter(e => e.bookmarked)
    }

    return NextResponse.json({ ok: true, events: result })
  } catch (err) {
    console.error('GET events error:', err)
    return NextResponse.json({ ok: false, error: 'Serverfehler.' }, { status: 500 })
  }
}

// POST /api/events  → Event erstellen
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session || session.role !== 'student') {
      return NextResponse.json({ ok: false, error: 'Keine Berechtigung.' }, { status: 403 })
    }

    const body = await req.json()
    const { title, category, date, startTime, endTime, location, locationDetail, description, imageUrl, sourceNotes, endDate, recurrenceRule, scheduleType } = body

    if (!title || !category) {
      return NextResponse.json({ ok: false, error: 'Titel und Kategorie sind erforderlich.' }, { status: 400 })
    }

    const id = crypto.randomUUID()

    await db.insert(events).values({
      id,
      title: title.trim(),
      category,
      date: date ?? '',
      startTime: startTime ?? '',
      endTime: endTime ?? null,
      location: location?.trim() ?? '',
      locationDetail: locationDetail?.trim() ?? null,
      description: description?.trim() ?? null,
      imageUrl: imageUrl ?? null,
      sourceNotes: sourceNotes ? JSON.stringify(sourceNotes) : null,
      scheduleType: scheduleType ?? 'single',
      endDate: endDate ?? null,
      recurrenceRule: recurrenceRule ?? null,
      displayText: generateDisplayText({ scheduleType: scheduleType ?? 'single', date, endDate, startTime, endTime, recurrenceRule }),
      universityId: session.universityId,
      authorId: session.sub,
    })

    return NextResponse.json({ ok: true, id })
  } catch (err) {
    console.error('POST events error:', err)
    return NextResponse.json({ ok: false, error: 'Serverfehler.' }, { status: 500 })
  }
}
