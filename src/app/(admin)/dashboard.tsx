'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/me').then(r => r.json()),
      fetch('/api/events').then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
    ]).then(([meData, eventsData, usersData]) => {
      if (!meData.ok) { router.push('/login'); return }
      setUser(meData.user)
      if (eventsData.ok) setEvents(eventsData.events ?? [])
      if (usersData.ok) setUserCount(usersData.users?.length ?? 0)
    }).catch(console.error).finally(() => setLoading(false))
  }, [router])

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

  const totalLikes = events.reduce((s, e) => s + (e.likesCount ?? 0), 0)
  const totalComments = events.reduce((s, e) => s + (e.commentsCount ?? 0), 0)
  const visibleEvents = events.filter(e => !e.isHidden)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#F05A1E] px-5 pt-12 pb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white font-bold">
            {user?.initials ?? '?'}
          </div>
          <div>
            <p className="text-white/70 text-xs">Willkommen zurück</p>
            <p className="text-white font-bold">{user?.name}</p>
          </div>
        </div>
        <p className="text-white/60 text-xs mt-1">{user?.universityName}</p>
      </div>

      <div className="px-4 -mt-4 flex flex-col gap-4 pb-24">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Aktive Events', value: String(visibleEvents.length), icon: '📅' },
            { label: 'Studierende', value: String(userCount), icon: '🎓' },
            { label: 'Gesamt Likes', value: String(totalLikes), icon: '❤️' },
            { label: 'Kommentare', value: String(totalComments), icon: '💬' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="text-2xl mb-1">{s.icon}</div>
              <p className="text-2xl font-bold text-[#1A1F2E]">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-[#1A1F2E]">Neueste Events</p>
            <a href="/admin/events" className="text-sm font-medium text-[#F05A1E]">Alle anzeigen</a>
          </div>
          {events.slice(0, 3).map(event => (
            <div key={event.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
              <div className="h-12 w-12 rounded-xl overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center">
                {event.imageUrl
                  ? <img src={event.imageUrl} alt={event.title} className="h-full w-full object-cover" />
                  : <span className="text-xl">📅</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[#1A1F2E] truncate">{event.title}</p>
                <p className="text-xs text-[#F05A1E]">{event.location}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#F05A1E">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span className="text-xs text-gray-500">{event.likesCount ?? 0}</span>
                </div>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-center text-gray-400 py-8">Noch keine Events vorhanden</p>
          )}
        </div>
      </div>
    </div>
  )
}
