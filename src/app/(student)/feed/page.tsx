import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/db'
import { events, users, likes, bookmarks, comments } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import FeedClient from './feed-client'

export default async function FeedPage() {
  const session = await getSession()
  if (!session || session.role !== 'student') redirect('/login')

  // Events der eigenen Hochschule laden (server-seitig, kein JS nötig)
  const allEvents = await db
    .select()
    .from(events)
    .where(and(eq(events.universityId, session.universityId), eq(events.isHidden, false)))
    .orderBy(desc(events.createdAt))

  // Likes + Bookmarks des eingeloggten Users
  const userLikes = await db.select().from(likes).where(eq(likes.userId, session.sub))
  const userBookmarks = await db.select().from(bookmarks).where(eq(bookmarks.userId, session.sub))
  const likedSet = new Set(userLikes.map(l => l.eventId))
  const bookmarkSet = new Set(userBookmarks.map(b => b.eventId))

  // Likes-Anzahl pro Event
  const allLikes = await db.select().from(likes)
  const likesCount: Record<string, number> = {}
  for (const l of allLikes) {
    likesCount[l.eventId] = (likesCount[l.eventId] ?? 0) + 1
  }

  // Kommentar-Anzahl pro Event
  const allComments = await db.select().from(comments)
  const commentsCount: Record<string, number> = {}
  for (const c of allComments) {
    commentsCount[c.eventId] = (commentsCount[c.eventId] ?? 0) + 1
  }

  // Autoren-Namen
  const allAuthors = await db.select({ id: users.id, name: users.name }).from(users)
  const authorMap = Object.fromEntries(allAuthors.map(a => [a.id, a.name]))

  const initialEvents = allEvents.map(e => ({
    ...e,
    authorName: authorMap[e.authorId] ?? 'Unbekannt',
    liked: likedSet.has(e.id),
    bookmarked: bookmarkSet.has(e.id),
    likesCount: likesCount[e.id] ?? 0,
    commentsCount: commentsCount[e.id] ?? 0,
  }))

  return <FeedClient initialEvents={initialEvents} />
}
