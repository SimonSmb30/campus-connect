'use client'

import { useState, useMemo } from 'react'
import Header from '@/components/layout/Header'
import EventCard from '@/components/feed/EventCard'
import { CATEGORY_COLORS } from '@/lib/mock-data'

type Category = 'Party' | 'Vortrag' | 'Workshop' | 'Angebot' | 'Sport' | 'Ausstellung' | 'Community'
const CATEGORIES: Category[] = ['Party', 'Vortrag', 'Workshop', 'Angebot', 'Sport', 'Ausstellung', 'Community']
const ZEITRAUM = ['Heute', 'Woche', 'Monat', 'Alle']

export default function FeedClient({ initialEvents }: { initialEvents: any[] }) {
  const [events] = useState<any[]>(initialEvents)

  // Sort
  const [sort, setSort] = useState('new')
  const [sortOpen, setSortOpen] = useState(false)

  // Filter
  const [filterOpen, setFilterOpen] = useState(false)
  const [activeCategories, setActiveCategories] = useState<Category[]>([])
  const [activeZeitraum, setActiveZeitraum] = useState('Alle')
  const [pendingCategories, setPendingCategories] = useState<Category[]>([])
  const [pendingZeitraum, setPendingZeitraum] = useState('Alle')

  function openFilter() {
    setPendingCategories(activeCategories)
    setPendingZeitraum(activeZeitraum)
    setFilterOpen(true)
  }

  function applyFilter() {
    setActiveCategories(pendingCategories)
    setActiveZeitraum(pendingZeitraum)
    setFilterOpen(false)
  }

  function resetFilter() {
    setPendingCategories([])
    setPendingZeitraum('Alle')
    setActiveCategories([])
    setActiveZeitraum('Alle')
    setFilterOpen(false)
  }

  function toggleCategory(cat: Category) {
    setPendingCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  const displayedEvents = useMemo(() => {
    let result = [...events]

    if (activeCategories.length > 0) {
      result = result.filter(e => activeCategories.includes(e.category))
    }

    if (activeZeitraum !== 'Alle') {
      const now = new Date()
      result = result.filter(e => {
        const d = new Date(e.date)
        if (activeZeitraum === 'Heute') return d.toDateString() === now.toDateString()
        if (activeZeitraum === 'Woche') {
          const week = new Date(now); week.setDate(now.getDate() + 7)
          return d >= now && d <= week
        }
        if (activeZeitraum === 'Monat') {
          const month = new Date(now); month.setMonth(now.getMonth() + 1)
          return d >= now && d <= month
        }
        return true
      })
    }

    if (sort === 'new') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else if (sort === 'popular') {
      result.sort((a, b) => (b.likesCount ?? 0) - (a.likesCount ?? 0))
    } else if (sort === 'saved') {
      result = result.filter(e => e.bookmarked)
    }

    return result
  }, [events, activeCategories, activeZeitraum, sort])

  const activeFilterCount = activeCategories.length + (activeZeitraum !== 'Alle' ? 1 : 0)

  return (
    <>
      <Header
        onMenuOpen={openFilter}
        sort={sort}
        onSortChange={setSort}
        sortOpen={sortOpen}
        onSortToggle={() => setSortOpen(v => !v)}
      />

      <main className="pt-14 px-4 pb-4 flex flex-col gap-3">
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs text-gray-500">{activeFilterCount} Filter aktiv</span>
            <button
              onClick={() => { setActiveCategories([]); setActiveZeitraum('Alle') }}
              className="text-xs font-medium text-[#F05A1E]"
            >
              Zurücksetzen
            </button>
          </div>
        )}

        {displayedEvents.length === 0 ? (
          <p className="text-center text-gray-400 py-16">Keine Events gefunden</p>
        ) : (
          displayedEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
            />
          ))
        )}
      </main>

      {/* Filter Sheet */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setFilterOpen(false)} />
          <div className="relative rounded-t-3xl bg-white px-5 pt-4 pb-8 flex flex-col gap-6">
            <div className="mx-auto h-1 w-10 rounded-full bg-gray-200" />
            <h2 className="text-lg font-bold text-[#1A1F2E]">Events filtern</h2>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Kategorie</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => {
                  const active = pendingCategories.includes(cat)
                  const colors = CATEGORY_COLORS[cat]
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                        active ? 'border-transparent' : 'border-gray-200 text-gray-700'
                      }`}
                      style={active ? { backgroundColor: colors.bg, color: colors.text, borderColor: colors.bg } : {}}
                    >
                      {cat}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Zeitraum</p>
              <div className="flex flex-wrap gap-2">
                {ZEITRAUM.map(z => (
                  <button
                    key={z}
                    onClick={() => setPendingZeitraum(z)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                      pendingZeitraum === z
                        ? 'border-[#F05A1E] bg-orange-50 text-[#F05A1E]'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    {z}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={resetFilter}
                className="flex-1 rounded-2xl border border-gray-200 py-3.5 font-semibold text-gray-700"
              >
                Zurücksetzen
              </button>
              <button
                onClick={applyFilter}
                className="flex-1 rounded-2xl bg-[#F05A1E] py-3.5 font-semibold text-white"
              >
                Anwenden
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
