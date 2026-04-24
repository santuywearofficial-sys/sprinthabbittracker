'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { HABIT_CATEGORIES } from '@/constants/habits'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
  Flame, Trophy, Heart, Brain, Dumbbell, Home, Users, TrendingUp,
  CheckCircle2, ChevronRight, BarChart3, Plus, LayoutDashboard
} from 'lucide-react'

interface HabitLog {
  id: string
  habit_id: string
  logged_date: string
  completed: boolean
}

interface Habit {
  id: string
  title: string
  frequency: string
  category_id: number
  habit_categories: { name: string; color: string; icon: string }
}

interface SprintHabit {
  habit_id: string
  is_locked: boolean
  habits: Habit
}

interface Sprint {
  id: string
  start_date: string
  end_date: string
  duration_days: number
  reward: string
  punishment: string
  sprint_habits: SprintHabit[]
}

interface Props {
  sprint: Sprint | null
  todayLogs: HabitLog[]
  userId: string
  profile: { full_name: string; timezone: string } | null
  today: string
  monthlyData?: { month: string; progress: number }[]
  categoryStats?: { id: number; name: string; rate: number; habitCount: number; color: string }[]
  streak?: number
}

const categoryIcons: Record<string, React.ReactNode> = {
  Soulset: <Heart size={20} />,
  Mindset: <Brain size={20} />,
  Healthset: <Dumbbell size={20} />,
  Familyset: <Home size={20} />,
  Socialset: <Users size={20} />,
  Wealthset: <TrendingUp size={20} />,
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
  Soulset: 'text-rose-500',
  Mindset: 'text-indigo-500',
  Healthset: 'text-emerald-500',
  Familyset: 'text-orange-500',
  Socialset: 'text-sky-500',
  Wealthset: 'text-amber-500',
}

