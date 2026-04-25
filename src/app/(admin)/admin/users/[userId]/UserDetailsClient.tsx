'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Mail, Calendar, Globe, Shield, TrendingUp, Target, CheckCircle, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

interface Habit {
  id: string
  title: string
  frequency: string
  habit_categories: { name: string; color: string }
}

interface Sprint {
  id: string
  start_date: string
  end_date: string
  status: string
  completion_rate: number | null
}

interface Stats {
  totalHabits: number
  totalSprints: number
  completionRate: number
  lastLogin: string
}

interface Props {
  user: User
  habits: Habit[]
  sprints: Sprint[]
  stats: Stats
}

export default function UserDetailsClient({ user, habits, sprints, stats }: Props) {
  const [selectedRole, setSelectedRole] = useState(user.role)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(user.full_name || '')
  const [editedEmail, setEditedEmail] = useState(user.email)
  const [savingProfile, setSavingProfile] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const handleRoleUpdate = async () => {
    if (selectedRole === user.role) return
    
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: user.id,
          role: selectedRole,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      // Log activity
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        await logActivity(
          currentUser.id,
          'role_update',
          user.id,
          { old_role: user.role, new_role: selectedRole }
        )
      }

      setToast({ message: 'Role updated successfully!', type: 'success' })
      router.refresh()
    } catch (error: any) {
      setToast({ message: `Failed to update role: ${error.message}`, type: 'error' })
      setSelectedRole(user.role) // Revert on error
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteUser = async () => {
    setDeleting(true)
    try {
      // Log activity before deletion
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        await logActivity(
          currentUser.id,
          'user_deleted',
          user.id,
          { 
            email: user.email,
            full_name: user.full_name,
            role: user.role
          }
        )
      }

      // Delete related data (cascade)
      await supabase.from('habit_logs').delete().eq('user_id', user.id)
      await supabase.from('habits').delete().eq('user_id', user.id)
      await supabase.from('sprints').delete().eq('user_id', user.id)
      await supabase.from('user_roles').delete().eq('user_id', user.id)

      // Delete user from auth
      const { error } = await supabase.auth.admin.deleteUser(user.id)
      if (error) throw error

      setToast({ message: 'User deleted successfully!', type: 'success' })
      setTimeout(() => router.push('/admin'), 1000)
    } catch (error: any) {
      setToast({ message: `Failed to delete user: ${error.message}`, type: 'error' })
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSaveProfile = async () => {
    // Validation
    if (!editedName.trim()) {
      setToast({ message: 'Name cannot be empty', type: 'error' })
      return
    }

    if (!validateEmail(editedEmail)) {
      setToast({ message: 'Please enter a valid email address', type: 'error' })
      return
    }

    setSavingProfile(true)
    try {
      // Update user metadata
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        {
          email: editedEmail,
          user_metadata: {
            username: editedName
          }
        }
      )

      if (updateError) throw updateError

      // Log activity
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        const changes: any = {}
        if (editedName !== user.full_name) changes.full_name = { old: user.full_name, new: editedName }
        if (editedEmail !== user.email) changes.email = { old: user.email, new: editedEmail }

        await logActivity(
          currentUser.id,
          'profile_updated',
          user.id,
          { changes }
        )
      }

      setToast({ message: 'Profile updated successfully!', type: 'success' })
      setIsEditing(false)
      router.refresh()
    } catch (error: any) {
      setToast({ message: `Failed to update profile: ${error.message}`, type: 'error' })
      // Revert on error
      setEditedName(user.full_name || '')
      setEditedEmail(user.email)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleCancelEdit = () => {
    setEditedName(user.full_name || '')
    setEditedEmail(user.email)
    setIsEditing(false)
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete User</h3>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete <strong>{user.email}</strong>? This will permanently remove all their data including habits, sprints, and logs. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back Button */}
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
      >
        <ArrowLeft size={18} />
        <span className="font-medium">Back to Users</span>
      </Link>

      {/* User Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-bold text-2xl">
                {user.email[0].toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{user.full_name || 'No name'}</h1>
              <div className="flex flex-col gap-2 mt-2">
                {!isEditing ? (
                  <>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail size={16} />
                      <span className="text-sm">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar size={16} />
                      <span className="text-sm">Joined {formatDate(user.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Globe size={16} />
                      <span className="text-sm">{user.timezone}</span>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 mt-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        disabled={savingProfile}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                      <input
                        type="email"
                        value={editedEmail}
                        onChange={(e) => setEditedEmail(e.target.value)}
                        disabled={savingProfile}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                      >
                        {savingProfile ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={savingProfile}
                        className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Role Management & Delete */}
          <div className="flex flex-col gap-3">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium"
              >
                Edit Profile
              </button>
            )}
            
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-slate-600" />
              <span className="text-sm font-medium text-slate-600">Role</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                disabled={updating || isEditing}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              {selectedRole !== user.role && (
                <button
                  onClick={handleRoleUpdate}
                  disabled={updating || isEditing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {updating ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting || isEditing}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
            >
              <Trash2 size={16} />
              Delete User
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Target size={20} className="text-blue-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Total Habits</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.totalHabits}</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar size={20} className="text-purple-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Total Sprints</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.totalSprints}</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-green-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Completion Rate</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.completionRate}%</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <CheckCircle size={20} className="text-amber-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Status</span>
          </div>
          <p className="text-lg font-bold text-slate-900">
            {user.onboarding_completed ? 'Active' : 'Pending'}
          </p>
        </div>
      </div>

      {/* Habits List */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Habits ({habits.length})</h2>
        {habits.length === 0 ? (
          <p className="text-slate-600 text-center py-8">No habits created yet.</p>
        ) : (
          <div className="space-y-3">
            {habits.map((habit) => (
              <div
                key={habit.id}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: habit.habit_categories.color }}
                  />
                  <div>
                    <p className="font-medium text-slate-900">{habit.title}</p>
                    <p className="text-sm text-slate-500">
                      {habit.habit_categories.name} • {habit.frequency}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sprints List */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Sprints ({sprints.length})</h2>
        {sprints.length === 0 ? (
          <p className="text-slate-600 text-center py-8">No sprints started yet.</p>
        ) : (
          <div className="space-y-3">
            {sprints.map((sprint) => (
              <div
                key={sprint.id}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {formatDate(sprint.start_date)} - {formatDate(sprint.end_date)}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">Status: {sprint.status}</p>
                </div>
                {sprint.completion_rate !== null && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">{sprint.completion_rate}%</p>
                    <p className="text-xs text-slate-500">Completion</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
