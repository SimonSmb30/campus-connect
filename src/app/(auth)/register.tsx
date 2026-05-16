'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

// ── Auge-Icon für Passwort-Toggle ───────────────────────────────────────────
function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="text-gray-400 hover:text-gray-600 transition-colors">
      {show ? (
        // Auge offen
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        // Auge geschlossen
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )}
    </button>
  )
}

// ── Rolle wählen ────────────────────────────────────────────────────────────
function RoleSelect() {
  const router = useRouter()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-12">
      <div className="w-full max-w-sm flex flex-col items-center gap-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#F05A1E]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6L12 2z" fill="white" />
          </svg>
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-[28px] font-bold leading-tight text-[#1A1F2E]">
            Willkommen bei<br />CampusConnect
          </h1>
          <p className="text-base text-gray-500">Wähle deine Rolle, um fortzufahren</p>
        </div>

        <div className="flex w-full flex-col gap-4">
          <button
            onClick={() => router.push('/register?role=student')}
            className="flex items-center gap-4 rounded-2xl border border-gray-200 p-4 text-left transition-colors hover:border-[#F05A1E]/40 hover:bg-orange-50"
          >
            <div>
              <p className="font-bold text-[#1A1F2E]">Ich bin Student</p>
              <p className="text-sm text-gray-500">Zugang zum Campus-Feed und Events</p>
            </div>
          </button>

          <button
            onClick={() => router.push('/register?role=admin')}
            className="flex items-center gap-4 rounded-2xl border border-gray-200 p-4 text-left transition-colors hover:border-[#F05A1E]/40 hover:bg-orange-50"
          >
            <div>
              <p className="font-bold text-[#1A1F2E]">Ich bin eine Hochschule</p>
              <p className="text-sm text-gray-500">Offizielle Hochschul-Verwaltung</p>
            </div>
          </button>
        </div>
        <button className="font-bold text-[#F05A1E]" onClick={() => router.push('/login')}>
          Zurück zur Anmeldung
        </button>
      </div>
    </main>
  )
}

// ── Student-Formular ────────────────────────────────────────────────────────
function StudentForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string; email?: string; password?: string; confirm?: string; general?: string
  }>({})
  const [loading, setLoading] = useState(false)
  const [detectedUni, setDetectedUni] = useState<string | null>(null)
  const [unis, setUnis] = useState<{ emailDomain: string; name: string }[]>([])

  useEffect(() => {
    fetch('/api/universities').then(r => r.json()).then(d => { if (d.ok) setUnis(d.universities ?? []) })
  }, [])

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setEmail(val)
    const domain = val.split('@')[1]?.toLowerCase() ?? ''
    const match = unis.find(u => u.emailDomain === domain)
    setDetectedUni(match ? match.name : domain.length > 2 && val.includes('@') ? '' : null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!name.trim()) next.name = 'Bitte gib deinen Namen ein.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Bitte gib eine gültige Hochschul-E-Mail ein.'
    if (password.length < 8) next.password = 'Passwort muss mind. 8 Zeichen haben.'
    if (password !== confirmPassword) next.confirm = 'Passwörter stimmen nicht überein.'
    if (Object.keys(next).length) { setErrors(next); return }
    setErrors({})
    setLoading(true)

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
      })
      const data = await res.json()
      if (!data.ok) { setErrors({ general: data.error }); return }
      router.push(`/verify?email=${encodeURIComponent(email)}&type=student&emailSent=${data.emailSent ?? true}`)
    } catch {
      setErrors({ general: 'Netzwerkfehler. Bitte versuche es erneut.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-white px-6 py-12">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-bold text-[#1A1F2E]">Konto erstellen</h1>
          <p className="text-base text-gray-500">Melde dich mit deiner Hochschul-E-Mail an</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Vor- und Nachname"
            placeholder="Niklas Haug"
            value={name}
            onChange={e => setName(e.target.value)}
            error={errors.name}
            autoComplete="name"
          />

          <div className="flex flex-col gap-1.5">
            <Input
              label="Hochschul-E-Mail"
              type="email"
              placeholder="name@hochschule.de"
              value={email}
              onChange={handleEmailChange}
              error={errors.email}
              autoComplete="email"
              inputMode="email"
            />
            {detectedUni !== null && (
              detectedUni ? (
                <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="22 4 12 14.01 9 11.01" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-sm text-green-700 font-medium">{detectedUni} gefunden</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="2"/>
                    <line x1="12" y1="8" x2="12" y2="12" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="12" y1="16" x2="12.01" y2="16" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span className="text-sm text-red-600">Keine Hochschule mit dieser Domain gefunden</span>
                </div>
              )
            )}
          </div>

          <Input
            label="Passwort"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            error={errors.password}
            autoComplete="new-password"
            rightElement={<EyeToggle show={showPassword} onToggle={() => setShowPassword(v => !v)} />}
          />

          <Input
            label="Passwort wiederholen"
            type={showConfirm ? 'text' : 'password'}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            error={errors.confirm}
            autoComplete="new-password"
            rightElement={<EyeToggle show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />}
          />

          {errors.general && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{errors.general}</p>
          )}
          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? 'Bitte warten…' : 'Registrieren'}
          </Button>
        </form>
      </div>
    </main>
  )
}

