'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface BottomNavProps {
  onPost?: () => void
}

export default function BottomNav({ onPost }: BottomNavProps) {
  const pathname = usePathname()
  const isFeed = pathname === '/feed' || pathname.startsWith('/feed/')
  const isProfile = pathname === '/profile'

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-gray-100 bg-white px-4">
      <Link href="/feed" className="flex flex-col items-center gap-0.5">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
            stroke={isFeed ? '#F05A1E' : '#9CA3AF'} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            fill={isFeed ? '#FFF0E8' : 'none'} />
          <polyline points="9,22 9,12 15,12 15,22"
            stroke={isFeed ? '#F05A1E' : '#9CA3AF'} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className={`text-[10px] font-medium ${isFeed ? 'text-[#F05A1E]' : 'text-gray-400'}`}>Feed</span>
      </Link>

      <button
        onClick={onPost}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F05A1E] shadow-lg shadow-orange-200 active:scale-95 transition-transform"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>

      <Link href="/profile" className="flex flex-col items-center gap-0.5">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
            stroke={isProfile ? '#F05A1E' : '#9CA3AF'} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="7" r="4"
            stroke={isProfile ? '#F05A1E' : '#9CA3AF'} strokeWidth="2" />
        </svg>
        <span className={`text-[10px] font-medium ${isProfile ? 'text-[#F05A1E]' : 'text-gray-400'}`}>Profil</span>
      </Link>
    </nav>
  )
}
