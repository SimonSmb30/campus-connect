'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { loginAction } from './login/actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center rounded-2xl bg-[#F05A1E] px-6 py-4 text-base font-semibold text-white disabled:opacity-50 active:opacity-80"
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="animate-spin">
            <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Bitte warten…
        </span>
      ) : 'Anmelden'}
    </button>
  )
}

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, null)
  const router = useRouter()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-12">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">

        {/* Logo */}
        <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#F05A1E]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6L12 2z" fill="white" />
          </svg>
        </div>

        {/* Heading */}
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-[28px] font-bold leading-tight text-[#1A1F2E]">
            Willkommen bei<br />CampusConnect
          </h1>
          <p className="text-base leading-relaxed text-gray-500">
            Melde dich an, um Inhalte deines Campus zu sehen und zu teilen.
          </p>
        </div>

        {/* Form – works as plain HTML POST on iOS Safari (no JS needed) */}
        <form action={formAction} className="flex w-full flex-col gap-4">
          {state?.error && (
            <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-600 text-center">
              {state.error}
            </div>
          )}

          <input
            name="email"
            type="email"
            placeholder="Hochschul E-Mail"
            autoComplete="email"
            inputMode="email"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-base text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#F05A1E] focus:bg-white transition-colors"
          />

          <input
            name="password"
            type="password"
            placeholder="Passwort"
            autoComplete="current-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-base text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#F05A1E] focus:bg-white transition-colors"
          />

          <SubmitButton />
        </form>

        <p className="text-sm text-gray-500">
          Du hast noch kein Konto?{' '}
          <button
            type="button"
            className="font-bold text-[#F05A1E]"
            onClick={() => router.push('/register')}
          >
            Registriere dich
          </button>
        </p>
      </div>
    </main>
  )
}
