import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, handleAuthError } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const auth = await verifyAuth(request, true)
    if (!auth.success) {
      return handleAuthError(auth.error!)
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      )
    }

    // 不允许删除管理员账户
    if (email === 'fchow') {
      return NextResponse.json(
        { success: false, message: 'Cannot delete admin account' },
        { status: 403 }
      )
    }

    // 删除用户
    const deletedUser = await prisma.user.delete({
      where: { email }
    })

    console.log(`[Admin] Deleted user: ${email}`)

    return NextResponse.json({
      success: true,
      message: `User ${email} deleted successfully`,
      deletedUser
    })

  } catch (error: any) {
    console.error('Error deleting user:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete user' },
      { status: 500 }
    )
  }
}
