import { pool } from '@/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await pool.query('SELECT 1')
    return NextResponse.json({ status: 'ok' })
  } catch {
    return NextResponse.json({ status: 'error', detail: 'DB nicht erreichbar' }, { status: 503 })
  }
}
