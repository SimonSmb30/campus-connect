'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CompleteProfileStudentPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/register?role=student') }, [router])
  return null
}
