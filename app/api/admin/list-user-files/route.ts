import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, handleAuthError } from '@/lib/auth'
import { getUserStoragePath } from '@/lib/storage-paths'
import fs from 'fs'
import path from 'path'

interface FileInfo {
  name: string
  path: string
  size: number
  modifiedAt: string
  isDirectory: boolean
}

export async function GET(req: NextRequest) {
  try {
    // 验证管理员权限
    const auth = await verifyAuth(req)
    if (!auth.success || !auth.user?.isAdmin) {
      return handleAuthError('UNAUTHORIZED')
    }

    const { searchParams } = new URL(req.url)
    const userEmail = searchParams.get('email')
    const type = searchParams.get('type') as 'sessions' | 'uploads' | 'scraped_data' | null

    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 })
    }

    if (!type || !['sessions', 'uploads', 'scraped_data'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    // 获取用户目录
    const userDir = getUserStoragePath(type, userEmail)

    if (!fs.existsSync(userDir)) {
      return NextResponse.json({ 
        success: true, 
        files: [],
        message: 'User directory does not exist'
      })
    }

    // 递归读取文件列表
    const getFilesRecursively = (dir: string, basePath: string = ''): FileInfo[] => {
      const files: FileInfo[] = []
      const items = fs.readdirSync(dir)

      for (const item of items) {
        const fullPath = path.join(dir, item)
        const relativePath = path.join(basePath, item)
        const stats = fs.statSync(fullPath)

        files.push({
          name: item,
          path: relativePath,
          size: stats.size,
          modifiedAt: stats.mtime.toISOString(),
          isDirectory: stats.isDirectory()
        })

        // 如果是目录，递归读取
        if (stats.isDirectory()) {
          const subFiles = getFilesRecursively(fullPath, relativePath)
          files.push(...subFiles)
        }
      }

      return files
    }

    const files = getFilesRecursively(userDir)

    return NextResponse.json({
      success: true,
      userEmail,
      type,
      files,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      totalFiles: files.filter(f => !f.isDirectory).length,
      totalDirectories: files.filter(f => f.isDirectory).length
    })

  } catch (error) {
    console.error('List user files error:', error)
    return NextResponse.json(
      { error: 'Failed to list user files', details: String(error) },
      { status: 500 }
    )
  }
}
