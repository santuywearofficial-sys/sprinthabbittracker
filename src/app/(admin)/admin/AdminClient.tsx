'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, X, UserPlus, Eye } from 'lucide-react'
import Link from 'next/link'
import NewUserModal from '@/components/NewUserModal'
import Toast from '@/components/Toast'
import { logActivity } from '@/lib/activityLogger'

interface User {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  timezone: string
  onboarding_completed: boolean
  created_at: string
  role: string
}

interface Props {
  initialUsers: User[]
  initialError?: string
}

export default function AdminClient({ initialUsers, initialError }: Props) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(initialError)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const supabase = createClient()

  const searchUsers = async (query: string, role: string) => {
    setLoading(true)
    setError(undefined)
    
    try {
      const { data, error: searchError } = await supabase.rpc('search_users', {
        query_text: query,
        role_filter: role
      })

      if (searchError) throw searchError
      setUsers(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery, roleFilter)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, roleFilter])

  const clearSearch = () => {
    setSearchQuery('')
    setRoleFilter('all')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const handleUserCreated = async () => {
    // Refresh user list
    await searchUsers(searchQuery, roleFilter)
    
    // Show success toast
    setToast({ message: 'User created successfully!', type: 'success' })

    // Log activity
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await logActivity(
          user.id,
          'user_created',
          null,
          { message: 'New user created via admin dashboard' }
        )
      }
    } catch (err) {
      console.error('Failed to log activity:', err)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* New User Modal */}
      <NewUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleUserCreated}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-600 mt-1">
            {users.length} {users.length === 1 ? 'user' : 'users'} total
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus size={18} />
          <span className="font-medium">Create User</span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>

          {(searchQuery || roleFilter !== 'all') && (
            <button
              onClick={clearSearch}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 text-sm">{error}</p>
          <button
            onClick={() => searchUsers(searchQuery, roleFilter)}
            className="mt-2 text-red-600 hover:text-red-700 text-sm font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && users.length === 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-slate-600">
            {searchQuery || roleFilter !== 'all'
              ? 'No users found matching your search.'
              : 'No users exist yet.'}
          </p>
        </div>
      )}

      {/* User List - Desktop Table */}
      {!loading && users.length > 0 && (
        <>
          <div className="hidden md:block bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Registered
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-sm">
                            {user.email[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{user.full_name || 'No name'}</p>
                          <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          user.onboarding_completed
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {user.onboarding_completed ? 'Active' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <Eye size={16} />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* User List - Mobile Cards */}
          <div className="md:hidden space-y-3">
            {users.map((user) => (
              <div key={user.id} className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {user.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{user.full_name || 'No name'}</p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-slate-600">Registered: {formatDate(user.created_at)}</p>
                    <p className="text-slate-600 mt-1">
                      Status:{' '}
                      <span
                        className={
                          user.onboarding_completed ? 'text-green-600' : 'text-yellow-600'
                        }
                      >
                        {user.onboarding_completed ? 'Active' : 'Pending'}
                      </span>
                    </p>
                  </div>
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="flex items-center gap-1 px-3 py-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Eye size={16} />
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
