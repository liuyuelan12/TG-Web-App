import path from 'path'

// Railway 只允许单个 volume，所以所有数据存储在 /app/data 下
const BASE_DATA_DIR = process.env.DATA_DIR || '/app/data'

export const STORAGE_PATHS = {
  sessions: path.join(BASE_DATA_DIR, 'sessions'),
  uploads: path.join(BASE_DATA_DIR, 'uploads'),
  scrapedData: path.join(BASE_DATA_DIR, 'scraped_data'),
  
  // 向后兼容旧路径（开发环境）
  legacySessions: path.join(process.cwd(), 'sessions'),
  legacyUploads: path.join(process.cwd(), 'uploads'),
  legacyScrapedData: path.join(process.cwd(), 'scraped_data'),
}

// 获取实际使用的路径（优先使用新路径）
export function getStoragePath(type: 'sessions' | 'uploads' | 'scraped_data'): string {
  const fs = require('fs')
  
  let newPath: string
  let legacyPath: string
  
  switch (type) {
    case 'sessions':
      newPath = STORAGE_PATHS.sessions
      legacyPath = STORAGE_PATHS.legacySessions
      break
    case 'uploads':
      newPath = STORAGE_PATHS.uploads
      legacyPath = STORAGE_PATHS.legacyUploads
      break
    case 'scraped_data':
      newPath = STORAGE_PATHS.scrapedData
      legacyPath = STORAGE_PATHS.legacyScrapedData
      break
  }
  
  // 如果新路径存在，使用新路径
  if (fs.existsSync(newPath)) {
    return newPath
  }
  
  // 否则使用旧路径（开发环境）
  return legacyPath
}
