import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME
const globalForPg = globalThis as unknown as { campusConnectPool?: Pool }

export const pool = globalForPg.campusConnectPool ?? new Pool({
  ...(instanceConnectionName
    ? {
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        host: `/cloudsql/${instanceConnectionName}`,
      }
    : {
        connectionString:
          process.env.DATABASE_URL ??
          'postgres://postgres:postgres@localhost:5432/campusconnect',
      }),
  // Cloud Run: wenige Verbindungen pro Instanz, schnell freigeben bei Scale-to-Zero
  max: 2,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

if (process.env.NODE_ENV !== 'production') {
  globalForPg.campusConnectPool = pool
}

// Verbindungen beim Herunterfahren sauber schließen (Cloud Run SIGTERM)
if (process.env.NODE_ENV === 'production') {
  process.on('SIGTERM', () => { pool.end().catch(console.error) })
}

export const db = drizzle(pool, { schema })
