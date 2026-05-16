'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CompleteProfileAdminPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/register?role=admin') }, [router])
  return null
}
