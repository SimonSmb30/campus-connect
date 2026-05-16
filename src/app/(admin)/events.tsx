'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORY_COLORS } from '@/lib/mock-data'

type Filter = 'alle' | 'sichtbar' | 'ausgeblendet' | 'archiviert' | 'geloescht'

const FILTER_LABELS: Record<Filter, string> = {
  alle: 'Alle',
  sichtbar: 'Sichtbar',
  ausgeblendet: 'Ausgeblendet',
  archiviert: 'Archiviert',
  geloescht: 'Gelöscht',
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return dateStr }
}

function getInitials(name: string) {
  return name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()
}

export default function AdminEventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<any[]>([])
  const [comments, setComments] = useState<Record<string, any[]>>({})
  const [filter, setFilter] = useState<Filter>('alle')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadEvents() {
    const res = await fetch('/api/events')
    const data = await res.json()
    if (!data.ok) { router.push('/login'); return }
    // Admin sieht alle Events – aber /api/events filtert für Studenten
    // Für archivierte/gelöschte brauchen wir einen admin-Endpunkt.
    // Hier holen wir alle via normalem Endpunkt (Admin sieht alles)
    setEvents(data.events ?? [])
    setLoading(false)
  }

  async function loadComments(eventId: string) {
    if (comments[eventId]) return
    const res = await fetch(`/api/events/${eventId}`)
    const data = await res.json()
    if (data.ok) {
      setComments(prev => ({ ...prev, [eventId]: data.event.comments ?? [] }))
    }
  }

  async function toggleHidden(eventId: string, current: boolean) {
    const res = await fetch(`/api/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isHidden: !current }),
    })
    const data = await res.json()
    if (data.ok) setEvents(prev => prev.map(e => e.id === eventId ? { ...e, isHidden: !current } : e))
  }

  async function restoreEvent(eventId: string) {
    const res = await fetch(`/api/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restore: true }),
    })
    const data = await res.json()
    if (data.ok) setEvents(prev => prev.map(e => e.id === eventId ? { ...e, isDeleted: false, isArchived: false } : e))
  }

  async function toggleCommentHidden(commentId: string, eventId: string, current: boolean) {
    const res = await fetch('/api/comments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId, isHidden: !current }),
    })
    const data = await res.json()
    if (data.ok) {
      setComments(prev => ({
        ...prev,
        [eventId]: (prev[eventId] ?? []).map(c => c.id === commentId ? { ...c, isHidden: !current } : c),
      }))
    }
  }

  const filtered = events.filter(e => {
    if (filter === 'sichtbar') return !e.isHidden && !e.isArchived && !e.isDeleted
    if (filter === 'ausgeblendet') return !!e.isHidden
    if (filter === 'archiviert') return !!e.isArchived
    if (filter === 'geloescht') return !!e.isDeleted
    return true
  })

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
        <span className="font-bold text-lg text-[#1A1F2E]">Events verwalten</span>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 px-4 py-3 bg-white border-b border-gray-100 overflow-x-auto">
        {(Object.keys(FILTER_LABELS) as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
              filter === f ? 'bg-[#F05A1E] text-white' : 'bg-gray-100 text-gray-500'
            }`}>
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 px-4 py-4 pb-24">
        {filtered.map(event => {
          const cat = CATEGORY_COLORS[event.category as keyof typeof CATEGORY_COLORS] ?? { bg: '#f3f4f6', text: '#6b7280' }
          const eventComments = comments[event.id] ?? []
          const isExpanded = expanded === event.id
          const isDimmed = event.isHidden || event.isArchived || event.isDeleted

          return (
            <div key={event.id} className={`rounded-2xl bg-white shadow-sm overflow-hidden ${isDimmed ? 'opacity-60' : ''}`}>
              <div className="flex gap-3 p-3 cursor-pointer" onClick={() => router.push(`/admin/events/${event.id}`)}>
                <div className="h-16 w-16 rounded-xl overflow-hidden shrink-0 bg-gray-100 relative flex items-center justify-center">
                  {event.imageUrl
                    ? <img src={event.imageUrl} alt={event.title} className="h-full w-full object-cover" />
                    : <span className="text-2xl">📅</span>
                  }
                  {isDimmed && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="1" y1="1" x2="23" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-[#1A1F2E] leading-snug">{event.title}</p>
                  <p className="text-xs text-[#F05A1E] mt-0.5">{formatDate(event.date)} · {event.startTime} Uhr</p>
                  <p className="text-xs text-gray-500">{event.location}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: cat.bg, color: cat.text }}>
                      {event.category}
                    </span>
                    {event.isArchived && <span className="text-[10px] text-gray-400 font-medium">📦 Archiviert</span>}
                    {event.isDeleted && <span className="text-[10px] text-red-400 font-medium">🗑 Gelöscht</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0">
                  <div className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#F05A1E">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span className="text-xs text-gray-500">{event.likesCount ?? 0}</span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); if (!isExpanded) loadComments(event.id); setExpanded(isExpanded ? null : event.id) }}
                    className="flex items-center gap-1 mt-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                        stroke={isExpanded ? '#F05A1E' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className={`text-xs ${isExpanded ? 'text-[#F05A1E]' : 'text-gray-500'}`}>{eventComments.length}</span>
                  </button>
                </div>
              </div>

              {/* Comments accordion */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  {eventComments.length === 0 ? (
                    <p className="text-xs text-gray-400 px-4 py-3">Keine Kommentare</p>
                  ) : (
                    eventComments.map((c: any, i: number) => (
                      <div key={c.id} className={`flex items-start gap-2.5 px-3 py-2.5 ${c.parentId ? 'pl-9' : ''} ${i > 0 ? 'border-t border-gray-50' : ''} ${c.isHidden || c.isDeleted ? 'opacity-50' : ''}`}>
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-300 text-white text-[10px] font-bold">
                          {getInitials(c.authorName ?? 'U')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#1A1F2E]">{c.authorName}</p>
                          <p className={`text-xs text-gray-500 leading-snug ${c.isHidden || c.isDeleted ? 'line-through' : ''}`}>
                            {c.isDeleted ? '[gelöscht]' : c.content}
                          </p>
                          {c.isDeleted && <span className="text-[10px] text-red-400 font-medium">Gelöscht</span>}
                        </div>
                        {!c.isDeleted && (
                          <button
                            onClick={() => toggleCommentHidden(c.id, event.id, c.isHidden)}
                            className="shrink-0 text-[10px] font-medium px-2 py-1 rounded-full border"
                            style={c.isHidden
                              ? { borderColor: '#D1FAE5', color: '#065F46', backgroundColor: '#D1FAE5' }
                              : { borderColor: '#FEE2E2', color: '#991B1B', backgroundColor: '#FEE2E2' }
                            }
                          >
                            {c.isHidden ? 'Einblenden' : 'Ausblenden'}
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Action bar */}
              <div className="flex border-t border-gray-100 divide-x divide-gray-100">
                {(event.isDeleted || event.isArchived) ? (
                  <button onClick={() => restoreEvent(event.id)}
                    className="flex-1 py-2.5 text-sm font-medium text-green-600">
                    Wiederherstellen
                  </button>
                ) : (
                  <button onClick={() => toggleHidden(event.id, event.isHidden)}
                    className="flex-1 py-2.5 text-sm font-medium text-[#F05A1E]">
                    {event.isHidden ? 'Einblenden' : 'Ausblenden'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-12">Keine Events vorhanden</p>
        )}
      </div>
    </div>
  )
}
