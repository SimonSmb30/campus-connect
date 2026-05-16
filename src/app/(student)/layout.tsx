'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [showPost, setShowPost] = useState(false)

  function handlePost() {
    router.push('/post')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-16">{children}</div>
      <BottomNav onPost={handlePost} />
    </div>
  )
}
