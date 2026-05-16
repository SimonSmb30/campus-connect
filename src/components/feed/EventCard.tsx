'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CATEGORY_COLORS } from '@/lib/mock-data'
import { formatEventDateShort } from '@/lib/event-time'

export default function EventCard({ event }: { event: any }) {
  const [bookmarked, setBookmarked] = useState(event.bookmarked ?? false)
  const [liked, setLiked] = useState(event.liked ?? false)
  const [likesCount, setLikesCount] = useState(event.likesCount ?? event.likes ?? 0)

  const cat = CATEGORY_COLORS[event.category as keyof typeof CATEGORY_COLORS] ?? { bg: '#f3f4f6', text: '#6b7280' }

  async function handleLike(e: React.MouseEvent) {
    e.preventDefault()
    const res = await fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: event.id, type: 'like' }),
    })
    const data = await res.json()
    if (data.ok) {
      setLiked(data.action === 'added')
      setLikesCount((prev: number) => prev + (data.action === 'added' ? 1 : -1))
    }
  }

  async function handleBookmark(e: React.MouseEvent) {
    e.preventDefault()
    const res = await fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: event.id, type: 'bookmark' }),
    })
    const data = await res.json()
    if (data.ok) setBookmarked(data.action === 'added')
  }

  return (
    <div className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm border border-gray-100">
      {/* Thumbnail */}
      <Link href={`/feed/${event.id}`} className="shrink-0">
        <div className="relative h-24 w-24 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
          {event.imageUrl ? (
            <img src={event.imageUrl} alt={event.title} className="h-full w-full object-cover" />
          ) : (
            <span className="text-3xl">📅</span>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/feed/${event.id}`}>
            <p className="font-bold text-[#1A1F2E] leading-snug line-clamp-2">{event.title}</p>
          </Link>
          <button onClick={handleBookmark} className="shrink-0 mt-0.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill={bookmarked ? '#F05A1E' : 'none'}>
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
                stroke={bookmarked ? '#F05A1E' : '#9CA3AF'} strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <p className="text-xs font-semibold text-[#F05A1E]">
          {formatEventDateShort(event)}
        </p>

        <div className="flex items-start gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="#9CA3AF" strokeWidth="2" />
            <circle cx="12" cy="10" r="3" stroke="#9CA3AF" strokeWidth="2" />
          </svg>
          <div className="min-w-0">
            {event.location && <p className="text-xs text-gray-500 truncate">{event.location}</p>}
            {event.locationDetail && <p className="text-xs text-gray-400 truncate">{event.locationDetail}</p>}
          </div>
        </div>

        <div className="flex items-center justify-between mt-1">
          <span className="rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ backgroundColor: cat.bg, color: cat.text }}>
            {event.category}
          </span>

          <div className="flex items-center gap-3">
            <button onClick={handleLike} className="flex items-center gap-1">
              <svg width="15" height="15" viewBox="0 0 24 24" fill={liked ? '#F05A1E' : 'none'}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                  stroke={liked ? '#F05A1E' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-xs text-gray-500">{likesCount}</span>
            </button>

            <Link href={`/feed/${event.id}#comments`} className="flex items-center gap-1">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                  stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-xs text-gray-500">{event.commentsCount ?? event.comments ?? 0}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
