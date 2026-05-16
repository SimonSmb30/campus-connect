'use client'

import Link from 'next/link'

const SORT_OPTIONS = [
  { value: 'new',      label: 'Neu' },
  { value: 'popular',  label: 'Beliebt' },
  { value: 'saved',     label: 'Gespeichert' },
]

interface HeaderProps {
  onMenuOpen?: () => void
  sort: string
  onSortChange: (value: string) => void
  sortOpen: boolean
  onSortToggle: () => void
}

export default function Header({ onMenuOpen, sort, onSortChange, sortOpen, onSortToggle }: HeaderProps) {
  const current = SORT_OPTIONS.find(o => o.value === sort) ?? SORT_OPTIONS[0]

  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between bg-white border-b border-gray-100 px-4">
      <button onClick={onMenuOpen} className="p-1 -ml-1">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <line x1="3" y1="6"  x2="21" y2="6"  stroke="#1A1F2E" strokeWidth="2" strokeLinecap="round" />
          <line x1="3" y1="12" x2="21" y2="12" stroke="#1A1F2E" strokeWidth="2" strokeLinecap="round" />
          <line x1="3" y1="18" x2="21" y2="18" stroke="#1A1F2E" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Sort dropdown */}
      <div className="relative">
        <button
          onClick={onSortToggle}
          className="flex items-center gap-1.5 font-semibold text-[#1A1F2E]"
        >
          {current.label}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <polyline points="6,9 12,15 18,9" stroke="#1A1F2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {sortOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={onSortToggle} />
            <div className="absolute left-1/2 -translate-x-1/2 top-8 z-50 w-40 rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { onSortChange(opt.value); onSortToggle() }}
                  className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                >
                  <span className={`font-medium ${sort === opt.value ? 'text-[#F05A1E]' : 'text-[#1A1F2E]'}`}>
                    {opt.label}
                  </span>
                  {sort === opt.value && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <polyline points="20,6 9,17 4,12" stroke="#F05A1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <Link href="/calendar" className="p-1 -mr-1">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="#1A1F2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="16" y1="2" x2="16" y2="6" stroke="#1A1F2E" strokeWidth="2" strokeLinecap="round" />
          <line x1="8"  y1="2" x2="8"  y2="6" stroke="#1A1F2E" strokeWidth="2" strokeLinecap="round" />
          <line x1="3"  y1="10" x2="21" y2="10" stroke="#1A1F2E" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </Link>
    </header>
  )
}
