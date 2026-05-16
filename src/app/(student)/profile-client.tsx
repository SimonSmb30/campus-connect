'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ProfileTab = 'aktiv' | 'archiviert' | 'gespeichert'

function EventCard({ event, onAction, showMenu }: {
  event: any
  showMenu?: boolean
  onAction?: (action: 'edit' | 'archive' | 'unarchive', id: string) => void
}) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const menuOptions = event.isArchived
    ? [{ label: 'Dearchivieren', action: 'unarchive' as const }]
    : [
        { label: 'Bearbeiten', action: 'edit' as const },
        { label: 'Archivieren', action: 'archive' as const },
      ]

  return (
    <div className="relative flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
      <button onClick={() => router.push(`/feed/${event.id}`)} className="flex items-center gap-3 flex-1 text-left min-w-0">
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.imageUrl} alt={event.title} className="h-14 w-14 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="h-14 w-14 rounded-xl bg-gray-100 shrink-0 flex items-center justify-center text-2xl">📅</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-[#1A1F2E] truncate">{event.title}</p>
          <p className="text-xs text-[#F05A1E] truncate">{event.location}</p>
          {event.isArchived && (
            <span className="text-[10px] text-gray-400 font-medium">Archiviert</span>
          )}
        </div>
      </button>

      {showMenu && onAction && (
        <div className="relative shrink-0">
          <button onClick={() => setMenuOpen(v => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 z-30 min-w-[160px] rounded-2xl bg-white shadow-xl overflow-hidden border border-gray-100">
              {menuOptions.map(opt => (
                <button key={opt.label}
                  onClick={() => { setMenuOpen(false); onAction(opt.action, event.id) }}
                  className="flex w-full items-center px-4 py-3 text-sm font-medium text-left border-b border-gray-50 last:border-0 text-[#1A1F2E]">
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface Props {
  initialUser: any
  initialActive: any[]
  initialArchived: any[]
  initialSaved: any[]
}

export default function ProfileClient({ initialUser, initialActive, initialArchived, initialSaved }: Props) {
  const router = useRouter()
  const [user] = useState<any>(initialUser)
  const [activeEvents, setActiveEvents] = useState<any[]>(initialActive)
  const [archivedEvents, setArchivedEvents] = useState<any[]>(initialArchived)
  const [savedEvents] = useState<any[]>(initialSaved)
  const [tab, setTab] = useState<ProfileTab>('aktiv')
  const [confirmAction, setConfirmAction] = useState<{ type: 'archive' | 'unarchive'; id: string } | null>(null)

  async function handleAction(action: 'edit' | 'archive' | 'unarchive', id: string) {
    if (action === 'edit') {
      router.push(`/feed/${id}`)
      return
    }
    if (action === 'archive') {
      setConfirmAction({ type: 'archive', id })
      return
    }
    // unarchive – sofort, kein Confirm
    await fetch(`/api/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isArchived: false }),
    })
    const event = archivedEvents.find(e => e.id === id)
    if (event) {
      setArchivedEvents(prev => prev.filter(e => e.id !== id))
      setActiveEvents(prev => [{ ...event, isArchived: false }, ...prev])
    }
  }

  async function executeConfirm() {
    if (!confirmAction) return
    const { type, id } = confirmAction
    setConfirmAction(null)
    if (type === 'archive') {
      await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true }),
      })
      const event = activeEvents.find(e => e.id === id)
      if (event) {
        setActiveEvents(prev => prev.filter(e => e.id !== id))
        setArchivedEvents(prev => [{ ...event, isArchived: true }, ...prev])
      }
    }
  }

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
  }

  const tabs: { key: ProfileTab; label: string; count: number }[] = [
    { key: 'aktiv',       label: 'Aktiv',       count: activeEvents.length },
    { key: 'archiviert',  label: 'Archiviert',   count: archivedEvents.length },
    { key: 'gespeichert', label: 'Gespeichert',  count: savedEvents.length },
  ]

  const currentList =
    tab === 'aktiv'       ? activeEvents
    : tab === 'archiviert' ? archivedEvents
    : savedEvents

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-14 items-center justify-between bg-white border-b border-gray-100 px-4">
        <span className="font-bold text-lg text-[#1A1F2E]">Profil</span>
        <button onClick={handleLogout} className="text-sm text-gray-400">Abmelden</button>
      </div>

      <div className="flex flex-col gap-4 px-4 py-5 pb-24">
        {/* Avatar card */}
        <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F05A1E] text-white text-xl font-bold shrink-0">
            {user.initials}
          </div>
          <div>
            <p className="font-bold text-lg text-[#1A1F2E]">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <p className="text-sm text-gray-400">{user.universityName}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-all ${
                tab === t.key ? 'bg-white text-[#1A1F2E] shadow-sm' : 'text-gray-400'
              }`}>
              {t.label}
              {t.count > 0 && (
                <span className={`flex h-4 min-w-4 items-center justify-center rounded-full text-[10px] font-bold px-1 ${
                  tab === t.key ? 'bg-[#F05A1E] text-white' : 'bg-gray-300 text-white'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Event list */}
        {currentList.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">
            {tab === 'aktiv'       && 'Noch keine aktiven Posts'}
            {tab === 'archiviert'  && 'Keine archivierten Posts'}
            {tab === 'gespeichert' && 'Keine gespeicherten Events'}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {currentList.map(event => (
              <EventCard
                key={event.id}
                event={event}
                showMenu={tab !== 'gespeichert'}
                onAction={handleAction}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmAction(null)} />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 flex flex-col gap-4 z-10">
            <h3 className="text-base font-bold text-[#1A1F2E]">Post archivieren?</h3>
            <p className="text-sm text-gray-500">
              Der Post wird für andere Studenten ausgeblendet, bleibt aber in deinem Archiv erhalten.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)}
                className="flex-1 rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-600">
                Abbrechen
              </button>
              <button onClick={executeConfirm}
                className="flex-1 rounded-2xl bg-[#F05A1E] py-3 text-sm font-semibold text-white">
                Archivieren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
