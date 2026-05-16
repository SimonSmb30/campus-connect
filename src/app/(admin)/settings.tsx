'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminSettingsPage() {
  const router = useRouter()
  const [admin, setAdmin] = useState<any>(null)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(data => { if (data.ok) setAdmin(data.user) })
      .catch(() => {})
  }, [])

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
  }

  const initials = admin?.initials ?? '??'
  const name = admin?.name ?? '–'
  const email = admin?.email ?? '–'
  const universityName = admin?.universityName ?? '–'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-14 items-center bg-white border-b border-gray-100 px-4">
        <span className="font-bold text-lg text-[#1A1F2E]">Einstellungen</span>
      </div>

      <div className="flex flex-col gap-4 px-4 py-5 pb-24">
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          {/* Profile */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F05A1E] text-white font-bold shrink-0">
              {initials}
            </div>
            <div>
              <p className="font-bold text-[#1A1F2E]">{name}</p>
              <p className="text-sm text-gray-500">{email}</p>
            </div>
          </div>

          <div className="px-4 py-3.5 border-b border-gray-100 flex flex-col gap-1">
            <p className="text-xs text-gray-400">Hochschule</p>
            <p className="text-sm font-semibold text-[#1A1F2E]">{universityName}</p>
          </div>

          {/* Abmelden */}
          <button
            onClick={handleLogout}
            className="flex w-full px-4 py-3.5 text-left"
          >
            <span className="text-sm font-medium text-red-500">Abmelden</span>
          </button>
        </div>
      </div>
    </div>
  )
}
