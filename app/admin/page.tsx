'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  email: string
  isAdmin: boolean
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

interface FileInfo {
  name: string
  path: string
  size: number
  modifiedAt: string
  isDirectory: boolean
}

interface UserFilesData {
  success: boolean
  userEmail: string
  type: string
  files: FileInfo[]
  totalSize: number
  totalFiles: number
  totalDirectories: number
}

export default function AdminPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [expireTime, setExpireTime] = useState('7') // 默认1周
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [userFiles, setUserFiles] = useState<UserFilesData | null>(null)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [activeTab, setActiveTab] = useState<'users' | 'files'>('users')
  const router = useRouter()

  // 获取所有用户
  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const response = await fetch('/api/admin/get-users')
      const data = await response.json()
      if (data.success) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // 计算过期时间
      const now = new Date()
      console.log('1. Current time:', {
        now: now.toISOString()
      })

      // 创建过期时间
      const expiresAt = new Date()
      
      // 根据选择添加时间
      const hours = expireTime === '0.125' ? 3 : 
                   expireTime === '0.208' ? 5 :
                   expireTime === '1' ? 24 :
                   expireTime === '3' ? 72 :
                   expireTime === '7' ? 168 :
                   expireTime === '14' ? 336 :
                   expireTime === '30' ? 720 :
                   expireTime === '60' ? 1440 :
                   expireTime === '90' ? 2160 : 0

      console.log('2. Adding hours:', {
        selectedOption: expireTime,
        hours
      })

      if (hours > 0) {
        // 直接设置小时
        expiresAt.setHours(expiresAt.getHours() + hours)
        console.log('3. After adding hours:', {
          now: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          diffHours: (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)
        })
      } else {
        expiresAt.setFullYear(9999)
        console.log('3. Set to forever:', {
          expiresAt: expiresAt.toISOString()
        })
      }

      // 准备请求数据
      const requestData = {
        email,
        password,
        expiresAt: expiresAt.toISOString()
      }

      console.log('4. Sending request:', {
        currentTime: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        diffHours: (expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60)
      })

      const res = await fetch('/api/admin/add-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      const data = await res.json()
      console.log('5. Response:', {
        status: res.status,
        data,
        currentTime: new Date().toISOString()
      })

      if (!res.ok) {
        throw new Error(data.message || '添加用户失败')
      }

      setSuccess('用户添加成功！')
      setEmail('')
      setPassword('')
      
      // 刷新用户列表
      fetchUsers()
      
    } catch (error) {
      setError(error instanceof Error ? error.message : '添加用户失败')
    } finally {
      setLoading(false)
    }
  }

  // 删除用户
  const handleDeleteUser = async (userEmail: string) => {
    if (!confirm(`确定要删除用户 ${userEmail} 吗？该用户将立即被强制退出登录。`)) {
      return
    }

    setDeleteLoading(userEmail)
    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '删除用户失败')
      }

      setSuccess(`用户 ${userEmail} 已删除`)
      
      // 刷新用户列表
      fetchUsers()
      
    } catch (error) {
      setError(error instanceof Error ? error.message : '删除用户失败')
    } finally {
      setDeleteLoading(null)
    }
  }

  // 查看用户文件
  const handleViewUserFiles = async (userEmail: string, type: 'sessions' | 'uploads' | 'scraped_data') => {
    setSelectedUser(userEmail)
    setLoadingFiles(true)
    setActiveTab('files')
    
    try {
      const response = await fetch(`/api/admin/list-user-files?email=${encodeURIComponent(userEmail)}&type=${type}`)
      const data = await response.json()
      
      if (data.success) {
        setUserFiles(data)
      } else {
        setError('Failed to load user files')
      }
    } catch (error) {
      console.error('Error loading user files:', error)
      setError('Failed to load user files')
    } finally {
      setLoadingFiles(false)
    }
  }

  // 下载用户文件
  const handleDownloadUserFiles = (userEmail: string, type: 'sessions' | 'uploads' | 'scraped_data' | 'all') => {
    const url = `/api/admin/download-user-files?email=${encodeURIComponent(userEmail)}&type=${type}`
    window.open(url, '_blank')
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 添加用户表单 */}
        <div>
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            添加新用户
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                邮箱
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="expireTime" className="sr-only">
                过期时间
              </label>
              <select
                id="expireTime"
                name="expireTime"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                value={expireTime}
                onChange={(e) => setExpireTime(e.target.value)}
              >
                <option value="0.125">3小时</option>
                <option value="0.208">5小时</option>
                <option value="1">1天</option>
                <option value="3">3天</option>
                <option value="7">1周</option>
                <option value="14">2周</option>
                <option value="30">1个月</option>
                <option value="60">2个月</option>
                <option value="90">3个月</option>
                <option value="0">永久</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="text-green-500 text-sm text-center">
              {success}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? '添加中...' : '添加用户'}
            </button>
          </div>
        </form>
        </div>

        {/* 用户列表 */}
        <div>
          <div className="text-center mb-6">
            <h2 className="text-3xl font-extrabold text-gray-900">
              用户管理
            </h2>
          </div>
          
          {loadingUsers ? (
            <div className="text-center py-8">
              <p className="text-gray-500">加载中...</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {users.map((user) => (
                  <li key={user.email} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.email}
                          {user.isAdmin && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              管理员
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          创建时间: {new Date(user.createdAt).toLocaleString('zh-CN')}
                        </p>
                        <p className="text-sm text-gray-500">
                          过期时间: {user.expiresAt ? new Date(user.expiresAt).toLocaleString('zh-CN') : '永久'}
                        </p>
                      </div>
                      <div className="ml-4 flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleViewUserFiles(user.email, 'scraped_data')}
                          className="px-3 py-1 text-sm rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          查看文件
                        </button>
                        <button
                          onClick={() => handleDownloadUserFiles(user.email, 'sessions')}
                          className="px-3 py-1 text-sm rounded-md text-white bg-purple-600 hover:bg-purple-700"
                        >
                          下载 Sessions
                        </button>
                        <button
                          onClick={() => handleDownloadUserFiles(user.email, 'scraped_data')}
                          className="px-3 py-1 text-sm rounded-md text-white bg-green-600 hover:bg-green-700"
                        >
                          下载爬取数据
                        </button>
                        {!user.isAdmin && (
                          <button
                            onClick={() => handleDeleteUser(user.email)}
                            disabled={deleteLoading === user.email}
                            className={`px-3 py-1 text-sm rounded-md text-white ${
                              deleteLoading === user.email
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700'
                            }`}
                          >
                            {deleteLoading === user.email ? '删除中...' : '删除'}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
                {users.length === 0 && (
                  <li className="px-4 py-8 text-center text-gray-500">
                    暂无用户
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
        </div>

        {/* 文件管理面板 */}
        {activeTab === 'files' && selectedUser && (
          <div className="mt-8">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedUser} 的文件</h3>
                  {userFiles && (
                    <p className="text-sm text-gray-500 mt-1">
                      {userFiles.totalFiles} 个文件，
                      {userFiles.totalDirectories} 个目录，
                      总大小: {formatFileSize(userFiles.totalSize)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setActiveTab('users')}
                  className="px-4 py-2 text-sm rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300"
                >
                  返回用户列表
                </button>
              </div>

              {/* 文件类型切换和下载 */}
              <div className="flex gap-2 mb-4 justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewUserFiles(selectedUser, 'sessions')}
                    className={`px-4 py-2 text-sm rounded-md ${
                      userFiles?.type === 'sessions' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-purple-100 hover:bg-purple-200 text-purple-800'
                    }`}
                  >
                    Sessions
                  </button>
                  <button
                    onClick={() => handleViewUserFiles(selectedUser, 'scraped_data')}
                    className={`px-4 py-2 text-sm rounded-md ${
                      userFiles?.type === 'scraped_data' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-green-100 hover:bg-green-200 text-green-800'
                    }`}
                  >
                    Scraped Data
                  </button>
                </div>
                {userFiles && userFiles.files.length > 0 && (
                  <button
                    onClick={() => handleDownloadUserFiles(selectedUser, userFiles.type as any)}
                    className="px-4 py-2 text-sm rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    📥 下载当前类型
                  </button>
                )}
              </div>

              {/* 文件列表 */}
              {loadingFiles ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">加载中...</p>
                </div>
              ) : userFiles && userFiles.files.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">文件名</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">大小</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">修改时间</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {userFiles.files.filter(f => !f.isDirectory).map((file, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">{file.path}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {file.isDirectory ? '目录' : '文件'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {formatFileSize(file.size)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(file.modifiedAt).toLocaleString('zh-CN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  该用户还没有上传任何文件
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
