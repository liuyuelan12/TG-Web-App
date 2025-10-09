import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, handleAuthError } from '@/lib/auth'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(req: NextRequest) {
  try {
    // 验证管理员权限
    const auth = await verifyAuth(req)
    if (!auth.success || auth.user?.role !== 'admin') {
      return handleAuthError('UNAUTHORIZED')
    }

    console.log('Starting database migration...')

    // 运行 Prisma 迁移
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
      cwd: process.cwd(),
      env: { ...process.env }
    })

    console.log('Migration stdout:', stdout)
    if (stderr) {
      console.log('Migration stderr:', stderr)
    }

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      output: stdout,
      errors: stderr || null
    })

  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to initialize database',
        details: error.message,
        stdout: error.stdout,
        stderr: error.stderr
      },
      { status: 500 }
    )
  }
}
