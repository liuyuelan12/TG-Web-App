import { useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const CHECK_INTERVAL = 30000 // 每30秒检查一次

export function useAuthCheck() {
  const router = useRouter()
  const pathname = usePathname()

  const checkAuthStatus = useCallback(async () => {
    // 如果在登录页面，不需要检查
    if (pathname === '/login') {
      return
    }

    try {
      const response = await fetch('/api/auth/check-status')
      const data = await response.json()

      if (!data.authenticated) {
        console.log('[Auth Check] User is not authenticated:', data.errorType)
        
        // 用户被删除或过期，强制退出
        if (data.errorType === 'USER_DELETED' || 
            data.errorType === 'USER_EXPIRED' ||
            data.errorType === 'TOKEN_EXPIRED') {
          
          // 清除本地存储
          localStorage.clear()
          sessionStorage.clear()
          
          // 显示提示
          const messages: Record<string, string> = {
            'USER_DELETED': '您的账户已被管理员删除',
            'USER_EXPIRED': '您的账户已过期',
            'TOKEN_EXPIRED': '登录已过期'
          }
          
          alert(messages[data.errorType] || '请重新登录')
          
          // 重定向到登录页
          router.push('/login')
          
          // 强制刷新页面以清除所有状态
          window.location.reload()
        }
      }
    } catch (error) {
      console.error('[Auth Check] Error:', error)
    }
  }, [router, pathname])

  useEffect(() => {
    // 立即检查一次
    checkAuthStatus()

    // 设置定期检查
    const interval = setInterval(checkAuthStatus, CHECK_INTERVAL)

    // 当页面获得焦点时也检查一次
    const handleFocus = () => {
      checkAuthStatus()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [checkAuthStatus])
}
