'use client'

import { useState, useEffect } from 'react'
import { SessionTest } from '@/types/session'
import toast from '@/lib/toast'

interface Progress {
  current: number;
  total: number;
  percentage: number;
  message?: string;
}

interface ScrapeResult {
  group: string;
  totalMessages: number;
  mediaFiles: number;
  csvFile: string;
  folderPath: string;
}

interface UploadResult {
  name: string;
  success: boolean;
  error?: string;
}

export default function ChatScraper() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([])
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<SessionTest[]>([])
  const [group, setGroup] = useState('')
  const [messageLimit, setMessageLimit] = useState(1000)
  const [scraping, setScraping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [session, setSession] = useState<SessionTest | null>(null)

  useEffect(() => {
    // 获取会话信息
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/check-session')
        const data = await response.json()
        console.log('Session check response:', data)
        if (data.success && data.user) {
          setSession(data.user)
        } else {
          console.error('Session check failed:', data)
        }
      } catch (error) {
        console.error('Failed to check session:', error)
      }
    }

    checkSession()
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setSelectedFiles(prev => {
        const uniqueFiles = newFiles.filter(newFile => 
          !prev.some(existingFile => existingFile.name === newFile.name)
        )
        return [...prev, ...uniqueFiles]
      })
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setUploading(true)
    setError(null)
    setUploadResults([])

    try {
      const formData = new FormData()
      selectedFiles.forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch('/api/chat-scraper/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.message)
      }

      setUploadResults(data.results)
    } catch (e: any) {
      setError(e.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setError(null)
    setResults([])

    try {
      const response = await fetch('/api/chat-scraper/test-sessions', {
        method: 'POST',
      })

      const data = await response.json()
      console.log('Test response:', { status: response.status, data });

      if (!response.ok || !data.success) {
        setError(data.message || '测试会话文件失败')
        return
      }

      setResults(data.results || [])
    } catch (error: any) {
      console.error('Error testing sessions:', error)
      setError(error.message || '测试会话文件失败')
    } finally {
      setTesting(false)
    }
  }

  const handleScrape = async () => {
    setScraping(true)
    setError(null)
    setScrapeResult(null)
    setProgress(null)
    setIsComplete(false)

    try {
      const response = await fetch('/api/chat-scraper/scrape-group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          group,
          messageLimit
        })
      })

      if (!response.ok) {
        throw new Error('Failed to start scraping')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream available')
      }

      let tempResult: ScrapeResult | null = null;

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break;

        const text = new TextDecoder().decode(value)
        const lines = text.split('\n')

        for (const line of lines) {
          if (!line.trim()) continue

          try {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim()
              if (!jsonStr) continue
              
              const data = JSON.parse(jsonStr)
              
              if (data.type === 'progress') {
                setProgress(data)
              } else if (data.type === 'result') {
                tempResult = data.data
              } else if (data.type === 'complete') {
                setIsComplete(true)
                if (tempResult) {
                  setScrapeResult(tempResult)
                }
              } else if (data.type === 'error') {
                setError(data.message)
                break
              } else if (data.type === 'heartbeat') {
                console.debug('Received heartbeat:', new Date(data.timestamp))
              }
            }
          } catch (e) {
            console.error('Error parsing line:', e, 'Line:', line)
          }
        }
      }
    } catch (e) {
      console.error('Scraping error:', e)
      setError(e instanceof Error ? e.message : '扒取过程中发生错误，请重试')
    } finally {
      setScraping(false)
    }
  }

  const handleDownload = async (type: 'csv' | 'all') => {
    console.log('handleDownload called with type:', type)
    console.log('scrapeResult:', scrapeResult)
    console.log('session:', session)

    if (!scrapeResult?.csvFile && !scrapeResult?.folderPath) {
      console.error('No file paths in scrapeResult')
      toast.error('文件路径不存在');
      return;
    }

    if (!session?.id) {
      console.error('No session ID')
      toast.error('用户未登录');
      return;
    }

    try {
      // 使用 scrapeResult 中的实际路径，移除开头的 /app/
      const filePath = type === 'csv' 
        ? scrapeResult.csvFile.replace(/^\/app\//, '')
        : scrapeResult.folderPath.replace(/^\/app\//, '');

      console.log('Sending download request with path:', filePath)
      
      const response = await fetch(`/api/chat-scraper/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath,
          type
        })
      });

      console.log('Download response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download error response:', errorText)
        throw new Error(errorText || '下载失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // 从 scrapeResult 中获取群组名称
      const groupName = scrapeResult.group.replace(/^@/, '');
      a.download = type === 'csv' ? `${groupName}_messages.csv` : `${groupName}_all.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('下载开始');
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error instanceof Error ? error.message : '下载失败，请重试');
    }
  };

  const handleDelete = async (sessionFile: string) => {
    if (!confirm(`确定要删除会话文件 ${sessionFile} 吗？`)) {
      return
    }

    try {
      const requestData = { 
        sessionFile: sessionFile.endsWith('.session') ? sessionFile : sessionFile + '.session'
      };
      console.log('Deleting session file, request data:', requestData);

      const response = await fetch('/api/chat-scraper/delete-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      const data = await response.json()
      console.log('Delete response:', { 
        status: response.status, 
        statusText: response.statusText,
        data 
      });

      if (!response.ok || !data.success) {
        setError(data.message || '删除会话文件失败')
        return
      }

      // 删除成功后刷新会话列表
      await handleTest()
      setError(null)
    } catch (error: any) {
      console.error('Error deleting session:', error)
      setError(error.message || '删除会话文件失败')
    }
  }

  const handleDeleteAllInvalid = async () => {
    const invalidSessions = results.filter(r => r.status === 'invalid')
    
    if (invalidSessions.length === 0) {
      return
    }

    if (!confirm(`确定要删除 ${invalidSessions.length} 个 invalid 的会话文件吗？此操作不可撤销。`)) {
      return
    }

    try {
      setError(null)
      let successCount = 0
      let failCount = 0

      // 批量删除所有 invalid sessions
      for (const session of invalidSessions) {
        try {
          const requestData = { 
            sessionFile: session.session.endsWith('.session') ? session.session : session.session + '.session'
          };

          const response = await fetch('/api/chat-scraper/delete-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
          })

          const data = await response.json()
          
          if (response.ok && data.success) {
            successCount++
          } else {
            failCount++
            console.error(`Failed to delete ${session.session}:`, data.message)
          }
        } catch (error) {
          failCount++
          console.error(`Error deleting ${session.session}:`, error)
        }
      }

      // 显示结果
      if (successCount > 0) {
        toast.success(`成功删除 ${successCount} 个 invalid sessions${failCount > 0 ? `，${failCount} 个失败` : ''}`)
      }
      
      if (failCount > 0 && successCount === 0) {
        setError(`删除失败: ${failCount} 个文件删除失败`)
      }

      // 刷新会话列表
      await handleTest()
    } catch (error: any) {
      console.error('Error in batch delete:', error)
      setError(error.message || '批量删除失败')
    }
  }

  return (
    <div suppressHydrationWarning className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">扒取群聊天</h1>
          <p className="text-gray-600">上传 Session 文件并抓取 Telegram 群组消息</p>
        </div>

        {/* Session Files Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">选择 Session 文件</h3>
              <p className="text-sm text-gray-500">如果没有，先去生成</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                选择文件
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="file"
                  accept=".session"
                  multiple
                  onChange={handleFileSelect}
                  className="flex-1 text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-blue-500 file:to-blue-600 file:text-white hover:file:from-blue-600 hover:file:to-blue-700 file:cursor-pointer file:transition-all file:duration-200 file:shadow-md"
                />
                <button
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0 || uploading}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center whitespace-nowrap"
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      上传中...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                      </svg>
                      上传
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">已选择的文件:</h4>
                <ul className="divide-y divide-gray-200">
                  {selectedFiles.map((file, index) => (
                    <li key={index} className="py-2 flex justify-between items-center">
                      <span className="text-sm text-gray-900">{file.name}</span>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        移除
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Upload Results */}
            {uploadResults.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">上传结果:</h4>
                <ul className="divide-y divide-gray-200">
                  {uploadResults.map((result, index) => (
                    <li key={index} className="py-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-900">{result.name}</span>
                        <span className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                          {result.success ? '成功' : result.error || '失败'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Test Button */}
            <div className="pt-2">
              <button
                onClick={handleTest}
                disabled={testing}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:shadow-none flex items-center"
              >
                {testing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    测试中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    测试 Sessions
                  </>
                )}
              </button>
              <p className="mt-3 text-xs text-gray-500 flex items-start">
                <svg className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
                点击此按钮测试已上传的会话文件。如果还没有上传会话文件，请先上传。
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-red-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-red-700">{error}</p>
                </div>
                {error.includes('没有找到') && (
                  <div className="mt-2 pl-7">
                    <p className="text-sm text-gray-600">
                      看起来您还没有上传任何会话文件。请按照以下步骤操作：
                    </p>
                    <ol className="mt-2 text-sm text-gray-600 list-decimal pl-5 space-y-1">
                      <li>使用上方的文件上传功能</li>
                      <li>选择您的 Telegram 会话文件（.session）</li>
                      <li>点击上传按钮</li>
                      <li>等待上传完成后再次尝试测试</li>
                    </ol>
                  </div>
                )}
              </div>
            )}
            {/* Test Results */}
            {results.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">测试结果</h4>
                  {results.some(r => r.status === 'invalid') && (
                    <button
                      onClick={handleDeleteAllInvalid}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                      删除所有 Invalid Sessions ({results.filter(r => r.status === 'invalid').length})
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">SESSION FILE</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">STATUS</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">USERNAME</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">PHONE</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.map((result) => (
                        <tr key={result.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.session}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              result.status === 'valid' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {result.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.username}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.phone}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleDelete(result.session)}
                              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors shadow-sm"
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* No Sessions Hint */}
            {results.length === 0 && !testing && !error && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-blue-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">没有 Session 文件？</h4>
                    <p className="text-sm text-blue-800 mb-3">
                      您还没有上传任何 Session 文件。您可以：
                    </p>
                    <ul className="space-y-2 text-sm text-blue-800">
                      <li className="flex items-start">
                        <span className="font-semibold mr-2">1.</span>
                        <span>
                          前往 
                          <a href="/session-gen" className="mx-1 font-semibold text-blue-600 hover:text-blue-700 underline">
                            生成Session文件
                          </a> 
                          页面自己生成（可能会报错）
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-semibold mr-2">2.</span>
                        <span>
                          联系 
                          <a 
                            href="https://t.me/kowliep" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="mx-1 font-semibold text-blue-600 hover:text-blue-700 underline"
                          >
                            管理员
                          </a> 
                          购买带 Session 文件的电报号（18元/个）
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Group Scraper Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">扒取指定群消息</h3>
              <p className="text-sm text-gray-500">输入群组名称并开始抓取</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                群组名称
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                </div>
                <input
                  type="text"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  placeholder="例如: LSMM8 (不需要 @ 符号)"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 font-medium placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                消息数量限制
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
                  </svg>
                </div>
                <input
                  type="number"
                  value={messageLimit}
                  onChange={(e) => setMessageLimit(parseInt(e.target.value) || 1000)}
                  min="1"
                  max="5000"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 font-medium placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleScrape}
                disabled={scraping || !group}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:shadow-none flex items-center"
              >
                {scraping ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    抓取中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                    开始抓取
                  </>
                )}
              </button>
              <p className="mt-3 text-xs text-gray-500 flex items-start">
                <svg className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
                扒取过程花费时间较长，1000条消息可能高达20分钟，请耐心等待。扒取完成后会自动显示下载选项。
              </p>
            </div>

            {/* Progress Bar */}
            {progress && (
              <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-purple-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">正在抓取消息...</p>
                      <p className="text-xs text-gray-500">{progress.current} / {progress.total} 条消息</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-purple-600">{Math.round(progress.percentage)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress.percentage}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Scrape Results */}
            {scrapeResult && isComplete && (
              <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-green-900">抓取完成！</h4>
                    <p className="text-sm text-green-600">数据已准备好，可以下载</p>
                  </div>
                </div>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-sm font-medium text-green-600">群组</dt>
                    <dd className="mt-1 text-sm text-green-900">@{scrapeResult.group}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-green-600">总消息数</dt>
                    <dd className="mt-1 text-sm text-green-900">{scrapeResult.totalMessages}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-green-600">媒体文件数</dt>
                    <dd className="mt-1 text-sm text-green-900">{scrapeResult.mediaFiles}</dd>
                  </div>
                </dl>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleDownload('csv')}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    下载 CSV
                  </button>
                  <button
                    onClick={() => handleDownload('all')}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                    </svg>
                    下载所有文件 (ZIP)
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
