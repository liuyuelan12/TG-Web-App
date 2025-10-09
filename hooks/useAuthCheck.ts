import { useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const CHECK_INTERVAL = 30000 // 每30秒检查一次

// 全局标记，避免多次重定向
let isRedirecting = false

export function useAuthCheck() {
  const router = useRouter()
  const pathname = usePathname()

  const checkAuthStatus = useCallback(async () => {
    // 如果在登录页面或正在重定向，不需要检查
    if (pathname === '/login' || isRedirecting) {
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
          
          // 设置重定向标记，避免重复执行
          if (isRedirecting) return
          isRedirecting = true
          
          // 显示提示
          const messages: Record<string, string> = {
            'USER_DELETED': '您的账户已被管理员删除',
            'USER_EXPIRED': '您的账户已过期',
            'TOKEN_EXPIRED': '登录已过期'
          }
          
          alert(messages[data.errorType] || '请重新登录')
          
          // 先清除 cookie
          document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
          
          // 清除本地存储
          localStorage.clear()
          sessionStorage.clear()
          
          // 重定向到登录页（使用 window.location 而不是 router.push，避免缓存）
          window.location.href = '/login'
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
