'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { HABIT_CATEGORIES } from '@/constants/habits'
import { Heart, Brain, Dumbbell, Home, Users, TrendingUp, Plus, Trash2, Flame } from 'lucide-react'

interface Category {
  id: number
  name: string
  color: string
  icon: string
}

interface Habit {
  id: string
  title: string
  frequency: 'daily' | 'weekly'
  weekly_target: number | null
  is_active: boolean
  category_id: number
  habit_categories: Category
}

interface Props {
  habits: Habit[]
  categories: Category[]
  userId: string
  lockedHabitIds: string[]
  habitStreaks: Record<string, number>
}

const categoryIcons: Record<string, React.ReactNode> = {
  Soulset: <Heart size={16} />,
  Mindset: <Brain size={16} />,
  Healthset: <Dumbbell size={16} />,
  Familyset: <Home size={16} />,
  Socialset: <Users size={16} />,
  Wealthset: <TrendingUp size={16} />,
}

const categoryBg: Record<string, string> = {
  Soulset: 'bg-rose-500',
  Mindset: 'bg-indigo-500',
  Healthset: 'bg-emerald-500',
  Familyset: 'bg-orange-500',
  Socialset: 'bg-sky-500',
  Wealthset: 'bg-amber-500',
}

const categoryText: Record<string, string> = {
  Soulset: 'text-rose-600',
  Mindset: 'text-indigo-600',
  Healthset: 'text-emerald-600',
  Familyset: 'text-orange-600',
  Socialset: 'text-sky-600',
  Wealthset: 'text-amber-600',
}

export default function HabitsClient({ habits, categories, userId, lockedHabitIds, habitStreaks }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategoryId, setNewCategoryId] = useState(1)
  const [newFrequency, setNewFrequency] = useState<'daily' | 'weekly'>('daily')
  const [newWeeklyTarget, setNewWeeklyTarget] = useState(3)
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const filteredHabits = selectedCategory
    ? habits.filter(h => h.category_id === selectedCategory)
    : habits

  const habitsByCategory = HABIT_CATEGORIES.map(cat => ({
    ...cat,
    habits: filteredHabits.filter(h => h.category_id === cat.id),
  })).filter(cat => cat.habits.length > 0)

  const addHabit = async () => {
    if (!newTitle.trim()) return
    setLoading(true)
    await supabase.from('habits').insert({
      user_id: userId,
      title: newTitle.trim(),
      category_id: newCategoryId,
      frequency: newFrequency,
      weekly_target: newFrequency === 'weekly' ? newWeeklyTarget : null,
    })
    setNewTitle('')
    setShowAdd(false)
    setLoading(false)
    router.refresh()
  }

  const deleteHabit = async (habitId: string) => {
    if (lockedHabitIds.includes(habitId)) {
      alert('Habit ini dikunci selama sprint aktif.')
      return
    }
    await supabase.from('habits').update({ deleted_at: new Date().toISOString() }).eq('id', habitId)
    router.refresh()
  }

  const toggleActive = async (habitId: string, currentActive: boolean) => {
    if (lockedHabitIds.includes(habitId)) {
      alert('Habit ini dikunci selama sprint aktif.')
      return
    }
    await supabase.from('habits').update({ is_active: !currentActive }).eq('id', habitId)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Habits</h1>
            <p className="text-sm text-slate-500">{habits.length} habit total</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-2xl text-sm font-bold transition-colors shadow-sm shadow-blue-200 flex items-center gap-1.5"
          >
            <Plus size={16} /> Tambah
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 pt-5">
        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              selectedCategory === null ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-500'
            }`}
          >
            Semua
          </button>
          {HABIT_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${
                selectedCategory === cat.id
                  ? `${categoryBg[cat.name]} text-white border-transparent`
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Add Habit Modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-lg border border-slate-200 shadow-xl">
              <h3 className="text-slate-800 font-bold text-lg mb-4">Tambah Habit Baru</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Nama habit..."
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewFrequency('daily')}
                    className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-colors ${
                      newFrequency === 'daily' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    Harian
                  </button>
                  <button
                    onClick={() => setNewFrequency('weekly')}
                    className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-colors ${
                      newFrequency === 'weekly' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    Mingguan
                  </button>
                </div>
                {newFrequency === 'weekly' && (
                  <div>
                    <label className="text-slate-600 text-sm font-medium block mb-1.5">Target per minggu</label>
                    <input
                      type="number" min={1} max={7}
                      value={newWeeklyTarget}
                      onChange={(e) => setNewWeeklyTarget(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowAdd(false)} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-2xl text-sm font-bold">
                  Batal
                </button>
                <button
                  onClick={addHabit}
                  disabled={loading || !newTitle.trim()}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-2xl text-sm font-bold shadow-lg shadow-blue-200 disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Habits List */}
        {habitsByCategory.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-slate-500 mb-3">Belum ada habit.</p>
            <button
              onClick={() => setShowAdd(true)}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-sm shadow-blue-200"
            >
              + Tambah habit pertama
            </button>
          </div>
        ) : (
          habitsByCategory.map(cat => (
            <div key={cat.id} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-xl ${categoryBg[cat.name]} text-white`}>
                  {categoryIcons[cat.name]}
                </div>
                <p className="text-slate-700 font-bold text-sm">{cat.name}</p>
                <span className={`text-xs font-bold ${categoryText[cat.name]} ml-auto`}>{cat.habits.length} habit</span>
              </div>
              <div className="space-y-2">
                {cat.habits.map(habit => {
                  const isLocked = lockedHabitIds.includes(habit.id)
                  return (
                    <div
                      key={habit.id}
                      className={`flex items-center gap-3 p-4 rounded-2xl border bg-white transition-all ${
                        habit.is_active ? 'border-slate-200' : 'border-slate-100 opacity-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 text-sm font-semibold truncate">{habit.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-slate-400 text-xs">
                            {habit.frequency === 'daily' ? 'Harian' : `${habit.weekly_target}x/minggu`}
                            {isLocked && ' · 🔒 Dikunci sprint'}
                          </p>
                          {(habitStreaks[habit.id] || 0) > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                              <Flame size={10} className="fill-amber-500 text-amber-500" />
                              {habitStreaks[habit.id]}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleActive(habit.id, habit.is_active)}
                          className={`w-11 h-6 rounded-full transition-colors relative ${
                            habit.is_active ? 'bg-blue-600' : 'bg-slate-200'
                          }`}
                        >
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            habit.is_active ? 'translate-x-5' : 'translate-x-0.5'
                          }`} />
                        </button>
                        {!isLocked && (
                          <button
                            onClick={() => deleteHabit(habit.id)}
                            className="text-slate-300 hover:text-red-400 transition-colors p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
