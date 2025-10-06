'use client'

import { useAuthCheck } from '@/hooks/useAuthCheck'

export default function AuthChecker() {
  useAuthCheck()
  return null
}
