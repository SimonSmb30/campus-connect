import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const q = new URL(req.url).searchParams.get('q') ?? ''
  if (!q || q.length < 3) return NextResponse.json([])

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
      {
        headers: {
          'User-Agent': 'CampusConnect/1.0 (campus-connect-app)',
          'Accept-Language': 'de',
        },
      }
    )
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json([])
  }
}
