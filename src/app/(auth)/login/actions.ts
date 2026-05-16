'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { db } from '@/db'
import { universities, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createToken, sessionCookieOptions } from '@/lib/auth'

export type LoginState = { error: string } | null

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = (formData.get('email') as string | null)?.trim().toLowerCase() ?? ''
  const password = (formData.get('password') as string | null)?.trim() ?? ''

  if (!email || !password) return { error: 'Bitte fülle alle Felder aus.' }

  // Admin-Check (universities-Tabelle)
  const [admin] = await db.select().from(universities).where(eq(universities.contactEmail, email))
  if (admin) {
    const valid = await bcrypt.compare(password, admin.password)
    if (!valid) return { error: 'Passwort falsch.' }
    if (!admin.emailVerified) return { error: 'Bitte bestätige zuerst deine E-Mail.' }

    const token = await createToken({
      sub: admin.id,
      email: admin.contactEmail,
      role: 'admin',
      universityId: admin.id,
      name: admin.contactName,
    })
    const store = await cookies()
    store.set(sessionCookieOptions(token))
    redirect('/admin/dashboard')
  }

  // Studenten-Check (users-Tabelle)
  const [user] = await db.select().from(users).where(eq(users.email, email))
  if (!user) return { error: 'Kein Konto mit dieser E-Mail gefunden.' }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return { error: 'Passwort falsch.' }
  if (!user.emailVerified) return { error: 'Bitte bestätige zuerst deine E-Mail.' }

  const token = await createToken({
    sub: user.id,
    email: user.email,
    role: 'student',
    universityId: user.universityId,
    name: user.name,
  })
  const store = await cookies()
  store.set(sessionCookieOptions(token))
  redirect('/feed')
}
