import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, handleAuthError } from '@/lib/auth'
import { getAllProcesses, getProcess } from '../process-manager'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return handleAuthError(auth.error!)
    }

    const { email } = auth.user!
    const userProcess = getProcess(email)
    const allProcesses = getAllProcesses()

    // 检查系统中所有的 auto_chat 进程
    let systemProcesses: Array<{pid: string; user: string; command: string}> = []
    try {
      const { stdout } = await execAsync('ps aux | grep "auto_chat.py" | grep -v grep')
      systemProcesses = stdout.trim().split('\n').map(line => {
        const parts = line.trim().split(/\s+/)
        return {
          pid: parts[1],
          user: parts[0],
          command: parts.slice(10).join(' ')
        }
      })
    } catch (error) {
      // No processes found
    }

    return NextResponse.json({
      success: true,
      userProcess,
      allManagedProcesses: allProcesses,
      systemProcesses,
      email
    })

  } catch (error) {
    console.error('Error checking process status:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to check process status'
    }, { status: 500 })
  }
}
