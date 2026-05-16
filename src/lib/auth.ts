import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET
  if (!s) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET Umgebungsvariable fehlt – App-Start in Production abgebrochen')
    }
    console.warn('[auth] JWT_SECRET nicht gesetzt – Fallback nur für lokale Entwicklung!')
  }
  return new TextEncoder().encode(s ?? 'campus-connect-super-secret-key-change-in-production')
}
const COOKIE = 'cc_session'

export type SessionPayload = {
  sub: string       // user or university id
  email: string
  role: 'student' | 'admin'
  universityId: string
  name: string
}

// ── Token erstellen ────────────────────────────────────────────────────────────
export async function createToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

// ── Token verifizieren ────────────────────────────────────────────────────────
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

// ── Session aus Cookie lesen (Server Component / Route Handler) ───────────────
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

// ── Session aus Request lesen (Middleware-freundlich) ────────────────────────
export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

// ── Session-Cookie setzen ────────────────────────────────────────────────────
export function sessionCookieOptions(token: string) {
  return {
    name: COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 Tage
    path: '/',
  }
}

// ── Session-Cookie löschen ───────────────────────────────────────────────────
export function clearSessionCookie() {
  return {
    name: COOKIE,
    value: '',
    maxAge: 0,
    path: '/',
  }
}
