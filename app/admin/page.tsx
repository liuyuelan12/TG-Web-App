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
                      <div className="ml-4">
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
      </div>
    </div>
  )
}
