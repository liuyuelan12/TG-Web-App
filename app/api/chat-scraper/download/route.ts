import { NextRequest } from 'next/server'
import { createReadStream } from 'fs'
import { stat, readdir } from 'fs/promises'
import path from 'path'
import archiver from 'archiver'
import { Readable } from 'stream'
import { verifyAuth, handleAuthError } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const auth = await verifyAuth(request)
    if (!auth.success || !auth.user) {
      return handleAuthError(auth.error!)
    }

    const { filePath, type, group, startDate, endDate, topicId } = await request.json()
    
    const userDir = path.join(process.cwd(), 'scraped_data', auth.user.email)
    let fullPath: string;

    // 如果没有提供filePath，根据group等信息查找最新文件
    if (!filePath || filePath === '') {
      if (!group) {
        return new Response('Either filePath or group must be provided', { status: 400 })
      }

      // 构建群组目录
      const groupDir = path.join(userDir, group.replace(/^@/, ''))
      
      try {
        const files = await readdir(groupDir)
        
        // 查找匹配的CSV文件（包括.tmp文件）
        let targetFiles = files.filter(f => {
          const isCSV = f.endsWith('.csv') || f.endsWith('.csv.tmp')
          if (!isCSV) return false
          
          // 如果指定了日期范围，匹配文件名
          if (startDate && endDate) {
            const startFormatted = startDate.replace(/-/g, '')
            const endFormatted = endDate.replace(/-/g, '')
            return f.includes(startFormatted) && f.includes(endFormatted)
          }
          
          // 如果指定了topicId，匹配文件名
          if (topicId) {
            return f.includes(`topic${topicId}`)
          }
          
          return true
        })

        if (targetFiles.length === 0) {
          return new Response('No matching files found', { status: 404 })
        }

        // 获取最新的文件（按修改时间排序）
        const filesWithStats = await Promise.all(
          targetFiles.map(async (file) => {
            const filePath = path.join(groupDir, file)
            const stats = await stat(filePath)
            return { file, mtime: stats.mtime }
          })
        )
        
        filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
        const latestFile = filesWithStats[0].file
        
        fullPath = type === 'csv' 
          ? path.join(groupDir, latestFile)
          : groupDir
      } catch (error) {
        console.error('Error finding files:', error)
        return new Response('Group directory not found or no files available', { status: 404 })
      }
    } else {
      // 使用提供的filePath
      fullPath = path.join(process.cwd(), filePath)
      
      // 安全检查：确保文件路径在用户目录下
      if (!fullPath.startsWith(userDir)) {
        return new Response('Access denied', { status: 403 })
      }

      try {
        await stat(fullPath)
      } catch (error) {
        return new Response('File not found', { status: 404 })
      }
    }

    if (type === 'csv') {
      const fileStream = createReadStream(fullPath)
      return new Response(fileStream as unknown as ReadableStream, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${path.basename(fullPath)}"`,
        },
      })
    } else if (type === 'all') {
      // 创建一个 ZIP 文件流
      const archive = archiver('zip', {
        zlib: { level: 9 }
      })

      // 设置错误处理
      archive.on('error', (err) => {
        console.error('Archiver error:', err)
      })

      // 将整个目录添加到 ZIP
      archive.directory(fullPath, false)

      // 完成打包
      archive.finalize()

      // 将 archive 流转换为 ReadableStream
      return new Response(Readable.from(archive) as unknown as ReadableStream, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${path.basename(fullPath)}.zip"`,
        },
      })
    }

    return new Response('Invalid download type', { status: 400 })
  } catch (error) {
    console.error('Download error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
