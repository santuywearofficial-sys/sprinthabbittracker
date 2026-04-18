'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Flame, Trophy, Plus, CheckCircle2 } from 'lucide-react'

interface Habit {
  id: string
  title: string
  category_id: number
  habit_categories: { name: string; color: string }
}

interface Sprint {
  id: string
  start_date: string
  end_date: string
  duration_days: number
  status: string
  reward: string
  punishment: string
  completion_rate: number | null
  reflection: string | null
  sprint_habits?: Array<{ habit_id: string; is_locked: boolean; habits: Habit }>
}

interface Props {
  activeSprint: Sprint | null
  pastSprints: Sprint[]
  habits: Habit[]
  userId: string
  completedSprintsCount: number
}

export default function SprintClient({ activeSprint, pastSprints, habits, userId, completedSprintsCount }: Props) {
  const [showNewSprint, setShowNewSprint] = useState(false)
  const [selectedHabits, setSelectedHabits] = useState<string[]>(habits.map(h => h.id))
  const [duration, setDuration] = useState(7)
  const [reward, setReward] = useState('')
  const [punishment, setPunishment] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [reflection, setReflection] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const canUse14Days = completedSprintsCount >= 2

  const daysRemaining = activeSprint
    ? Math.max(0, Math.ceil((new Date(activeSprint.end_date).getTime() - new Date().getTime()) / 86400000))
    : 0

  const daysPassed = activeSprint ? activeSprint.duration_days - daysRemaining : 0

  const createSprint = async () => {
    if (selectedHabits.length === 0) return
    setLoading(true)
    const today = new Date()
    const endDate = new Date(today)
    endDate.setDate(today.getDate() + duration - 1)

    const { data: sprint, error } = await supabase.from('sprints').insert({
      user_id: userId,
      start_date: today.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      duration_days: duration,
      status: 'active',
      reward,
      punishment,
    }).select().single()

    if (error || !sprint) { setLoading(false); return }

    await supabase.from('sprint_habits').insert(
      selectedHabits.map(hId => ({ sprint_id: sprint.id, habit_id: hId, is_locked: true }))
    )
    setLoading(false)
    setShowNewSprint(false)
    router.refresh()
  }

  const completeSprint = async () => {
    if (!activeSprint) return
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const { data: logs } = await supabase
      .from('habit_logs').select('*').eq('user_id', userId)
      .gte('logged_date', activeSprint.start_date).lte('logged_date', today)

    const habitIds = activeSprint.sprint_habits?.map(sh => sh.habit_id) || []
    const totalPossible = habitIds.length * activeSprint.duration_days
    const completed = logs?.filter(l => habitIds.includes(l.habit_id) && l.completed).length || 0
    const rate = totalPossible > 0 ? Math.round((completed / totalPossible) * 100) : 0

    await supabase.from('sprints').update({ status: 'completed', completion_rate: rate, reflection }).eq('id', activeSprint.id)
    await supabase.from('sprint_habits').update({ is_locked: false }).eq('sprint_id', activeSprint.id)
    setLoading(false)
    setShowReview(false)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Sprint</h1>
            <p className="text-sm text-slate-500">{completedSprintsCount} sprint selesai</p>
          </div>
          {!activeSprint && (
            <button
              onClick={() => setShowNewSprint(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-2xl text-sm font-bold shadow-sm shadow-blue-200 flex items-center gap-1.5"
            >
              <Plus size={16} /> Sprint Baru
            </button>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 pt-5">
        {/* Active Sprint */}
        {activeSprint ? (
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 mb-6 text-white shadow-xl shadow-blue-200">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-sm font-bold opacity-90">Sprint Aktif</p>
              <span className="ml-auto text-sm opacity-75">{activeSprint.duration_days} hari</span>
            </div>

            {/* Timeline */}
            <div className="flex items-center gap-2 mb-5">
              <p className="text-xs opacity-75">
                {new Date(activeSprint.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
              </p>
              <div className="flex-1 bg-white/20 rounded-full h-2.5 relative overflow-hidden">
                <div
                  className="bg-white h-full rounded-full transition-all"
                  style={{ width: `${(daysPassed / activeSprint.duration_days) * 100}%` }}
                />
              </div>
              <p className="text-xs opacity-75">
                {new Date(activeSprint.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { value: daysRemaining, label: 'Hari tersisa' },
                { value: activeSprint.sprint_habits?.length || 0, label: 'Habit dikunci' },
                { value: daysPassed, label: 'Hari berjalan' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/15 rounded-2xl p-3 text-center">
                  <p className="text-white font-bold text-2xl">{stat.value}</p>
                  <p className="text-white/70 text-xs mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {activeSprint.reward && (
              <div className="bg-white/15 rounded-2xl px-4 py-2.5 mb-2">
                <p className="text-sm">🎁 {activeSprint.reward}</p>
              </div>
            )}
            {activeSprint.punishment && (
              <div className="bg-white/15 rounded-2xl px-4 py-2.5 mb-4">
                <p className="text-sm">⚡ {activeSprint.punishment}</p>
              </div>
            )}

            <button
              onClick={() => setShowReview(true)}
              className="w-full bg-white/20 hover:bg-white/30 text-white py-3 rounded-2xl text-sm font-bold transition-colors"
            >
              Selesaikan Sprint
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 mb-6 text-center shadow-sm">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Flame className="text-blue-600" size={28} />
            </div>
            <p className="text-slate-800 font-bold text-lg mb-1">Tidak ada sprint aktif</p>
            <p className="text-slate-500 text-sm mb-5">Buat sprint baru untuk mulai berkomitmen.</p>
            <button
              onClick={() => setShowNewSprint(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-blue-200"
            >
              Buat Sprint Baru
            </button>
          </div>
        )}

        {/* Past Sprints */}
        {pastSprints.length > 0 && (
          <div>
            <h2 className="text-slate-800 font-bold mb-3 flex items-center gap-2">
              <Trophy size={18} className="text-amber-500" />
              Riwayat Sprint
            </h2>
            <div className="space-y-3">
              {pastSprints.map(sprint => (
                <div key={sprint.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-slate-700 text-sm font-semibold">
                        {new Date(sprint.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} —{' '}
                        {new Date(sprint.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-slate-400 text-xs">{sprint.duration_days} hari</p>
                    </div>
                    <div className={`text-xl font-bold ${(sprint.completion_rate || 0) >= 80 ? 'text-emerald-500' : 'text-red-400'}`}>
                      {sprint.completion_rate || 0}%
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${(sprint.completion_rate || 0) >= 80 ? 'bg-emerald-500' : 'bg-red-400'}`}
                      style={{ width: `${sprint.completion_rate || 0}%` }}
                    />
                  </div>
                  {sprint.reflection && (
                    <p className="text-slate-400 text-xs mt-2 italic">"{sprint.reflection}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* New Sprint Modal */}
      {showNewSprint && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg border border-slate-200 shadow-xl max-h-[85vh] overflow-y-auto">
            <h3 className="text-slate-800 font-bold text-lg mb-5">Sprint Baru</h3>

            <div className="mb-4">
              <label className="text-slate-600 text-sm font-medium block mb-2">Durasi</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setDuration(7)}
                  className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-colors ${duration === 7 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                >
                  7 Hari
                </button>
                <button
                  onClick={() => canUse14Days && setDuration(14)}
                  disabled={!canUse14Days}
                  className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-colors ${duration === 14 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'} ${!canUse14Days ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  14 Hari {!canUse14Days && '🔒'}
                </button>
              </div>
              {!canUse14Days && <p className="text-slate-400 text-xs mt-1">Selesaikan 2 sprint untuk unlock 14 hari</p>}
            </div>

            <div className="mb-4">
              <label className="text-slate-600 text-sm font-medium block mb-2">Pilih habit ({selectedHabits.length})</label>
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {habits.map(habit => (
                  <button
                    key={habit.id}
                    onClick={() => setSelectedHabits(prev =>
                      prev.includes(habit.id) ? prev.filter(id => id !== habit.id) : [...prev, habit.id]
                    )}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all ${
                      selectedHabits.includes(habit.id)
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 font-medium'
                        : 'bg-slate-50 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {selectedHabits.includes(habit.id) ? '✓ ' : ''}{habit.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <input
                type="text" value={reward} onChange={(e) => setReward(e.target.value)}
                placeholder="🎁 Reward jika berhasil..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
              />
              <input
                type="text" value={punishment} onChange={(e) => setPunishment(e.target.value)}
                placeholder="⚡ Punishment jika gagal..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowNewSprint(false)} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-2xl text-sm font-bold">
                Batal
              </button>
              <button
                onClick={createSprint}
                disabled={loading || selectedHabits.length === 0}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-2xl text-sm font-bold shadow-lg shadow-blue-200 disabled:opacity-50"
              >
                {loading ? 'Membuat...' : '🚀 Mulai Sprint'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sprint Review Modal */}
      {showReview && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg border border-slate-200 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
                <CheckCircle2 className="text-blue-600" size={20} />
              </div>
              <div>
                <h3 className="text-slate-800 font-bold">Selesaikan Sprint</h3>
                <p className="text-slate-500 text-xs">Tulis refleksi singkat (opsional)</p>
              </div>
            </div>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Apa yang berjalan baik? Apa yang perlu diperbaiki?"
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowReview(false)} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-2xl text-sm font-bold">
                Batal
              </button>
              <button
                onClick={completeSprint}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-2xl text-sm font-bold shadow-lg shadow-blue-200 disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : 'Selesaikan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
