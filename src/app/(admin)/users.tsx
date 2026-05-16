'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const BAN_DURATIONS = [
  { label: '7 Tage', days: 7 },
  { label: '30 Tage', days: 30 },
  { label: '90 Tage', days: 90 },
  { label: 'Permanent', days: null },
]

function getInitials(name: string) {
  return name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()
}

const COLORS = ['#F05A1E', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EC4899']
function colorForName(name: string) {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % COLORS.length
  return COLORS[Math.abs(hash)]
}

function formatBlockedUntil(iso: string | null | undefined) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [blockSheet, setBlockSheet] = useState<{ userId: string; field: 'blockedPosting' | 'blockedCommenting' } | null>(null)

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(data => {
        if (!data.ok) { router.push('/login'); return }
        setUsers(data.users ?? [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [router])

  async function applyBlock(userId: string, field: 'blockedPosting' | 'blockedCommenting', days: number | null) {
    const blockedUntil = days
      ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
      : null // permanent

    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        [field]: true,
        blockedUntil,
      }),
    })
    const data = await res.json()
    if (data.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: true, blockedUntil } : u))
    }
    setBlockSheet(null)
  }

  async function unblock(userId: string, field: 'blockedPosting' | 'blockedCommenting') {
    const user = users.find(u => u.id === userId)
    const stillBlocked = field === 'blockedPosting' ? user?.blockedCommenting : user?.blockedPosting

    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        [field]: false,
        // blockedUntil nur leeren wenn keine Sperre mehr aktiv
        ...(!stillBlocked ? { blockedUntil: null } : {}),
      }),
    })
    const data = await res.json()
    if (data.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: false } : u))
    }
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="animate-spin">
          <circle cx="12" cy="12" r="10" stroke="#F05A1E" strokeWidth="2" strokeOpacity="0.2" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="#F05A1E" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-14 items-center bg-white border-b border-gray-100 px-4">
        <span className="font-bold text-lg text-[#1A1F2E]">Nutzer verwalten</span>
      </div>

      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#9CA3AF" strokeWidth="2"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Nutzer suchen…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400" />
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4 pb-24">
        {filtered.length === 0 && <p className="text-center text-gray-400 py-12">Keine Nutzer gefunden</p>}
        {filtered.map(user => {
          const anyBlocked = user.blockedPosting || user.blockedCommenting
          const untilLabel = anyBlocked ? formatBlockedUntil(user.blockedUntil) : null
          return (
            <div key={user.id} className="rounded-2xl bg-white p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: colorForName(user.name) }}>
                  {getInitials(user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold text-sm text-[#1A1F2E]">{user.name}</p>
                    {user.blockedPosting && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600">Postsperre</span>
                    )}
                    {user.blockedCommenting && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-600">Kommentarsperre</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  {untilLabel && (
                    <p className="text-[10px] text-gray-400 mt-0.5">Gesperrt bis: {untilLabel}</p>
                  )}
                  {anyBlocked && !user.blockedUntil && (
                    <p className="text-[10px] text-red-400 mt-0.5 font-medium">Permanent gesperrt</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Postsperre */}
                {user.blockedPosting ? (
                  <button onClick={() => unblock(user.id, 'blockedPosting')}
                    className="rounded-xl py-2 text-xs font-medium bg-red-100 text-red-600">
                    🚫 Posten gesperrt
                  </button>
                ) : (
                  <button onClick={() => setBlockSheet({ userId: user.id, field: 'blockedPosting' })}
                    className="rounded-xl py-2 text-xs font-medium bg-gray-100 text-gray-600">
                    ✅ Posten erlaubt
                  </button>
                )}
                {/* Kommentarsperre */}
                {user.blockedCommenting ? (
                  <button onClick={() => unblock(user.id, 'blockedCommenting')}
                    className="rounded-xl py-2 text-xs font-medium bg-orange-100 text-orange-600">
                    🚫 Kommentare gesperrt
                  </button>
                ) : (
                  <button onClick={() => setBlockSheet({ userId: user.id, field: 'blockedCommenting' })}
                    className="rounded-xl py-2 text-xs font-medium bg-gray-100 text-gray-600">
                    ✅ Kommentare erlaubt
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Block Duration Sheet */}
      {blockSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 pointer-events-none" />
          <div className="absolute inset-0" onClick={() => setBlockSheet(null)} />
          <div className="relative w-full rounded-t-3xl bg-white px-5 pt-4 pb-10 flex flex-col gap-2 z-10"
            onClick={e => e.stopPropagation()}>
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-gray-200" />
            <p className="text-center text-sm font-semibold text-[#1A1F2E] mb-2">
              Sperrdauer wählen
            </p>
            <p className="text-center text-xs text-gray-400 -mt-1 mb-2">
              {blockSheet.field === 'blockedPosting' ? 'Postsperre' : 'Kommentarsperre'}
            </p>
            {BAN_DURATIONS.map(d => (
              <button key={d.label}
                onClick={() => applyBlock(blockSheet.userId, blockSheet.field, d.days)}
                className="w-full rounded-2xl border border-gray-100 px-4 py-3.5 text-sm font-medium text-left text-[#1A1F2E] active:bg-gray-50">
                {d.label}
              </button>
            ))}
            <button onClick={() => setBlockSheet(null)}
              className="mt-1 w-full rounded-2xl bg-gray-100 py-3 text-sm font-semibold text-gray-600">
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
