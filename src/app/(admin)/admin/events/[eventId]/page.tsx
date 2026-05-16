'use client'

import { useState, use, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { formatEventDateLong } from '@/lib/event-time'

const CATEGORY_COLORS: Record<string, string> = {
  Party:       '#7C3AED',
  Vortrag:     '#92400E',
  Workshop:    '#1E40AF',
  Angebot:     '#065F46',
  Sport:       '#991B1B',
  Ausstellung: '#9D174D',
  Community:   '#C2410C',
}

const AVATAR_COLORS = ['#F05A1E', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EC4899']
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

function ThreeDotMenu({ options }: { options: { label: string; danger?: boolean; action: () => void }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#1A1F2E">
          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 min-w-[180px] rounded-2xl bg-white shadow-lg overflow-hidden border border-gray-100">
          {options.map(opt => (
            <button
              key={opt.label}
              onClick={() => { opt.action(); setOpen(false) }}
              className={`flex w-full items-center px-4 py-3 text-sm font-medium text-left border-b border-gray-50 last:border-0 ${opt.danger ? 'text-red-500' : 'text-[#1A1F2E]'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminEventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params)
  const router = useRouter()

  const [event, setEvent] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/events/${eventId}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setEvent(data.event)
          setComments(data.event.comments ?? [])
        }
      })
      .finally(() => setLoading(false))
  }, [eventId])

  async function toggleEventHidden() {
    if (!event) return
    const newHidden = !event.isHidden
    await fetch(`/api/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isHidden: newHidden }),
    })
    setEvent((prev: any) => ({ ...prev, isHidden: newHidden }))
  }

  async function toggleCommentHidden(commentId: string, current: boolean) {
    await fetch('/api/comments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId, isHidden: !current }),
    })
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, isHidden: !current } : c))
  }

  async function blockUser(userId: string) {
    await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, blockedPosting: true, blockedCommenting: true }),
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F05A1E] border-t-transparent" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
        <p className="text-gray-500">Event nicht gefunden.</p>
        <button onClick={() => router.back()} className="text-[#F05A1E] font-medium text-sm">Zurück</button>
      </div>
    )
  }

  const catColor = CATEGORY_COLORS[event.category] ?? '#9CA3AF'

  return (
    <div className="min-h-screen bg-white">
      {/* Hero image – blur fill + object-contain (wie Student-Ansicht) */}
      <div className="relative h-56 w-full overflow-hidden bg-gray-900">
        {event.imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.imageUrl} alt="" aria-hidden
              className="absolute inset-0 h-full w-full object-cover scale-110 blur-2xl opacity-50 pointer-events-none" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.imageUrl} alt={event.title}
              className="absolute inset-0 h-full w-full object-contain" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <span className="text-6xl">📅</span>
          </div>
        )}

        {/* Dimmed overlay if hidden */}
        {event.isHidden && <div className="absolute inset-0 bg-black/40" />}

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute left-4 top-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <polyline points="15,18 9,12 15,6" stroke="#1A1F2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* 3-dot menu for event */}
        <div className="absolute right-4 top-10">
          <ThreeDotMenu options={[
            {
              label: event.isHidden ? 'Post einblenden' : 'Post ausblenden',
              action: toggleEventHidden,
            },
          ]} />
        </div>

        {/* Hidden badge */}
        {event.isHidden && (
          <div className="absolute bottom-4 left-4 rounded-full bg-black/60 px-3 py-1 flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="1" y1="1" x2="23" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="text-white text-xs font-medium">Ausgeblendet</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="-mt-5 rounded-t-3xl bg-white px-5 pt-5 pb-10 flex flex-col gap-4">
        {/* Category + title */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 rounded-full" style={{ backgroundColor: catColor }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: catColor }}>{event.category}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1A1F2E] leading-snug">{event.title}</h1>
        </div>

        {/* Author */}
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: avatarColor(event.authorName ?? '') }}
          >
            {initials(event.authorName ?? '?')}
          </div>
          <span className="text-sm text-gray-500">
            Gepostet von <span className="font-medium text-[#1A1F2E]">{event.authorName}</span>
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="#F05A1E" strokeWidth="2" />
                <line x1="16" y1="2" x2="16" y2="6" stroke="#F05A1E" strokeWidth="2" strokeLinecap="round" />
                <line x1="8" y1="2" x2="8" y2="6" stroke="#F05A1E" strokeWidth="2" strokeLinecap="round" />
                <line x1="3" y1="10" x2="21" y2="10" stroke="#F05A1E" strokeWidth="2" />
              </svg>
            </div>
            <div>
              {(() => {
                const { dateLine, timeLine } = formatEventDateLong(event)
                return <>
                  <p className="font-semibold text-[#1A1F2E]">{dateLine}</p>
                  {timeLine && <p className="text-sm text-gray-500">{timeLine}</p>}
                </>
              })()}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="#F05A1E" strokeWidth="2" />
                <circle cx="12" cy="10" r="3" stroke="#F05A1E" strokeWidth="2" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-[#1A1F2E]">{event.location}</p>
              {event.locationDetail && (
                <p className="text-sm text-gray-500 mt-0.5">{event.locationDetail}</p>
              )}
            </div>
          </div>
        </div>

        <p className="text-base leading-relaxed text-gray-700">{event.description}</p>

        <div className="h-px bg-gray-100" />

        {/* Likes & comments count (read-only) */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-semibold text-gray-700">{event.likesCount ?? 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-semibold text-gray-700">{comments.length}</span>
          </div>
        </div>

        {/* Comments */}
        <div className="flex flex-col gap-3">
          {comments.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Keine Kommentare</p>
          )}
          {comments.map(comment => {
            const isHidden = !!comment.isHidden
            const isDeleted = !!comment.isDeleted
            const dimmed = isHidden || isDeleted
            return (
              <div key={comment.id} className={`flex gap-3 rounded-2xl p-3 ${dimmed ? 'opacity-60' : ''}`}>
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: avatarColor(comment.authorName ?? '') }}
                >
                  {initials(comment.authorName ?? '?')}
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-sm text-[#1A1F2E]">{comment.authorName}</span>
                    {isDeleted && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] text-red-500 font-medium border border-red-100">
                        vom Nutzer gelöscht
                      </span>
                    )}
                    {isHidden && !isDeleted && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-400 font-medium">
                        ausgeblendet
                      </span>
                    )}
                  </div>
                  <p className={`text-sm text-gray-700 ${isHidden && !isDeleted ? 'line-through' : ''}`}>
                    {comment.content}
                  </p>
                </div>
                {/* 3-dot menu – nur für nicht-gelöschte Kommentare ausblenden/einblenden */}
                {!isDeleted && (
                  <ThreeDotMenu options={[
                    {
                      label: isHidden ? 'Kommentar einblenden' : 'Kommentar ausblenden',
                      action: () => toggleCommentHidden(comment.id, isHidden),
                    },
                    {
                      label: 'Nutzer sperren',
                      danger: true,
                      action: () => blockUser(comment.authorId),
                    },
                  ]} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