// ── Admin-Formular ──────────────────────────────────────────────────────────
function AdminForm() {
  const router = useRouter()
  const [contact, setContact] = useState('')
  const [university, setUniversity] = useState('')
  const [city, setCity] = useState('')
  const [domain, setDomain] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<{
    contact?: string; university?: string; domain?: string
    email?: string; password?: string; confirm?: string; general?: string
  }>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!contact.trim()) next.contact = 'Bitte gib einen Ansprechpartner ein.'
    if (!university.trim()) next.university = 'Bitte gib den Hochschulnamen ein.'
    if (!domain.trim()) next.domain = 'Bitte gib die studentische E-Mail-Domain ein.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Bitte gib eine gültige E-Mail ein.'
    if (password.length < 8) next.password = 'Passwort muss mind. 8 Zeichen haben.'
    if (password !== confirmPassword) next.confirm = 'Passwörter stimmen nicht überein.'
    if (Object.keys(next).length) { setErrors(next); return }
    setErrors({})
    setLoading(true)

    try {
      const res = await fetch('/api/universities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          universityName: university.trim(),
          emailDomain: domain.trim(),
          contactName: contact.trim(),
          contactEmail: email.trim().toLowerCase(),
          password,
          city: city.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!data.ok) { setErrors({ general: data.error }); return }
      router.push(`/verify?email=${encodeURIComponent(email)}&type=admin&emailSent=${data.emailSent ?? true}`)
    } catch {
      setErrors({ general: 'Netzwerkfehler. Bitte versuche es erneut.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-white px-6 py-12">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-bold text-[#1A1F2E]">Hochschule registrieren</h1>
          <p className="text-base text-gray-500">Einmalige Registrierung pro Hochschule</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Ansprechpartner"
            placeholder="Max Mustermann"
            value={contact}
            onChange={e => setContact(e.target.value)}
            error={errors.contact}
            autoComplete="name"
          />
          <Input
            label="Name der Hochschule"
            placeholder="Hochschule/Universität"
            value={university}
            onChange={e => setUniversity(e.target.value)}
            error={errors.university}
          />
          <Input
            label="Stadt (optional)"
            placeholder="z.B. München, Mannheim, Berlin"
            value={city}
            onChange={e => setCity(e.target.value)}
            hint="Wird für genauere Ortsangaben bei Events verwendet"
          />
          <Input
            label="Studentische E-Mail-Domain"
            placeholder="@hochschule.de"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            error={errors.domain}
            hint="Studierende mit dieser Domain werden Ihrer Hochschule zugeordnet"
          />
          <Input
            label="Kontakt-E-Mail"
            type="email"
            placeholder="admin@hochschule.de"
            value={email}
            onChange={e => setEmail(e.target.value)}
            error={errors.email}
            autoComplete="email"
            inputMode="email"
          />
          <Input
            label="Passwort"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            error={errors.password}
            autoComplete="new-password"
            rightElement={<EyeToggle show={showPassword} onToggle={() => setShowPassword(v => !v)} />}
          />
          <Input
            label="Passwort wiederholen"
            type={showConfirm ? 'text' : 'password'}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            error={errors.confirm}
            autoComplete="new-password"
            rightElement={<EyeToggle show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />}
          />
          {errors.general && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{errors.general}</p>
          )}
          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? 'Bitte warten…' : 'Registrieren'}
          </Button>
        </form>
      </div>
    </main>
  )
}

// ── Router ──────────────────────────────────────────────────────────────────
function RegisterContent() {
  const searchParams = useSearchParams()
  const role = searchParams.get('role')
  if (role === 'student') return <StudentForm />
  if (role === 'admin') return <AdminForm />
  return <RoleSelect />
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterContent />
    </Suspense>
  )
}
