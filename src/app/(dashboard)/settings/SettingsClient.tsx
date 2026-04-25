'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, User, Trophy, ChevronRight, Shield, Moon, Sun, Download } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'

interface Badge {
  id: string
  badge_type: string
  earned_at: string
}

interface Props {
  profile: { full_name: string; timezone: string; onboarding_completed: boolean } | null
  email: string
  badges: Badge[]
  sprintCount: number
  habitCount: number
  isAdmin: boolean
  userId: string
}

const BADGE_INFO: Record<string, { label: string; icon: string; desc: string }> = {
  first_sprint: { label: 'First Sprint', icon: '🚀', desc: 'Selesaikan sprint pertama' },
  '7_day_streak': { label: '7 Day Streak', icon: '🔥', desc: '7 hari berturut-turut' },
  '30_day_streak': { label: '30 Day Streak', icon: '⚡', desc: '30 hari berturut-turut' },
  '30_day_consistency': { label: '30 Days Consistency', icon: '💎', desc: 'Konsisten 30 hari' },
  sprint_master: { label: 'Sprint Master', icon: '👑', desc: 'Selesaikan 5 sprint' },
  perfect_sprint: { label: 'Perfect Sprint', icon: '🎯', desc: '100% completion rate' },
}

export default function SettingsClient({ profile, email, badges, sprintCount, habitCount, isAdmin, userId }: Props) {
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { theme, toggleTheme } = useTheme()

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      // Fetch all habit logs
      const { data: logs } = await supabase
        .from('habit_logs')
        .select('logged_date, completed, habits(title, habit_categories(name))')
        .eq('user_id', userId)
        .order('logged_date', { ascending: false }) as any

      if (!logs || logs.length === 0) {
        alert('Belum ada data untuk diekspor.')
        return
      }

      // Build CSV
      const rows = [['Tanggal', 'Habit', 'Kategori', 'Status']]
      for (const log of logs) {
        rows.push([
          log.logged_date,
          log.habits?.title || '-',
          log.habits?.habit_categories?.name || '-',
          log.completed ? 'Selesai' : 'Tidak Selesai',
        ])
      }

      const csv = rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sprint-tracker-export-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Gagal mengekspor data.')
    } finally {
      setExporting(false)
    }
  }

  const handleLogout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleSaveName = async () => {
    if (!fullName.trim()) return
    setSaving(true)
    await supabase.from('users').update({ full_name: fullName.trim() }).eq('id', (await supabase.auth.getUser()).data.user?.id || '')
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-slate-900">Profil</h1>
          <p className="text-sm text-slate-500">{email}</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 pt-5 space-y-5">
        {/* Avatar & Stats */}        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-200">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
              {(profile?.full_name || email)[0].toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-lg">{profile?.full_name || 'Sobat Sprint'}</p>
              <p className="text-white/70 text-sm">{email}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/15 rounded-2xl p-3 text-center">
              <p className="font-bold text-xl">{sprintCount}</p>
              <p className="text-white/70 text-xs">Sprint</p>
            </div>
            <div className="bg-white/15 rounded-2xl p-3 text-center">
              <p className="font-bold text-xl">{habitCount}</p>
              <p className="text-white/70 text-xs">Habits</p>
            </div>
            <div className="bg-white/15 rounded-2xl p-3 text-center">
              <p className="font-bold text-xl">{badges.length}</p>
              <p className="text-white/70 text-xs">Badges</p>
            </div>
          </div>
        </div>

        {/* Edit Name */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <h2 className="text-slate-800 font-bold text-sm mb-3 flex items-center gap-2">
            <User size={16} className="text-blue-600" />
            Edit Nama
          </h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nama kamu..."
              className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
            />
            <button
              onClick={handleSaveName}
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2.5 rounded-2xl text-sm font-bold disabled:opacity-50"
            >
              {saved ? '✓' : saving ? '...' : 'Simpan'}
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <h2 className="text-slate-800 font-bold text-sm mb-4 flex items-center gap-2">
            <Trophy size={16} className="text-amber-500" />
            Badges ({badges.length})
          </h2>
          {badges.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-4xl mb-2">🏆</p>
              <p className="text-slate-400 text-sm">Belum ada badge. Selesaikan sprint pertama!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {badges.map(badge => {
                const info = BADGE_INFO[badge.badge_type] || { label: badge.badge_type, icon: '🏅', desc: '' }
                return (
                  <div key={badge.id} className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-center">
                    <p className="text-2xl mb-1">{info.icon}</p>
                    <p className="text-slate-700 text-xs font-bold">{info.label}</p>
                    <p className="text-slate-400 text-[10px] mt-0.5">{info.desc}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* All possible badges (locked) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <h2 className="text-slate-800 font-bold text-sm mb-4">Semua Badge</h2>
          <div className="space-y-2">
            {Object.entries(BADGE_INFO).map(([key, info]) => {
              const earned = badges.some(b => b.badge_type === key)
              return (
                <div key={key} className={`flex items-center gap-3 p-3 rounded-2xl ${earned ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50 border border-slate-100'}`}>
                  <span className={`text-2xl ${!earned ? 'grayscale opacity-40' : ''}`}>{info.icon}</span>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${earned ? 'text-slate-800' : 'text-slate-400'}`}>{info.label}</p>
                    <p className="text-slate-400 text-xs">{info.desc}</p>
                  </div>
                  {earned && <span className="text-amber-500 text-xs font-bold">✓ Earned</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Admin Dashboard Button — only for admins */}
        {isAdmin && (
          <Link
            href="/admin"
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm block"
          >
            <div className="flex items-center justify-between px-5 py-4 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center">
                  <Shield size={16} className="text-purple-600" />
                </div>
                <div>
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Admin Dashboard</span>
                  <p className="text-xs text-slate-400">Kelola users & aktivitas</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </div>
          </Link>
        )}

        {/* Dark Mode Toggle */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                {theme === 'dark' ? <Sun size={16} className="text-amber-500" /> : <Moon size={16} className="text-slate-600" />}
              </div>
              <div className="text-left">
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                  {theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
                </span>
                <p className="text-xs text-slate-400">Sekarang: {theme === 'dark' ? 'Dark' : 'Light'}</p>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-200'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </div>

        {/* Export Data */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center">
                <Download size={16} className="text-emerald-600" />
              </div>
              <div className="text-left">
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Export Data</span>
                <p className="text-xs text-slate-400">Download semua habit log (.csv)</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-300" />
          </button>
        </div>

        {/* Logout */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <button
            onClick={handleLogout}
            disabled={loading}
            className="w-full flex items-center justify-between px-5 py-4 text-red-500 hover:bg-red-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <LogOut size={18} />
              <span className="font-semibold text-sm">{loading ? 'Keluar...' : 'Keluar'}</span>
            </div>
            <ChevronRight size={18} className="text-slate-300" />
          </button>
        </div>
      </div>
    </div>
  )
}