export default function DashboardClient({
  sprint, todayLogs, userId, profile, today,
  monthlyData = [], categoryStats = [], streak = 0
}: Props) {
  const [logs, setLogs] = useState<HabitLog[]>(todayLogs)
  const [loading, setLoading] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') === 'checkin' ? 'checkin' : 'overview'
  const supabase = createClient()

  const setActiveTab = (tab: string) => {
    router.push(`/dashboard?tab=${tab}`)
  }

  const habits = sprint?.sprint_habits?.map(sh => sh.habits) || []
  const completedCount = habits.filter(h => logs.some(l => l.habit_id === h.id && l.completed)).length
  const totalCount = habits.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const isCompleted = (habitId: string) => logs.some(l => l.habit_id === habitId && l.completed)

  const toggleHabit = async (habitId: string) => {
    if (loading) return
    setLoading(habitId)
    const completed = isCompleted(habitId)

    if (completed) {
      await supabase.from('habit_logs').delete()
        .eq('habit_id', habitId).eq('logged_date', today).eq('user_id', userId)
      setLogs(logs.filter(l => !(l.habit_id === habitId && l.logged_date === today)))
    } else {
      const { data } = await supabase.from('habit_logs')
        .upsert({ habit_id: habitId, user_id: userId, logged_date: today, completed: true })
        .select().single()
      if (data) {
        const newLogs = [...logs.filter(l => l.habit_id !== habitId), data]
        setLogs(newLogs)
        const newCompleted = habits.filter(h => newLogs.some(l => l.habit_id === h.id && l.completed)).length
        if (newCompleted === totalCount && totalCount > 0) {
          setShowConfetti(true)
          setTimeout(() => setShowConfetti(false), 3000)
        }
      }
    }
    setLoading(null)
  }

  const daysRemaining = sprint
    ? Math.max(0, Math.ceil((new Date(sprint.end_date).getTime() - new Date().getTime()) / 86400000))
    : 0

  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  // Build category stats from habits
  const catStats = HABIT_CATEGORIES.map(cat => {
    const catHabits = habits.filter(h => h.category_id === cat.id)
    const completed = catHabits.filter(h => isCompleted(h.id)).length
    const rate = catHabits.length > 0 ? Math.round((completed / catHabits.length) * 100) : 0
    return { ...cat, rate, habitCount: catHabits.length }
  }).filter(c => c.habitCount > 0)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="bg-blue-600 text-white text-xl font-bold px-6 py-3 rounded-2xl shadow-lg animate-bounce">
            🎉 Semua habit selesai!
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Sprint Tracker <span className="text-blue-600">2.0</span>
            </h1>
            <p className="text-sm text-slate-500">{dateStr}</p>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
              <Flame className="text-amber-500 fill-amber-500" size={18} />
              <span className="text-sm font-bold text-amber-700">{streak} Day Streak</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        {activeTab === 'overview' ? (
          <>
            {/* Today's Progress Card */}
            <section className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-200">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h2 className="text-base font-medium opacity-90">Progress Hari Ini</h2>
                  <p className="text-5xl font-bold mt-1">{progressPercent}%</p>
                </div>
                <Trophy size={48} className="opacity-25" />
              </div>
              <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden mb-3">
                <div
                  className="bg-white h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium opacity-90">
                  {completedCount} dari {totalCount} habit selesai
                </p>
                {sprint && (
                  <p className="text-sm opacity-75">Sprint: {daysRemaining} hari lagi</p>
                )}
              </div>
              {sprint?.reward && (
                <div className="mt-3 bg-white/10 rounded-xl px-3 py-2">
                  <p className="text-sm opacity-90">🎁 {sprint.reward}</p>
                </div>
              )}
            </section>

            {/* 6 Sets Grid */}
            {catStats.length > 0 && (
              <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {catStats.map((cat) => (
                  <div
                    key={cat.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors cursor-pointer group"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className={`p-2 rounded-xl ${categoryBg[cat.name]} text-white group-hover:scale-110 transition-transform`}>
                        {categoryIcons[cat.name]}
                      </div>
                      <span className={`text-xs font-bold ${categoryText[cat.name]}`}>{cat.rate}%</span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">{cat.name}</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{cat.habitCount} Habits</p>
                  </div>
                ))}
              </section>
            )}

            {/* Monthly Trend Chart */}
            {monthlyData.length > 0 && (
              <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <BarChart3 size={20} className="text-blue-600" />
                    Tren Kesuksesan Bulanan
                  </h3>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Area type="monotone" dataKey="progress" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorProgress)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* No sprint state */}
            {!sprint && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
                <p className="text-4xl mb-3">🏃</p>
                <p className="text-slate-700 font-semibold mb-1">Belum ada sprint aktif</p>
                <a href="/sprint" className="text-blue-600 text-sm">Buat sprint baru →</a>
              </div>
            )}
          </>
        ) : (
          /* Check-in Tab — grouped by category */
          <section className="space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Check-in Harian</h2>
              <a href="/habits" className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:rotate-90 transition-transform inline-flex">
                <Plus size={20} />
              </a>
            </div>

            {habits.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">Belum ada habit di sprint aktif.</p>
                <a href="/sprint" className="text-blue-600 text-sm mt-1 inline-block">Buat sprint →</a>
              </div>
            ) : (
              HABIT_CATEGORIES.map((cat) => {
                const catHabits = habits.filter(h => h.category_id === cat.id)
                if (catHabits.length === 0) return null
                const catCompleted = catHabits.filter(h => isCompleted(h.id)).length
                return (
                  <div key={cat.id}>
                    {/* Category Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-xl ${categoryBg[cat.name]} text-white`}>
                        {categoryIcons[cat.name]}
                      </div>
                      <p className="text-slate-700 font-bold text-sm">{cat.name}</p>
                      <span className="text-slate-400 text-xs ml-auto">{catCompleted}/{catHabits.length}</span>
                    </div>
                    {/* Habits in category */}
                    <div className="space-y-2">
                      {catHabits.map((habit) => {
                        const done = isCompleted(habit.id)
                        const isLoading = loading === habit.id
                        return (
                          <div
                            key={habit.id}
                            onClick={() => toggleHabit(habit.id)}
                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                              done
                                ? 'bg-blue-50 border-blue-200 translate-x-1'
                                : 'bg-white border-slate-200 hover:border-blue-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                                done ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                              }`}>
                                {done && <CheckCircle2 size={13} className="text-white" />}
                              </div>
                              <h4 className={`font-semibold text-sm transition-all ${done ? 'text-blue-700 line-through opacity-60' : 'text-slate-800'}`}>
                                {habit.title}
                              </h4>
                            </div>
                            {isLoading
                              ? <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                              : <ChevronRight size={18} className="text-slate-300 flex-shrink-0" />
                            }
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}

            {/* Tips */}
            <div className="p-5 bg-slate-800 rounded-3xl text-white">
              <h4 className="font-bold mb-2">💡 Tips Hari Ini</h4>
              <p className="text-sm text-slate-300 leading-relaxed italic">
                "Disiplin adalah jembatan antara tujuan dan pencapaian. 1% better every day!"
              </p>
            </div>
          </section>
        )}
      </main>

      {/* Tab switcher nav — hanya untuk dashboard internal tabs */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-2xl mx-auto flex justify-around items-center">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'overview' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <LayoutDashboard size={22} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('checkin')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'checkin' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <CheckCircle2 size={22} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Check-in</span>
          </button>
          <a href="/habits" className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600 transition-colors">
            <Plus size={22} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Habits</span>
          </a>
          <a href="/sprint" className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600 transition-colors">
            <Flame size={22} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Sprint</span>
          </a>
          <a href="/analytics" className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600 transition-colors">
            <Trophy size={22} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Stats</span>
          </a>
        </div>
      </div>
    </div>
  )
}
