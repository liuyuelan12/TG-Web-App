import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, handleAuthError } from '@/lib/auth'
import fs from 'fs'
import path from 'path'
import archiver from 'archiver'

export async function GET(req: NextRequest) {
  try {
    // 验证管理员权限
    const auth = await verifyAuth(req)
    if (!auth.success || auth.user?.role !== 'admin') {
      return handleAuthError('UNAUTHORIZED')
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // 'sessions', 'uploads', 'scraped_data'

    let dirPath: string
    let zipName: string

    switch (type) {
      case 'sessions':
        dirPath = path.join(process.cwd(), 'sessions')
        zipName = 'sessions.zip'
        break
      case 'uploads':
        dirPath = path.join(process.cwd(), 'uploads')
        zipName = 'uploads.zip'
        break
      case 'scraped_data':
        dirPath = path.join(process.cwd(), 'scraped_data')
        zipName = 'scraped_data.zip'
        break
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    // 检查目录是否存在
    if (!fs.existsSync(dirPath)) {
      return NextResponse.json({ error: 'Directory not found' }, { status: 404 })
    }

    // 创建 ZIP 压缩流
    const archive = archiver('zip', { zlib: { level: 9 } })
    
    // 设置响应头
    const headers = new Headers()
    headers.set('Content-Type', 'application/zip')
    headers.set('Content-Disposition', `attachment; filename="${zipName}"`)

    // 添加目录到压缩包
    archive.directory(dirPath, false)
    archive.finalize()

    // 返回压缩流
    return new NextResponse(archive as any, { headers })

  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Failed to download files' },
      { status: 500 }
    )
  }
}
