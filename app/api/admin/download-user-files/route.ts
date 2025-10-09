import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, handleAuthError } from '@/lib/auth'
import { getUserStoragePath } from '@/lib/storage-paths'
import fs from 'fs'
import path from 'path'
import archiver from 'archiver'

export async function GET(req: NextRequest) {
  try {
    // 验证管理员权限
    const auth = await verifyAuth(req)
    if (!auth.success || !auth.user?.isAdmin) {
      return handleAuthError('UNAUTHORIZED')
    }

    const { searchParams } = new URL(req.url)
    const userEmail = searchParams.get('email')
    const type = searchParams.get('type') as 'sessions' | 'uploads' | 'scraped_data' | 'all' | null

    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 })
    }

    if (type === 'all') {
      // 下载用户的所有数据
      return downloadAllUserData(userEmail)
    }

    if (!type || !['sessions', 'uploads', 'scraped_data'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    // 获取用户目录
    const userDir = getUserStoragePath(type, userEmail)

    if (!fs.existsSync(userDir)) {
      return NextResponse.json({ error: 'User directory not found' }, { status: 404 })
    }

    // 检查目录是否为空
    const files = fs.readdirSync(userDir)
    if (files.length === 0) {
      return NextResponse.json({ error: 'Directory is empty' }, { status: 404 })
    }

    // 创建 ZIP 压缩流
    const archive = archiver('zip', { zlib: { level: 9 } })
    
    // 设置响应头
    const headers = new Headers()
    headers.set('Content-Type', 'application/zip')
    headers.set('Content-Disposition', `attachment; filename="${userEmail.replace('@', '_')}_${type}.zip"`)

    // 添加目录到压缩包
    archive.directory(userDir, false)
    archive.finalize()

    // 返回压缩流
    return new NextResponse(archive as any, { headers })

  } catch (error) {
    console.error('Download user files error:', error)
    return NextResponse.json(
      { error: 'Failed to download user files', details: String(error) },
      { status: 500 }
    )
  }
}

// 下载用户的所有数据
async function downloadAllUserData(userEmail: string) {
  const archive = archiver('zip', { zlib: { level: 9 } })
  
  const headers = new Headers()
  headers.set('Content-Type', 'application/zip')
  headers.set('Content-Disposition', `attachment; filename="${userEmail.replace('@', '_')}_all_data.zip"`)

  // 添加所有类型的数据
  const types: Array<'sessions' | 'uploads' | 'scraped_data'> = ['sessions', 'uploads', 'scraped_data']
  
  for (const type of types) {
    const dirPath = getUserStoragePath(type, userEmail)
    if (fs.existsSync(dirPath) && fs.readdirSync(dirPath).length > 0) {
      // 使用类型名作为压缩包内的文件夹名
      archive.directory(dirPath, type)
    }
  }

  archive.finalize()

  return new NextResponse(archive as any, { headers })
}
