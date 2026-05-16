/**
 * Einmaliger Import aus der lokalen SQLite-Datei nach PostgreSQL.
 *
 * Voraussetzung:
 *   DATABASE_URL=postgres://... npm run db:import-sqlite
 */
import Database from 'better-sqlite3'
import path from 'path'
import { db, pool } from './index'
import {
  bookmarks,
  commentLikes,
  comments,
  events,
  likes,
  moderationLogs,
  universities,
  users,
} from './schema'

type SqliteRow = Record<string, unknown>

const sqlitePath = process.env.SQLITE_IMPORT_PATH
  ? path.resolve(process.env.SQLITE_IMPORT_PATH)
  : path.resolve('./campusconnect.sqlite3')

function bool(value: unknown) {
  return value === true || value === 1
}

function text(value: unknown) {
  return typeof value === 'string' ? value : null
}

async function insertRows<T extends SqliteRow>(
  tableName: string,
  rows: T[],
  insert: (rows: T[]) => Promise<unknown>,
) {
  if (!rows.length) {
    console.log(`${tableName}: 0 Zeilen`)
    return
  }

  await insert(rows)
  console.log(`${tableName}: ${rows.length} Zeilen importiert`)
}

async function main() {
  const sqlite = new Database(sqlitePath, { readonly: true })

  try {
    const uniRows = (sqlite.prepare('SELECT * FROM universities').all() as SqliteRow[]).map(row => ({
      id: String(row.id),
      name: String(row.name),
      emailDomain: String(row.email_domain),
      contactName: String(row.contact_name),
      contactEmail: String(row.contact_email),
      password: String(row.password),
      emailVerified: bool(row.email_verified),
      verifyToken: text(row.verify_token),
      city: text(row.city),
      createdAt: String(row.created_at),
    }))

    const userRows = (sqlite.prepare('SELECT * FROM users').all() as SqliteRow[]).map(row => ({
      id: String(row.id),
      email: String(row.email),
      name: String(row.name),
      password: String(row.password),
      universityId: String(row.university_id),
      blockedPosting: bool(row.blocked_posting),
      blockedCommenting: bool(row.blocked_commenting),
      blockedUntil: text(row.blocked_until),
      banReason: text(row.ban_reason),
      emailVerified: bool(row.email_verified),
      verifyToken: text(row.verify_token),
      createdAt: String(row.created_at),
    }))

    const eventRows = (sqlite.prepare('SELECT * FROM events').all() as SqliteRow[]).map(row => ({
      id: String(row.id),
      title: String(row.title),
      category: String(row.category) as 'Party' | 'Vortrag' | 'Workshop' | 'Angebot' | 'Sport' | 'Ausstellung' | 'Community',
      date: String(row.date),
      startTime: String(row.start_time),
      endTime: text(row.end_time),
      location: String(row.location),
      locationDetail: text(row.location_detail),
      description: text(row.description),
      imageUrl: text(row.image_url),
      sourceNotes: text(row.source_notes),
      isHidden: bool(row.is_hidden),
      hiddenAt: text(row.hidden_at),
      hiddenBy: text(row.hidden_by),
      isArchived: bool(row.is_archived),
      archivedAt: text(row.archived_at),
      isDeleted: bool(row.is_deleted),
      deletedAt: text(row.deleted_at),
      universityId: String(row.university_id),
      authorId: String(row.author_id),
      createdAt: String(row.created_at),
      updatedAt: text(row.updated_at),
      scheduleType: text(row.schedule_type),
      endDate: text(row.end_date),
      recurrenceRule: text(row.recurrence_rule),
      displayText: text(row.display_text),
    }))

    const commentRows = (sqlite.prepare('SELECT * FROM comments').all() as SqliteRow[]).map(row => ({
      id: String(row.id),
      content: String(row.content),
      parentId: text(row.parent_id),
      isHidden: bool(row.is_hidden),
      hiddenAt: text(row.hidden_at),
      hiddenBy: text(row.hidden_by),
      isDeleted: bool(row.is_deleted),
      deletedAt: text(row.deleted_at),
      eventId: String(row.event_id),
      authorId: String(row.author_id),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }))

    const likeRows = (sqlite.prepare('SELECT * FROM likes').all() as SqliteRow[]).map(row => ({
      id: String(row.id),
      eventId: String(row.event_id),
      userId: String(row.user_id),
      createdAt: String(row.created_at),
    }))

    const bookmarkRows = (sqlite.prepare('SELECT * FROM bookmarks').all() as SqliteRow[]).map(row => ({
      id: String(row.id),
      eventId: String(row.event_id),
      userId: String(row.user_id),
      createdAt: String(row.created_at),
    }))

    const commentLikeRows = (sqlite.prepare('SELECT * FROM comment_likes').all() as SqliteRow[]).map(row => ({
      id: String(row.id),
      commentId: String(row.comment_id),
      userId: String(row.user_id),
      createdAt: String(row.created_at),
    }))

    const moderationRows = (sqlite.prepare('SELECT * FROM moderation_logs').all() as SqliteRow[]).map(row => ({
      id: String(row.id),
      targetType: String(row.target_type) as 'event' | 'comment' | 'user',
      targetId: String(row.target_id),
      action: String(row.action) as 'hide' | 'unhide' | 'delete' | 'restore' | 'archive' | 'unarchive' | 'block' | 'unblock',
      performedBy: String(row.performed_by),
      reason: text(row.reason),
      createdAt: String(row.created_at),
    }))

    await insertRows('universities', uniRows, rows => db.insert(universities).values(rows).onConflictDoNothing())
    await insertRows('users', userRows, rows => db.insert(users).values(rows).onConflictDoNothing())
    await insertRows('events', eventRows, rows => db.insert(events).values(rows).onConflictDoNothing())
    await insertRows('comments', commentRows, rows => db.insert(comments).values(rows).onConflictDoNothing())
    await insertRows('likes', likeRows, rows => db.insert(likes).values(rows).onConflictDoNothing())
    await insertRows('bookmarks', bookmarkRows, rows => db.insert(bookmarks).values(rows).onConflictDoNothing())
    await insertRows('comment_likes', commentLikeRows, rows => db.insert(commentLikes).values(rows).onConflictDoNothing())
    await insertRows('moderation_logs', moderationRows, rows => db.insert(moderationLogs).values(rows).onConflictDoNothing())
  } finally {
    sqlite.close()
  }
}

main()
  .catch(err => {
    console.error('SQLite-Import fehlgeschlagen:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
