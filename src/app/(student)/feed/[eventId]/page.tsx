'use client'

import { useState, use, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { CATEGORY_COLORS } from '@/lib/mock-data'
import { formatEventDateLong } from '@/lib/event-time'

const CATEGORIES = ['Party', 'Vortrag', 'Workshop', 'Angebot', 'Sport', 'Ausstellung', 'Community']

// Kleines 3-Dot-Menü (weiße Pille, Optionen als Dropdown)
function ThreeDotMenu({ options }: { options: { label: string; danger?: boolean; action: () => void }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#1A1F2E">
          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 min-w-[180px] rounded-2xl bg-white shadow-xl overflow-hidden border border-gray-100">
          {options.map(opt => (
            <button key={opt.label}
              onClick={() => { opt.action(); setOpen(false) }}
              className={`flex w-full items-center px-4 py-3 text-sm font-medium text-left border-b border-gray-50 last:border-0 ${opt.danger ? 'text-red-500' : 'text-[#1A1F2E]'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr // already a human-readable string, return as-is
    return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return dateStr }
}

// Build Google Calendar URL
function buildGoogleCalendarUrl(event: any) {
  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
  const title = encodeURIComponent(event.title ?? '')
  const loc = encodeURIComponent(event.location ?? '')
  const desc = encodeURIComponent(event.description ?? '')

  // Try to build a date string YYYYMMDD
  let dates = ''
  try {
    const d = new Date(event.date)
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0')
      const yyyy = d.getFullYear()
      const mm = pad(d.getMonth() + 1)
      const dd = pad(d.getDate())

      if (event.startTime) {
        const [sh, sm] = event.startTime.split(':').map(Number)
        const startStr = `${yyyy}${mm}${dd}T${pad(sh)}${pad(sm ?? 0)}00`
        if (event.endTime) {
          const [eh, em] = event.endTime.split(':').map(Number)
          const endStr = `${yyyy}${mm}${dd}T${pad(eh)}${pad(em ?? 0)}00`
          dates = `${startStr}/${endStr}`
        } else {
          // Default 1 hour
          const endH = sh + 1
          dates = `${startStr}/${yyyy}${mm}${dd}T${pad(endH)}${pad(sm ?? 0)}00`
        }
      } else {
        dates = `${yyyy}${mm}${dd}/${yyyy}${mm}${dd}`
      }
    }
  } catch { /* ignore */ }

  return `${base}&text=${title}&dates=${dates}&location=${loc}&details=${desc}`
}

// Build Outlook.com URL
function buildOutlookUrl(event: any) {
  const base = 'https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent'
  const title = encodeURIComponent(event.title ?? '')
  const loc = encodeURIComponent(event.location ?? '')
  const body = encodeURIComponent(event.description ?? '')

  let startdt = ''
  let enddt = ''
  try {
    const d = new Date(event.date)
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0')
      const yyyy = d.getFullYear()
      const mm = pad(d.getMonth() + 1)
      const dd = pad(d.getDate())
      if (event.startTime) {
        const [sh, sm] = event.startTime.split(':').map(Number)
        startdt = `${yyyy}-${mm}-${dd}T${pad(sh)}:${pad(sm ?? 0)}:00`
        if (event.endTime) {
          const [eh, em] = event.endTime.split(':').map(Number)
          enddt = `${yyyy}-${mm}-${dd}T${pad(eh)}:${pad(em ?? 0)}:00`
        } else {
          enddt = `${yyyy}-${mm}-${dd}T${pad(sh + 1)}:${pad(sm ?? 0)}:00`
        }
      } else {
        startdt = `${yyyy}-${mm}-${dd}T09:00:00`
        enddt = `${yyyy}-${mm}-${dd}T10:00:00`
      }
    }
  } catch { /* ignore */ }

  return `${base}&subject=${title}&startdt=${encodeURIComponent(startdt)}&enddt=${encodeURIComponent(enddt)}&location=${loc}&body=${body}`
}

// Generate and download ICS file for Apple Calendar
function downloadICS(event: any) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const now = new Date()
  const dtstamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}Z`

  let dtstart = ''
  let dtend = ''
  try {
    const d = new Date(event.date)
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear()
      const mm = pad(d.getMonth() + 1)
      const dd = pad(d.getDate())
      if (event.startTime) {
        const [sh, sm] = event.startTime.split(':').map(Number)
        dtstart = `${yyyy}${mm}${dd}T${pad(sh)}${pad(sm ?? 0)}00`
        if (event.endTime) {
          const [eh, em] = event.endTime.split(':').map(Number)
          dtend = `${yyyy}${mm}${dd}T${pad(eh)}${pad(em ?? 0)}00`
        } else {
          dtend = `${yyyy}${mm}${dd}T${pad(sh + 1)}${pad(sm ?? 0)}00`
        }
      } else {
        dtstart = `${yyyy}${mm}${dd}`
        dtend = `${yyyy}${mm}${dd}`
      }
    }
  } catch { /* ignore */ }

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CampusConnect//DE',
    'BEGIN:VEVENT',
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${(event.title ?? '').replace(/\n/g, ' ')}`,
    `LOCATION:${(event.location ?? '').replace(/\n/g, ' ')}`,
    `DESCRIPTION:${(event.description ?? '').replace(/\n/g, '\\n')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(event.title ?? 'event').replace(/[^a-z0-9]/gi, '_')}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

function getInitials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

const AUTHOR_COLORS = ['#F05A1E', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EC4899']
function colorForName(name: string) {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % AUTHOR_COLORS.length
  return AUTHOR_COLORS[Math.abs(hash)]
}

export default function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params)
  const router = useRouter()

  const [event, setEvent] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [blockedCommenting, setBlockedCommenting] = useState(false)

  // Likes / Bookmark
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [bookmarked, setBookmarked] = useState(false)

  // Kommentar-Input
  const [commentText, setCommentText] = useState('')
  const [sending, setSending] = useState(false)

  // Bottom Sheets
  const [showCalendarSheet, setShowCalendarSheet] = useState(false)
  const [showMapsSheet, setShowMapsSheet] = useState(false)
  const [showCommentsSheet, setShowCommentsSheet] = useState(false)

  // Eigener Post: Bearbeiten / Archivieren / Löschen
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [confirmAction, setConfirmAction] = useState<'archive' | 'delete' | null>(null)

  // Kommentare: Reply / Edit
  const [replyToId, setReplyToId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`/api/events/${eventId}`).then(r => r.json()),
      fetch('/api/me').then(r => r.json()),
    ])
      .then(([evData, meData]) => {
        if (!evData.ok) { router.push('/feed'); return }
        setEvent(evData.event)
        setComments(evData.event.comments ?? [])
        setLiked(evData.event.liked)
        setLikesCount(evData.event.likesCount)
        setBookmarked(evData.event.bookmarked)
        if (meData.ok) {
          setCurrentUserId(meData.user.id)
          setBlockedCommenting(meData.user.blockedCommenting ?? false)
        }
      })
      .catch(() => router.push('/feed'))
      .finally(() => setLoading(false))
  }, [eventId, router])

  async function handleToggleLike() {
    const res = await fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, type: 'like' }),
    })
    const data = await res.json()
    if (!data.ok) return
    setLiked(data.action === 'added')
    setLikesCount(prev => prev + (data.action === 'added' ? 1 : -1))
  }

  async function handleToggleBookmark() {
    const res = await fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, type: 'bookmark' }),
    })
    const data = await res.json()
    if (!data.ok) return
    setBookmarked(data.action === 'added')
  }

  async function handleComment() {
    if (!commentText.trim() || sending) return
    setSending(true)
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, content: commentText.trim() }),
    })
    const data = await res.json()
    if (data.ok) {
      setComments(prev => [data.comment, ...prev])
      setCommentText('')
    }
    setSending(false)
  }

  async function handleReply() {
    if (!replyText.trim() || !replyToId || sendingReply) return
    setSendingReply(true)
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, content: replyText.trim(), parentId: replyToId }),
    })
    const data = await res.json()
    if (data.ok) {
      setComments(prev => [...prev, data.comment])
      setReplyText('')
      setReplyToId(null)
    }
    setSendingReply(false)
  }

  async function handleCommentLike(commentId: string) {
    const res = await fetch('/api/comment-likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId }),
    })
    const data = await res.json()
    if (!data.ok) return
    setComments(prev => prev.map(c =>
      c.id === commentId
        ? { ...c, liked: data.action === 'added', likesCount: (c.likesCount ?? 0) + (data.action === 'added' ? 1 : -1) }
        : c
    ))
  }

  async function handleCommentDelete(commentId: string) {
    const res = await fetch('/api/comments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId, isDeleted: true }),
    })
    const data = await res.json()
    if (data.ok) {
      setComments(prev => prev.filter(c => c.id !== commentId))
    }
  }

  async function handleCommentEditSave(commentId: string) {
    if (!editCommentText.trim()) return
    const res = await fetch('/api/comments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId, content: editCommentText.trim() }),
    })
    const data = await res.json()
    if (data.ok) {
      setComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, content: editCommentText.trim() } : c
      ))
      setEditingCommentId(null)
      setEditCommentText('')
    }
  }

  async function handleArchive() {
    const res = await fetch(`/api/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isArchived: true }),
    })
    const data = await res.json()
    if (data.ok) router.back()
  }

  async function handleDeleteEvent() {
    const res = await fetch(`/api/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDeleted: true }),
    })
    const data = await res.json()
    if (data.ok) router.back()
  }

  async function handleEditSave() {
    if (editSaving) return
    setEditSaving(true)
    const res = await fetch(`/api/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    const data = await res.json()
    if (data.ok) {
      setEvent((prev: any) => ({ ...prev, ...editForm }))
      setShowEditSheet(false)
    }
    setEditSaving(false)
  }

  function openEditSheet() {
    setEditForm({
      title: event.title ?? '',
      category: event.category ?? 'Community',
      date: event.date ?? '',
      startTime: event.startTime ?? '',
      endTime: event.endTime ?? '',
      location: event.location ?? '',
      description: event.description ?? '',
    })
    setShowEditSheet(true)
  }

  const isOwnEvent = !!currentUserId && currentUserId === event?.authorId

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
  if (!event) return null

  const cat = CATEGORY_COLORS[event.category as keyof typeof CATEGORY_COLORS] ?? { bg: '#f3f4f6', text: '#6b7280' }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero – fixed height, blur fill, image contained (no stretch) */}
      <div className="relative w-full h-56 overflow-hidden bg-gray-900">
        {event.imageUrl ? (
          <>
            <Image
              src={event.imageUrl} alt="" fill unoptimized
              className="object-cover scale-110 blur-2xl opacity-50 pointer-events-none"
              sizes="100vw"
            />
            <Image
              src={event.imageUrl} alt={event.title} fill unoptimized
              className="object-contain"
              sizes="100vw"
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <span className="text-6xl">📅</span>
          </div>
        )}
        <button onClick={() => router.back()}
          className="absolute left-4 top-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <polyline points="15,18 9,12 15,6" stroke="#1A1F2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="absolute right-4 top-10 flex items-center gap-2">
          {isOwnEvent && (
            <ThreeDotMenu options={[
              { label: 'Bearbeiten', action: openEditSheet },
              { label: 'Archivieren', action: () => setConfirmAction('archive') },
            ]} />
          )}
          <button onClick={handleToggleBookmark}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow">
            <svg width="18" height="18" viewBox="0 0 24 24" fill={bookmarked ? '#F05A1E' : 'none'}>
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
                stroke={bookmarked ? '#F05A1E' : '#1A1F2E'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content card */}
      <div className="-mt-5 rounded-t-3xl bg-white px-5 pt-8 pb-10 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ backgroundColor: cat.text }} />
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: cat.text }}>{event.category}</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1A1F2E] leading-snug -mt-2">{event.title}</h1>

        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: colorForName(event.authorName ?? '') }}>
            {getInitials(event.authorName ?? 'U')}
          </div>
          <span className="text-sm text-gray-500">Gepostet von <span className="font-medium text-[#1A1F2E]">{event.authorName}</span></span>
        </div>

        <div className="flex flex-col gap-3">
          <button onClick={() => setShowCalendarSheet(true)}
            className="flex items-center gap-3 w-full text-left active:opacity-70 transition-opacity">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="#F05A1E" strokeWidth="2" />
                <line x1="16" y1="2" x2="16" y2="6" stroke="#F05A1E" strokeWidth="2" strokeLinecap="round" />
                <line x1="8"  y1="2" x2="8"  y2="6" stroke="#F05A1E" strokeWidth="2" strokeLinecap="round" />
                <line x1="3"  y1="10" x2="21" y2="10" stroke="#F05A1E" strokeWidth="2" />
              </svg>
            </div>
            <div className="flex-1">
              {(() => {
                const { dateLine, timeLine } = formatEventDateLong(event)
                return <>
                  <p className="font-semibold text-[#1A1F2E]">{dateLine}</p>
                  {timeLine && <p className="text-sm text-gray-500">{timeLine}</p>}
                </>
              })()}
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-gray-300">
              <polyline points="9,18 15,12 9,6" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button onClick={() => event.location && setShowMapsSheet(true)}
            className={`flex items-center gap-3 w-full text-left transition-opacity ${event.location ? 'active:opacity-70' : 'cursor-default'}`}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="#F05A1E" strokeWidth="2" />
                <circle cx="12" cy="10" r="3" stroke="#F05A1E" strokeWidth="2" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#1A1F2E]">{event.location}</p>
              {event.locationDetail && (
                <p className="text-sm text-gray-500 mt-0.5">{event.locationDetail}</p>
              )}
            </div>
            {event.location && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <polyline points="9,18 15,12 9,6" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>

        {event.description && <p className="text-base leading-relaxed text-gray-700">{event.description}</p>}

        <div className="h-px bg-gray-100" />

        <div className="flex items-center gap-5">
          <button onClick={handleToggleLike} className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? '#F05A1E' : 'none'}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                stroke={liked ? '#F05A1E' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-semibold text-gray-700">{likesCount}</span>
          </button>
          <button onClick={() => setShowCommentsSheet(true)} className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-semibold text-gray-700">{comments.length}</span>
          </button>
        </div>
      </div>

      {/* Calendar Bottom Sheet */}
      {showCalendarSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 pointer-events-none" />
          <div className="absolute inset-0" onClick={() => setShowCalendarSheet(false)} />
          <div className="relative w-full rounded-t-3xl bg-white px-5 pt-4 pb-10 flex flex-col gap-2 z-10"
            onClick={e => e.stopPropagation()}>
            {/* Drag handle */}
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-gray-200" />
            <p className="text-center text-sm font-semibold text-[#1A1F2E] mb-1">In Kalender speichern</p>

            {/* Google Calendar */}
            <a href={buildGoogleCalendarUrl(event)} target="_blank" rel="noopener noreferrer"
              onClick={() => setShowCalendarSheet(false)}
              className="flex items-center gap-4 rounded-2xl border border-gray-100 px-4 py-3 active:bg-gray-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" fill="#4285F4" />
                  <rect x="3" y="4" width="18" height="5" fill="#4285F4" />
                  <rect x="3" y="9" width="18" height="13" rx="0" fill="white" />
                  <rect x="3" y="9" width="18" height="13" rx="2" fill="white" />
                  <text x="12" y="19" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#4285F4">G</text>
                  <line x1="3" y1="9" x2="21" y2="9" stroke="#4285F4" strokeWidth="1" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-sm text-[#1A1F2E]">Google Kalender</p>
                <p className="text-xs text-gray-400">Im Browser öffnen</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ml-auto shrink-0">
                <polyline points="9,18 15,12 9,6" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>

            {/* Apple Calendar (ICS) */}
            <button onClick={() => { downloadICS(event); setShowCalendarSheet(false) }}
              className="flex items-center gap-4 rounded-2xl border border-gray-100 px-4 py-3 active:bg-gray-50 w-full text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="3" fill="#FF3B30" />
                  <rect x="3" y="4" width="18" height="7" rx="3" fill="#FF3B30" />
                  <rect x="3" y="8" width="18" height="14" rx="0" fill="white" />
                  <rect x="3" y="8" width="18" height="14" rx="3" fill="white" />
                  <text x="12" y="18" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#1A1F2E">31</text>
                  <line x1="3" y1="8" x2="21" y2="8" stroke="#FF3B30" strokeWidth="0.5" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-sm text-[#1A1F2E]">Apple Kalender</p>
                <p className="text-xs text-gray-400">.ics herunterladen</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ml-auto shrink-0">
                <polyline points="9,18 15,12 9,6" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Outlook */}
            <a href={buildOutlookUrl(event)} target="_blank" rel="noopener noreferrer"
              onClick={() => setShowCalendarSheet(false)}
              className="flex items-center gap-4 rounded-2xl border border-gray-100 px-4 py-3 active:bg-gray-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="2" fill="#0078D4" />
                  <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" fill="white">Out</text>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-sm text-[#1A1F2E]">Outlook</p>
                <p className="text-xs text-gray-400">Im Browser öffnen</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ml-auto shrink-0">
                <polyline points="9,18 15,12 9,6" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>

            <button onClick={() => setShowCalendarSheet(false)}
              className="mt-2 w-full rounded-2xl bg-gray-100 py-3 text-sm font-semibold text-gray-600 active:bg-gray-200">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Maps Bottom Sheet */}
      {showMapsSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 pointer-events-none" />
          <div className="absolute inset-0" onClick={() => setShowMapsSheet(false)} />
          <div className="relative w-full rounded-t-3xl bg-white px-5 pt-4 pb-10 flex flex-col gap-2 z-10"
            onClick={e => e.stopPropagation()}>
            {/* Drag handle */}
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-gray-200" />
            <p className="text-center text-sm font-semibold text-[#1A1F2E] mb-1">In Karten öffnen</p>

            {/* Apple Maps */}
            <a href={`maps://maps.apple.com/?q=${encodeURIComponent(event.location ?? '')}`}
              onClick={() => setShowMapsSheet(false)}
              className="flex items-center gap-4 rounded-2xl border border-gray-100 px-4 py-3 active:bg-gray-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#34C759" />
                  <circle cx="12" cy="9" r="2.5" fill="white" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-sm text-[#1A1F2E]">Apple Karten</p>
                <p className="text-xs text-gray-400 truncate max-w-[180px]">{event.location}</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ml-auto shrink-0">
                <polyline points="9,18 15,12 9,6" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>

            {/* Google Maps */}
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location ?? '')}`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => setShowMapsSheet(false)}
              className="flex items-center gap-4 rounded-2xl border border-gray-100 px-4 py-3 active:bg-gray-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335" />
                  <circle cx="12" cy="9" r="2.5" fill="white" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-sm text-[#1A1F2E]">Google Maps</p>
                <p className="text-xs text-gray-400 truncate max-w-[180px]">{event.location}</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ml-auto shrink-0">
                <polyline points="9,18 15,12 9,6" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>

            <button onClick={() => setShowMapsSheet(false)}
              className="mt-2 w-full rounded-2xl bg-gray-100 py-3 text-sm font-semibold text-gray-600 active:bg-gray-200">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Comments Bottom Sheet */}
      {showCommentsSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 pointer-events-none" />
          <div className="absolute inset-0" onClick={() => setShowCommentsSheet(false)} />
          <div className="relative w-full rounded-t-3xl bg-white flex flex-col z-10" style={{ maxHeight: '80vh' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-gray-100">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200" />
              <p className="text-center text-sm font-semibold text-[#1A1F2E]">
                Kommentare{comments.length > 0 ? ` (${comments.length})` : ''}
              </p>
            </div>

            {/* Scrollable comments list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
              {comments.filter(c => !c.parentId).length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">Noch keine Kommentare</p>
              ) : (
                comments.filter(c => !c.parentId).map(c => {
                  const isOwn = currentUserId === c.authorId
                  const replies = comments.filter(r => r.parentId === c.id)
                  return (
                    <div key={c.id} className="flex flex-col gap-2">
                      {/* Top-level comment */}
                      <div className="flex gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                          style={{ backgroundColor: colorForName(c.authorName ?? '') }}>
                          {getInitials(c.authorName ?? 'U')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm text-[#1A1F2E]">{c.authorName}</span>
                            {isOwn && (
                              <ThreeDotMenu options={[
                                { label: 'Bearbeiten', action: () => { setEditingCommentId(c.id); setEditCommentText(c.content) } },
                                { label: 'Löschen', danger: true, action: () => handleCommentDelete(c.id) },
                              ]} />
                            )}
                          </div>
                          {editingCommentId === c.id ? (
                            <div className="mt-1 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-1.5">
                              <input
                                value={editCommentText}
                                onChange={e => setEditCommentText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCommentEditSave(c.id)}
                                className="flex-1 bg-transparent text-sm outline-none"
                                autoFocus
                              />
                              <button onClick={() => handleCommentEditSave(c.id)} className="text-[#F05A1E] text-xs font-semibold">Speichern</button>
                              <button onClick={() => setEditingCommentId(null)} className="text-gray-400 text-xs">✕</button>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-700 mt-0.5">{c.content}</p>
                          )}
                          {/* Like + Reply Row */}
                          <div className="flex items-center gap-4 mt-1.5">
                            <button onClick={() => handleCommentLike(c.id)} className="flex items-center gap-1">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill={c.liked ? '#F05A1E' : 'none'}>
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                                  stroke={c.liked ? '#F05A1E' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              {(c.likesCount ?? 0) > 0 && <span className="text-xs text-gray-400">{c.likesCount}</span>}
                            </button>
                            <button onClick={() => { setReplyToId(c.id); setReplyText('') }}
                              className="text-xs text-gray-400 font-medium">
                              Antworten
                            </button>
                          </div>
                          {/* Reply Input */}
                          {replyToId === c.id && (
                            <div className="mt-2 flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#F05A1E]/40">
                              <input
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleReply()}
                                placeholder={`@${c.authorName} antworten…`}
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                                autoFocus
                              />
                              <button onClick={handleReply} disabled={!replyText.trim() || sendingReply}
                                className={replyText.trim() ? 'text-[#F05A1E]' : 'text-gray-300'}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                                </svg>
                              </button>
                              <button onClick={() => setReplyToId(null)} className="text-gray-400 text-xs ml-1">✕</button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Replies (eingerückt) */}
                      {replies.map(r => {
                        const isOwnReply = currentUserId === r.authorId
                        return (
                          <div key={r.id} className="flex gap-3 pl-12">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                              style={{ backgroundColor: colorForName(r.authorName ?? '') }}>
                              {getInitials(r.authorName ?? 'U')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-xs text-[#1A1F2E]">{r.authorName}</span>
                                {isOwnReply && (
                                  <ThreeDotMenu options={[
                                    { label: 'Bearbeiten', action: () => { setEditingCommentId(r.id); setEditCommentText(r.content) } },
                                    { label: 'Löschen', danger: true, action: () => handleCommentDelete(r.id) },
                                  ]} />
                                )}
                              </div>
                              {editingCommentId === r.id ? (
                                <div className="mt-1 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-1.5">
                                  <input value={editCommentText} onChange={e => setEditCommentText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCommentEditSave(r.id)}
                                    className="flex-1 bg-transparent text-xs outline-none" autoFocus />
                                  <button onClick={() => handleCommentEditSave(r.id)} className="text-[#F05A1E] text-xs font-semibold">Speichern</button>
                                  <button onClick={() => setEditingCommentId(null)} className="text-gray-400 text-xs">✕</button>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-700 mt-0.5">{r.content}</p>
                              )}
                              <button onClick={() => handleCommentLike(r.id)} className="flex items-center gap-1 mt-1.5">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill={r.liked ? '#F05A1E' : 'none'}>
                                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                                    stroke={r.liked ? '#F05A1E' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {(r.likesCount ?? 0) > 0 && <span className="text-xs text-gray-400">{r.likesCount}</span>}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })
              )}
            </div>

            {/* Comment input */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 pb-8">
              {blockedCommenting ? (
                <p className="text-center text-sm text-gray-400 py-2">Du kannst derzeit keine Kommentare schreiben.</p>
              ) : (
                <div className="flex items-center rounded-full bg-gray-100 px-4 py-2 gap-2 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-[#F05A1E]/40">
                  <input
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleComment()}
                    placeholder="Kommentar schreiben..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                  />
                  <button onClick={handleComment} disabled={!commentText.trim() || sending}
                    className={commentText.trim() ? 'text-[#F05A1E]' : 'text-gray-300'}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Post Sheet */}
      {showEditSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 pointer-events-none" />
          <div className="absolute inset-0" onClick={() => setShowEditSheet(false)} />
          <div className="relative w-full rounded-t-3xl bg-white flex flex-col z-10" style={{ maxHeight: '85vh' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-gray-100">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200" />
              <p className="text-center text-sm font-semibold text-[#1A1F2E]">Post bearbeiten</p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
              {/* Titel */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Titel</label>
                <input value={editForm.title ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="mt-1.5 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#F05A1E] focus:ring-1 focus:ring-[#F05A1E]/30" />
              </div>
              {/* Kategorie */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Kategorie</label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat} type="button"
                      onClick={() => setEditForm(f => ({ ...f, category: cat }))}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                        editForm.category === cat
                          ? 'bg-[#F05A1E] text-white border-[#F05A1E]'
                          : 'border-gray-200 text-gray-600'
                      }`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              {/* Datum + Uhrzeit */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Datum</label>
                  <input type="date" value={editForm.date ?? ''}
                    onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                    className="mt-1.5 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#F05A1E]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Von</label>
                  <input type="time" value={editForm.startTime ?? ''}
                    onChange={e => setEditForm(f => ({ ...f, startTime: e.target.value }))}
                    className="mt-1.5 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#F05A1E]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Bis</label>
                  <input type="time" value={editForm.endTime ?? ''}
                    onChange={e => setEditForm(f => ({ ...f, endTime: e.target.value }))}
                    className="mt-1.5 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#F05A1E]" />
                </div>
              </div>
              {/* Ort */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ort</label>
                <input value={editForm.location ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                  className="mt-1.5 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#F05A1E]" />
              </div>
              {/* Beschreibung */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Beschreibung</label>
                <textarea value={editForm.description ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="mt-1.5 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#F05A1E] resize-none" />
              </div>
            </div>
            <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 pb-8 flex gap-3">
              <button onClick={() => setShowEditSheet(false)}
                className="flex-1 rounded-2xl border border-gray-200 py-3.5 text-sm font-semibold text-gray-600">
                Abbrechen
              </button>
              <button onClick={handleEditSave} disabled={editSaving}
                className="flex-1 rounded-2xl bg-[#F05A1E] py-3.5 text-sm font-semibold text-white disabled:opacity-50">
                {editSaving ? 'Speichern…' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm: Archivieren / Löschen */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmAction(null)} />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 flex flex-col gap-4 z-10">
            <h3 className="text-base font-bold text-[#1A1F2E]">
              {confirmAction === 'archive' ? 'Post archivieren?' : 'Post löschen?'}
            </h3>
            <p className="text-sm text-gray-500">
              {confirmAction === 'archive'
                ? 'Der Post wird für andere Studenten ausgeblendet, bleibt aber in deinem Profil unter „Archiviert" sichtbar.'
                : 'Der Post wird dauerhaft ausgeblendet. Admins können ihn noch einsehen.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)}
                className="flex-1 rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-600">
                Abbrechen
              </button>
              <button
                onClick={() => { setConfirmAction(null); confirmAction === 'archive' ? handleArchive() : handleDeleteEvent() }}
                className={`flex-1 rounded-2xl py-3 text-sm font-semibold text-white ${confirmAction === 'delete' ? 'bg-red-500' : 'bg-[#F05A1E]'}`}>
                {confirmAction === 'archive' ? 'Archivieren' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
