import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    
    if (!auth.success) {
      // 返回特定的错误状态
      const errorType = auth.error === 'User not found' ? 'USER_DELETED' : 
                       auth.error === 'User expired' ? 'USER_EXPIRED' :
                       auth.error === 'Token expired' ? 'TOKEN_EXPIRED' : 'AUTH_FAILED'
      
      return NextResponse.json({
        success: false,
        authenticated: false,
        errorType,
        message: auth.error
      }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: auth.user
    })

  } catch (error: any) {
    console.error('Error checking auth status:', error)
    return NextResponse.json(
      { 
        success: false, 
        authenticated: false,
        errorType: 'SERVER_ERROR',
        message: error.message || 'Failed to check authentication status' 
      },
      { status: 500 }
    )
  }
}
