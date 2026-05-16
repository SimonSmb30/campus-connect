import { boolean, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const universities = pgTable('universities', {
  id:            text('id').primaryKey(),
  name:          text('name').notNull(),
  emailDomain:   text('email_domain').notNull().unique(),
  contactName:   text('contact_name').notNull(),
  contactEmail:  text('contact_email').notNull().unique(),
  password:      text('password').notNull(),
  emailVerified: boolean('email_verified').notNull().default(false),
  verifyToken:   text('verify_token'),
  city:          text('city'),
  createdAt:     timestamp('created_at', { mode: 'string' }).notNull().default(sql`now()`),
})

export const users = pgTable('users', {
  id:                 text('id').primaryKey(),
  email:              text('email').notNull().unique(),
  name:               text('name').notNull(),
  password:           text('password').notNull(),
  universityId:       text('university_id').notNull().references(() => universities.id),
  blockedPosting:     boolean('blocked_posting').notNull().default(false),
  blockedCommenting:  boolean('blocked_commenting').notNull().default(false),
  blockedUntil:       text('blocked_until'),       // ISO timestamp; NULL = permanent
  banReason:          text('ban_reason'),
  emailVerified:      boolean('email_verified').notNull().default(false),
  verifyToken:        text('verify_token'),
  createdAt:          timestamp('created_at', { mode: 'string' }).notNull().default(sql`now()`),
})

export const events = pgTable('events', {
  id:          text('id').primaryKey(),
  title:       text('title').notNull(),
  category:    text('category', {
    enum: ['Party', 'Vortrag', 'Workshop', 'Angebot', 'Sport', 'Ausstellung', 'Community'],
  }).notNull(),
  date:        text('date').notNull(),
  startTime:   text('start_time').notNull(),
  endTime:     text('end_time'),
  location:       text('location').notNull(),
  locationDetail: text('location_detail'),    // Raum, Gebäudeteil, interne Ortsangabe
  description: text('description'),
  imageUrl:    text('image_url'),
  sourceNotes: text('source_notes'),
  isHidden:    boolean('is_hidden').notNull().default(false),
  hiddenAt:    text('hidden_at'),
  hiddenBy:    text('hidden_by').references(() => universities.id),
  isArchived:  boolean('is_archived').notNull().default(false),
  archivedAt:  text('archived_at'),
  isDeleted:   boolean('is_deleted').notNull().default(false),
  deletedAt:   text('deleted_at'),
  universityId: text('university_id').notNull().references(() => universities.id),
  authorId:    text('author_id').notNull().references(() => users.id),
  createdAt:   timestamp('created_at', { mode: 'string' }).notNull().default(sql`now()`),
  updatedAt:      text('updated_at'),
  scheduleType:   text('schedule_type'),      // 'single' | 'multi_day' | 'recurring' | 'ongoing'
  endDate:        text('end_date'),           // ISO YYYY-MM-DD – letzter Tag bei multi_day
  recurrenceRule: text('recurrence_rule'),    // JSON: { type:'weekly', days:[0-6], until?:'YYYY-MM-DD' }
  displayText:    text('display_text'),       // Vorgespeicherter Anzeigetext für Feed-Karte
})

export const comments = pgTable('comments', {
  id:         text('id').primaryKey(),
  content:    text('content').notNull(),
  parentId:   text('parent_id'),               // NULL = Top-Level; gesetzt = Reply
  isHidden:   boolean('is_hidden').notNull().default(false),
  hiddenAt:   text('hidden_at'),
  hiddenBy:   text('hidden_by').references(() => universities.id),
  isDeleted:  boolean('is_deleted').notNull().default(false),
  deletedAt:  text('deleted_at'),
  eventId:    text('event_id').notNull().references(() => events.id),
  authorId:   text('author_id').notNull().references(() => users.id),
  createdAt:  timestamp('created_at', { mode: 'string' }).notNull().default(sql`now()`),
  updatedAt:  timestamp('updated_at', { mode: 'string' }).notNull().default(sql`now()`),
})

export const likes = pgTable('likes', {
  id:        text('id').primaryKey(),
  eventId:   text('event_id').notNull().references(() => events.id),
  userId:    text('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().default(sql`now()`),
}, table => ({
  eventUserUnique: unique().on(table.eventId, table.userId),
}))

export const bookmarks = pgTable('bookmarks', {
  id:        text('id').primaryKey(),
  eventId:   text('event_id').notNull().references(() => events.id),
  userId:    text('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().default(sql`now()`),
}, table => ({
  eventUserUnique: unique().on(table.eventId, table.userId),
}))

export const commentLikes = pgTable('comment_likes', {
  id:        text('id').primaryKey(),
  commentId: text('comment_id').notNull().references(() => comments.id),
  userId:    text('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().default(sql`now()`),
}, table => ({
  commentUserUnique: unique().on(table.commentId, table.userId),
}))

export const moderationLogs = pgTable('moderation_logs', {
  id:          text('id').primaryKey(),
  targetType:  text('target_type', { enum: ['event', 'comment', 'user'] }).notNull(),
  targetId:    text('target_id').notNull(),
  action:      text('action', {
    enum: ['hide', 'unhide', 'delete', 'restore', 'archive', 'unarchive', 'block', 'unblock'],
  }).notNull(),
  performedBy: text('performed_by').notNull().references(() => universities.id),
  reason:      text('reason'),
  createdAt:   timestamp('created_at', { mode: 'string' }).notNull().default(sql`now()`),
})
