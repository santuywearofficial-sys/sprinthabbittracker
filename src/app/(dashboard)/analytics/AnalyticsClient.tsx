'use client'

import { HABIT_CATEGORIES } from '@/constants/habits'
import { Flame, Trophy, BarChart3 } from 'lucide-react'
import dynamic from 'next/dynamic'

// Lazy load Recharts — heavy library, don't block initial render
const AreaChart = dynamic(() => import('recharts').then(m => ({ default: m.AreaChart })), { ssr: false })
const Area = dynamic(() => import('recharts').then(m => ({ default: m.Area })), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => ({ default: m.XAxis })), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => ({ default: m.YAxis })), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(m => ({ default: m.CartesianGrid })), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => ({ default: m.Tooltip })), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })), { ssr: false })

interface Log {
  logged_date: string
  completed: boolean
  habit_id: string
}

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
  completion_rate: number | null
  status: string
}

interface Props {
  logs: Log[]
  habits: Habit[]
  sprints: Sprint[]
  streak: number
  fromDate: string
  today: string
}

const categoryBg: Record<string, string> = {
  Soulset: 'bg-rose-500',
  Mindset: 'bg-indigo-500',
  Healthset: 'bg-emerald-500',
  Familyset: 'bg-orange-500',
  Socialset: 'bg-sky-500',
  Wealthset: 'bg-amber-500',
}

const categoryColor: Record<string, string> = {
  Soulset: '#f43f5e',
  Mindset: '#6366f1',
  Healthset: '#10b981',
  Familyset: '#f97316',
  Socialset: '#0ea5e9',
  Wealthset: '#f59e0b',
}

export default function AnalyticsClient({ logs, habits, sprints, streak, fromDate, today }: Props) {
  // Heatmap
  const heatmapData: { date: string; rate: number }[] = []
  const current = new Date(fromDate)
  const end = new Date(today)
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0]
    const dayLogs = logs.filter(l => l.logged_date === dateStr && l.completed)
    const rate = habits.length > 0 ? Math.round((dayLogs.length / habits.length) * 100) : 0
    heatmapData.push({ date: dateStr, rate })
    current.setDate(current.getDate() + 1)
  }

  // Category stats
  const categoryStats = HABIT_CATEGORIES.map(cat => {
    const catHabits = habits.filter(h => h.category_id === cat.id)
    if (catHabits.length === 0) return null
    const catLogs = logs.filter(l => catHabits.some(h => h.id === l.habit_id) && l.completed)
    const totalPossible = catHabits.length * 30
    const rate = totalPossible > 0 ? Math.round((catLogs.length / totalPossible) * 100) : 0
    return { ...cat, rate, habitCount: catHabits.length }
  }).filter(Boolean) as any[]

  const totalLogs = logs.filter(l => l.completed).length
  const totalPossible = habits.length * 30
  const overallRate = totalPossible > 0 ? Math.round((totalLogs / totalPossible) * 100) : 0

  const completedSprints = sprints.filter(s => s.status === 'completed')

  // Sprint trend for chart
  const sprintChartData = completedSprints.slice().reverse().map((s, i) => ({
    sprint: `S${i + 1}`,
    rate: s.completion_rate || 0,
  }))

  const getHeatColor = (rate: number) => {
    if (rate === 0) return 'bg-slate-100'
    if (rate < 40) return 'bg-blue-200'
    if (rate < 70) return 'bg-blue-400'
    if (rate < 90) return 'bg-blue-600'
    return 'bg-indigo-700'
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500">30 hari terakhir</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 pt-5 space-y-5">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-4 text-center text-white shadow-lg shadow-amber-200">
            <Flame className="mx-auto mb-1 fill-white" size={20} />
            <p className="text-3xl font-bold">{streak}</p>
            <p className="text-white/80 text-xs mt-0.5">Day Streak</p>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-4 text-center text-white shadow-lg shadow-blue-200">
            <BarChart3 className="mx-auto mb-1" size={20} />
            <p className="text-3xl font-bold">{overallRate}%</p>
            <p className="text-white/80 text-xs mt-0.5">30 Hari</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-center text-white shadow-lg shadow-emerald-200">
            <Trophy className="mx-auto mb-1" size={20} />
            <p className="text-3xl font-bold">{completedSprints.length}</p>
            <p className="text-white/80 text-xs mt-0.5">Sprint Selesai</p>
          </div>
        </div>

        {/* Heatmap */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <h2 className="text-slate-800 font-bold text-sm mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-600" />
            Aktivitas 30 Hari Terakhir
          </h2>
          {habits.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">Belum ada data</p>
          ) : (
            <>
              <div className="grid grid-cols-10 gap-1">
                {heatmapData.map((d) => (
                  <div
                    key={d.date}
                    title={`${d.date}: ${d.rate}%`}
                    className={`aspect-square rounded-sm ${getHeatColor(d.rate)}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5 mt-3 justify-end">
                <span className="text-slate-400 text-xs">Kurang</span>
                {['bg-slate-100', 'bg-blue-200', 'bg-blue-400', 'bg-blue-600', 'bg-indigo-700'].map(c => (
                  <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
                ))}
                <span className="text-slate-400 text-xs">Banyak</span>
              </div>
            </>
          )}
        </div>

        {/* Category Breakdown */}
        {categoryStats.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <h2 className="text-slate-800 font-bold text-sm mb-4">Per Pilar (30 hari)</h2>
            <div className="space-y-3">
              {categoryStats.map((cat: any) => (
                <div key={cat.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${categoryBg[cat.name]}`} />
                      <span className="text-slate-600 text-sm font-medium">{cat.name}</span>
                    </div>
                    <span className="text-slate-800 text-sm font-bold">{cat.rate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${cat.rate}%`, backgroundColor: categoryColor[cat.name] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sprint Trend Chart */}
        {sprintChartData.length > 1 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <h2 className="text-slate-800 font-bold text-sm mb-4 flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" />
              Tren Sprint
            </h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sprintChartData}>
                  <defs>
                    <linearGradient id="sprintGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="sprint" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip
                    formatter={(val) => [`${val}%`, 'Completion']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#sprintGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Sprint List */}
        {completedSprints.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <h2 className="text-slate-800 font-bold text-sm mb-4">Riwayat Sprint</h2>
            <div className="space-y-3">
              {completedSprints.map(sprint => (
                <div key={sprint.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-slate-600 text-xs font-medium">
                      {new Date(sprint.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} —{' '}
                      {new Date(sprint.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </p>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                      <div
                        className={`h-1.5 rounded-full ${(sprint.completion_rate || 0) >= 80 ? 'bg-emerald-500' : 'bg-red-400'}`}
                        style={{ width: `${sprint.completion_rate || 0}%` }}
                      />
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${(sprint.completion_rate || 0) >= 80 ? 'text-emerald-500' : 'text-red-400'}`}>
                    {sprint.completion_rate || 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
