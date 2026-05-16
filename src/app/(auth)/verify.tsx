'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useState, useEffect } from 'react'

function VerifyContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get('email') ?? ''
  const type = searchParams.get('type') ?? 'student'
  const initialEmailSent = searchParams.get('emailSent') !== 'false'

  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function handleResend() {
    setResendLoading(true)
    setResendError(null)
    try {
      const res = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type }),
      })
      const data = await res.json()
      if (!data.ok) {
        setResendError(data.error)
      } else {
        setResendSuccess(true)
        setCountdown(60)
      }
    } catch {
      setResendError('Netzwerkfehler. Bitte versuche es erneut.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-white px-6 py-12">
      <div className="w-full max-w-sm flex flex-col items-center gap-8 pt-8">

        {/* Icon */}
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                stroke="#F05A1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="22,6 12,13 2,6"
                stroke="#F05A1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#F05A1E]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
              <polyline points="8,12 11,15 16,9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Titel & Text */}
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-[28px] font-bold text-[#1A1F2E]">E-Mail bestätigen</h1>
          <p className="text-base leading-relaxed text-gray-500">
            {resendSuccess
              ? 'E-Mail erfolgreich gesendet! Klicke auf den Link in der E-Mail um dein Konto zu aktivieren.'
              : initialEmailSent
              ? 'Wir haben dir einen Bestätigungslink gesendet. Klicke auf den Link in der E-Mail um dein Konto zu aktivieren.'
              : 'Die E-Mail konnte leider nicht gesendet werden. Bitte versuche es mit dem Button unten erneut.'}
          </p>
        </div>

        {/* E-Mail-Adresse */}
        {email && (
          <div className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
            <p className="text-xs text-gray-500">Gesendet an</p>
            <p className="mt-1 text-base font-semibold text-gray-900 break-all">{email}</p>
          </div>
        )}

        {/* Fehler-Banner wenn initiales Senden fehlschlug */}
        {!initialEmailSent && !resendSuccess && (
          <div className="w-full rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 text-center">
            E-Mail konnte nicht gesendet werden. Bitte klicke auf „E-Mail erneut senden".
          </div>
        )}

        {/* Spam-Hinweis */}
        <div className="w-full flex flex-col items-center gap-2 rounded-2xl bg-orange-50 p-4">
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} className={`h-2 w-2 rounded-full ${i === 0 ? 'bg-[#F05A1E]' : 'bg-orange-200'}`} />
            ))}
          </div>
          <p className="text-sm text-gray-500 text-center">Überprüfe auch deinen Spam-Ordner</p>
        </div>

        {/* Resend-Fehler */}
        {resendError && (
          <p className="text-sm text-red-500 text-center">{resendError}</p>
        )}

        {/* Resend-Button */}
        {!resendSuccess && (
          <button
            onClick={handleResend}
            disabled={resendLoading || countdown > 0}
            className={`w-full rounded-2xl px-4 py-3 text-base font-semibold transition-opacity disabled:opacity-50 ${
              initialEmailSent
                ? 'border border-[#F05A1E] text-[#F05A1E] bg-white'
                : 'bg-[#F05A1E] text-white'
            }`}
          >
            {resendLoading
              ? 'Senden...'
              : countdown > 0
              ? `Erneut senden in ${countdown}s`
              : 'E-Mail erneut senden'}
          </button>
        )}

        <button
          className="text-sm font-medium text-[#F05A1E]"
          onClick={() => router.push('/register')}
        >
          Andere E-Mail verwenden
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center pb-4">
        Nach dem Klick wirst du automatisch eingeloggt.
      </p>
    </main>
  )
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  )
}
