import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  ...(process.env.INSTANCE_CONNECTION_NAME
    ? {
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
      }
    : {
        connectionString:
          process.env.DATABASE_URL ??
          'postgres://postgres:postgres@localhost:5432/campusconnect',
      }),
  connectionTimeoutMillis: 10_000,
})

// Verbindung testen bevor Migration läuft
try {
  await pool.query('SELECT 1')
  console.log('Datenbankverbindung erfolgreich.')
} catch (err) {
  console.error('Datenbankverbindung fehlgeschlagen:', err.message)
  process.exit(1)
}

await pool.query(`
  CREATE TABLE IF NOT EXISTS universities (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    email_domain   TEXT NOT NULL UNIQUE,
    contact_name   TEXT NOT NULL,
    contact_email  TEXT NOT NULL UNIQUE,
    password       TEXT NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verify_token   TEXT,
    city           TEXT,
    created_at     TIMESTAMP NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS users (
    id                  TEXT PRIMARY KEY,
    email               TEXT NOT NULL UNIQUE,
    name                TEXT NOT NULL,
    password            TEXT NOT NULL,
    university_id       TEXT NOT NULL REFERENCES universities(id),
    blocked_posting     BOOLEAN NOT NULL DEFAULT FALSE,
    blocked_commenting  BOOLEAN NOT NULL DEFAULT FALSE,
    blocked_until       TEXT,
    ban_reason          TEXT,
    email_verified      BOOLEAN NOT NULL DEFAULT FALSE,
    verify_token        TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS events (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    category        TEXT NOT NULL,
    date            TEXT NOT NULL,
    start_time      TEXT NOT NULL,
    end_time        TEXT,
    location        TEXT NOT NULL,
    location_detail TEXT,
    description     TEXT,
    image_url       TEXT,
    source_notes    TEXT,
    is_hidden       BOOLEAN NOT NULL DEFAULT FALSE,
    hidden_at       TEXT,
    hidden_by       TEXT REFERENCES universities(id),
    is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at     TEXT,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TEXT,
    university_id   TEXT NOT NULL REFERENCES universities(id),
    author_id       TEXT NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TEXT,
    schedule_type   TEXT,
    end_date        TEXT,
    recurrence_rule TEXT,
    display_text    TEXT
  );

  CREATE TABLE IF NOT EXISTS comments (
    id          TEXT PRIMARY KEY,
    content     TEXT NOT NULL,
    parent_id   TEXT,
    is_hidden   BOOLEAN NOT NULL DEFAULT FALSE,
    hidden_at   TEXT,
    hidden_by   TEXT REFERENCES universities(id),
    is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at  TEXT,
    event_id    TEXT NOT NULL REFERENCES events(id),
    author_id   TEXT NOT NULL REFERENCES users(id),
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS likes (
    id          TEXT PRIMARY KEY,
    event_id    TEXT NOT NULL REFERENCES events(id),
    user_id     TEXT NOT NULL REFERENCES users(id),
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(event_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    id          TEXT PRIMARY KEY,
    event_id    TEXT NOT NULL REFERENCES events(id),
    user_id     TEXT NOT NULL REFERENCES users(id),
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(event_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS comment_likes (
    id          TEXT PRIMARY KEY,
    comment_id  TEXT NOT NULL REFERENCES comments(id),
    user_id     TEXT NOT NULL REFERENCES users(id),
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(comment_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS moderation_logs (
    id            TEXT PRIMARY KEY,
    target_type   TEXT NOT NULL CHECK(target_type IN ('event','comment','user')),
    target_id     TEXT NOT NULL,
    action        TEXT NOT NULL CHECK(action IN ('hide','unhide','delete','restore','archive','unarchive','block','unblock')),
    performed_by  TEXT NOT NULL REFERENCES universities(id),
    reason        TEXT,
    created_at    TIMESTAMP NOT NULL DEFAULT now()
  );
`)

console.log('Migration abgeschlossen.')
await pool.end()
