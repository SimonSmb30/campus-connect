'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Party:       { bg: '#EDE9FE', text: '#7C3AED' },
  Vortrag:     { bg: '#FEF3C7', text: '#92400E' },
  Workshop:    { bg: '#DBEAFE', text: '#1E40AF' },
  Angebot:     { bg: '#D1FAE5', text: '#065F46' },
  Sport:       { bg: '#FEE2E2', text: '#991B1B' },
  Ausstellung: { bg: '#FCE7F3', text: '#9D174D' },
  Community:   { bg: '#FFEDD5', text: '#C2410C' },
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstWeekday(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

export default function CalendarPage() {
  const router = useRouter()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState(today.getDate())
  const [filter, setFilter] = useState<'alle' | 'gespeichert'>('alle')
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(data => { if (data.ok) setEvents(data.events ?? []) })
      .catch(() => {})
  }, [])

  const filteredEvents = filter === 'gespeichert' ? events.filter(e => e.bookmarked) : events

  const daysInMonth = getDaysInMonth(year, month)
  const firstWeekday = getFirstWeekday(year, month)

  const eventDays = new Set(
    filteredEvents.map(e => {
      const d = new Date(e.date)
      if (d.getFullYear() === year && d.getMonth() === month) return d.getDate()
      return null
    }).filter(Boolean)
  )

  const selectedDate = new Date(year, month, selectedDay).toISOString().slice(0, 10)
  const dayEvents = filteredEvents.filter(e => e.date === selectedDate)

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
  }

  const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  return (
    <div className="min-h-screen bg-white">
      <div className="flex h-14 items-center gap-4 border-b border-gray-100 px-4">
        <button onClick={() => router.back()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <polyline points="15,18 9,12 15,6" stroke="#1A1F2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="font-semibold text-[#1A1F2E] flex-1 text-center pr-5">Kalender</span>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4 pb-24">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <polyline points="15,18 9,12 15,6" stroke="#1A1F2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="font-bold text-[#1A1F2E]">{MONTHS[month]} {year}</span>
            <button onClick={nextMonth}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <polyline points="9,18 15,12 9,6" stroke="#1A1F2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="flex rounded-xl bg-gray-100 p-0.5">
            {(['alle', 'gespeichert'] as const).map(v => (
              <button key={v} onClick={() => setFilter(v)}
                className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${filter === v ? 'bg-[#F05A1E] text-white' : 'text-gray-500'}`}>
                {v === 'alle' ? 'Alle' : 'Gespeichert'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-7 text-center">
          {WEEKDAYS.map(d => <span key={d} className="text-xs font-medium text-gray-400 py-1">{d}</span>)}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: firstWeekday }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const active = day === selectedDay
            const hasEvent = eventDays.has(day)
            return (
              <div key={day} className="flex flex-col items-center gap-0.5 py-1">
                <button onClick={() => setSelectedDay(day)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    active ? 'bg-[#F05A1E] text-white' : isToday(day) ? 'text-[#F05A1E] font-bold' : 'text-[#1A1F2E]'
                  }`}>
                  {day}
                </button>
                {hasEvent && !active && <div className="h-1.5 w-1.5 rounded-full bg-[#F05A1E]" />}
              </div>
            )
          })}
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <p className="font-bold text-[#1A1F2E]">
            {new Date(year, month, selectedDay).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          {dayEvents.length === 0
            ? <p className="text-sm text-gray-400 text-center py-6">Keine Events an diesem Tag</p>
            : dayEvents.map(event => {
                const cat = CATEGORY_COLORS[event.category]
                return (
                  <button key={event.id} onClick={() => router.push(`/feed/${event.id}`)}
                    className="flex flex-col gap-1 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm"
                    style={{ borderLeftWidth: 4, borderLeftColor: cat.text }}>
                    <p className="text-sm font-semibold" style={{ color: cat.text }}>{event.startTime} – {event.endTime} Uhr</p>
                    <p className="font-bold text-[#1A1F2E]">{event.title}</p>
                    <div className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="#9CA3AF" strokeWidth="2" />
                        <circle cx="12" cy="10" r="3" stroke="#9CA3AF" strokeWidth="2" />
                      </svg>
                      <span className="text-xs text-gray-500">{event.location}</span>
                    </div>
                  </button>
                )
              })
          }
        </div>
      </div>
    </div>
  )
}
