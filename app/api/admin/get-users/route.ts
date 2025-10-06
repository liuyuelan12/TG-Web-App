import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, handleAuthError } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const auth = await verifyAuth(request, true)
    if (!auth.success) {
      return handleAuthError(auth.error!)
    }

    // 获取所有用户
    const users = await prisma.user.findMany({
      select: {
        email: true,
        isAdmin: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      users
    })

  } catch (error: any) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
