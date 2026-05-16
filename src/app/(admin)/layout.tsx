'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke={active ? '#F05A1E' : '#9CA3AF'} strokeWidth="2" />
      <rect x="14" y="3" width="7" height="7" rx="1" stroke={active ? '#F05A1E' : '#9CA3AF'} strokeWidth="2" />
      <rect x="3" y="14" width="7" height="7" rx="1" stroke={active ? '#F05A1E' : '#9CA3AF'} strokeWidth="2" />
      <rect x="14" y="14" width="7" height="7" rx="1" stroke={active ? '#F05A1E' : '#9CA3AF'} strokeWidth="2" />
    </svg>
  )},
  { href: '/admin/events', label: 'Events', icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke={active ? '#F05A1E' : '#9CA3AF'} strokeWidth="2" />
      <line x1="16" y1="2" x2="16" y2="6" stroke={active ? '#F05A1E' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="2" x2="8" y2="6" stroke={active ? '#F05A1E' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="10" x2="21" y2="10" stroke={active ? '#F05A1E' : '#9CA3AF'} strokeWidth="2" />
    </svg>
  )},
  { href: '/admin/users', label: 'Nutzer', icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={active ? '#F05A1E' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9" cy="7" r="4" stroke={active ? '#F05A1E' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke={active ? '#F05A1E' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke={active ? '#F05A1E' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { href: '/admin/settings', label: 'Einstellungen', icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke={active ? '#F05A1E' : '#9CA3AF'} strokeWidth="2" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke={active ? '#F05A1E' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )},
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-16">{children}</div>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-gray-100 bg-white px-4">
        {NAV.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5">
              {item.icon(active)}
              <span className={`text-[10px] font-medium ${active ? 'text-[#F05A1E]' : 'text-gray-400'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
