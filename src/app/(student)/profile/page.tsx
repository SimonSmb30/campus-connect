import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/db'
import { events, users, bookmarks, universities } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import ProfileClient from '../profile-client'

export default async function ProfilePage() {
  const session = await getSession()
  if (!session || session.role !== 'student') redirect('/login')

  // User + Uni laden
  const [user] = await db.select().from(users).where(eq(users.id, session.sub))
  const [uni] = await db.select().from(universities).where(eq(universities.id, session.universityId))
  if (!user) redirect('/login')

  // Eigene Events
  const allMyEvents = await db
    .select()
    .from(events)
    .where(eq(events.authorId, session.sub))
    .orderBy(desc(events.createdAt))

  // Gespeicherte Events (Bookmarks)
  const userBookmarks = await db.select().from(bookmarks).where(eq(bookmarks.userId, session.sub))
  const bookmarkSet = new Set(userBookmarks.map(b => b.eventId))

  const allUniEvents = bookmarkSet.size > 0
    ? await db.select().from(events).where(eq(events.universityId, session.universityId))
    : []

  // Autoren-Namen
  const allAuthors = await db.select({ id: users.id, name: users.name }).from(users)
  const authorMap = Object.fromEntries(allAuthors.map(a => [a.id, a.name]))

  const activeEvents = allMyEvents
    .filter(e => !e.isArchived && !e.isDeleted)
    .map(e => ({ ...e, authorName: authorMap[e.authorId] ?? '' }))

  const archivedEvents = allMyEvents
    .filter(e => e.isArchived && !e.isDeleted)
    .map(e => ({ ...e, authorName: authorMap[e.authorId] ?? '' }))

  const savedEvents = allUniEvents
    .filter(e => bookmarkSet.has(e.id) && !e.isDeleted && !e.isHidden && !e.isArchived)
    .map(e => ({ ...e, authorName: authorMap[e.authorId] ?? '' }))

  const initialUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    universityName: uni?.name ?? '',
    initials: user.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase(),
  }

  return (
    <ProfileClient
      initialUser={initialUser}
      initialActive={activeEvents}
      initialArchived={archivedEvents}
      initialSaved={savedEvents}
    />
  )
}
